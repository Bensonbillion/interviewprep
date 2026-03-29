import { ScrollReveal } from "./ScrollReveal";

const STEPS = [
  { n: "01", emoji: "📄", bg: "#FEF0EB", title: "Upload your resume", body: "We extract your metrics, experience, and career arc. Every answer in your kit reflects your actual story — not a generic template.", tag: "30 seconds" },
  { n: "02", emoji: "🏢", bg: "#EFF6FF", title: "Pick your company and round", body: "Choose who you're interviewing with and which stage. We research their methodology, what the grader scores, and what to expect.", tag: "60 seconds" },
  { n: "03", emoji: "✨", bg: "#F0FDF4", title: "Get your full prep kit", body: "10 cards instantly — hypothesis, discovery questions, trap questions, pain recap, scoring guide, live teleprompter. Ready now.", tag: "Instant" },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 sm:px-14 py-20 border-b border-[#E8E4DF]">
      <ScrollReveal>
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#E8735A] mb-[14px]">How it works</p>
      </ScrollReveal>
      <ScrollReveal delay={1}>
        <h2 className="font-[family-name:var(--font-serif)] text-[36px] sm:text-[46px] leading-[1.08] tracking-[-0.8px] text-[#1C1713] max-w-[520px] mb-2">From zero to ready<br />in three steps.</h2>
      </ScrollReveal>
      <ScrollReveal delay={2}>
        <p className="text-[16px] leading-relaxed text-[#7A6F65] max-w-[480px] mb-12 font-light">Your resume comes first. Everything after is built around your real experience — not a template.</p>
      </ScrollReveal>
      <ScrollReveal delay={2}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#E8E4DF] border border-[#E8E4DF] rounded-2xl overflow-hidden">
          {STEPS.map((step) => (
            <div key={step.n} className="bg-white p-6 sm:p-8 group hover:bg-[#F7F6F3] transition-colors duration-300">
              <div className="font-[family-name:var(--font-serif)] text-[40px] text-[#E8E4DF] leading-none mb-5">{step.n}</div>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-[20px] mb-4 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300" style={{ backgroundColor: step.bg }}>{step.emoji}</div>
              <h3 className="text-[15px] font-medium text-[#1C1713] mb-2">{step.title}</h3>
              <p className="text-[13px] leading-[1.65] text-[#7A6F65] mb-4">{step.body}</p>
              <span className="inline-flex items-center text-[11px] font-medium text-[#9B8E82] bg-[#F7F6F3] border border-[#E8E4DF] px-[10px] py-1 rounded-full">{step.tag}</span>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
