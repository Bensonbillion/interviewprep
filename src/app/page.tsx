import type { Metadata } from "next";
import { Hero } from "@/components/landing/Hero";
import { CompanyGrid } from "@/components/landing/CompanyGrid";
import { LogoStrip } from "@/components/landing/LogoStrip";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WhySalesPrep } from "@/components/landing/WhySalesPrep";
import { Testimonials } from "@/components/landing/Testimonials";
import { StatsGrid } from "@/components/landing/StatsGrid";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "SalesPrep AI — Your interviewer has a scorecard. Now you do too.",
  description:
    "AI-powered interview prep for tech sales candidates. Company-specific scoring criteria, discovery scripts, trap questions, and a live teleprompter. Built from your resume.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "SalesPrep AI — Your interviewer has a scorecard. Now you do too.",
    description:
      "Company-specific scoring criteria, discovery scripts, trap questions, and a live teleprompter. Built from your resume.",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <main className="bg-[#F7F6F3]">
      <Hero />
      <CompanyGrid />
      <LogoStrip />
      <HowItWorks />
      <WhySalesPrep />
      <Testimonials />
      <StatsGrid />
      <FinalCTA />
      <Footer />
    </main>
  );
}
