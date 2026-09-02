import { Link } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import JourneyTimeline from "../components/JourneyTimeline";
import useReveal from "../hooks/useReveal";
import "./About.css";

function Reveal({ as: Tag = "div", className = "", delay = 0, children }) {
  const [ref, inView] = useReveal();
  return (
    <Tag
      ref={ref}
      className={`about-reveal ${className} ${inView ? "is-visible" : ""}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

const glance = [
  ["Operated by", "KKS Private Limited"],
  ["Model", "Multi-vendor local commerce"],
  ["Categories", "Kirana, Dairy, Medical, Electrical, Bakery & more"],
  ["Fulfilment", "Store pickup & in-person visit"],
];

const doing = [
  {
    icon: "🛍️",
    title: "For shoppers",
    desc: "Discover the actual shops around you, browse a specific storefront, search across categories in your own language, and collect from the counter — no queue, no guesswork.",
  },
  {
    icon: "🏪",
    title: "For shop owners",
    desc: "A digital storefront plus a dashboard to manage catalogue, prices and live orders, and see daily GMV. The tools of a big platform, kept in the shop owner's hands.",
  },
  {
    icon: "🧭",
    title: "For the neighbourhood",
    desc: "Every order keeps money on your street. BreakQ makes the local market discoverable online without pulling it into a warehouse somewhere else.",
  },
];

const principles = [
  {
    k: "Shop-first",
    v: "You choose a shop, then its catalogue — not an anonymous pile of SKUs. The relationship you already have with a store carries over.",
  },
  {
    k: "Local-first",
    v: "Stock, prices and pickup are real and nearby. No dark stores, no hidden middle layer between you and the shop.",
  },
  {
    k: "Trust-first",
    v: "Verified stores, email-OTP login, industry-standard encryption, and in-app account deletion. You stay in control of your data.",
  },
];

export default function About() {
  return (
    <>
      <PageHeader
        eyebrow="About BreakQ"
        title="The neighbourhood economy, brought online."
        subtitle="BreakQ is a multi-vendor platform that connects the local shops you already know — Kirana, dairy, medical, electrical and more — with the people who live around them."
      />

      {/* WHO WE ARE */}
      <section className="section about-who">
        <div className="container about-who-inner">
          <Reveal className="about-who-text">
            <span className="eyebrow about-eyebrow-left">Who we are</span>
            <h2 className="section-title about-title-left">
              A small team, obsessed with the shop on the corner
            </h2>
            <p>
              We grew up buying from neighbourhood stores — the ones that know your name and keep
              your usual aside. Those shops carry everything a street needs, but online they were
              invisible, flattened into a generic grocery list on someone else&rsquo;s app.
            </p>
            <p>
              BreakQ, operated by KKS Private Limited, exists to fix that. We give every kind of
              local store — not just groceries — a real presence online, and give shoppers a fast,
              honest way to find what&rsquo;s in stock right now, a short walk away.
            </p>
          </Reveal>

          <Reveal as="aside" className="about-glance" delay={120}>
            <span className="about-glance-label">At a glance</span>
            <dl>
              {glance.map(([k, v]) => (
                <div className="about-glance-row" key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>

      {/* WHAT WE DO */}
      <section className="section about-do">
        <div className="container">
          <Reveal>
            <span className="eyebrow">What we do</span>
            <h2 className="section-title">One platform, three sides of the same street</h2>
            <p className="section-subtitle">
              BreakQ only works if it works for everyone on the block — the person shopping, the
              person behind the counter, and the neighbourhood they share.
            </p>
          </Reveal>

          <div className="about-do-grid">
            {doing.map((d, i) => (
              <Reveal as="article" className="about-do-card" key={d.title} delay={i * 90}>
                <span className="about-do-icon" aria-hidden="true">
                  {d.icon}
                </span>
                <h3>{d.title}</h3>
                <p>{d.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* OUR PURPOSE */}
      <section className="section about-purpose">
        <div className="container about-purpose-inner">
          <Reveal>
            <span className="eyebrow">Our purpose</span>
            <h2 className="section-title">Keep the local economy local — just easier to reach.</h2>
            <p className="about-purpose-lead">
              Quick commerce usually means replacing the corner shop. We want the opposite: the same
              shops, the same trust, with the convenience of an app on top. Success for us is a
              busier Kirana store, not an emptier one.
            </p>
          </Reveal>

          <ul className="about-principles">
            {principles.map((p, i) => (
              <Reveal as="li" key={p.k} delay={i * 90}>
                <span className="about-principle-k">{p.k}</span>
                <span className="about-principle-v">{p.v}</span>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* JOURNEY TIMELINE */}
      <Reveal>
        <JourneyTimeline
          eyebrow="Our journey"
          title="How BreakQ got here"
          lead="From a queue outside a Kirana store to a neighbourhood that shops itself online — hover the rail to walk through it."
        />
      </Reveal>

      {/* CTA */}
      <section className="section about-cta">
        <div className="container">
          <Reveal className="about-cta-inner">
            <h2>Support your local community, however it shows up on your street</h2>
            <p>
              Experience the future of neighbourhood retail. Download BreakQ today and bring your
              local market home.
            </p>
            <div className="about-cta-actions">
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
          </Reveal>
        </div>
      </section>
    </>
  );
}
