import { Building2, Sparkles, Target } from "lucide-react";

const STEPS = [
  {
    icon: Building2,
    num: "1",
    title: "Tell us about your interview",
    description: "Company, role, and interview stage. That\u2019s it.",
  },
  {
    icon: Sparkles,
    num: "2",
    title: "Get your AI prep kit",
    description:
      "Personalized answers, company-specific questions, and interviewer intel.",
  },
  {
    icon: Target,
    num: "3",
    title: "Practice and nail it",
    description: "Review, refine, and walk in ready.",
  },
];

export function HowItWorks() {
  return (
    <section className="bg-[#222] py-14 md:py-20">
      <div className="max-w-[1120px] mx-auto px-5">
        <h2 className="text-2xl md:text-3xl font-bold text-[#e0e0e0] text-center leading-tight">
          From anxious to confident in 3 steps
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
          {STEPS.map(({ icon: Icon, num, title, description }) => (
            <div key={num} className="text-center">
              <div className="w-12 h-12 rounded-xl bg-[#2a2a2a] flex items-center justify-center mx-auto mb-3">
                <Icon className="w-5 h-5 text-[#4A7AFF]" />
              </div>
              <p className="text-xs font-bold text-[#4A7AFF] mb-1.5">Step {num}</p>
              <h3 className="text-base font-semibold text-[#e0e0e0]">{title}</h3>
              <p className="text-sm text-[#999] mt-1.5 leading-relaxed max-w-xs mx-auto">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
