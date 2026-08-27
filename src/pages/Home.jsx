import Hero from "../components/Hero";
import SupportingKiranas from "../components/SupportingKiranas";
import Features from "../components/Features";
import VoiceOrder from "../components/VoiceOrder";
import NightBanner from "../components/NightBanner";
import StatsSection from "../components/StatsSection";
import MultiLang from "../components/MultiLang";

export default function Home() {
  return (
    <>
      <Hero />
      <SupportingKiranas />
      <Features />
      <MultiLang />
      <NightBanner />
      <StatsSection />
    </>
  );
}
