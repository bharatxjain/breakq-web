import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import PhotoPlaceholder from '../components/PhotoPlaceholder'
import './About.css'

const customerFeatures = [
  {
    icon: '🏬',
    title: 'Multi-Vendor, Multi-Category Discovery',
    desc: 'Explore a wide network of verified local stores — Kirana, Dairy, Medical, Electrical, and more — all in your area.',
  },
  {
    icon: '🛍️',
    title: 'Shop-First Experience',
    desc: 'Select your favorite specific vendor to browse their unique digital storefront and catalog.',
  },
  {
    icon: '🔍',
    title: 'Smart Search & Categories',
    desc: 'Find exactly what you need — from Atta and Dal to medicines, dairy products, and electrical fittings — using our lightning-fast search.',
  },
  {
    icon: '🔐',
    title: 'Secure Authentication',
    desc: 'Enjoy a safe shopping experience with our verified email OTP login system.',
  },
  {
    icon: '📍',
    title: 'Direct Store Access',
    desc: 'Need to visit in person? Get precise map directions and instant call support for every partner store.',
  },
  {
    icon: '✨',
    title: 'Clean & Premium UI',
    desc: 'A modern, clutter-free interface designed for speed and ease of use across every store category.',
  },
]

const vendorFeatures = [
  {
    icon: '🗂️',
    title: 'Vendor Dashboard',
    desc: 'A dedicated hub to manage your products, update prices, and track inventory, tailored to your store type.',
  },
  {
    icon: '📦',
    title: 'Live Order Management',
    desc: 'Receive and process orders in real-time with status updates for your customers.',
  },
  {
    icon: '📊',
    title: 'Business Insights',
    desc: 'View your daily GMV and order analytics to grow your business effectively.',
  },
]

export default function About() {
  return (
    <>
      <PageHeader
        eyebrow="Welcome to BreakQ"
        title="Your Neighborhood's Digital Marketplace!"
        subtitle="A professional multi-vendor quick-commerce platform designed to bridge the gap between local stores and neighborhood shoppers."
      />

      <section className="section about-story">
        <div className="container about-story-inner">
          <div className="about-story-text">
            <span className="eyebrow">Who we are</span>
            <h2 className="section-title" style={{ textAlign: 'left' }}>
              Empowering every local shop owner
            </h2>
            <p>
              We empower local shop owners — from Kirana stores to dairies, medical shops, and electrical
              stores — with the technology to go digital, while giving you the convenience of shopping from
              the vendors you already know and trust.
            </p>
            <p>
              Unlike generic grocery-only apps, BreakQ puts your entire local community first. We believe in
              the "Shop Local" movement, giving you direct access to the freshest stock and real-time
              inventory across every kind of neighborhood store — not just groceries.
            </p>
          </div>
          <PhotoPlaceholder label="Local shop owner going digital with BreakQ" tone="green" />
        </div>
      </section>

      <section className="section about-values">
        <div className="container">
          <span className="eyebrow">Key features for customers</span>
          <h2 className="section-title">Everything you need, from stores you trust</h2>

          <div className="values-grid">
            {customerFeatures.map((v) => (
              <div className="value-card" key={v.title}>
                <div className="value-icon">{v.icon}</div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section about-vendors">
        <div className="container">
          <span className="eyebrow eyebrow-dark">For store owners</span>
          <h2 className="section-title title-light">Empowering local vendors</h2>
          <p className="section-subtitle subtitle-light">
            Are you a shop owner — Kirana, dairy, medical, or electrical? Join the BreakQ ecosystem and start
            selling online in minutes!
          </p>

          <div className="vendor-grid">
            {vendorFeatures.map((v) => (
              <div className="vendor-card" key={v.title}>
                <div className="value-icon">{v.icon}</div>
                <h3>{v.title}</h3>
                <p>{v.desc}</p>
              </div>
            ))}
          </div>

          <div className="about-vendors-cta">
            <Link to="/contact" className="btn btn-primary">
              Become a partner store
            </Link>
          </div>
        </div>
      </section>

      <section className="section about-security">
        <div className="container about-security-inner">
          <div className="value-icon">🔒</div>
          <span className="eyebrow">Trust &amp; safety</span>
          <h2 className="section-title">Platform security &amp; compliance</h2>
          <p>
            BreakQ is operated by KKS PVT and is built on a foundation of trust. We use industry-standard
            encryption to protect your data and offer transparent account management, including easy in-app
            account deletion to keep you in control of your information.
          </p>
        </div>
      </section>

      <section className="section about-cta">
        <div className="container about-cta-inner">
          <h2>Support your local community, however it shows up on your street</h2>
          <p>Experience the future of neighborhood retail. Download BreakQ today and bring your local market home!</p>
          <div className="about-cta-actions">
            <button className="btn btn-primary">Download BreakQ</button>
            <Link to="/contact" className="btn btn-black">
              Become a partner
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
