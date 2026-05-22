import { ScrollReveal } from "./ScrollReveal";

/**
 * The proof section. Same interview question, two answers — the one a
 * generic chatbot gives, and the one SalesPrep gives. Card B is drawn
 * from the verified Motive→Samsara fixture (the Hill & Sons construction
 * deal). The whole section's job: make the visitor see a real difference
 * a chatbot structurally could not produce.
 */
export function SeeTheDifference() {
  return (
    <section className="px-6 sm:px-14 py-20 bg-[#F7F6F3] border-b border-[#E8E4DF]">
      <ScrollReveal>
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#E8735A] mb-[14px]">
          See the difference
        </p>
      </ScrollReveal>

      <ScrollReveal delay={1}>
        <h2 className="font-[family-name:var(--font-serif)] text-[36px] sm:text-[46px] leading-[1.08] tracking-[-0.8px] text-[#1C1713] max-w-[640px] mb-3">
          Same question.
          <br />
          Two very different answers.
        </h2>
      </ScrollReveal>

      <ScrollReveal delay={2}>
        <p className="text-[16px] leading-relaxed text-[#7A6F65] max-w-[560px] mb-10 font-light">
          The interviewer asks the same thing both candidates. One uses a
          generic AI tool. One uses SalesPrep.
        </p>
      </ScrollReveal>

      <ScrollReveal delay={2}>
        <p className="text-[12px] font-medium tracking-[0.05em] text-[#1C1713] mb-5 max-w-[1200px] mx-auto">
          <span className="text-[#9B8E82] uppercase tracking-[0.1em]">
            Question:
          </span>{" "}
          &ldquo;Why do you want to work at Samsara?&rdquo;
        </p>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-[1200px] mx-auto">
        {/* ── Card A — generic AI prep ── */}
        <ScrollReveal delay={2}>
          <div className="bg-white border border-[#E8E4DF] rounded-2xl p-6 sm:p-7 h-full flex flex-col opacity-90">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#9B8E82]" />
              <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#9B8E82]">
                Generic AI prep
              </p>
            </div>

            <blockquote className="text-[14px] sm:text-[15px] text-[#7A6F65] leading-[1.65] font-light flex-1">
              &ldquo;I&rsquo;m really excited about Samsara because of your
              innovative platform and strong position in the connected-operations
              market. I admire the mission, and I think my background in sales
              would be a great fit for the team.&rdquo;
            </blockquote>

            <p className="text-[11px] text-[#9B8E82] italic mt-4 pt-3 border-t border-[#F1ECE6]">
              An answer the interviewer has heard before.
            </p>
          </div>
        </ScrollReveal>

        {/* ── Card B — SalesPrep ── */}
        <ScrollReveal delay={3}>
          <div className="bg-white border-2 border-[#E8735A] rounded-2xl p-6 sm:p-7 h-full flex flex-col shadow-[0_8px_28px_rgba(232,115,90,0.12)]">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#E8735A]" />
              <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#E8735A]">
                SalesPrep
              </p>
            </div>

            <blockquote className="text-[14px] sm:text-[15px] text-[#1C1713] leading-[1.65] font-light flex-1">
              &ldquo;The honest answer is I&rsquo;ve been studying Samsara from
              the other side of the table for three years. I lost a 120-truck
              construction fleet in Texas when the safety director told me,
              point-blank, they were leaning Samsara because Samsara&rsquo;s
              site and equipment visibility covered their yard. I tried to
              reframe it — but deep down I knew it was real. Motive is strong
              on the vehicle side. Samsara goes wider. I&rsquo;d rather sell
              from the side telling the stronger story.&rdquo;
            </blockquote>

            <p className="text-[11px] text-[#7A6F65] mt-4 pt-3 border-t border-[#F1ECE6]">
              Built from a real deal the candidate worked at Motive.
            </p>
          </div>
        </ScrollReveal>
      </div>

      <ScrollReveal delay={3}>
        <p className="text-[14px] sm:text-[15px] text-[#7A6F65] max-w-[640px] mx-auto text-center mt-10 leading-relaxed">
          Card B is only possible because SalesPrep researched how Motive and
          Samsara actually compete — and asked the candidate what{" "}
          <span className="text-[#1C1713] font-medium">they</span> saw. A
          generic tool never asks.
        </p>
      </ScrollReveal>
    </section>
  );
}
