import "./StatsSection.css";

const stats = [
  { value: "43%", label: "of retail will be digital by 2030" },
  { value: "$1.3T", label: "projected market value by 2028" },
  { value: "27%", label: "CAGR in rural e-commerce" },
];

const drivers = [
  { title: "Urbanization", desc: "560M+ Urban population by 2030" },
  { title: "Government Initiatives", desc: "ONDC empowering small retailers" },
  {
    title: "Rising Incomes",
    desc: "Rising incomes fuelling demand for convenience",
  },
  {
    title: "Digital Adaptation",
    desc: "750M+ smartphone users driving digital shopping",
  },
];

const investors = [
  "TURBOSTART",
  "UV — Unpopular Ventures",
  "snow leopard technology ventures",
];

export default function StatsSection() {
  return (
    <section className="section stats-section">
      <div className="container">
        <span className="eyebrow eyebrow-dark">Powered by Ambition</span>
        <h2 className="section-title title-light">India's Retail Revolution</h2>
        <p className="section-subtitle subtitle-light">
          India has always been in the fore-front when it comes to retail. How
          do the numbers look?
        </p>

        <div className="stats-grid">
          {stats.map((s) => (
            <div className="stat-box" key={s.label}>
              <strong>{s.value}</strong>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        <div className="market-share-box">
          <div className="pie-chart" />
          <div>
            <h3>92% Market Share</h3>
            <p>
              Traditional retail dominates but faces growing Q-commerce
              competition
            </p>
          </div>
        </div>

        <div className="drivers-box">
          <div className="drivers-label">Growth drivers</div>
          <div className="drivers-grid">
            {drivers.map((d) => (
              <div className="driver-cell" key={d.title}>
                <strong>{d.title}</strong>
                <span>{d.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="investors-label">Backed by leading investors</p>
        <div className="investors-row">
          {investors.map((inv) => (
            <span key={inv}>{inv}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
