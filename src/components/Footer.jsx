import { Link } from "react-router-dom";
import Logo from "./Logo";
import "./Footer.css";

const routes = { Home: "/", "About us": "/about", "Contact us": "/contact" };

const columns = [
  {
    title: "Platform",
    links: ["Home", "About us", "Contact us", "Bright Stores", "Merchants"],
  },
  {
    title: "Legal",
    links: ["Privacy Policy", "Terms & Conditions", "Return Policy"],
  },
  { title: "Socials", links: ["Insta", "Linkedin", "X"] },
];

export default function Footer() {
  return (
    <footer className="footer">
      <span className="footer-float ff1">🍬</span>
      <span className="footer-float ff2">🍫</span>
      <span className="footer-float ff3">🍎</span>
      <span className="footer-float ff4">🍊</span>

      <div className="container footer-top">
        <div className="footer-brand">
          <Link to="/" className="footer-brand-row">
            <Logo size={36} />
            <span>
              Break<span className="brand-pro">Q</span>
            </span>
          </Link>
          <p>BreakQ by KKS Private Limited</p>
        </div>

        {columns.map((col) => (
          <div className="footer-col" key={col.title}>
            <h4>{col.title}</h4>
            <ul>
              {col.links.map((l) => (
                <li key={l}>
                  {routes[l] ? (
                    <Link to={routes[l]}>{l}</Link>
                  ) : (
                    <a href="#">{l}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="container footer-bottom"></div>

      <div className="footer-watermark">BreakQ</div>
    </footer>
  );
}
