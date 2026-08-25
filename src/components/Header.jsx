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
  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="brand">
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

        <button className="btn btn-black">Download App</button>
      </div>
    </header>
  )
}
