import type { Metadata } from "next";
import { Hero } from "@/components/landing/Hero";
import { LogoStrip } from "@/components/landing/LogoStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WhySalesPrep } from "@/components/landing/WhySalesPrep";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { StickyMobileCTA } from "@/components/landing/StickyMobileCTA";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqPageSchema, howToSchema } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "SalesPrep AI — Nail Your Tech Sales Interview",
  description:
    "AI-powered interview prep for SDR, BDR, and AE candidates. Get personalized answers built from your resume and target company. Free to start.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SalesPrep AI — Nail Your Tech Sales Interview",
    description:
      "Personalized interview answers built from your resume and target company. Ready in 5 minutes.",
    type: "website",
  },
};

const HOME_FAQ = [
  {
    question: "What is SalesPrep AI?",
    answer:
      "SalesPrep AI is an AI-powered interview preparation tool built specifically for tech sales roles — SDR, BDR, Account Executive, and more. It generates personalized answers from your resume and target company.",
  },
  {
    question: "How does SalesPrep AI work?",
    answer:
      "Upload your resume, enter your target company and role, and SalesPrep AI generates a complete prep kit with company-specific answers to common interview questions, cold call scripts, objection handling, and more.",
  },
  {
    question: "Is SalesPrep AI free?",
    answer:
      "Yes! SalesPrep AI offers a free tier with 3 prep kits. Premium plans unlock unlimited prep kits, advanced mock interviews, and company-specific playbooks.",
  },
  {
    question: "What sales roles does SalesPrep AI cover?",
    answer:
      "SalesPrep AI covers SDR (Sales Development Representative), BDR (Business Development Representative), Account Executive, Account Manager, and Customer Success Manager interview preparation.",
  },
  {
    question: "Can I prep for a specific company's interview?",
    answer:
      "Yes. SalesPrep AI researches your target company and tailors all answers to their products, values, and interview style. We have intelligence on 500+ SaaS companies.",
  },
];

const PREP_STEPS = [
  {
    name: "Upload your resume",
    text: "Drop in your resume and SalesPrep AI extracts your key achievements, metrics, and experience to personalize every answer.",
  },
  {
    name: "Enter your target company and role",
    text: "Tell us which company and role you're interviewing for. We research the company and tailor your prep kit to their specific interview style.",
  },
  {
    name: "Practice with your prep kit",
    text: "Get personalized answers for behavioral questions, cold call scripts, objection handling, and more. Edit, practice, and walk in confident.",
  },
];

export default function HomePage() {
  return (
    <main className="pb-20 md:pb-0">
      <JsonLd data={faqPageSchema(HOME_FAQ)} />
      <JsonLd
        data={howToSchema({
          name: "How to Prepare for a Tech Sales Interview with AI",
          description:
            "Use SalesPrep AI to create a personalized interview prep kit in under 5 minutes.",
          totalTime: "PT5M",
          steps: PREP_STEPS,
        })}
      />
      <Hero />
      <LogoStrip />
      <HowItWorks />
      <WhySalesPrep />
      <FinalCTA />
      <Footer />
      <StickyMobileCTA />
    </main>
  );
}
