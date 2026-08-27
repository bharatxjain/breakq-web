import { useEffect, useRef, useState } from "react";
import "./Features.css";

// Swap the `image` values below with your real app screenshots later.
// Recommended screenshot size: 320x640 (9:16), same crop for all six.
const features = [
  {
    icon: "🏬",
    title: "Multi-Vendor, Multi-Category Discovery",
    desc: "Explore a wide network of verified local stores — Kirana, Dairy, Medical, Electrical, and more — all in your area.",
    image: "https://placehold.co/320x640/7001FE/ffffff?text=Discovery",
  },
  {
    icon: "🛍️",
    title: "Shop-First Experience",
    desc: "Select your favorite specific vendor to browse their unique digital storefront and catalog.",
    image: "https://placehold.co/320x640/38bdf8/ffffff?text=Storefront",
  },
  {
    icon: "🔍",
    title: "Smart Search & Categories",
    desc: "Find exactly what you need — from Atta and Dal to medicines, dairy products, and electrical fittings — using our lightning-fast search.",
    image: "https://placehold.co/320x640/f87171/ffffff?text=Search",
  },
  {
    icon: "🔐",
    title: "Secure Authentication",
    desc: "Enjoy a safe shopping experience with our verified email OTP login system.",
    image: "https://placehold.co/320x640/facc15/1a1a1a?text=OTP+Login",
  },
  {
    icon: "📍",
    title: "Direct Store Access",
    desc: "Need to visit in person? Get precise map directions and instant call support for every partner store.",
    image: "https://placehold.co/320x640/34d399/ffffff?text=Directions",
  },
  {
    icon: "✨",
    title: "Clean & Premium UI",
    desc: "A modern, clutter-free interface designed for speed and ease of use across every store category.",
    image: "https://placehold.co/320x640/a78bfa/ffffff?text=BreakQ+UI",
  },
];

const AUTOPLAY_MS = 4500;

export default function Features() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    setProgress(0);

    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min((elapsed / AUTOPLAY_MS) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        setActive((prev) => (prev + 1) % features.length);
      }
    }, 50);

    return () => clearInterval(id);
  }, [active]);

  const handleSelect = (index) => {
    if (index === active) return;
    setActive(index);
  };

  return (
    <section className="section features">
      <div className="container">
        <span className="eyebrow">Why choose BreakQ</span>
        <h2 className="section-title">
          Everything your neighborhood needs, in one app
        </h2>
        <p className="section-subtitle">
          Unlike generic grocery-only apps, BreakQ puts your entire local
          community first — Kirana, Dairy, Medical, Electrical, and more, not
          just groceries.
        </p>

        <div className="hiw-layout">
          <div className="hiw-list">
            {features.map((f, i) => {
              const isActive = i === active;
              return (
                <div
                  key={f.title}
                  className={`hiw-item ${isActive ? "is-active" : ""}`}
                  onClick={() => handleSelect(i)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && handleSelect(i)}
                >
                  <div className="hiw-item-head">
                    <span className="hiw-item-icon">{f.icon}</span>
                    <h3>{f.title}</h3>
                  </div>

                  <div
                    className="hiw-item-body"
                    style={{ maxHeight: isActive ? "160px" : "0px" }}
                  >
                    <p>{f.desc}</p>
                  </div>

                  <div className="hiw-progress-track">
                    <div
                      className="hiw-progress-fill"
                      style={{ width: isActive ? `${progress}%` : "0%" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hiw-phone-wrap">
            <div className="hiw-phone">
              <div className="hiw-phone-notch" />
              <div className="hiw-phone-status">9:41</div>
              <div className="hiw-phone-screen">
                {features.map((f, i) => (
                  <img
                    key={f.title}
                    src={f.image}
                    alt={f.title}
                    className={`hiw-phone-img ${i === active ? "is-visible" : ""}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
