import { ScrollReveal } from "./ScrollReveal";

const NUMBERS = [
  { n: "40+", title: "Companies pre-loaded", body: "Gong, HubSpot, Salesforce, Datadog, Outreach and more — real scoring criteria, real methodology." },
  { n: "9", title: "Call phases in Live Mode", body: "Opener → Hypothesis → Technical → Personal → Business + Traps → Recap → Recommendation → Close." },
  { n: "30", title: "Cards in your teleprompter", body: "Every question, every listen cue, every pause — preloaded. Nothing to think about except the prospect." },
];

export function StatsGrid() {
  return (
    <section className="px-6 sm:px-14 py-20 border-b border-[#E8E4DF]">
      <ScrollReveal><p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#E8735A] mb-[14px]">The numbers</p></ScrollReveal>
      <ScrollReveal delay={1}><h2 className="font-[family-name:var(--font-serif)] text-[36px] sm:text-[46px] leading-[1.08] tracking-[-0.8px] text-[#1C1713] max-w-[460px] mb-12">Built on real intel,<br />not guesswork.</h2></ScrollReveal>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {NUMBERS.map((item, i) => (
          <ScrollReveal key={i} delay={(i + 1) as 1 | 2 | 3}>
            <div className="bg-white border border-[#E8E4DF] rounded-[14px] p-7 relative overflow-hidden group cursor-default hover:-translate-y-[3px] hover:border-[#E8735A] transition-all duration-300">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#E8735A] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300" />
              <div className="font-[family-name:var(--font-serif)] text-[52px] text-[#E8735A] leading-none mb-[10px]">{item.n}</div>
              <div className="text-[14px] font-medium text-[#1C1713] mb-[6px]">{item.title}</div>
              <div className="text-[13px] leading-relaxed text-[#7A6F65]">{item.body}</div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
