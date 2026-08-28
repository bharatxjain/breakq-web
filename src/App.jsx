import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import FloatingQR from './components/FloatingQR'
import ScrollToTop from './components/ScrollToTop'
import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Returns from './pages/Returns'
import WhyBreakQ from './pages/WhyBreakQ'
import BecomePartner from './pages/BecomePartner'

// Admin panel — its own bundle, never downloaded by normal visitors.
const Admin = lazy(() => import('./pages/Admin'))

// The public marketing site — header, footer, floating CTA.
function SiteLayout() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/why-breakq" element={<WhyBreakQ />} />
          <Route path="/become-a-partner" element={<BecomePartner />} />
        </Routes>
      </main>
      <Footer />
      <FloatingQR />
    </>
  )
}

export default function App() {
  return (
    <Suspense fallback={null}>
      <Routes>
        {/* Hidden — not linked anywhere. Reachable only by typing /admin. */}
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/*" element={<SiteLayout />} />
      </Routes>
    </Suspense>
  )
}
