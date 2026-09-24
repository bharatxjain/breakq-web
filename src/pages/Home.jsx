import Hero from "../components/Hero";
import SupportingKiranas from "../components/SupportingKiranas";
import Features from "../components/Features";
import FAQ, { faqs } from "../components/FAQ";
import MultiLang from "../components/MultiLang";
import SustainablePartners from "../components/SustainablePartners";
import StepJourney from "../components/StepJourney";
import { useSeo, SITE_URL } from "../lib/seo";

// Module-level constant so useSeo's effect doesn't re-run on every render -
// see the "stable reference" note on useSeo. Built from the same `faqs`
// FAQ.jsx renders, so the two can't drift apart.
const HOME_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "BreakQ",
      legalName: "KKS Private Limited",
      url: SITE_URL,
      // TODO: swap for a real >=112x112 PNG logo once one exists.
      logo: `${SITE_URL}/favicon.svg`,
      description:
        "BreakQ is a multi-vendor hyperlocal marketplace connecting neighbourhood Kirana, dairy, medical and electrical stores with local shoppers.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "BreakQ",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

export default function Home() {
  useSeo({
    title: "Your Neighborhood's Digital Marketplace",
    description:
      "Order from verified local Kirana, dairy, medical and electrical stores near you. Search in your language and choose delivery or skip-the-queue pickup.",
    path: "/",
    jsonLd: HOME_JSON_LD,
  });

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
