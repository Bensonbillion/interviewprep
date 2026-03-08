import type { Metadata } from "next";
import { WizardHeader } from "./components/WizardHeader";
import { GetStartedContent } from "./components/GetStartedContent";

export const metadata: Metadata = {
  title: "Get Started — SalesPrep AI",
  description: "Start building your personalized sales interview prep kit.",
};

export default function GetStartedPage() {
  return (
    <main className="min-h-screen bg-[#F0F7FF] px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <WizardHeader currentStep={1} />
        <GetStartedContent />
      </div>
    </main>
  );
}
