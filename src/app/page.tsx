import type { Metadata } from "next";
import { Hero } from "@/components/landing/Hero";
import { LogoStrip } from "@/components/landing/LogoStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { Testimonials } from "@/components/landing/Testimonials";
import { StatsGrid } from "@/components/landing/StatsGrid";
import { HomeFAQ } from "@/components/landing/HomeFAQ";
import { HOME_FAQ_DATA } from "@/lib/landing/faq-data";
import { CompanyGrid } from "@/components/landing/CompanyGrid";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { StickyMobileCTA } from "@/components/landing/StickyMobileCTA";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  faqPageSchema,
  howToSchema,
  softwareApplicationSchema,
  organizationSchema,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "SalesPrep AI — AI Interview Prep for Sales | SDR, BDR & AE",
  description:
    "AI interview prep for SDR, BDR, and AE candidates. Company-specific questions, mock cold call scripts, and personalized answers. Free to start.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SalesPrep AI — AI Interview Prep for Sales",
    description:
      "Company-specific questions, mock cold call practice, and personalized answers. Ready in 2 minutes. Free to start.",
    type: "website",
  },
};

const PREP_STEPS = [
  {
    name: "Tell us about your interview",
    text: "Enter your target company, role, and interview stage.",
  },
  {
    name: "Get your AI prep kit",
    text: "Personalized answers, company-specific questions, and interviewer intel generated in seconds.",
  },
  {
    name: "Practice and nail it",
    text: "Review, refine, and walk into your sales interview ready to close.",
  },
];

export default function HomePage() {
  return (
    <main className="pb-16 md:pb-0">
      <JsonLd data={softwareApplicationSchema()} />
      <JsonLd data={organizationSchema()} />
      <JsonLd data={faqPageSchema(HOME_FAQ_DATA)} />
      <JsonLd
        data={howToSchema({
          name: "How to Prepare for a Tech Sales Interview with AI",
          description:
            "Use SalesPrep AI to create a personalized interview prep kit in under 2 minutes.",
          totalTime: "PT2M",
          steps: PREP_STEPS,
        })}
      />
      {/* S1 — Hero */}
      <Hero />
      {/* S2 — Logo bar with internal links to /companies/* */}
      <LogoStrip />
      {/* S3 — How it works */}
      <HowItWorks />
      {/* S4 — Feature grid */}
      <FeatureGrid />
      {/* S5 — Testimonials */}
      <Testimonials />
      {/* S6 — Stats */}
      <StatsGrid />
      {/* S7 — FAQ with FAQPage schema */}
      <HomeFAQ />
      {/* Company SEO pages (shows only when published pages exist) */}
      <CompanyGrid />
      {/* S8 — Final CTA */}
      <FinalCTA />
      {/* S9 — Footer */}
      <Footer />
      {/* Sticky mobile CTA — appears after hero scrolls out */}
      <StickyMobileCTA />
    </main>
  );
}
