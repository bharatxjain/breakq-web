import Hero from "../components/Hero";
import SupportingKiranas from "../components/SupportingKiranas";
import Features from "../components/Features";
import NightBanner from "../components/NightBanner";
import MultiLang from "../components/MultiLang";
import SustainablePartners from "../components/SustainablePartners";

export default function Home() {
  return (
    <>
      <Hero />
      <SupportingKiranas />
      <Features />
      <MultiLang />
      <SustainablePartners />
      <NightBanner />
    </>
  );
}
