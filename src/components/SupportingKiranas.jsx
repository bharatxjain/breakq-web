import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./SupportingKiranas.css";

const stores = [
  {
    key: "kirana",
    label: "KIRANA",
    items: "🥛 🍚 🧴",
    color: "#7001FE",
    x: 50,
    y: 6,
  },
  {
    key: "medical",
    label: "MEDICAL",
    items: "💊 🩹 🧴",
    color: "#f87171",
    x: 12,
    y: 32,
  },
  {
    key: "electrical",
    label: "ELECTRIC",
    items: "💡 🔌 🔋",
    color: "#facc15",
    x: 88,
    y: 32,
  },
  {
    key: "dairy",
    label: "DAIRY",
    items: "🥛 🧈 🧀",
    color: "#38bdf8",
    x: 18,
    y: 70,
  },
  {
    key: "bakery",
    label: "BAKERY",
    items: "🍞 🥐 🎂",
    color: "#fb923c",
    x: 82,
    y: 70,
  },
];

const HUB = { x: 50, y: 46 };
const PHONE = { x: 50, y: 80 };

// Per-phase timings for the split-and-merge bike choreography. All are easy
// to retune; together they land the full loop in the 6-9s target window
// (1400 + (1300+280) + 500 + (1300+280) + 1400 + 500 = 6960ms).
const PHASE_MS = {
  inbound: 1400, // Order Online -> hub, single bike
  fanout: 1300, // hub -> each store, 5 bikes in parallel
  pause: 500, // dwell at the store node (400-600ms)
  fanin: 1300, // store -> hub, 5 bikes in parallel
  outbound: 1400, // hub -> Order Online, single bike
  rest: 500, // dwell at Order Online before looping
  fade: 180, // crossfade when bikes split (1 -> 5) or merge (5 -> 1)
};

// Each fleet bike starts its fan-out/fan-in ride this many ms after the
// previous one, so the 5 bikes peel off the hub in a quick ripple instead of
// snapping out in perfect lockstep. Keep this in the 50-100ms range.
const STAGGER_MS = 70;
const FAN_SPREAD_MS = (stores.length - 1) * STAGGER_MS;

// Drives the bike choreography: one bike travels Order Online -> hub, splits
// into 5 bikes that fan out to every store and back in parallel, then merges
// back into one bike that returns to Order Online. Every position reuses the
// existing PHONE/HUB/store coordinates the dashed SVG lines are drawn from,
// so the split/merge points always land exactly on the hub (no jump-cut).
function useBikeChoreography() {
  const [phase, setPhase] = useState("inbound");
  const [singlePos, setSinglePos] = useState(PHONE);
  const [singleVisible, setSingleVisible] = useState(true);
  const [fleetPos, setFleetPos] = useState(() => stores.map(() => HUB));
  const [fleetVisible, setFleetVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timeoutIds = [];
    const wait = (ms) =>
      new Promise((resolve) => {
        timeoutIds.push(setTimeout(resolve, ms));
      });
    // Moves each fleet bike to `target(i)` on its own staggered timer
    // instead of all 5 at once, so the fan-out/fan-in reads less robotic.
    const setFleetPosStaggered = (target) => {
      stores.forEach((_, i) => {
        timeoutIds.push(
          setTimeout(() => {
            if (cancelled) return;
            setFleetPos((prev) => {
              const next = [...prev];
              next[i] = target(i);
              return next;
            });
          }, i * STAGGER_MS)
        );
      });
    };

    (async function run() {
      while (!cancelled) {
        // Phase 1 - inbound: single bike, Order Online -> hub.
        setPhase("inbound");
        setFleetVisible(false);
        setSingleVisible(true);
        setSinglePos(HUB);
        await wait(PHASE_MS.inbound);
        if (cancelled) return;

        // Phase 2 - fan-out: split into 5 bikes, hub -> each store, parallel
        // (each bike's own ride staggered by STAGGER_MS so they don't leave
        // in lockstep).
        setPhase("fanout");
        setSingleVisible(false);
        setFleetVisible(true);
        setFleetPosStaggered((i) => ({ x: stores[i].x, y: stores[i].y }));
        await wait(PHASE_MS.fanout + FAN_SPREAD_MS);
        if (cancelled) return;

        // Phase 3 - dwell at each store node.
        setPhase("pause");
        await wait(PHASE_MS.pause);
        if (cancelled) return;

        // Phase 3 (return leg) - fan-in: each store -> hub, parallel and
        // staggered the same way as the fan-out leg.
        setPhase("fanin");
        setFleetPosStaggered(() => HUB);
        await wait(PHASE_MS.fanin + FAN_SPREAD_MS);
        if (cancelled) return;

        // Phase 4 - merge back into 1 bike, hub -> Order Online.
        setPhase("outbound");
        setFleetVisible(false);
        setSingleVisible(true);
        setSinglePos(PHONE);
        await wait(PHASE_MS.outbound);
        if (cancelled) return;

        // Loop - dwell at Order Online, then restart phase 1.
        setPhase("rest");
        await wait(PHASE_MS.rest);
      }
    })();

    return () => {
      cancelled = true;
      timeoutIds.forEach(clearTimeout);
    };
  }, []);

  return { phase, singlePos, singleVisible, fleetPos, fleetVisible };
}

const stats = [
  { label: "500+ Stores", pos: "stat-tl" },
  { label: "10K+ Products", pos: "stat-tr" },
  { label: "Verified Vendors", pos: "stat-bl" },
  { label: "1k+ Happy customers", pos: "stat-br" },
];

export default function SupportingKiranas() {
  const { phase, singlePos, singleVisible, fleetPos, fleetVisible } =
    useBikeChoreography();

  // Single bike only ever travels PHONE<->HUB, so its facing direction is
  // fixed per phase (inbound = arriving at hub, outbound = leaving it).
  const singleDuration =
    phase === "outbound" ? PHASE_MS.outbound : PHASE_MS.inbound;
  const singleFacingLeft =
    phase === "outbound" ? PHONE.x < HUB.x : HUB.x < PHONE.x;
  const fleetDuration = phase === "fanin" ? PHASE_MS.fanin : PHASE_MS.fanout;

  return (
    <section className="section supporting-kiranas">
      <div className="container sk-inner">
        <div className="sk-copy">
          <span className="eyebrow">Everything local. One app.</span>
          <h2 className="sk-title">
            Your Entire Neighborhood Market, Now Online
          </h2>
          <p className="sk-subtitle">
            Shop from trusted local Kirana, Medical, Dairy, Bakery, and
            Electrical stores - all through a single platform built for your
            community.
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

          <svg
            className="sk-lines"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
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
            <line
              x1={HUB.x}
              y1={HUB.y}
              x2={PHONE.x}
              y2={PHONE.y}
              className="sk-line"
            />
          </svg>

          {stores.map((s) => (
            <div
              key={s.key}
              className="sk-store"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                "--store-color": s.color,
              }}
            >
              <div className="sk-store-head">{s.label}</div>
              <div className="sk-store-items">{s.items}</div>
            </div>
          ))}

          <div
            className="sk-hub"
            style={{ left: `${HUB.x}%`, top: `${HUB.y}%` }}
          >
            <div className="sk-hub-logo">
              BREAK<span className="q-text">Q</span>
            </div>
            <span className="sk-hub-tag">Supporting Local Stores</span>
            <span className="sk-hub-tag">Empowering Communities</span>
            <span className="sk-live">Live Inventory</span>
          </div>

          <div
            className="sk-phone"
            style={{ left: `${PHONE.x}%`, top: `${PHONE.y}%` }}
          >
            <span className="sk-phone-icon">📱</span>
            <span>Order Online</span>
          </div>

          <div
            className="sk-bike"
            style={{
              left: `${singlePos.x}%`,
              top: `${singlePos.y}%`,
              opacity: singleVisible ? 1 : 0,
              transform: `translate(-50%, -50%) scaleX(${
                singleFacingLeft ? -1 : 1
              })`,
              "--bike-duration": `${singleDuration}ms`,
              "--bike-fade": `${PHASE_MS.fade}ms`,
            }}
          >
            🛵
          </div>

          {stores.map((store, i) => {
            const pos = fleetPos[i];
            const facingLeft =
              phase === "fanin" ? HUB.x < store.x : store.x < HUB.x;
            return (
              <div
                key={store.key}
                className="sk-bike sk-bike-fleet"
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  opacity: fleetVisible ? 1 : 0,
                  transform: `translate(-50%, -50%) scaleX(${
                    facingLeft ? -1 : 1
                  })`,
                  "--bike-duration": `${fleetDuration}ms`,
                  "--bike-fade": `${PHASE_MS.fade}ms`,
                }}
              >
                🛵
              </div>
            );
          })}

          <div className="sk-customers">
            <span>👨</span>
            <span>👩</span>
            <span>👴</span>
          </div>
        </div>
      </div>
    </section>
  );
}
