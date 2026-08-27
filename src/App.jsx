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

export default function App() {
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
