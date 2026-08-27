import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import useReveal from '../hooks/useReveal'
import './Returns.css'

const sections = [
  {
    id: 'counter-inspection',
    title: 'The "Counter Inspection" Rule',
    body: [
      {
        type: 'p',
        text: 'BreakQ operates on an express pickup model. The most critical point for returns is the store counter.',
      },
      {
        type: 'ul',
        items: [
          {
            text: 'Customers are required to inspect all items (expiry, quality, and quantity) before the vendor scans the pickup QR code.',
          },
          {
            text: 'If an item is unsatisfactory, the customer should request an immediate replacement or a removal of the item from the bill at the counter.',
          },
        ],
      },
    ],
  },
  {
    id: 'cancellation',
    title: 'Cancellation Policy',
    body: [
      {
        type: 'ul',
        items: [
          {
            label: 'Pre-Packing',
            text: 'You may cancel an order for a full refund at any time as long as the status is "Order Placed."',
          },
          {
            label: 'Post-Packing',
            text: "Once a shop moves the status to \"Preparing\" or \"Ready for Pickup,\" cancellations are at the vendor's discretion, as labor and packaging have already been committed.",
          },
        ],
      },
    ],
  },
  {
    id: 'non-perishable',
    title: 'Return of Non-Perishable Items',
    body: [
      {
        type: 'p',
        text: 'For non-perishable goods (packaged snacks, detergents, etc.), returns are accepted within 24 hours of pickup if the packaging remains unopened and the original digital receipt is provided. Returns must be processed at the same physical store where the item was collected.',
      },
    ],
  },
  {
    id: 'perishable',
    title: 'Perishable Goods',
    body: [
      {
        type: 'p',
        text: 'Items such as milk, bread, eggs, and fresh vegetables are not eligible for return once they have left the store premises due to health and safety regulations.',
      },
    ],
  },
  {
    id: 'refund-processing',
    title: 'Refund Processing',
    body: [
      {
        type: 'ul',
        items: [
          { label: 'Wallet Refunds', text: 'Refunds to the BreakQ Kirana Wallet are processed instantly.' },
          {
            label: 'Bank/UPI Refunds',
            text: "If a digital payment was made, refunds will be credited to the original source within 3 to 7 business days, depending on your bank's policy.",
          },
        ],
      },
    ],
  },
  {
    id: 'incorrect-billing',
    title: 'Incorrect Billing',
    body: [
      {
        type: 'p',
        text: 'If you are overcharged or an item is missing from your bag despite being on the digital receipt, please contact support via the app or visit the store with your Order ID for a manual adjustment.',
      },
    ],
  },
]

function ReturnsSection({ section, index }) {
  const [ref, inView] = useReveal()

  return (
    <section
      id={section.id}
      ref={ref}
      className={`returns-section ${inView ? 'is-visible' : ''}`}
      style={{ transitionDelay: inView ? `${Math.min(index, 4) * 70}ms` : '0ms' }}
    >
      <div className="returns-section-head">
        <span className="returns-section-num">{String(index + 1).padStart(2, '0')}</span>
        <h2>{section.title}</h2>
      </div>
      <div className="returns-section-body">
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

export default function Returns() {
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
      <PageHeader
        eyebrow="Legal"
        title="Return, Refund & Cancellation Policy"
        subtitle="How returns, refunds and cancellations work on BreakQ"
      />

      <section className="section returns-page">
        <div className="container returns-layout">
          <aside className="returns-toc">
            <p className="returns-toc-label">On this page</p>
            <nav>
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`} className={activeId === s.id ? 'is-active' : ''}>
                  {s.title}
                </a>
              ))}
            </nav>
          </aside>

          <div className="returns-content">
            {sections.map((s, i) => (
              <ReturnsSection key={s.id} section={s} index={i} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
