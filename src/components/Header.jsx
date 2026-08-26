import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import Logo from './Logo'
import './Header.css'

const links = [
  { label: 'Home', to: '/' },
  { label: 'About us', to: '/about' },
  { label: 'Careers', to: '#' },
  { label: 'Contact us', to: '/contact' },
]

export default function Header() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="brand" onClick={() => setOpen(false)}>
          <Logo size={44} />
          <div className="brand-text">
            <span className="brand-name">
              Break<span className="brand-pro">Q</span>
            </span>
            <span className="brand-tag">Your Neighborhood's Digital Marketplace</span>
          </div>
        </Link>

        <nav className="nav">
          {links.map((link) =>
            link.to === '#' ? (
              <a key={link.label} href="#">
                {link.label}
              </a>
            ) : (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) => (isActive ? 'nav-active' : undefined)}
              >
                {link.label}
              </NavLink>
            )
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
          className={`menu-toggle ${open ? 'is-open' : ''}`}
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className={`mobile-nav-backdrop ${open ? 'is-open' : ''}`} onClick={() => setOpen(false)} />

      <div className={`mobile-nav ${open ? 'is-open' : ''}`}>
        <nav>
          {links.map((link) =>
            link.to === '#' ? (
              <a key={link.label} href="#" onClick={() => setOpen(false)}>
                {link.label}
              </a>
            ) : (
              <NavLink
                key={link.label}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) => (isActive ? 'nav-active' : undefined)}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </NavLink>
            )
          )}
        </nav>
        <a
          href="https://play.google.com/store/apps/details?id=com.kks.bharatkirana"
          className="btn btn-black mobile-nav-cta"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpen(false)}
        >
          Download App
        </a>
      </div>
    </header>
  )
}
