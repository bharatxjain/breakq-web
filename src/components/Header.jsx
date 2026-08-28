import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import Logo from "./Logo";
import "./Header.css";

const links = [
  { label: "Home", to: "/" },
  { label: "Why BreakQ?", to: "/why-breakq" },
  { label: "About us", to: "/about" },
  { label: "Contact us", to: "/contact" },
];

const secondaryLinks = [
  { label: "Become a partner", to: "/become-a-partner" },
  { label: "Privacy Policy", to: "/privacy" },
  { label: "Terms & Conditions", to: "/terms" },
  { label: "Return Policy", to: "/returns" },
];

const socialLinks = [
  {
    label: "Instagram",
    href: "#",
    icon: (
      <path d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153.55.55.899 1.112 1.153 1.772.248.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.217 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772c-.55.55-1.112.899-1.772 1.153-.637.248-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.217-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.066.217-1.79.465-2.428a4.9 4.9 0 0 1 1.153-1.772A4.9 4.9 0 0 1 5.45 2.525c.638-.248 1.362-.415 2.428-.465C8.944 2.013 9.283 2 12 2Zm0 1.802c-2.67 0-2.986.01-4.04.058-.976.045-1.505.207-1.858.344-.466.181-.8.399-1.15.748-.35.35-.567.684-.748 1.15-.137.353-.3.882-.344 1.857-.048 1.055-.058 1.37-.058 4.041 0 2.67.01 2.986.058 4.04.045.976.207 1.505.344 1.858.181.466.399.8.748 1.15.35.35.684.567 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058 2.67 0 2.986-.01 4.04-.058.976-.045 1.505-.207 1.858-.344a3.09 3.09 0 0 0 1.15-.748c.35-.35.567-.684.748-1.15.137-.353.3-.882.344-1.857.048-1.054.058-1.37.058-4.041 0-2.67-.01-2.986-.058-4.04-.045-.976-.207-1.505-.344-1.858a3.1 3.1 0 0 0-.748-1.15 3.09 3.09 0 0 0-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.055-.048-1.37-.058-4.041-.058Zm0 4.595a5.603 5.603 0 1 1 0 11.206 5.603 5.603 0 0 1 0-11.206Zm0 9.24a3.638 3.638 0 1 0 0-7.276 3.638 3.638 0 0 0 0 7.276Zm7.146-9.462a1.31 1.31 0 1 1-2.62 0 1.31 1.31 0 0 1 2.62 0Z" />
    ),
  },
  {
    label: "LinkedIn",
    href: "#",
    icon: (
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286ZM5.337 7.433a2.062 2.062 0 1 1-.001-4.125 2.062 2.062 0 0 1 .001 4.125ZM7.114 20.452H3.558V9h3.556v11.452Z" />
    ),
  },
  {
    label: "X",
    href: "#",
    icon: (
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231ZM17.083 19.77h1.833L7.084 4.126H5.117Z" />
    ),
  },
];

export default function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <Logo size={44} />
          <div className="brand-text">
            <span className="brand-name">
              Break<span className="brand-pro">Q</span>
            </span>
            <span className="brand-tag">
              Your Neighborhood's Digital Marketplace
            </span>
          </div>
        </Link>

        <nav className="nav">
          {links.map((link) =>
            link.to === "#" ? (
              <a key={link.label} href="#">
                {link.label}
              </a>
            ) : (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  isActive ? "nav-active" : undefined
                }
              >
                {link.label}
              </NavLink>
            ),
          )}
        </nav>

        <a
          href="https://play.google.com/store/apps/details?id=com.kks.bharatkirana"
          className="btn btn-black header-cta"
          target="_blank"
          rel="noopener noreferrer"
        >
          Download App
        </a>

        <button
          className={`menu-toggle ${open ? "is-open" : ""}`}
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div
        className={`mobile-nav-backdrop ${open ? "is-open" : ""}`}
        onClick={() => setOpen(false)}
      />

      <div className={`mobile-nav ${open ? "is-open" : ""}`}>
        <button className="mobile-nav-close" aria-label="Close menu" onClick={() => setOpen(false)}>
          ✕
        </button>

        <nav className="mobile-nav-primary">
          {links.map((link) => (
            <NavLink
              key={link.label}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) => (isActive ? "nav-active" : undefined)}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <nav className="mobile-nav-secondary">
          {secondaryLinks.map((link) => (
            <Link key={link.label} to={link.to} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mobile-nav-footer">
          <a
            href="https://play.google.com/store/apps/details?id=com.kks.bharatkirana"
            className="btn btn-black mobile-nav-cta"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            Download App
          </a>

          <div className="mobile-nav-socials">
            {socialLinks.map((s) => (
              <a key={s.label} href={s.href} aria-label={s.label} target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  {s.icon}
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
