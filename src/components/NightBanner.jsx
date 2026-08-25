import './NightBanner.css'

export default function NightBanner() {
  return (
    <section className="night-banner">
      <div className="night-bg" aria-hidden="true">
        <span className="night-caption">Indian street market at dusk — replace with brand photography</span>
      </div>

      <div className="night-phones">
        <div className="night-phone phone-back">
          <div className="nb-status">Searching...</div>
          <div className="nb-orb" />
        </div>

        <div className="night-phone phone-front">
          <div className="nb-topbar">
            <strong>Delivery in 15 Mins</strong>
          </div>
          <div className="nb-greeting">
            <small>Hi, Deepak</small>
            <p>Here's what's nearby</p>
          </div>
          <div className="nb-card">
            <span>
              From Kirana to Medical, right from the <strong>stores you trust!</strong>
            </span>
            <span className="nb-basket">🧺</span>
          </div>
          <div className="nb-try">Popular picks near you,</div>
          <div className="nb-chips">
            <div className="nb-chip">
              <span>🍅</span> Tomato & Onions, 1kg each
            </div>
            <div className="nb-chip">
              <span>💊</span> Paracetamol, from City Medical
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
