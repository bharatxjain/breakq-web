import { useEffect, useRef, useState } from "react";
import "./HowItWorks.css";

const steps = [
  {
    title: "Discover stores nearby",
    text: "Browse verified Kirana, Dairy, Medical, Electrical and more shops around you.",
    image: "/images/step-1.png",
  },
  {
    title: "Pick a vendor",
    text: "Open your favorite store's digital storefront and explore its catalog.",
    image: "/images/step-2.png",
  },
  {
    title: "Search & add to cart",
    text: "Find exactly what you need in seconds with lightning-fast search.",
    image: "/images/step-3.png",
  },
  {
    title: "Get it delivered",
    text: "Track your order to your doorstep or visit in person.",
    image: "/images/step-4.png",
  },
];

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          const index = Number(visible[0].target.dataset.index);

          setActiveStep(index);
        }
      },
      {
        threshold: [0.3, 0.5, 0.7],
        rootMargin: "-20% 0px -30% 0px",
      },
    );

    stepRefs.current.forEach((element) => {
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, []);

  return (
    <section className="how-it-works section">
      <div className="container">
        <span className="eyebrow">SIMPLE & FAST</span>

        <h2 className="section-title">How it works</h2>

        <p className="section-subtitle">
          From discovery to doorstep, in four easy steps.
        </p>

        <div className="how-layout">
          {/* LEFT TIMELINE */}

          <div className="timeline">
            {steps.map((step, index) => (
              <button
                type="button"
                key={step.title}
                ref={(element) => {
                  stepRefs.current[index] = element;
                }}
                data-index={index}
                className={`timeline-step ${
                  activeStep === index ? "active" : ""
                }`}
                onClick={() => {
                  setActiveStep(index);
                }}
              >
                <span className="timeline-line" />

                <span className="timeline-dot">{index + 1}</span>

                <div className="timeline-content">
                  <h3>{step.title}</h3>

                  <p>{step.text}</p>
                </div>
              </button>
            ))}
          </div>

          {/* RIGHT PREVIEW */}

          <div className="preview-sticky">
            <div className="preview-card">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className={`preview-screen ${
                    activeStep === index ? "active" : ""
                  }`}
                >
                  {step.image ? (
                    <img src={step.image} alt={step.title} />
                  ) : (
                    <div className="placeholder-screen">
                      <div className="phone-header">BREAKQ</div>

                      <div className="placeholder-number">{index + 1}</div>

                      <h3>{step.title}</h3>

                      <p>{step.text}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
