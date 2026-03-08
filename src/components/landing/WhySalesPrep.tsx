import { Building2, User, Target } from "lucide-react";

const DIFFERENTIATOR_CARDS = [
  {
    icon: Building2,
    title: "Researches the company for you",
    description:
      "We pull real data about their product, buyers, and competitors. Your answers show you did your homework.",
  },
  {
    icon: User,
    title: "Uses YOUR story",
    description:
      "Every answer uses your actual experience — your metrics, your deals, your career. Not a template with blanks.",
  },
  {
    icon: Target,
    title: "Built for sales interviews",
    description:
      "Cold calls, discovery demos, closing presentations. The rounds that decide who gets the offer.",
  },
];

export function WhySalesPrep() {
  return (
    <section className="bg-[#0B1120] py-16 md:py-24">
      <div className="max-w-[1120px] mx-auto px-5">
        <p className="text-xs font-semibold text-[#4A7AFF] uppercase tracking-widest text-center">
          Why SalesPrep
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mt-3 max-w-lg mx-auto leading-tight">
          ChatGPT gives advice. We give answers.
        </h2>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 max-w-4xl mx-auto">
          {/* ChatGPT — generic */}
          <div className="bg-[#131C31] rounded-2xl border border-[#1E293B] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">&#x1F916;</span>
                <span className="text-sm font-semibold text-[#64748B]">
                  ChatGPT
                </span>
              </div>
              <span className="bg-[#1E293B] text-[#64748B] text-xs px-2 py-0.5 rounded-full">
                Generic
              </span>
            </div>
            <p className="text-xs text-[#64748B] italic mb-3">
              &ldquo;Tell me about yourself&rdquo;
            </p>
            <p className="text-sm text-[#64748B] italic leading-relaxed">
              &ldquo;When answering this question, focus on your relevant sales
              experience and highlight key metrics. Start with your current role,
              mention 2&ndash;3 achievements, and explain why you&rsquo;re
              interested in the company. Keep it under 90 seconds&hellip;&rdquo;
            </p>
            <div className="mt-4 pt-4 border-t border-[#1E293B]">
              <p className="text-xs text-[#475569]">
                &#x274C; Generic advice &middot; Not personalized &middot; No
                company research
              </p>
            </div>
          </div>

          {/* SalesPrep — personalized */}
          <div className="bg-[#131C31] rounded-2xl border border-[#1E3A5F] p-6 shadow-[0_0_24px_rgba(74,122,255,0.1)]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base text-[#4A7AFF]">&#x2726;</span>
                <span className="text-sm font-semibold text-[#60A5FA]">
                  SalesPrep
                </span>
              </div>
              <span className="bg-[#172554] text-[#60A5FA] text-xs px-2 py-0.5 rounded-full">
                Personalized
              </span>
            </div>
            <p className="text-sm text-[#E2E8F0] leading-relaxed">
              &ldquo;Over the past two years at Toast, I&rsquo;ve managed a 200+
              cover territory targeting restaurant groups going through
              technology transitions. I consistently hit 118% of my outbound
              quota by building a multi-threaded prospecting approach — cold
              calls, personalized video, and strategic LinkedIn sequences.
              I&rsquo;m particularly excited about Gong because your revenue
              intelligence platform solves the exact coaching gap I saw managers
              struggle with across my team&hellip;&rdquo;
            </p>
            <div className="mt-4 pt-4 border-t border-[#1E3A5F]">
              <p className="text-xs text-[#60A5FA]">
                &#x2713; Uses your resume &middot; &#x2713; Researched the
                company &middot; &#x2713; Structured for the round
              </p>
            </div>
          </div>
        </div>

        {/* Differentiator cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          {DIFFERENTIATOR_CARDS.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-[#131C31] rounded-2xl p-6 border border-[#1E293B]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1E293B] flex items-center justify-center">
                <Icon className="w-5 h-5 text-[#4A7AFF]" />
              </div>
              <h3 className="text-base font-semibold text-white mt-4">
                {title}
              </h3>
              <p className="text-sm text-[#94A3B8] mt-2 leading-relaxed">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
