import { useState } from "react";
import "./FAQ.css";

const faqs = [
  {
    q: "What is BreakQ?",
    a: "BreakQ connects you with verified neighbourhood stores - Kirana, dairy, medical, electrical and more - so you can order from the shops you already trust and have it delivered or kept ready for pickup.",
  },
  {
    q: "How do I place an order?",
    a: "Open BreakQ, search for what you need in your own language, pick a nearby store, add items to your basket, and choose a delivery or skip-the-queue pickup slot that suits you.",
  },
  {
    q: "Which areas is BreakQ available in?",
    a: "We're live across a growing list of neighbourhoods and add new areas every week. Enter your location in the app to see the stores near you right now.",
  },
  {
    q: "Can I search in my own language?",
    a: "Yes. BreakQ understands everyday grocery and medicine terms across multiple Indian languages, so you can type the way you speak.",
  },
  {
    q: "Do you deliver, or is it pickup only?",
    a: "Both. Every store lets you choose doorstep delivery or a counter pickup, and you pick the time window when you place the order.",
  },
  {
    q: "How do I pay?",
    a: "Pay online in the app or on pickup/delivery, whichever the store supports. You always see the store's live prices - there's no hidden markup on top.",
  },
  {
    q: "What happens if an item is out of stock?",
    a: "You see live stock before you add an item, and the store confirms your basket before packing it, so there are no surprises at the door.",
  },
  {
    q: "I run a store - how do I join BreakQ?",
    a: "Head to “Become a partner” and share a few details. Our team gets your digital storefront live, usually within a couple of days.",
  },
];

const PREVIEW_COUNT = 5;

/* On-brand FAQ illustration — decorative, hidden on mobile. */
function FaqArt() {
  return (
    <svg
      className="faq-art__svg"
      viewBox="0 0 460 400"
      role="img"
      aria-label="Frequently asked questions"
    >
      <rect
        className="faq-art__bg"
        x="18"
        y="96"
        width="424"
        height="228"
        rx="40"
      />

      {/* speech bubble, left */}
      <rect
        className="faq-art__bubble"
        x="52"
        y="30"
        width="112"
        height="78"
        rx="22"
      />
      <path className="faq-art__bubble" d="M74 104 78 138 108 106 Z" />
      <text
        className="faq-art__mark"
        x="108"
        y="72"
        textAnchor="middle"
        dominantBaseline="central"
      >
        ?
      </text>

      {/* speech bubble, right */}
      <circle className="faq-art__bubble" cx="392" cy="74" r="46" />
      <path className="faq-art__bubble" d="M366 104 356 138 392 118 Z" />
      <text
        className="faq-art__mark"
        x="392"
        y="76"
        textAnchor="middle"
        dominantBaseline="central"
      >
        ?
      </text>

      {/* FAQ wordmark */}
      <text
        className="faq-art__word"
        x="232"
        y="216"
        textAnchor="middle"
        dominantBaseline="central"
      >
        FAQ
      </text>

      <circle className="faq-art__dot" cx="40" cy="250" r="9" />
      <circle className="faq-art__dot" cx="424" cy="286" r="7" />
      <circle className="faq-art__ring" cx="70" cy="320" r="16" />
    </svg>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? faqs : faqs.slice(0, PREVIEW_COUNT);

  return (
    <section className="section faq" aria-labelledby="faq-heading">
      <div className="container">
        <h2 className="section-title" id="faq-heading">
          Frequently Asked Questions
        </h2>
        <p className="section-subtitle">
          Find answers about ordering from your neighbourhood stores on BreakQ -
          how it works, delivery and pickup, supported areas, and getting
          started.
        </p>

        <div className="faq-layout">
          <div className="faq-art" aria-hidden="true">
            <FaqArt />
          </div>

          <div className="faq-list">
            <ul className="faq-items">
              {visible.map((item, i) => {
                const isOpen = openIndex === i;
                return (
                  <li
                    key={item.q}
                    className={`faq-item${isOpen ? " is-open" : ""}`}
                  >
                    <button
                      type="button"
                      className="faq-q"
                      id={`faq-q-${i}`}
                      aria-expanded={isOpen}
                      aria-controls={`faq-a-${i}`}
                      onClick={() => setOpenIndex(isOpen ? -1 : i)}
                    >
                      <span className="faq-num">{i + 1}.</span>
                      <span className="faq-q-text">{item.q}</span>
                      <svg
                        className="faq-chevron"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </button>
                    <div
                      className="faq-a"
                      id={`faq-a-${i}`}
                      role="region"
                      aria-labelledby={`faq-q-${i}`}
                    >
                      <div className="faq-a-inner">
                        <p>{item.a}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {faqs.length > PREVIEW_COUNT && (
              <button
                type="button"
                className="faq-more"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "See Less" : "See More"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
