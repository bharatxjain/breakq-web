import Hero from '../components/Hero'
import SupportingKiranas from '../components/SupportingKiranas'
import Features from '../components/Features'
import HowItWorks from '../components/HowItWorks'
import VoiceOrder from '../components/VoiceOrder'
import NightBanner from '../components/NightBanner'
import StatsSection from '../components/StatsSection'

export default function Home() {
  return (
    <>
      <Hero />
      <SupportingKiranas />
      <Features />
      <HowItWorks />
      <VoiceOrder />
      <NightBanner />
      <StatsSection />
    </>
  )
}
