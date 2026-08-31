import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./StepJourney.css";

/* Lucide-react isn't a dependency here, so the icons below are inlined in the
   same 24px / stroke-2 / round-cap style Lucide uses. */

function IconSearch(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function IconCheck(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function IconSparkle(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  );
}

function IconShield(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

const steps = [
  {
    id: 1,
    title: "Find your store",
    description:
      "Search in any language and see the neighbourhood shops that have your items in stock right now.",
  },
  {
    id: 2,
    title: "Build your basket",
    description:
      "Add items across categories, compare live prices, and pick a pickup or delivery slot that suits you.",
  },
  {
    id: 3,
    title: "Collect and go",
    description:
      "Pay on pickup, skip the queue, and get a ping the moment your order is packed and ready.",
  },
];

const floatStat = {
  1: { value: "12 stores", label: "within 1 km" },
  2: { value: "₹48 saved", label: "vs MRP today" },
  3: { value: "4 min", label: "avg pickup wait" },
};

/* ---------- mock app screens ---------- */

function ScreenFind() {
  const rows = [
    { code: "SB", name: "Sri Balaji Kirana", dist: "320 m", tag: "In stock" },
    { code: "AS", name: "Anand Super Bazar", dist: "550 m", tag: "In stock" },
    { code: "GL", name: "Green Leaf Mart", dist: "1.1 km", tag: "2 of 3 items" },
  ];
  return (
    <div className="sj-ui-body">
      <div className="sj-ui-search">
        <IconSearch className="sj-ui-search-ico" />
        <span>2 kg atta &amp; toor dal</span>
      </div>
      <p className="sj-ui-label">Stores near you</p>
      {rows.map((r) => (
        <div className="sj-ui-row" key={r.code}>
          <span className="sj-ui-avatar">{r.code}</span>
          <span className="sj-ui-row-main">
            <strong>{r.name}</strong>
            <span>{r.dist} away</span>
          </span>
          <span className="sj-ui-pill">{r.tag}</span>
        </div>
      ))}
    </div>
  );
}

function ScreenBasket() {
  const items = [
    { code: "AA", name: "Aashirvaad Atta 5 kg", price: "₹270" },
    { code: "TD", name: "Toor Dal 1 kg", price: "₹142" },
    { code: "RB", name: "Refined Oil 1 L", price: "₹100" },
  ];
  return (
    <div className="sj-ui-body">
      <p className="sj-ui-label">Your basket · Sri Balaji Kirana</p>
      {items.map((it) => (
        <div className="sj-ui-row" key={it.code}>
          <span className="sj-ui-avatar sj-ui-avatar-sq">{it.code}</span>
          <span className="sj-ui-row-main">
            <strong>{it.name}</strong>
            <span>{it.price}</span>
          </span>
          <span className="sj-ui-stepper" aria-hidden="true">
            <i>–</i>
            <b>1</b>
            <i>+</i>
          </span>
        </div>
      ))}
      <div className="sj-ui-chips">
        <span className="sj-ui-chip is-on">Pickup · 5:30 PM</span>
        <span className="sj-ui-chip">Delivery · 6:15 PM</span>
      </div>
      <div className="sj-ui-total">
        <span>Subtotal</span>
        <strong>₹512</strong>
      </div>
    </div>
  );
}

function ScreenReady() {
  return (
    <div className="sj-ui-body sj-ui-center">
      <span className="sj-ui-success-badge">
        <IconCheck />
      </span>
      <strong className="sj-ui-success-title">Order ready for pickup</strong>
      <p className="sj-ui-success-sub">Sri Balaji Kirana · Counter 2</p>
      <div className="sj-ui-code">
        <span>Pickup code</span>
        <b>4207</b>
      </div>
      <div className="sj-ui-success-row">
        <span>Items packed</span>
        <span>6</span>
      </div>
      <div className="sj-ui-success-row">
        <span>Pay on pickup</span>
        <span>₹512</span>
      </div>
    </div>
  );
}

const SCREENS = { 1: ScreenFind, 2: ScreenBasket, 3: ScreenReady };

function PreviewCard({ step }) {
  const Screen = SCREENS[step.id];
  const stat = floatStat[step.id];
  return (
    <>
      <span className="sj-deco sj-deco-blob-a" aria-hidden="true" />
      <span className="sj-deco sj-deco-blob-b" aria-hidden="true" />
      <span className="sj-deco sj-deco-ring" aria-hidden="true" />

      <div className="sj-preview-card">
        <div className="sj-ui-topbar" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="sj-ui-wrap">
          <Screen />
        </div>
      </div>

      <div className="sj-float sj-float-a" aria-hidden="true">
        <span className="sj-float-ico">
          <IconSparkle />
        </span>
        <span className="sj-float-text">
          <strong>{stat.value}</strong>
          <span>{stat.label}</span>
        </span>
      </div>

      <div className="sj-float sj-float-b" aria-hidden="true">
        <span className="sj-float-ico">
          <IconShield />
        </span>
        <span className="sj-float-text">
          <strong>Verified local store</strong>
          <span>KYC &amp; FSSAI checked</span>
        </span>
      </div>
    </>
  );
}

/* ---------- section ---------- */

export default function StepJourney() {
  const tallRef = useRef(null);
  const stepsRef = useRef(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  activeRef.current = active;

  // scroll position → active step (pure position: sticky, no wheel/touch hijack)
  useEffect(() => {
    const tall = tallRef.current;
    if (!tall) return undefined;
    let raf = 0;
    const read = () => {
      raf = 0;
      const rect = tall.getBoundingClientRect();
      const dist = rect.height - window.innerHeight;
      if (dist <= 0) {
        if (activeRef.current !== 0) setActive(0);
        return;
      }
      const progress = Math.min(1, Math.max(0, -rect.top / dist));
      const idx = Math.min(
        steps.length - 1,
        Math.floor(progress * steps.length),
      );
      if (idx !== activeRef.current) setActive(idx);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // draw the connector line exactly between the first and last dot centres
  useEffect(() => {
    const ol = stepsRef.current;
    if (!ol) return undefined;
    const measure = () => {
      const dots = ol.querySelectorAll(".sj-dot");
      if (dots.length < 2) return;
      const box = ol.getBoundingClientRect();
      const a = dots[0].getBoundingClientRect();
      const b = dots[dots.length - 1].getBoundingClientRect();
      const top = a.top + a.height / 2 - box.top;
      ol.style.setProperty("--sj-line-left", `${a.left + a.width / 2 - box.left}px`);
      ol.style.setProperty("--sj-line-top", `${top}px`);
      ol.style.setProperty(
        "--sj-line-height",
        `${b.top + b.height / 2 - box.top - top}px`,
      );
    };
    measure();
    const t = setTimeout(measure, 200);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const goToStep = (i) => {
    const tall = tallRef.current;
    const dist = tall ? tall.offsetHeight - window.innerHeight : 0;
    if (!tall || dist <= 0) {
      setActive(i); // mobile / not pinned — nothing to scroll to
      return;
    }
    const docTop = window.scrollY + tall.getBoundingClientRect().top;
    const progress = (i + 0.5) / steps.length;
    const reduced =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: docTop + progress * dist,
      behavior: reduced ? "auto" : "smooth",
    });
  };

  return (
    <section className="sj-section" aria-labelledby="sj-heading">
      <div className="sj-head container">
        <span className="sj-eyebrow">How it works</span>
        <h2 className="sj-title" id="sj-heading">
          From &ldquo;we&rsquo;re out of atta&rdquo; to packed and ready.
        </h2>
        <p className="sj-lead">
          Three steps between opening the app and walking out with your order
          &mdash; no queue, no guesswork, no calls to the shop.
        </p>
      </div>

      <div
        className="sj-tall"
        ref={tallRef}
        style={{ "--sj-steps": steps.length }}
      >
        <div className="sj-sticky">
          <div className="sj-grid container">
            {/* LEFT — step list */}
            <ol className="sj-steps" ref={stepsRef}>
              <span className="sj-line" aria-hidden="true" />
              {steps.map((s, i) => (
                <li
                  key={s.id}
                  className={`sj-step${i === active ? " is-active" : ""}`}
                >
                  <button
                    type="button"
                    className="sj-step-btn"
                    aria-current={i === active ? "step" : undefined}
                    onClick={() => goToStep(i)}
                  >
                    <span className="sj-dot" aria-hidden="true" />
                    <span className="sj-step-body">
                      <span className="sj-step-title">{s.title}</span>
                      <span className="sj-step-desc">{s.description}</span>
                    </span>
                  </button>
                  {i === steps.length - 1 && (
                    <Link to="/why-breakq" className="sj-cta">
                      Explore BreakQ <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </li>
              ))}
            </ol>

            {/* RIGHT — visual panel */}
            <div className="sj-panel">
              {steps.map((s, i) => (
                <div
                  key={s.id}
                  className={`sj-card${i === active ? " is-active" : ""}`}
                  aria-hidden={i !== active}
                >
                  <PreviewCard step={s} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
