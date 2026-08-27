import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import useReveal from '../hooks/useReveal'
import './Terms.css'

const sections = [
  {
    id: 'acceptance',
    title: 'Acceptance of Agreement',
    body: [
      {
        type: 'p',
        text: 'By accessing or using BreakQ, you agree to be bound by these Terms. If you do not agree, you must immediately cease use of the application.',
      },
    ],
  },
  {
    id: 'service-description',
    title: 'Service Description',
    body: [
      {
        type: 'p',
        text: 'BreakQ provides a digital marketplace for local Kirana stores. We facilitate a "Click and Collect" (Express Pickup) model. BreakQ does not provide home delivery services.',
      },
    ],
  },
  {
    id: 'user-accounts',
    title: 'User Accounts',
    body: [
      {
        type: 'ul',
        items: [
          { text: 'You must be at least 18 years of age to create an account.' },
          { text: 'You are responsible for maintaining the confidentiality of your account credentials.' },
          { text: 'You agree to provide accurate and updated information at all times.' },
        ],
      },
    ],
  },
  {
    id: 'ordering-pickup',
    title: 'Ordering and Pickup Workflow',
    body: [
      {
        type: 'ul',
        items: [
          { label: 'Order Placement', text: 'An order is an offer to the shop to purchase items.' },
          {
            label: 'Pickup Tokens',
            text: 'Upon order readiness, a unique QR code is generated. This code is your proof of purchase.',
          },
          {
            label: 'Collection',
            text: 'You must present the QR code at the physical store counter. The store staff will scan the code to verify the order before handing over the goods.',
          },
          {
            label: 'Unclaimed Orders',
            text: 'Shops reserve the right to restock items if an order is not picked up within 24 hours of being marked "Ready for Pickup."',
          },
        ],
      },
    ],
  },
  {
    id: 'pricing-payments',
    title: 'Pricing and Payments',
    body: [
      {
        type: 'ul',
        items: [
          { text: 'All prices are determined by the partner shops and include applicable GST.' },
          {
            text: 'BreakQ reserves the right to charge a nominal "Handling Fee" or "Platform Fee," which will be clearly displayed at checkout.',
          },
          { text: 'Payments made via the Kirana Wallet or UPI are final once the QR code is scanned by the vendor.' },
        ],
      },
    ],
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    body: [
      {
        type: 'p',
        text: 'BreakQ is a platform provider. We are not responsible for the quality, safety, or legality of the items sold by independent partner shops. Any disputes regarding product quality must be resolved directly with the shop at the time of pickup.',
      },
    ],
  },
]

function TermsSection({ section, index }) {
  const [ref, inView] = useReveal()

  return (
    <section
      id={section.id}
      ref={ref}
      className={`terms-section ${inView ? 'is-visible' : ''}`}
      style={{ transitionDelay: inView ? `${Math.min(index, 4) * 70}ms` : '0ms' }}
    >
      <div className="terms-section-head">
        <span className="terms-section-num">{String(index + 1).padStart(2, '0')}</span>
        <h2>{section.title}</h2>
      </div>
      <div className="terms-section-body">
        {section.body.map((block, i) =>
          block.type === 'ul' ? (
            <ul key={i}>
              {block.items.map((item, j) => (
                <li key={j}>
                  {item.label && <strong>{item.label}: </strong>}
                  {item.text}
                </li>
              ))}
            </ul>
          ) : (
            <p key={i}>{block.text}</p>
          )
        )}
      </div>
    </section>
  )
}

export default function Terms() {
  const [activeId, setActiveId] = useState(sections[0].id)

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean)
    if (!els.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        })
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    )

    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <PageHeader eyebrow="Legal" title="Terms & Conditions" subtitle="Last Updated: August 27, 2026" />

      <section className="section terms-page">
        <div className="container terms-layout">
          <aside className="terms-toc">
            <p className="terms-toc-label">On this page</p>
            <nav>
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`} className={activeId === s.id ? 'is-active' : ''}>
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="terms-content">
            {sections.map((s, i) => (
              <TermsSection key={s.id} section={s} index={i} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
