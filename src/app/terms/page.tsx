import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { TERMS_MD } from "@/content/legal/terms";

export const metadata: Metadata = {
  title: "Terms of Service — SalesPrep AI",
  description:
    "The agreement between you and SalesPrep AI (operated by Roadmap Engine Inc.) governing your use of the platform.",
  alternates: { canonical: "/terms" },
};

export default function TermsOfServicePage() {
  return <LegalPage content={TERMS_MD} />;
}
