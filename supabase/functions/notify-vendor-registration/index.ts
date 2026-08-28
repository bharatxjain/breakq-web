// Deploy:  supabase functions deploy notify-vendor-registration
// Secret:  supabase secrets set RESEND_API_KEY=...
//
// Called directly from the website right after a successful shop
// registration (BecomePartner.jsx). Sends the vendor a "we got your
// application, it's under review" confirmation email via Resend.
// Fire-and-forget from the client — a failure here never blocks the
// success screen or the shop record itself.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  try {
    const { email, ownerName, shopName } = await req.json();
    if (!email) {
      return new Response("Missing email", { status: 400 });
    }

    const html = `
      <h2>Thanks for registering with BreakQ, ${ownerName}!</h2>
      <p>We've received your application for <strong>${shopName}</strong>.</p>
      <p>Your shop is now under review. We'll email you at this address as soon as it's verified and live on BreakQ.</p>
      <p>In the meantime, download the BreakQ app and log in with this same email — your Vendor Dashboard will unlock automatically once your shop is approved.</p>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BreakQ <onboarding@resend.dev>",
        to: [email],
        subject: "Your BreakQ shop registration is under review",
        html,
      }),
    });

    if (!res.ok) {
      return new Response(await res.text(), { status: 500 });
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
});
