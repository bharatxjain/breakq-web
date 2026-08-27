import { useEffect, useRef, useState } from "react";
import "./MultiLang.css";

const languages = [
  { name: "English", query: "2kg rice and amul milk" },
  { name: "Hindi", query: "2 किलो चावल और अमूल दूध" },
  { name: "Tamil", query: "2 கிலோ அரிசி மற்றும் அமுல் பால்" },
  { name: "Telugu", query: "2 కిలో బియ్యం మరియు అమూల్ పాలు" },
  { name: "Malayalam", query: "2 കിലോ അരിയും അമുൽ പാലും" },
  { name: "Kannada", query: "2 ಕೆಜಿ ಅಕ್ಕಿ ಮತ್ತು ಅಮೂಲ್ ಹಾಲು" },
];

const chips = ["English", "हिंदी", "தமிழ்", "తెలుగు", "മലയാളം", "ಕನ್ನಡ"];

const products = [
  { icon: "🥛", label: "Milk" },
  { icon: "🌾", label: "Rice" },
];

const storesByLanguage = {
  English: [
    { name: "Lakshmi Kirana", distance: "250m" },
    { name: "Fresh Mart", distance: "400m" },
    { name: "Sai Super Market", distance: "600m" },
  ],

  Hindi: [
    { name: "लक्ष्मी किराना", distance: "250m" },
    { name: "फ्रेश मार्ट", distance: "400m" },
    { name: "साई सुपर मार्केट", distance: "600m" },
  ],

  Tamil: [
    { name: "லட்சுமி கிரானா", distance: "250m" },
    { name: "ஃப்ரெஷ் மார்ட்", distance: "400m" },
    { name: "சாய் சூப்பர் மார்க்கெட்", distance: "600m" },
  ],

  Telugu: [
    { name: "లక్ష్మీ కిరాణా", distance: "250m" },
    { name: "ఫ్రెష్ మార్ట్", distance: "400m" },
    { name: "సాయి సూపర్ మార్కెట్", distance: "600m" },
  ],

  Malayalam: [
    { name: "ലക്ഷ്മി കിരാണ", distance: "250m" },
    { name: "ഫ്രെഷ് മാർട്ട്", distance: "400m" },
    { name: "സായി സൂപ്പർ മാർക്കറ്റ്", distance: "600m" },
  ],

  Kannada: [
    { name: "ಲಕ್ಷ್ಮೀ ಕಿರಾಣಾ", distance: "250m" },
    { name: "ಫ್ರೆಶ್ ಮಾರ್ಟ್", distance: "400m" },
    { name: "ಸಾಯಿ ಸೂಪರ್ ಮಾರ್ಕೆಟ್", distance: "600m" },
  ],
};

const steps = [
  "Query Detected",
  "Language Identified",
  "Products Recognized",
  "Nearby Stores Found",
];

// cumulative ms thresholds within one language cycle
const THRESHOLDS = [1400, 2200, 3000, 3800, 4800];
const CYCLE_MS = THRESHOLDS[THRESHOLDS.length - 1];

export default function VoiceOrder() {
  const [langIndex, setLangIndex] = useState(0);
  const [phase, setPhase] = useState(0);
  const [typedLength, setTypedLength] = useState(0);

  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    setPhase(0);
    setTypedLength(0);

    const currentQuery = languages[langIndex].query;

    const id = setInterval(() => {
      const elapsed = Date.now() - startRef.current;

      let nextPhase = 0;

      for (let i = 0; i < THRESHOLDS.length; i++) {
        if (elapsed < THRESHOLDS[i]) {
          nextPhase = i;
          break;
        }
        nextPhase = i + 1;
      }

      setPhase(Math.min(nextPhase, 4));

      if (elapsed < THRESHOLDS[0]) {
        const pct = Math.min(elapsed / THRESHOLDS[0], 1);
        setTypedLength(Math.round(pct * currentQuery.length));
      } else {
        setTypedLength(currentQuery.length);
      }

      if (elapsed >= CYCLE_MS) {
        setLangIndex((prev) => (prev + 1) % languages.length);
      }
    }, 50);

    return () => clearInterval(id);
  }, [langIndex]);

  const current = languages[langIndex];
  const currentStores =
    storesByLanguage[current.name] || storesByLanguage.English;

  const displayedQuery = current.query.slice(0, typedLength);

  const showProducts = phase >= 3;
  const showStores = phase >= 4;

  return (
    <section className="section lang-search">
      <div className="container lang-search-inner">
        <span className="eyebrow">Search in your language</span>

        <h1 className="lang-search-title">
          Find What You Need, In Any Language
        </h1>

        <p className="lang-search-subtitle">
          Search naturally in Hindi, Telugu, Tamil, Malayalam, Kannada, or
          English. BreakQ understands your language and instantly finds products
          from nearby local stores.
        </p>

        <div className="lang-search-stage">
          <div className="lang-chip chip-1">{chips[0]}</div>
          <div className="lang-chip chip-2">{chips[1]}</div>
          <div className="lang-chip chip-3">{chips[2]}</div>
          <div className="lang-chip chip-4">{chips[3]}</div>
          <div className="lang-chip chip-5">{chips[4]}</div>
          <div className="lang-chip chip-6">{chips[5]}</div>

          <div className="lang-search-box">
            <span className="lang-search-icon">🔍</span>

            <span className="lang-search-text">
              {displayedQuery}
              <span className="lang-search-cursor" />
            </span>
          </div>

          <div
            className={`lang-product-cards ${showProducts ? "is-visible" : ""}`}
          >
            {products.map((product) => (
              <div className="lang-product-card" key={product.label}>
                <span>{product.icon}</span>
                <p>{product.label}</p>
              </div>
            ))}
          </div>

          <div className={`lang-store-list ${showStores ? "is-visible" : ""}`}>
            {currentStores.map((store) => (
              <div
                className="lang-store-row"
                key={`${current.name}-${store.name}`}
              >
                <span>🏪 {store.name}</span>

                <span className="lang-store-distance">{store.distance}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lang-steps">
          {steps.map((step, i) => (
            <div
              key={step}
              className={`lang-step ${phase >= i + 1 ? "is-active" : ""}`}
            >
              <span className="lang-step-dot" />
              <span>{step}</span>

              {i < steps.length - 1 && (
                <span className="lang-step-arrow">→</span>
              )}
            </div>
          ))}
        </div>

        <div className="lang-feature-grid">
          <div className="lang-feature-card">
            <span className="lang-feature-icon">🌐</span>
            <h3>Multi-Language Search</h3>
            <p>Search naturally, in your own words.</p>
          </div>

          <div className="lang-feature-card">
            <span className="lang-feature-icon">🏪</span>
            <h3>Store Discovery</h3>
            <p>Find nearby vendors who have it in stock.</p>
          </div>

          <div className="lang-feature-card">
            <span className="lang-feature-icon">⚡</span>
            <h3>Fast Results</h3>
            <p>Get answers instantly, every time.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
