import { Link } from "react-router-dom";
import useReveal from "../hooks/useReveal";
import "./SustainablePartners.css";

const shops = [
  {
    name: "Joshi Kirana Store",
    initial: "JO",
    c1: "#f59e0b",
    c2: "#b45309",
    orders: "1,240",
    rating: "4.6",
  },
  {
    name: "Mehta General Store",
    initial: "ME",
    c1: "#f59e0b",
    c2: "#b45309",
    orders: "1,120",
    rating: "4.7",
  },
  {
    name: "Swami Medical Store",
    initial: "SW",
    c1: "#dc2626",
    c2: "#991b1b",
    orders: "870",
    rating: "4.8",
  },
  {
    name: "Kapoor Pharmacy",
    initial: "KA",
    c1: "#dc2626",
    c2: "#991b1b",
    orders: "450",
    rating: "4.5",
  },
  {
    name: "Priya Beauty Parlour",
    initial: "PR",
    c1: "#ec4899",
    c2: "#be185d",
    orders: "540",
    rating: "4.5",
  },
  {
    name: "Glow Beauty Salon",
    initial: "GL",
    c1: "#ec4899",
    c2: "#be185d",
    orders: "980",
    rating: "4.2",
  },
  {
    name: "Verma Electricals",
    initial: "VE",
    c1: "#eab308",
    c2: "#a16207",
    orders: "320",
    rating: "4.3",
  },
  {
    name: "Singh Electric Works",
    initial: "SI",
    c1: "#eab308",
    c2: "#a16207",
    orders: "890",
    rating: "4.1",
  },
  {
    name: "Dayal Mobile",
    initial: "DA",
    c1: "#2563eb",
    c2: "#1e3a8a",
    orders: "980",
    rating: "4.4",
  },
  {
    name: "Sharma Mobile Point",
    initial: "SH",
    c1: "#2563eb",
    c2: "#1e3a8a",
    orders: "760",
    rating: "4.6",
  },
];

const rowOne = shops.slice(0, 5);
const rowTwo = shops.slice(5);

function ShopCard({ shop, duplicate = false }) {
  return (
    <li
      className="sp-card"
      data-dup={duplicate ? "" : undefined}
      aria-hidden={duplicate ? "true" : undefined}
    >
      <span
        className="sp-card__logo"
        style={{ "--c1": shop.c1, "--c2": shop.c2 }}
        aria-hidden="true"
      >
        {shop.initial}
      </span>
      <span className="sp-card__body">
        <span className="sp-card__name">{shop.name}</span>
        <span className="sp-card__stats">
          <span className="sp-card__stat">{shop.orders} orders</span>
          <span className="sp-card__sep" aria-hidden="true" />
          <span className="sp-card__stat">
            <span aria-hidden="true">&#9733;</span> {shop.rating}
          </span>
        </span>
      </span>
    </li>
  );
}

function MarqueeRow({ items, reverse = false, duration, label }) {
  return (
    <div className={`sp-marquee${reverse ? " sp-marquee--reverse" : ""}`}>
      <ul
        className="sp-track"
        style={{ "--sp-duration": duration }}
        aria-label={label}
      >
        {items.map((shop) => (
          <ShopCard key={shop.name} shop={shop} />
        ))}
        {items.map((shop) => (
          <ShopCard key={`${shop.name}-dup`} shop={shop} duplicate />
        ))}
      </ul>
    </div>
  );
}

export default function SustainablePartners() {
  const [ref, inView] = useReveal();

  return (
    <section
      className={`section sp-section${inView ? " is-visible" : ""}`}
      aria-labelledby="sp-heading"
      ref={ref}
    >
      <div className="container sp-grid">
        <div className="sp-intro">
          <h2 className="sp-title" id="sp-heading">
            The local shops that power BreakQ.
          </h2>
          <p className="sp-subtitle">
            Kirana staples, medicines, beauty store and mobile repairs -
            thousands of neighbourhood businesses take orders on BreakQ every
            day.
          </p>

          <div className="sp-cta">
            <div className="sp-metrics">
              <div className="sp-metric">
                <strong>400+</strong>
                <span>Partner stores</span>
              </div>
              <div className="sp-metric">
                <strong>10,000+</strong>
                <span>Orders fulfilled</span>
              </div>
            </div>

            <Link to="/become-a-partner" className="btn btn-primary sp-cta-btn">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m11 17 2 2a1 1 0 1 0 3-3" />
                <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
                <path d="m21 3 1 11h-2" />
                <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
                <path d="M3 4h8" />
              </svg>
              Become a partner
            </Link>
          </div>
        </div>

        <div className="sp-rows" role="group" aria-label="Partner stores">
          <MarqueeRow
            items={rowOne}
            duration="46s"
            label="Partner stores, row one"
          />
          <MarqueeRow
            items={rowTwo}
            reverse
            duration="56s"
            label="Partner stores, row two"
          />
        </div>
      </div>
    </section>
  );
}
