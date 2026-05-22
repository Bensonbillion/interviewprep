import { ScrollReveal } from "./ScrollReveal";

const STEPS = [
  {
    n: "01",
    emoji: "🧭",
    bg: "#FEF0EB",
    title: "Tell us where you've been and where you're headed.",
    body: "Your resume and your target company. SalesPrep figures out how they relate — competitor, adjacent, a step up, a category switch.",
    tag: "30 seconds",
  },
  {
    n: "02",
    emoji: "💬",
    bg: "#EFF6FF",
    title: "Answer a few sharp questions only you can answer.",
    body: "We ask the questions a good sales coach would: which deals did you lose, and why? What did the buyer actually say? We can't guess these — and we don't try.",
    tag: "3 minutes",
  },
  {
    n: "03",
    emoji: "✨",
    bg: "#F0FDF4",
    title: "Get a kit that sounds like one person who did the work.",
    body: "Every answer — your \"tell me about yourself,\" your \"why this company,\" your behavioral stories — built from one coherent story. Specific, honest, yours.",
    tag: "Instant",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="px-6 sm:px-14 py-20 border-b border-[#E8E4DF]"
    >
      <ScrollReveal>
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#E8735A] mb-[14px]">
          How it works
        </p>
      </ScrollReveal>
      <ScrollReveal delay={1}>
        <h2 className="font-[family-name:var(--font-serif)] text-[36px] sm:text-[46px] leading-[1.08] tracking-[-0.8px] text-[#1C1713] max-w-[560px] mb-2">
          One coherent story.
          <br />
          Three steps to get there.
        </h2>
      </ScrollReveal>
      <ScrollReveal delay={2}>
        <p className="text-[16px] leading-relaxed text-[#7A6F65] max-w-[520px] mb-12 font-light">
          The best answer lives in your head, not on your resume. Step 2 is
          where we ask for it.
        </p>
      </ScrollReveal>
      <ScrollReveal delay={2}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#E8E4DF] border border-[#E8E4DF] rounded-2xl overflow-hidden">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="bg-white p-6 sm:p-8 group hover:bg-[#F7F6F3] transition-colors duration-300"
            >
              <div className="font-[family-name:var(--font-serif)] text-[40px] text-[#E8E4DF] leading-none mb-5">
                {step.n}
              </div>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-[20px] mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300"
                style={{ backgroundColor: step.bg }}
              >
                {step.emoji}
              </div>
              <h3 className="text-[15px] font-medium text-[#1C1713] mb-2 leading-snug">
                {step.title}
              </h3>
              <p className="text-[13px] leading-[1.65] text-[#7A6F65] mb-4">
                {step.body}
              </p>
              <span className="inline-flex items-center text-[11px] font-medium text-[#9B8E82] bg-[#F7F6F3] border border-[#E8E4DF] px-[10px] py-1 rounded-full">
                {step.tag}
              </span>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
