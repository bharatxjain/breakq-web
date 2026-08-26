import PhoneFrame from "./PhoneFrame";
import "./Hero.css";

const suggestions = [
  { emoji: "🍅", text: "Fresh vegetables from your Kirana" },
  { emoji: "🥛", text: "Toned Milk & dairy essentials" },
  { emoji: "💊", text: "Paracetamol from the medical store" },
];

const tickerItems = [
  "multi-vendor marketplace",
  "verified local stores",
  "shop-first experience",
];

export default function Hero() {
  return (
    <section className="hero-wrap">
      <div className="container">
        <div className="hero">
          <div className="hero-bg-shape" aria-hidden="true" />

          <div className="hero-content">
            <div className="hero-pill">
              <span>🏪 Are you a Shop Owner?</span>
              <button className="btn btn-black hero-pill-btn">Sign up</button>
            </div>

            <h1>
              Your Neighborhood's
              <br />
              Digital Marketplace
            </h1>

            <p className="hero-subtitle">
              Kirana, Dairy, Medical, Electrical & more — shop from the local
              vendors you already trust.
            </p>

            <div className="store-badges">
              <a href="#" className="store-badge">
                <img src="/badges/google-play.png" alt="Get it on Google Play" />
              </a>
            </div>

            <div className="hero-rating">
              <div className="rating-avatars">
                <span
                  className="rating-avatar"
                  style={{ background: "#facc15" }}
                />
                <span
                  className="rating-avatar"
                  style={{ background: "#fb7185" }}
                />
                <span
                  className="rating-avatar"
                  style={{ background: "#38bdf8" }}
                />
                <span
                  className="rating-avatar"
                  style={{ background: "#cbd5e1" }}
                />
              </div>
              <p>
                <strong>4.8/5</strong> from 1k+ reviews
              </p>
            </div>
          </div>

          <div className="hero-phone">
            <PhoneFrame>
              <div className="app-screen">
                <div className="app-topbar">
                  <span className="app-menu">☰</span>
                  <div className="app-topbar-text">
                    <strong>Shop from stores you trust</strong>
                    <small>Bilekahalli - Oasis Regency Apart... ⌄</small>
                  </div>
                  <span className="app-bell">🔔</span>
                </div>
                <div className="app-greeting">
                  <small>Hi, Deepak</small>
                  <p>Here's what's nearby</p>
                </div>
                <div className="app-card">
                  <div>
                    <p>
                      Shop Kirana, Dairy, Medical & more from your trusted{" "}
                      <strong>local vendors</strong>
                    </p>
                  </div>
                  <div className="app-basket">🧺</div>
                </div>
                <div className="app-try-label">Try searching for,</div>
                <div className="app-chips">
                  {suggestions.map((s) => (
                    <div className="app-chip" key={s.text}>
                      <span className="chip-emoji">{s.emoji}</span>
                      <span>{s.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </PhoneFrame>
          </div>

          <div className="hero-ticker">
            <div className="ticker-track">
              {[...tickerItems, ...tickerItems, ...tickerItems].map((t, i) => (
                <span key={i}>
                  {t} <span className="dot">◆</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
