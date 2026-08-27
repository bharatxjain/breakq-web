import { Link } from 'react-router-dom'
import './SupportingKiranas.css'

const stores = [
  { key: 'kirana', label: 'KIRANA', items: '🥛 🍚 🧴', color: '#7001FE', x: 50, y: 6 },
  { key: 'medical', label: 'MEDICAL', items: '💊 🩹 🧴', color: '#f87171', x: 12, y: 32 },
  { key: 'electrical', label: 'ELECTRIC', items: '💡 🔌 🔋', color: '#facc15', x: 88, y: 32 },
  { key: 'dairy', label: 'DAIRY', items: '🥛 🧈 🧀', color: '#38bdf8', x: 18, y: 70 },
  { key: 'bakery', label: 'BAKERY', items: '🍞 🥐 🎂', color: '#fb923c', x: 82, y: 70 },
]

const HUB = { x: 50, y: 46 }
const PHONE = { x: 50, y: 80 }

const stats = [
  { label: '500+ Stores', pos: 'stat-tl' },
  { label: '10K+ Products', pos: 'stat-tr' },
  { label: 'Verified Vendors', pos: 'stat-bl' },
  { label: 'Happy customers', pos: 'stat-br' },
]

export default function SupportingKiranas() {
  return (
    <section className="section supporting-kiranas">
      <div className="container sk-inner">
        <div className="sk-copy">
          <span className="eyebrow">Everything local. One app.</span>
          <h1 className="sk-title">Your Entire Neighborhood Market, Now Online</h1>
          <p className="sk-subtitle">
            Shop from trusted local Kirana, Medical, Dairy, Bakery, and Electrical stores — all through a
            single platform built for your community.
          </p>
          <div className="sk-actions">
            <button className="btn btn-primary">Download BreakQ</button>
            <Link to="/become-a-partner" className="btn btn-black">
              Become a partner
            </Link>
          </div>
        </div>

        <div className="sk-map">
          {stats.map((s) => (
            <div className={`sk-stat ${s.pos}`} key={s.label}>
              {s.label}
            </div>
          ))}

          <svg className="sk-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
            {stores.map((s) => (
              <line
                key={s.key}
                x1={s.x}
                y1={s.y}
                x2={HUB.x}
                y2={HUB.y}
                className="sk-line"
              />
            ))}
            <line x1={HUB.x} y1={HUB.y} x2={PHONE.x} y2={PHONE.y} className="sk-line" />
          </svg>

          {stores.map((s) => (
            <div
              key={s.key}
              className="sk-store"
              style={{ left: `${s.x}%`, top: `${s.y}%`, '--store-color': s.color }}
            >
              <div className="sk-store-head">{s.label}</div>
              <div className="sk-store-items">{s.items}</div>
            </div>
          ))}

          <div className="sk-hub" style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }}>
            <div className="sk-hub-logo">
              BREAK<span className="q-text">Q</span>
            </div>
            <span className="sk-hub-tag">Supporting Local Stores</span>
            <span className="sk-hub-tag">Empowering Communities</span>
            <span className="sk-live">Live Inventory</span>
          </div>

          <div className="sk-phone" style={{ left: `${PHONE.x}%`, top: `${PHONE.y}%` }}>
            <span className="sk-phone-icon">📱</span>
            <span>Order Online</span>
          </div>

          <div className="sk-bike">🛵</div>

          <div className="sk-customers">
            <span>👨</span>
            <span>👩</span>
            <span>👴</span>
          </div>
        </div>
      </div>
    </section>
  )
}
