import Hero from "../components/Hero";
import SupportingKiranas from "../components/SupportingKiranas";
import Features from "../components/Features";
import NightBanner from "../components/NightBanner";
import StatsSection from "../components/StatsSection";

export default function Home() {
  return (
    <>
      <Hero />
      <SupportingKiranas />
      <Features />
      <NightBanner />
      <StatsSection />
    </>
  );
}
