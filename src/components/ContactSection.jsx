import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './ContactSection.css'

const BLANK = { name: '', phone: '', email: '', message: '', company: '' }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ContactSection() {
  const [form, setForm] = useState(BLANK)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.name.trim()) return setError('Please enter your name.')
    if (!EMAIL_RE.test(form.email.trim())) return setError('Please enter a valid email address.')
    if (!form.message.trim()) return setError('Please enter a message.')
    if (!supabase) return setError('Messaging is unavailable right now. Please email us directly.')

    setStatus('sending')
    try {
      const { data, error: fnError } = await supabase.functions.invoke('contact-message', {
        body: {
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          message: form.message.trim(),
          company: form.company, // honeypot
        },
      })
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)

      setForm(BLANK)
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      setError(err?.message || 'Could not send your message. Please try again.')
    }
  }

  const sending = status === 'sending'

  return (
    <section className="section contact-section">
      <div className="container contact-inner">
        <span className="floating-item fi1">🍌</span>
        <span className="floating-item fi2">🍫</span>
        <span className="floating-item fi3">🍬</span>

        {status === 'sent' ? (
          <div className="contact-status is-ok" role="status">
            <strong>Thanks for reaching out!</strong>
            <p>Your message is on its way to our team. We&rsquo;ll get back to you at the email you provided.</p>
            <button type="button" className="btn btn-black" onClick={() => setStatus('idle')}>
              Send another message
            </button>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={set('name')}
              disabled={sending}
              autoComplete="name"
            />
            <input
              type="tel"
              placeholder="Phone"
              value={form.phone}
              onChange={set('phone')}
              disabled={sending}
              autoComplete="tel"
            />
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={set('email')}
              disabled={sending}
              autoComplete="email"
            />
            <textarea
              placeholder="Your message"
              rows={4}
              value={form.message}
              onChange={set('message')}
              disabled={sending}
            />

            {/* honeypot - hidden from real users, catches bots */}
            <input
              type="text"
              className="contact-hp"
              tabIndex={-1}
              autoComplete="off"
              value={form.company}
              onChange={set('company')}
              aria-hidden="true"
            />

            {error && (
              <p className="contact-status is-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? 'Sending…' : 'Send message'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
