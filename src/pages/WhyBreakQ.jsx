import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import useReveal from '../hooks/useReveal'
import './WhyBreakQ.css'

const marketFactors = [
  {
    factor: 'Smartphone penetration',
    reality: "High and rising, even where broadband/quick-commerce infra isn't",
  },
  {
    factor: 'ONDC presence',
    reality: 'Live, but adoption and vendor density are meaningfully weaker than metros',
  },
  {
    factor: 'Local commerce',
    reality: 'Still dominated by unorganized retail with zero digital footprint',
  },
  {
    factor: 'Vendor pain point',
    reality: 'Footfall dependency, no way to reach customers beyond physical proximity',
  },
  {
    factor: 'Customer pain point',
    reality: 'No reliable way to check stock, compare, or order ahead without walking store to store',
  },
]

const diffCards = [
  {
    title: 'Vendor-First, Not Delivery-First',
    text: "BreakQ's core moat isn't logistics speed, it's owning the relationship with local vendors: their catalog, their stock visibility, their customer base, and eventually their supply chain and financing needs. Speed is a feature quick commerce can win. Trust and vendor lock-in through genuine utility is not.",
  },
  {
    title: 'Built for Pay-on-Counter Reality',
    text: 'Digital payment habits and trust are still forming in these markets. BreakQ launches with pay-on-counter as the default, meeting customers where they actually are, with in-app payments layered in once trust and usage patterns are established, not the other way around.',
  },
  {
    title: 'One Locality at a Time',
    text: 'Rather than spreading thin across many cities on day one, BreakQ solves the two-sided marketplace cold-start problem deliberately: prove density and liquidity in a single locality before expanding. A shallow presence everywhere helps no one; a genuinely useful presence in one town builds the playbook for the next hundred.',
  },
  {
    title: 'Designed for Low-Data, Vernacular Reality',
    text: "Vernacular language toggle, lite/low-data mode, WhatsApp fallback for vendors who can't manage a digital catalog interface, and real-time stock badges so customers don't waste a trip. These aren't add-ons, they're prerequisites for the market BreakQ serves.",
  },
  {
    title: 'Fair, Growth-Aligned Vendor Economics',
    text: "Instead of punishing small vendors with hard catalog caps, BreakQ's monetization is built around visibility, analytics, and growth tools, so a vendor's success on the platform isn't capped by an arbitrary listing limit. Vendors grow, BreakQ grows with them, not off a toll on every item they try to list.",
  },
]

const roadmapItems = [
  {
    lead: 'Vendor restocking and wholesale access',
    rest: ' (Udaan-style), so the same platform that brings customers to a shop also helps that shop stay stocked',
  },
  {
    lead: 'Micro-credit and financing via NBFC partnerships',
    rest: ', addressing a real capital gap for small retailers',
  },
  {
    lead: 'Aggregated demand data for FMCG brands',
    rest: ', monetizing the supply-side insight that only a platform embedded in these markets can generate',
  },
  {
    lead: 'Bill payments and utility recharge bundling',
    rest: ', deepening daily-use relevance beyond shopping',
  },
  {
    lead: 'A local champion model',
    rest: ', using town-level agents to drive vendor onboarding and trust, the same way informal commerce actually spreads in these markets',
  },
]

const audienceCards = [
  {
    icon: '🛍️',
    title: 'Customers',
    text: 'A faster, more reliable way to find and order from the stores they already trust, without walking store to store to check what’s in stock.',
  },
  {
    icon: '🏪',
    title: 'Vendors',
    text: 'A digital storefront and growth engine that meets them at their current level of digital readiness, not one that demands they become tech operators overnight.',
  },
  {
    icon: '🌍',
    title: 'The Ecosystem',
    text: "Proof that hyperlocal commerce infrastructure for tier 3/4 India doesn't need to wait for quick commerce to arrive. It can be built for this market, on this market's terms, starting now.",
  },
]

function Reveal({ as: Tag = 'div', className = '', children }) {
  const [ref, inView] = useReveal()
  return (
    <Tag ref={ref} className={`${className} why-reveal ${inView ? 'is-visible' : ''}`}>
      {children}
    </Tag>
  )
}

export default function WhyBreakQ() {
  return (
    <>
      <PageHeader
        eyebrow="Why BreakQ"
        title="Built for the India quick commerce left behind"
        subtitle="BreakQ exists to close that gap, not by copying quick commerce, but by building for the market it was never designed for."
      />

      <section className="section why-problem">
        <div className="container why-narrow">
          <Reveal as="div">
            <span className="eyebrow">The problem</span>
            <h2 className="section-title">Quick Commerce Can't Solve This</h2>
            <p>
              Blinkit, Zepto, and Instamart have proven that instant hyperlocal delivery works, but only in a
              narrow slice of India. Their model depends on dense population, high average order values, and
              dark-store economics that require thousands of daily orders per square kilometer to break even.
              That math falls apart outside the top 20–30 metro pockets.
            </p>
            <p>
              Meanwhile, 65%+ of India lives in tier 3, tier 4 towns and villages, and this is exactly where
              quick commerce infrastructure cannot follow. Not because demand doesn't exist, but because the
              unit economics never will at that scale. ONDC has expanded reach on paper, but real vendor
              onboarding, catalog quality, and fulfillment reliability remain metro-centric in practice.
            </p>
            <p>
              That leaves millions of neighborhood kirana stores, dairies, medical shops, and electrical
              vendors exactly where they've always been: invisible to digital discovery, dependent on walk-in
              footfall, and structurally excluded from the shift to app-based commerce.
            </p>
          </Reveal>

          <Reveal as="blockquote" className="why-callout">
            BreakQ exists to close that gap, not by copying quick commerce, but by building for the market it
            was never designed for.
          </Reveal>
        </div>
      </section>

      <section className="section why-what-is">
        <div className="container why-narrow">
          <Reveal as="div">
            <span className="eyebrow">What BreakQ actually is</span>
            <h2 className="section-title">A hyperlocal platform, not a delivery app</h2>
            <p>
              BreakQ is a multi-vendor hyperlocal discovery and ordering platform built specifically for tier
              3/4 towns and developing villages. It connects local shoppers with the stores already in their
              neighborhood, kirana, dairy, medical, electrical, and more, giving those vendors a digital
              storefront without asking them to change how they operate.
            </p>
            <p>
              No dark stores. No delivery fleet to subsidize. No 10-minute delivery promise that only works
              with venture-scale cash burn. Just the shop down the street, made discoverable, searchable, and
              orderable from a phone.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section why-market">
        <div className="container">
          <Reveal as="div" className="why-narrow">
            <span className="eyebrow">Why this market, why now</span>
            <h2 className="section-title">A genuine, underserved gap</h2>
          </Reveal>

          <Reveal as="div" className="why-table-wrap">
            <table className="why-table">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Reality in Tier 3/4 India</th>
                </tr>
              </thead>
              <tbody>
                {marketFactors.map((row) => (
                  <tr key={row.factor}>
                    <td>{row.factor}</td>
                    <td>{row.reality}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Reveal>

          <Reveal as="p" className="why-narrow why-market-note">
            This is a genuine, underserved gap, not a hypothetical one. The platforms built for metros
            structurally cannot expand downward. BreakQ is built to expand outward from exactly this starting
            point.
          </Reveal>
        </div>
      </section>

      <section className="section why-diff">
        <div className="container">
          <span className="eyebrow">What makes BreakQ different</span>
          <h2 className="section-title">Five bets quick commerce won't make</h2>

          <div className="why-diff-grid">
            {diffCards.map((c, i) => (
              <Reveal as="div" className="why-diff-card" key={c.title}>
                <span className="why-diff-num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section why-roadmap">
        <div className="container why-narrow">
          <Reveal as="div">
            <span className="eyebrow">The bigger picture</span>
            <h2 className="section-title">More than an ordering app</h2>
            <p>
              BreakQ's roadmap is built around becoming genuine infrastructure for local commerce, not just a
              discovery layer:
            </p>
          </Reveal>

          <Reveal as="ul" className="why-roadmap-list">
            {roadmapItems.map((item) => (
              <li key={item.lead}>
                <strong>{item.lead}</strong>
                {item.rest}
              </li>
            ))}
          </Reveal>

          <Reveal as="p" className="why-roadmap-note">
            Each of these deepens the moat: not delivery speed, but embedded trust, financial relationships,
            and supply chain integration that a quick-commerce app has no reason or incentive to build.
          </Reveal>
        </div>
      </section>

      <section className="section why-security">
        <div className="container">
          <Reveal as="div" className="why-security-inner">
            <div className="why-security-icon">🔒</div>
            <span className="eyebrow">Security &amp; trust, built in from day one</span>
            <h2 className="section-title">Trust is fragile. We treat it that way.</h2>
            <p>
              Local commerce runs on trust, and trust is fragile. BreakQ treats cybersecurity and data
              integrity as non-negotiable from the prototype stage, not an afterthought bolted on after
              traction. Vendor data, customer data, and order integrity are protected by design, because a
              single infrastructure failure can undo years of community trust overnight.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section why-audience">
        <div className="container">
          <span className="eyebrow">Who BreakQ is for</span>
          <h2 className="section-title">Built around three kinds of trust</h2>

          <div className="why-audience-grid">
            {audienceCards.map((c) => (
              <Reveal as="div" className="why-audience-card" key={c.title}>
                <div className="why-audience-icon">{c.icon}</div>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section why-cta">
        <div className="container">
          <Reveal as="blockquote" className="why-closing-quote">
            BreakQ is built by a lean, founder-led team under KKS PVT, focused on solving hyperlocal commerce
            for the India that quick commerce left behind.
          </Reveal>

          <div className="why-cta-inner">
            <h2>Support your local community, however it shows up on your street</h2>
            <p>Experience the future of neighborhood retail. Download BreakQ today and bring your local market home!</p>
            <div className="why-cta-actions">
              <a
                href="https://play.google.com/store/apps/details?id=com.kks.bharatkirana"
                className="btn btn-primary"
                target="_blank"
                rel="noopener noreferrer"
              >
                Download BreakQ
              </a>
              <Link to="/become-a-partner" className="btn btn-black">
                Become a partner
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
