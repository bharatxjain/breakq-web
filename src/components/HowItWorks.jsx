import './HowItWorks.css'

const steps = [
  { title: 'Discover stores nearby', text: 'Browse verified Kirana, Dairy, Medical, Electrical & more shops around you', icon: '📍' },
  { title: 'Pick a vendor', text: 'Open your favorite store’s digital storefront and explore its catalog', icon: '🏬' },
  { title: 'Search & add to cart', text: 'Find exactly what you need in seconds with lightning-fast search', icon: '🔍' },
  { title: 'Get it delivered', text: 'Track your order to your doorstep, or visit in person with map & call support', icon: '🚴' },
]

export default function HowItWorks() {
  return (
    <section className="section how-it-works">
      <div className="container">
        <span className="eyebrow">Simple & fast</span>
        <h2 className="section-title">How it works</h2>
        <p className="section-subtitle">From discovery to doorstep, in four easy steps</p>

        <div className="steps-grid">
          {steps.map((s, i) => (
            <div className="step-card" key={s.title}>
              <div className="step-number">{String(i + 1).padStart(2, '0')}</div>
              <div className="step-icon">{s.icon}</div>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              {i < steps.length - 1 && <div className="step-connector" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
