import { useCallback, useEffect, useRef, useState } from "react";
import {
  getMyProfile,
  getRole,
  getSession,
  getUserEmail,
  logLoginAttempt,
  probeSchema,
  sendOtp,
  signOut,
  verifyOtp,
} from "../admin/api";
import { Avatar, Spinner, ToastProvider } from "../admin/ui";
import NavIcon from "../admin/NavIcon";
import ProfileModal from "../admin/ProfileModal";
import Dashboard from "../admin/views/Dashboard";
import Users from "../admin/views/Users";
import Vendors from "../admin/views/Vendors";
import Subscriptions from "../admin/views/Subscriptions";
import Payments from "../admin/views/Payments";
import Promotions from "../admin/views/Promotions";
import Coupons from "../admin/views/Coupons";
import Categories from "../admin/views/Categories";
import Health from "../admin/views/Health";
import "./Admin.css";

// The page password is a shared pre-filter, NOT the identity check — it lives
// in the client bundle. Real authorization is profiles.role === 'admin' below.
const GATE_PASSWORD = import.meta.env.VITE_ADMIN_GATE_PASSWORD || "breakq-admin";
const GATE_KEY = "ap_gate_ok";
const VIEW_KEY = "ap_view";

const NAV = [
  {
    group: "Overview",
    items: [
      { key: "dashboard", label: "Dashboard", el: Dashboard },
      { key: "users", label: "Users", el: Users },
    ],
  },
  {
    group: "Manage",
    items: [
      { key: "vendors", label: "Vendors", el: Vendors },
      { key: "subscriptions", label: "Subscriptions", el: Subscriptions },
      { key: "payments", label: "Payments", el: Payments },
      { key: "promotions", label: "Promotions", el: Promotions },
      { key: "coupons", label: "Coupons", el: Coupons },
      { key: "categories", label: "Categories", el: Categories },
    ],
  },
  { group: "System", items: [{ key: "health", label: "System", el: Health }] },
];
const ALL_VIEWS = NAV.flatMap((g) => g.items);

export default function Admin() {
  const [gateOk, setGateOk] = useState(() => sessionStorage.getItem(GATE_KEY) === "1");
  const [phase, setPhase] = useState("checking"); // checking | email | otp | denied | ready

  useEffect(() => {
    const prev = document.title;
    document.title = "BreakQ Admin";
    return () => {
      document.title = prev;
    };
  }, []);

  const checkAdmin = useCallback(async () => {
    setPhase("checking");
    try {
      const session = await getSession();
      if (!session) {
        setPhase("email");
        return;
      }
      const role = await getRole();
      if (role === "admin") {
        setPhase("ready");
      } else {
        await signOut();
        setPhase("denied");
      }
    } catch {
      setPhase("email");
    }
  }, []);

  useEffect(() => {
    if (gateOk) checkAdmin();
  }, [gateOk, checkAdmin]);

  if (!gateOk) {
    return <GateScreen onPass={() => {
      sessionStorage.setItem(GATE_KEY, "1");
      setGateOk(true);
    }} />;
  }

  if (phase === "checking") {
    return (
      <div className="ap ap-center">
        <Spinner />
      </div>
    );
  }

  if (phase === "ready") {
    return (
      <ToastProvider>
        <Shell
          onSignOut={async () => {
            await signOut();
            setPhase("email");
          }}
        />
      </ToastProvider>
    );
  }

  return <LoginScreen phase={phase} setPhase={setPhase} onAuthed={checkAdmin} />;
}

/* ------------------------------------------------------------- auth --- */

function AuthShell({ step, title, lead, children }) {
  return (
    <div className="ap ap-center">
      <div className="ap-auth">
        <div className="ap-auth-logo">
          <span className="ap-logo-mark" aria-hidden="true" />
          <span className="ap-logo-word">
            Break<span className="ap-logo-q">Q</span>
          </span>
          <span className="ap-auth-logo-sub">Admin</span>
        </div>
        {step && <span className="ap-auth-step">{step}</span>}
        <h1 className="ap-auth-title">{title}</h1>
        {lead && <p className="ap-auth-lead">{lead}</p>}
        {children}
        <p className="ap-auth-foot">Hidden console · authorised admins only</p>
      </div>
    </div>
  );
}

function GateScreen({ onPass }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  return (
    <AuthShell step="Step 1 of 2" title="Access password" lead="Enter the shared password to reach the sign-in screen.">
      <form
        className="ap-auth-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (pw === GATE_PASSWORD) onPass();
          else setErr("Incorrect password.");
        }}
      >
        <label className="ap-field">
          <span className="ap-field-label">Access password</span>
          <input
            type="password"
            autoFocus
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              setErr("");
            }}
            placeholder="••••••••"
          />
          {err && <span className="ap-field-error">{err}</span>}
        </label>
        <button type="submit" className="ap-btn ap-btn-primary ap-btn-block ap-btn-lg">
          Continue
        </button>
      </form>
    </AuthShell>
  );
}

function LoginScreen({ phase, setPhase, onAuthed }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  async function handleSend(e) {
    e.preventDefault();
    setErr("");
    setInfo("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErr("Enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      await sendOtp(email);
      setPhase("otp");
      setInfo("We sent a 6-digit code to your email.");
    } catch (e2) {
      setErr(e2.message || "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setErr("");
    if (!/^\d{6}$/.test(otp)) {
      setErr("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    try {
      await verifyOtp(email, otp);
      const role = await getRole();
      if (role === "admin") {
        await logLoginAttempt(true);
        await onAuthed();
      } else {
        await logLoginAttempt(false);
        await signOut();
        setPhase("denied");
        setErr("This account is not an admin.");
      }
    } catch (e2) {
      setErr(e2.message || "Invalid or expired code.");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "denied") {
    return (
      <AuthShell
        step="Step 2 of 2"
        title="Not authorised"
        lead="That account doesn’t have admin access. Sign in with an admin email."
      >
        <button
          className="ap-btn ap-btn-primary ap-btn-block ap-btn-lg"
          onClick={() => {
            setPhase("email");
            setErr("");
            setOtp("");
          }}
        >
          Try another email
        </button>
      </AuthShell>
    );
  }

  if (phase === "otp") {
    return (
      <AuthShell step="Step 2 of 2" title="Enter your code" lead={`We sent a 6-digit code to ${email}.`}>
        <form className="ap-auth-form" onSubmit={handleVerify}>
          <label className="ap-field">
            <span className="ap-field-label">Verification code</span>
            <input
              inputMode="numeric"
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="ap-otp"
            />
            {info && !err && <span className="ap-field-hint">{info}</span>}
            {err && <span className="ap-field-error">{err}</span>}
          </label>
          <button type="submit" className="ap-btn ap-btn-primary ap-btn-block ap-btn-lg" disabled={busy}>
            {busy ? "Verifying…" : "Verify & sign in"}
          </button>
          <button
            type="button"
            className="ap-auth-link"
            onClick={() => {
              setPhase("email");
              setOtp("");
              setErr("");
            }}
          >
            Change email
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell step="Step 2 of 2" title="Sign in" lead="We’ll email you a one-time code.">
      <form className="ap-auth-form" onSubmit={handleSend}>
        <label className="ap-field">
          <span className="ap-field-label">Admin email</span>
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@breakq.app"
          />
          {err && <span className="ap-field-error">{err}</span>}
        </label>
        <button type="submit" className="ap-btn ap-btn-primary ap-btn-block ap-btn-lg" disabled={busy}>
          {busy ? "Sending…" : "Send code"}
        </button>
      </form>
    </AuthShell>
  );
}

/* ------------------------------------------------------------ shell --- */

function Shell({ onSignOut }) {
  const [view, setView] = useState(() => {
    const saved = sessionStorage.getItem(VIEW_KEY);
    return ALL_VIEWS.some((n) => n.key === saved) ? saved : "dashboard";
  });
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("ap_nav_collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [filter, setFilter] = useState("");
  const [email, setEmail] = useState("");
  const [pname, setPname] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [setupOk, setSetupOk] = useState(null); // null unknown | true | false
  const searchRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem(VIEW_KEY, view);
  }, [view]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ap_nav_collapsed", collapsed ? "1" : "0");
    } catch {
      /* storage unavailable — collapse just won't persist */
    }
  }, [collapsed]);

  useEffect(() => {
    getUserEmail().then((e) => setEmail(e || ""));
    getMyProfile()
      .then((p) => setPname(p?.full_name || p?.name || p?.display_name || ""))
      .catch(() => {});
    probeSchema()
      .then((p) => setSetupOk(!!p.admin_dashboard_rpc))
      .catch(() => setSetupOk(null));
  }, []);

  const current = ALL_VIEWS.find((n) => n.key === view) ?? ALL_VIEWS[0];
  const Active = current.el;
  const q = filter.trim().toLowerCase();
  const matches = q ? ALL_VIEWS.filter((n) => n.label.toLowerCase().includes(q)) : [];

  const go = (key) => {
    setView(key);
    setNavOpen(false);
    setFilter("");
  };

  return (
    <div className="ap ap-shell">
      <header className="ap-header">
        <div className="ap-header-left">
          <button className="ap-burger" onClick={() => setNavOpen((v) => !v)} aria-label="Menu">
            ☰
          </button>
          <div className="ap-header-brand">
            <span className="ap-logo-mark" aria-hidden="true" />
            <span className="ap-logo-word">
              Break<span className="ap-logo-q">Q</span>
            </span>
            <span className="ap-header-brand-sub">Admin</span>
          </div>
        </div>

        <div className="ap-header-search">
          <svg className="ap-search-ico" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="9" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="13.5" y1="13.5" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            ref={searchRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && (setFilter(""), e.currentTarget.blur())}
            placeholder="Jump to a section"
            aria-label="Jump to a section"
          />
          <kbd className="ap-kbd">/</kbd>
          {q && (
            <div className="ap-search-menu">
              {matches.map((n) => (
                <button key={n.key} onClick={() => go(n.key)}>
                  <NavIcon name={n.key} />
                  {n.label}
                </button>
              ))}
              {matches.length === 0 && <span className="ap-search-empty">No section</span>}
            </div>
          )}
        </div>

        <div className="ap-header-right">
          {setupOk === false && (
            <button className="ap-setup-pill" onClick={() => go("health")}>
              <span className="ap-setup-dot" /> Setup incomplete
            </button>
          )}
          <div className="ap-usermenu">
            <button
              className="ap-avatar-btn"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Account menu"
            >
              <Avatar name={pname} email={email} size={32} />
            </button>
            {menuOpen && (
              <>
                <div className="ap-menu-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="ap-menu" role="menu">
                  <div className="ap-menu-head">
                    <Avatar name={pname} email={email} size={38} />
                    <div>
                      <strong>{pname || "Admin"}</strong>
                      <span>{email}</span>
                    </div>
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setProfileOpen(true);
                    }}
                  >
                    Edit profile
                  </button>
                  <button role="menuitem" className="ap-menu-danger" onClick={onSignOut}>
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className={`ap-body ${collapsed ? "is-collapsed" : ""}`}>
        <aside className={`ap-side ${navOpen ? "is-open" : ""}`}>
          <nav className="ap-side-nav">
            {NAV.map((grp) => (
              <div key={grp.group} className="ap-nav-group">
                <span className="ap-nav-group-label">{grp.group}</span>
                {grp.items.map((n) => (
                  <button
                    key={n.key}
                    className={view === n.key ? "is-active" : ""}
                    onClick={() => go(n.key)}
                    title={collapsed ? n.label : undefined}
                  >
                    <NavIcon name={n.key} />
                    <span className="ap-nav-label">{n.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <button className="ap-user-card" onClick={() => setProfileOpen(true)} title="Edit profile">
            <Avatar name={pname} email={email} size={34} />
            <span className="ap-user-meta">
              <strong>{pname || "Admin"}</strong>
              <span>{email}</span>
            </span>
            <span className="ap-user-caret" aria-hidden="true">
              ›
            </span>
          </button>

          <button
            className="ap-collapse-toggle"
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand menu" : "Collapse menu"}
            title={collapsed ? "Expand menu" : "Collapse menu"}
          >
            <span className="ap-collapse-caret" aria-hidden="true">
              {collapsed ? "»" : "«"}
            </span>
            <span className="ap-nav-label">Collapse menu</span>
          </button>
        </aside>

        <main className="ap-main">
          <div className="ap-content">
            <Active />
          </div>
        </main>

        {navOpen && <div className="ap-side-scrim" onClick={() => setNavOpen(false)} />}
      </div>

      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
