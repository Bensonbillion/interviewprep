import { Building2, Phone, UserSearch, MessageSquare } from "lucide-react";

const FEATURES = [
  {
    icon: Building2,
    title: "Company-Specific Prep",
    description:
      "Research and questions tailored to your target company\u2019s product, customers, and interview style.",
  },
  {
    icon: Phone,
    title: "Mock Cold Call Scripts",
    description:
      "Practice the roleplay round that eliminates 70% of SDR candidates.",
  },
  {
    icon: UserSearch,
    title: "Interviewer Research",
    description:
      "Know who\u2019s across the table before you sit down.",
  },
  {
    icon: MessageSquare,
    title: "Answers That Sound Like You",
    description:
      "AI that writes how you talk, not how robots write. Built from your resume and real experience.",
  },
];

export function FeatureGrid() {
  return (
    <section className="bg-[#1a1a1a] py-14 md:py-20">
      <div className="max-w-[1120px] mx-auto px-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-[#222] rounded-xl p-5 border border-[#2a2a2a]"
            >
              <div className="w-10 h-10 rounded-lg bg-[#2a2a2a] flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-[#4A7AFF]" />
              </div>
              <h3 className="text-sm font-semibold text-[#e0e0e0]">{title}</h3>
              <p className="text-xs text-[#999] mt-1.5 leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
