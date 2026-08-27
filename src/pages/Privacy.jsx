import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import useReveal from '../hooks/useReveal'
import './Privacy.css'

const sections = [
  {
    id: 'overview',
    title: 'Overview',
    body: [
      {
        type: 'p',
        text: 'BreakQ ("we," "us," or "our") operates the BreakQ mobile application. We respect your privacy and are committed to protecting the personal data we hold about you. This policy outlines how we handle your information.',
      },
    ],
  },
  {
    id: 'information-collection',
    title: 'Information Collection',
    body: [
      {
        type: 'ul',
        items: [
          {
            label: 'Account Information',
            text: 'When you register, we collect your name, email address, and mobile number. This is required for authentication and to link your orders to your identity.',
          },
          {
            label: 'Transaction Data',
            text: 'We collect details of the products you add to your cart, your order history, total spend, and the specific shop locations you interact with.',
          },
          {
            label: 'Location Information',
            text: 'With your permission, we use GPS data to identify partner shops near you. This data is processed locally to provide store suggestions and is not stored as a permanent movement log on our servers.',
          },
          {
            label: 'Device Information',
            text: 'We collect technical data such as your IP address, device model, operating system, and unique device identifiers (e.g., FCM tokens) to send push notifications.',
          },
        ],
      },
    ],
  },
  {
    id: 'use-of-information',
    title: 'Use of Information',
    body: [
      { type: 'p', text: 'We use your data solely to:' },
      {
        type: 'ul',
        items: [
          { text: 'Facilitate the express pickup workflow (sending orders to vendors).' },
          { text: 'Generate secure QR codes for in-store collection.' },
          { text: 'Provide customer support and troubleshooting.' },
          { text: 'Send order status updates and promotional alerts (if opted-in).' },
        ],
      },
    ],
  },
  {
    id: 'data-sharing',
    title: 'Data Sharing and Disclosure',
    body: [
      { type: 'p', text: 'We do not sell your data. We only share information with:' },
      {
        type: 'ul',
        items: [
          {
            label: 'Store Partners',
            text: 'Only the specific shop you order from receives your name and order details to fulfill your request.',
          },
          {
            label: 'Service Providers',
            text: 'Infrastructure providers (like Supabase or Firebase) that host our database and handle authentication under strict confidentiality agreements.',
          },
        ],
      },
    ],
  },
  {
    id: 'data-retention',
    title: 'Data Retention & Deletion',
    body: [
      { type: 'p', text: 'We retain your data as long as your account is active.' },
      {
        type: 'ul',
        items: [
          {
            label: 'Self-Service Deletion',
            text: 'You may delete your account and all associated personal data permanently via the "Delete Account" button in the App Profile.',
          },
          {
            label: 'Legal Necessity',
            text: 'Some transaction records may be retained for statutory periods required by Indian tax and accounting laws.',
          },
        ],
      },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    body: [
      {
        type: 'p',
        text: 'We employ industry-standard TLS/SSL encryption for data in transit and Row-Level Security (RLS) to ensure that only you can access your personal order data.',
      },
    ],
  },
]

function PrivacySection({ section, index }) {
  const [ref, inView] = useReveal()

  return (
    <section
      id={section.id}
      ref={ref}
      className={`privacy-section ${inView ? 'is-visible' : ''}`}
      style={{ transitionDelay: inView ? `${Math.min(index, 4) * 70}ms` : '0ms' }}
    >
      <div className="privacy-section-head">
        <span className="privacy-section-num">{String(index + 1).padStart(2, '0')}</span>
        <h2>{section.title}</h2>
      </div>
      <div className="privacy-section-body">
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

export default function Privacy() {
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
      <PageHeader eyebrow="Legal" title="Privacy Policy" subtitle="Effective Date: August 27, 2026" />

      <section className="section privacy-page">
        <div className="container privacy-layout">
          <aside className="privacy-toc">
            <p className="privacy-toc-label">On this page</p>
            <nav>
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`} className={activeId === s.id ? 'is-active' : ''}>
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="privacy-content">
            {sections.map((s, i) => (
              <PrivacySection key={s.id} section={s} index={i} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
