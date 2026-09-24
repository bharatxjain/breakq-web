import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import FloatingQR from './components/FloatingQR'
import ScrollToTop from './components/ScrollToTop'
// Each public route gets its own chunk, so landing on any one page (most
// often "/") only downloads that page's code - not all eight, plus Admin.
// This is the single biggest lever on initial JS payload / LCP / TBT for a
// CSR app like this one.
const Home = lazy(() => import('./pages/Home'))
const About = lazy(() => import('./pages/About'))
const Contact = lazy(() => import('./pages/Contact'))
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Returns = lazy(() => import('./pages/Returns'))
const WhyBreakQ = lazy(() => import('./pages/WhyBreakQ'))
const BecomePartner = lazy(() => import('./pages/BecomePartner'))

// Admin panel - its own bundle, never downloaded by normal visitors.
const Admin = lazy(() => import('./pages/Admin'))

// The public marketing site - header, footer, floating CTA.
function SiteLayout() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main>
        {/* Its own boundary so a page-chunk load only blanks the content
            area, Header/Footer/FloatingQR stay mounted across route changes. */}
        <Suspense fallback={null}>
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
        </Suspense>
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
        {/* Hidden - not linked anywhere. Reachable only by typing /admin. */}
        <Route path="/admin/*" element={<Admin />} />
        <Route path="/*" element={<SiteLayout />} />
      </Routes>
    </Suspense>
  )
}
