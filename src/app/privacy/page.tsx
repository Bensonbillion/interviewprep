import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { PRIVACY_MD } from "@/content/legal/privacy";

export const metadata: Metadata = {
  title: "Privacy Policy — SalesPrep AI",
  description:
    "How SalesPrep AI (operated by Roadmap Engine Inc.) collects, uses, and protects your personal information under PIPEDA.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPolicyPage() {
  return <LegalPage content={PRIVACY_MD} />;
}
