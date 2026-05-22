import { ScrollReveal } from "./ScrollReveal";

/**
 * A short setup beat between hero and how-it-works. The shipped v1
 * jumped straight from promise to proof — never naming the pain.
 * Three sentences, then move on.
 */
export function TheProblem() {
  return (
    <section className="px-6 sm:px-14 py-16 sm:py-20 border-b border-[#E8E4DF]">
      <div className="max-w-[760px]">
        <ScrollReveal>
          <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#E8735A] mb-[14px]">
            The problem
          </p>
        </ScrollReveal>
        <ScrollReveal delay={1}>
          <h2 className="font-[family-name:var(--font-serif)] text-[34px] sm:text-[44px] leading-[1.1] tracking-[-0.6px] text-[#1C1713] mb-4">
            Generic prep gets you a generic answer.
          </h2>
        </ScrollReveal>
        <ScrollReveal delay={2}>
          <p className="text-[16px] sm:text-[17px] leading-[1.7] text-[#7A6F65] font-light">
            You can paste your resume into a chatbot and get answers. They will
            be fluent, polished, and say nothing — the same answers it gives
            everyone. An interviewer has heard them a hundred times. The answer
            that gets you hired is specific to you, to them, and to the deal
            you actually worked. Generic prep can&rsquo;t reach it.
          </p>
        </ScrollReveal>
      </div>
    </section>
  );
}
