// Deploy:   supabase functions deploy notify-partner-application
// Secrets:  supabase secrets set RESEND_API_KEY=... PARTNER_NOTIFY_EMAIL=bjain5329@gmail.com
//           (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically)
// Trigger:  Supabase Dashboard -> Database -> Webhooks -> new webhook
//           table: partner_applications, event: INSERT, target: this function.
//
// Runs server-side only. Reads the new row via the webhook payload, mints
// short-lived signed URLs for the uploaded files (the storage bucket is
// private), and emails the application to PARTNER_NOTIFY_EMAIL via Resend.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const NOTIFY_EMAIL = Deno.env.get('PARTNER_NOTIFY_EMAIL') ?? 'bjain5329@gmail.com'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function signedUrl(path) {
  if (!path) return null
  const { data } = await supabase.storage
    .from('partner-applications')
    .createSignedUrl(path, 60 * 60 * 24 * 7) // 7 days
  return data?.signedUrl ?? null
}

Deno.serve(async (req) => {
  try {
    const { record } = await req.json()

    const [photoUrl, proofUrl] = await Promise.all([
      signedUrl(record.photo_path),
      signedUrl(record.business_proof_path),
    ])

    const html = `
      <h2>New BreakQ partner application</h2>
      <p><strong>Name:</strong> ${record.name}</p>
      <p><strong>Mobile:</strong> ${record.mobile}</p>
      <p><strong>Business address:</strong> ${record.business_address}</p>
      <p><strong>Years of experience:</strong> ${record.years_experience}</p>
      <p><strong>GSTIN:</strong> ${record.gstin ?? '—'}</p>
      <p><strong>Photo:</strong> ${photoUrl ? `<a href="${photoUrl}">View (link expires in 7 days)</a>` : '—'}</p>
      <p><strong>Business proof:</strong> ${proofUrl ? `<a href="${proofUrl}">View (link expires in 7 days)</a>` : 'Not provided'}</p>
      <p style="color:#888">Submitted ${record.created_at}</p>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'BreakQ Partners <onboarding@resend.dev>',
        to: [NOTIFY_EMAIL],
        subject: `New partner application — ${record.name}`,
        html,
      }),
    })

    if (!res.ok) {
      return new Response(await res.text(), { status: 500 })
    }

    return new Response('ok', { status: 200 })
  } catch (err) {
    return new Response(String(err), { status: 500 })
  }
})
