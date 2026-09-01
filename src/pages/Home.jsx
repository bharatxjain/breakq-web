import Hero from "../components/Hero";
import SupportingKiranas from "../components/SupportingKiranas";
import Features from "../components/Features";
import FAQ from "../components/FAQ";
import MultiLang from "../components/MultiLang";
import SustainablePartners from "../components/SustainablePartners";
import StepJourney from "../components/StepJourney";

export default function Home() {
  return (
    <>
      <Hero />
      <SupportingKiranas />
      <Features />
      <MultiLang />
      <StepJourney />
      <FAQ />
      <SustainablePartners />
    </>
  );
}
