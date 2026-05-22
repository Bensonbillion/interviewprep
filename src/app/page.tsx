import type { Metadata } from "next";
import { Hero } from "@/components/landing/Hero";
import { SeeTheDifference } from "@/components/landing/SeeTheDifference";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WhySalesPrep } from "@/components/landing/WhySalesPrep";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title:
    "SalesPrep AI — Your best interview answer is hiding in the job you're leaving.",
  description:
    "AI interview prep that uses how your current company and your target company actually compete — so your answers say what a generic chatbot can't.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title:
      "SalesPrep AI — Your best interview answer is hiding in the job you're leaving.",
    description:
      "Interview prep built on how the company you're leaving stacks up against the company you're joining. For SDRs, BDRs, and AEs.",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <main className="bg-[#F7F6F3]">
      <Hero />
      <SeeTheDifference />
      <HowItWorks />
      <WhySalesPrep />
      <FinalCTA />
      <Footer />
    </main>
  );
}
