import './ContactSection.css'

export default function ContactSection() {
  return (
    <section className="section contact-section">
      <div className="container contact-inner">
        <span className="floating-item fi1">🍌</span>
        <span className="floating-item fi2">🍫</span>
        <span className="floating-item fi3">🍬</span>

        <form className="contact-form" onSubmit={(e) => e.preventDefault()}>
          <input type="text" placeholder="Name" />
          <input type="tel" placeholder="Phone" />
          <input type="email" placeholder="Email" />
          <textarea placeholder="Your message" rows={4} />
          <button type="submit" className="btn btn-primary">
            Send message
          </button>
        </form>
      </div>
    </section>
  )
}
