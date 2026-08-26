import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import PhotoPlaceholder from "../components/PhotoPlaceholder";
import "./About.css";

const steps = [
  {
    title: "Discover stores nearby",
    text: "Browse verified Kirana, Dairy, Medical, Electrical & more shops around you",
    icon: "📍",
  },
  {
    title: "Pick a vendor",
    text: "Open your favorite store’s digital storefront and explore its catalog",
    icon: "🏬",
  },
  {
    title: "Search & add to cart",
    text: "Find exactly what you need in seconds with lightning-fast search",
    icon: "🔍",
  },
  {
    title: "Pickup from Vendor.",
    text: "Visit in person with Live map tracking & call support",
    icon: "🚴",
  },
];

const vendorFeatures = [
  {
    icon: "🗂️",
    title: "Vendor Dashboard",
    desc: "A dedicated hub to manage your products, update prices, and track inventory, tailored to your store type.",
  },
  {
    icon: "📦",
    title: "Live Order Management",
    desc: "Receive and process orders in real-time with status updates for your customers.",
  },
  {
    icon: "📊",
    title: "Business Insights",
    desc: "View your daily GMV and order analytics to grow your business effectively.",
  },
];

function AppIconsVisual() {
  const icons = [
    { label: "Kirana", color: "#7001FE", glyph: "🛒" },
    { label: "Dairy", color: "#38bdf8", glyph: "🥛" },
    { label: "Medical", color: "#f87171", glyph: "💊" },
    { label: "Electrical", color: "#facc15", glyph: "💡" },
    { label: "Bakery", color: "#fb923c", glyph: "🍞" },
    { label: "Stationery", color: "#34d399", glyph: "📚" },
    { label: "Fashion", color: "#f472b6", glyph: "👕" },
    { label: "Mobiles", color: "#a78bfa", glyph: "📱" },
  ];
  return (
    <div className="visual-phone-mini">
      <div className="mini-status">9:41</div>
      <div className="mini-icons">
        {icons.map((ic) => (
          <div
            key={ic.label}
            className="mini-icon"
            style={{ background: ic.color }}
          >
            <span>{ic.glyph}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VendorPickerVisual() {
  return (
    <div className="visual-card-mini">
      <p className="visual-mini-title">Nearby Stores</p>
      <div className="delivery-option active">
        <span>🏪 Sharma Kirana Store</span>
        <small>⭐ 4.8 · 0.4 km away</small>
      </div>
      <div className="delivery-option">
        <span>💊 City Medical Store</span>
        <small>⭐ 4.6 · 0.7 km away</small>
      </div>
    </div>
  );
}

function SearchOrbVisual() {
  return (
    <div className="visual-orb-mini">
      <p>
        Searching nearby stores
        <br />
        for "toned milk"...
      </p>
      <div className="mini-orb" />
      <span className="mini-float f1">🥛</span>
      <span className="mini-float f2">🔍</span>
      <span className="mini-float f3">🏬</span>
    </div>
  );
}

const cards = [
  {
    title: "Multi-Vendor, Multi-Category Discovery",
    desc: "Explore a wide network of verified local stores - Kirana, Dairy, Medical, Electrical, and more all in your area.",
    visual: <AppIconsVisual />,
  },
  {
    title: "Shop-First Experience",
    desc: "Select your favorite specific vendor to browse their unique digital storefront and catalog.",
    visual: <VendorPickerVisual />,
  },
  {
    title: "Smart Search & Categories",
    desc: "Find exactly what you need - from Atta and Dal to medicines, dairy products, and electrical fittings using our lightning-fast search.",
    visual: <SearchOrbVisual />,
    tall: true,
  },
  {
    title: "Secure Authentication",
    desc: "Enjoy a safe shopping experience with our verified email OTP login system.",
    visual: (
      <div className="visual-coin-mini">
        <div className="coin">🔐</div>
      </div>
    ),
  },
  {
    title: "Direct Store Access",
    desc: "Need to visit in person? Get precise map directions and instant call support for every partner store.",
    visual: (
      <div className="visual-docs-mini">
        <div className="store-access-icons">
          <span>📍</span>
          <span>📞</span>
        </div>
      </div>
    ),
  },
  {
    title: "Clean & Premium UI",
    desc: "A modern, clutter-free interface designed for speed and ease of use across every store category.",
    visual: (
      <div className="visual-phone-mini bag-visual">
        <div className="mini-status">9:41</div>
        <div className="bag-icon">🛍️</div>
      </div>
    ),
  },
];

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
            <h2 className="section-title" style={{ textAlign: "left" }}>
              Empowering every local shop owner
            </h2>
            <p>
              We empower local shop owners from Kirana stores to dairies,
              medical shops, and electrical stores with the technology to go
              digital, while giving you the convenience of shopping from the
              vendors you already know and trust.
            </p>
            <p>
              Unlike generic grocery-only apps, BreakQ puts your entire local
              community first. We believe in the "Shop Local" movement, giving
              you direct access to the freshest stock and real-time inventory
              across every kind of neighborhood store not just groceries.
            </p>
          </div>
          <PhotoPlaceholder
            label="Local shop owner going digital with BreakQ"
            tone="green"
          />
        </div>
      </section>

      <section className="section features">
        <div className="container">
          <span className="eyebrow">Why choose BreakQ</span>
          <h2 className="section-title">
            Everything your neighborhood needs, in one app
          </h2>
          <p className="section-subtitle">
            Unlike generic grocery-only apps, BreakQ puts your entire local
            community first - Kirana, Dairy, Medical, Electrical, and more, not
            just groceries.
          </p>

          <div className="features-grid">
            {cards.map((c) => (
              <div className="feature-card" key={c.title}>
                <h3>{c.title}</h3>
                <p>{c.desc}</p>
                <div className="feature-visual">{c.visual}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section how-it-works">
        <div className="container">
          <span className="eyebrow">Simple & fast</span>
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle">
            From discovery to Pickup, in four easy steps
          </p>

          <div className="steps-grid">
            {steps.map((s, i) => (
              <div className="step-card" key={s.title}>
                <div className="step-number">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="step-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                {i < steps.length - 1 && (
                  <div className="step-connector" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section about-security">
        <div className="container about-security-inner">
          <div className="value-icon">🔒</div>
          <span className="eyebrow">Trust &amp; safety</span>
          <h2 className="section-title">Platform security &amp; compliance</h2>
          <p>
            BreakQ is operated by KKS PVT and is built on a foundation of trust.
            We use industry-standard encryption to protect your data and offer
            transparent account management, including easy in-app account
            deletion to keep you in control of your information.
          </p>
        </div>
      </section>

      <section className="section about-cta">
        <div className="container">
          <div className="about-cta-inner">
            <h2>
              Support your local community, however it shows up on your street
            </h2>
            <p>
              Experience the future of neighborhood retail. Download BreakQ
              today and bring your local market home!
            </p>
            <div className="about-cta-actions">
              <button className="btn btn-primary">Download BreakQ</button>
              <Link to="/contact" className="btn btn-black">
                Become a partner
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
