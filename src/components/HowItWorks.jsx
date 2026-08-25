import PhotoPlaceholder from './PhotoPlaceholder'
import './HowItWorks.css'

const steps = [
  { text: 'Discover verified stores near you — Kirana, Dairy, Medical, Electrical & more', photo: 'Customer browsing nearby stores on phone', side: 'text-left' },
  { text: 'Pick your favorite vendor and browse their digital storefront', photo: 'Customer browsing a store catalog', side: 'text-right' },
  { text: 'Search and add items to your cart in seconds', photo: 'Customer searching for products', side: 'text-left' },
  { text: 'Get it delivered, or visit in person with map & call support', photo: 'Delivery partner on the road', side: 'text-right' },
]

export default function HowItWorks() {
  return (
    <section className="section how-it-works">
      <div className="container">
        <span className="eyebrow">Simple & fast</span>
        <h2 className="section-title">How it works</h2>
        <p className="section-subtitle">From discovery to doorstep, in four easy steps</p>

        <div className="timeline">
          <div className="timeline-line" />
          {steps.map((s, i) => (
            <div className={`timeline-row ${s.side}`} key={i}>
              <div className="timeline-text">
                <h3>{s.text}</h3>
              </div>
              <div className="timeline-dot" />
              <div className="timeline-photo">
                <PhotoPlaceholder label={s.photo} tone="light" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
