import { useCallback, useEffect, useRef, useState } from "react";
import "./JourneyTimeline.css";

/* Self-contained dock-style journey timeline.
   A vertical tick rail that magnifies toward the pointer, driving a preview
   card (progress bar + timecode). Every tick is one step. Magnification is a
   gaussian falloff over ~3 ticks either side; each tick eases toward its target
   every frame instead of snapping — that is what makes it feel physical, not
   like a menu. The rAF loop halts once nothing is moving and the pointer has
   left. Rotates to a horizontal rail under 680px. Under prefers-reduced-motion
   the magnify mechanic is removed and the rail becomes a plain readable list.
   Avatars are drawn from initials on a coloured disc — no image dependency. */

const STEPS = [
  {
    code: "00:00",
    time: "Spark",
    who: "Founders",
    initials: "KK",
    color: "#7001fe",
    title: "A queue too long",
    body: "Neighbours waiting outside a Kirana store for stock that was already sold out. The shop had everything — it just had no way to show it.",
  },
  {
    code: "00:45",
    time: "Build",
    who: "Product",
    initials: "PD",
    color: "#38bdf8",
    title: "One storefront per shop",
    body: "Every shop gets a live digital storefront — real catalogue, real prices, real stock — not a generic grocery list bolted onto a delivery app.",
  },
  {
    code: "01:30",
    time: "Pilot",
    who: "Field team",
    initials: "FT",
    color: "#34d399",
    title: "First neighbourhood live",
    body: "Kirana, dairy, medical and electrical stores on one map. Shoppers browsed a specific shop, then walked over to collect.",
  },
  {
    code: "02:20",
    time: "Grow",
    who: "Vendors",
    initials: "VN",
    color: "#fb923c",
    title: "Beyond groceries",
    body: "Bakery, stationery, fashion, mobiles — any shop on the street, discoverable in seconds, in the language you actually think in.",
  },
  {
    code: "03:10",
    time: "Now",
    who: "Community",
    initials: "BQ",
    color: "#5500c5",
    title: "Shop-first, local-first",
    body: "A multi-vendor marketplace that puts the shops you already trust first, with a dashboard that helps them run the business, not just take orders.",
  },
  {
    code: "04:00",
    time: "Next",
    who: "You",
    initials: "YOU",
    color: "#f472b6",
    title: "Your street, online",
    body: "More categories, more cities — same principle: the neighbourhood economy brought online without being taken over.",
  },
];

const SIGMA = 1.15; // gaussian width in tick units → real lift ~3 ticks either side
const AMP = 3.2; // extra scale at the crest
const REST = 0.5; // settled lift kept on the active tick when the pointer is away
const EASE = 0.16; // per-frame approach to target

export default function JourneyTimeline({
  eyebrow = "Our journey",
  title = "How BreakQ got here",
  lead = "From a queue outside a Kirana store to a neighbourhood that shops itself online — one step at a time.",
}) {
  const N = STEPS.length;
  const railRef = useRef(null);
  const barRefs = useRef([]);
  const liRefs = useRef([]);
  const [active, setActive] = useState(0);
  const activeRef = useRef(active);
  activeRef.current = active;
  const [horizontal, setHorizontal] = useState(false);
  const [touched, setTouched] = useState(false);

  const reduce = useRef(
    typeof window !== "undefined" &&
      !!window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const targets = useRef(new Array(N).fill(1));
  const current = useRef(new Array(N).fill(1));
  const focusIdx = useRef(-1); // pointer / keyboard position along the rail, -1 = disengaged
  const rafRef = useRef(0);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia("(max-width: 680px)");
    const sync = () => setHorizontal(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const writeBars = useCallback(() => {
    for (let i = 0; i < N; i += 1) {
      const el = barRefs.current[i];
      if (!el) continue;
      const s = current.current[i];
      el.style.transform = horizontal ? `scaleY(${s.toFixed(3)})` : `scaleX(${s.toFixed(3)})`;
      el.style.opacity = String(Math.min(1, 0.38 + s * 0.2));
    }
  }, [N, horizontal]);

  const computeTargets = useCallback(() => {
    const f = focusIdx.current;
    for (let i = 0; i < N; i += 1) {
      if (f >= 0) {
        const d = i - f;
        targets.current[i] = 1 + AMP * Math.exp(-(d * d) / (2 * SIGMA * SIGMA));
      } else {
        targets.current[i] = i === activeRef.current ? 1 + REST : 1;
      }
    }
  }, [N]);

  const loop = useCallback(() => {
    let moving = false;
    let crest = 0;
    let crestVal = -1;
    for (let i = 0; i < N; i += 1) {
      const t = targets.current[i];
      const c = current.current[i];
      const next = c + (t - c) * EASE;
      current.current[i] = Math.abs(t - next) < 0.002 ? t : next;
      if (Math.abs(t - current.current[i]) > 0.002) moving = true;
      if (current.current[i] > crestVal) {
        crestVal = current.current[i];
        crest = i;
      }
    }
    writeBars();

    if (focusIdx.current >= 0) {
      const idx = Math.round(focusIdx.current);
      if (idx !== activeRef.current) setActive(idx);
    }
    for (let i = 0; i < N; i += 1) {
      liRefs.current[i]?.classList.toggle("is-crest", i === crest && focusIdx.current >= 0);
    }

    // Stop once nothing is moving (the pointer having left just relaxes the
    // targets, which then settle and end the loop here).
    if (moving) {
      rafRef.current = requestAnimationFrame(loop);
    } else {
      runningRef.current = false;
    }
  }, [N, writeBars]);

  const kick = useCallback(() => {
    if (reduce.current) return;
    computeTargets();
    if (!runningRef.current) {
      runningRef.current = true;
      rafRef.current = requestAnimationFrame(loop);
    }
  }, [computeTargets, loop]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || reduce.current) return undefined;
    const onMove = (e) => {
      const r = rail.getBoundingClientRect();
      const pos = horizontal
        ? (e.clientX - r.left) / Math.max(1, r.width)
        : (e.clientY - r.top) / Math.max(1, r.height);
      focusIdx.current = Math.max(0, Math.min(N - 1, pos * (N - 1)));
      setTouched(true);
      kick();
    };
    const onLeave = () => {
      focusIdx.current = -1;
      kick();
    };
    rail.addEventListener("pointermove", onMove);
    rail.addEventListener("pointerleave", onLeave);
    return () => {
      rail.removeEventListener("pointermove", onMove);
      rail.removeEventListener("pointerleave", onLeave);
    };
  }, [horizontal, N, kick]);

  useEffect(() => {
    if (reduce.current) return;
    computeTargets();
    writeBars();
    kick();
  }, [horizontal, active, computeTargets, writeBars, kick]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const step = STEPS[active];
  const pct = ((active + 1) / N) * 100;
  const nn = String(active + 1).padStart(2, "0");
  const hint = touched ? step.time.toUpperCase() : horizontal ? "Tap a step" : "Hover the rail";

  return (
    <section className="jt" aria-labelledby="jt-title">
      <div className="jt-panel">
        <div className="jt-head">
          <div className="jt-head-text">
            <span className="jt-eyebrow">{eyebrow}</span>
            <h2 className="jt-title" id="jt-title">
              {title}
            </h2>
            <p className="jt-lead">{lead}</p>
          </div>
          <span className="jt-count-total">{N} steps</span>
        </div>

        <div className={`jt-stage${horizontal ? " jt-stage--h" : ""}`}>
          <ul
            className="jt-rail"
            ref={railRef}
            role="tablist"
            aria-orientation={horizontal ? "horizontal" : "vertical"}
            aria-label="Journey milestones"
          >
            {STEPS.map((s, i) => (
              <li
                key={s.time}
                className={`jt-tick${i === active ? " is-active" : ""}`}
                ref={(el) => (liRefs.current[i] = el)}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  className="jt-tick-btn"
                  onClick={() => {
                    setTouched(true);
                    setActive(i);
                  }}
                  onFocus={() => {
                    setTouched(true);
                    setActive(i);
                    if (!reduce.current) {
                      focusIdx.current = i;
                      kick();
                    }
                  }}
                  onBlur={() => {
                    focusIdx.current = -1;
                    kick();
                  }}
                >
                  <span
                    className="jt-tick-bar"
                    ref={(el) => (barRefs.current[i] = el)}
                    style={{ "--tick-color": s.color }}
                    aria-hidden="true"
                  />
                  <span className="jt-tick-time">{s.time}</span>
                  <span className="jt-tick-title">{s.title}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="jt-preview" aria-live="polite">
            <article className="jt-card" key={active}>
              <div className="jt-card-top">
                <span className="jt-avatar" style={{ background: step.color }} aria-hidden="true">
                  {step.initials}
                </span>
                <span className="jt-step-label">Step {nn}</span>
                <span className="jt-card-who">· {step.who}</span>
              </div>
              <h3 className="jt-card-title">{step.title}</h3>
              <p className="jt-card-body">{step.body}</p>
              <div
                className="jt-progress"
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={N}
                aria-valuenow={active + 1}
                aria-label={`Step ${active + 1} of ${N}`}
              >
                <span className="jt-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="jt-card-foot">
                <span className="jt-timecode">{step.code}</span>
                <span className="jt-hint">{hint}</span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
