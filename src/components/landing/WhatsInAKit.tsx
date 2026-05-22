import { ScrollReveal } from "./ScrollReveal";

/**
 * The centerpiece of the v2 rebuild — what the shipped page was missing.
 *
 * Shows real excerpts from FIVE different answer types in one Motive→
 * Samsara kit, so the visitor sees that "a kit" is a complete, multi-
 * part deliverable — not a single clever answer. Every excerpt below is
 * lifted from tests/fixtures/landing-kit-samples.json, which is real
 * Sonnet output generated end-to-end via the engine→interview→spine→
 * generate pipeline. The Motive AE candidate is a synthetic test
 * fixture (not a real user).
 *
 * Critically: card #1 is a real personal-arc TMAY that is visibly NOT a
 * competitive answer — fixing the "competitive insight ate the product"
 * problem the v1 page had.
 */

interface KitCard {
  question: string;
  type: string;
  excerpt: string;
  /** Whether this card is the competitive scroll-stopper. */
  highlight?: boolean;
}

const CARDS: KitCard[] = [
  {
    question: "Tell me about yourself",
    type: "Personal arc",
    excerpt:
      "I've spent the last three years as a mid-market AE at Motive, closing fleet telematics and AI dashcam deals to trucking and construction fleets across Texas and the Southwest. Full-cycle motion the whole time — outbound prospecting, discovery with safety directors, all the way through close. I started at ADP as an SDR before that. The last three years is where the deal complexity came from.",
  },
  {
    question: "Why Samsara?",
    type: "Competitive read",
    highlight: true,
    excerpt:
      "I've been at Motive for three years going head-to-head with Samsara. The losses taught me something — when a buyer is running mixed operations, Samsara's unified platform just covers more ground. I'd rather sell from that side.",
  },
  {
    question: "Tell me about a deal you lost",
    type: "Behavioral STAR",
    excerpt:
      "A 75-truck regional carrier in the Southwest, mid last year. I'd built a strong relationship with the fleet director but I hadn't gone deep enough into the org — the VP of Operations came in late with a prior relationship with the Samsara rep. They went with Samsara. So I changed something concrete: I started mapping every account's org chart in Salesforce within the first two weeks of a deal — at least two levels up. The lesson was that a strong champion at the wrong level isn't a champion. It's a false ceiling.",
  },
  {
    question: "You've never sold SaaS — why hire you?",
    type: "Objection handling",
    excerpt:
      "Yeah, totally fair — I'd ask the same question. Here's the thing: I've spent three years at Motive selling against Samsara. I know the 73% crash-reduction stat. I know the site-visibility pitch. I know exactly how your AEs frame the platform breadth story — because I've had to beat it, and sometimes I didn't.",
  },
  {
    question: "Questions to ask your interviewer",
    type: "Close-the-room",
    excerpt:
      "Based on everything we've talked about — I came in knowing Samsara's pitch from the other side of the table, and I think that's actually a faster ramp than most candidates you'll see. But I'd rather know now: is there anything about my background that gives you hesitation about moving me forward?",
  },
];

export function WhatsInAKit() {
  return (
    <section className="px-6 sm:px-14 py-20 bg-[#F7F6F3] border-b border-[#E8E4DF]">
      <ScrollReveal>
        <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#E8735A] mb-[14px]">
          What&rsquo;s in a kit
        </p>
      </ScrollReveal>
      <ScrollReveal delay={1}>
        <h2 className="font-[family-name:var(--font-serif)] text-[36px] sm:text-[46px] leading-[1.08] tracking-[-0.8px] text-[#1C1713] max-w-[680px] mb-3">
          Every kit is a full interview, answered.
        </h2>
      </ScrollReveal>
      <ScrollReveal delay={2}>
        <p className="text-[16px] leading-relaxed text-[#7A6F65] max-w-[560px] mb-12 font-light">
          Not one clever line — every question they&rsquo;ll actually ask, in
          your voice, ready to practice.
        </p>
      </ScrollReveal>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 max-w-[1100px]">
        {CARDS.map((card, i) => (
          <ScrollReveal
            key={card.question}
            delay={((i % 3) + 1) as 1 | 2 | 3}
          >
            <article
              className={`bg-white border rounded-2xl p-5 sm:p-6 h-full flex flex-col ${
                card.highlight
                  ? "border-[#E8735A]/40 shadow-[0_4px_20px_rgba(232,115,90,0.08)]"
                  : "border-[#E8E4DF]"
              }`}
            >
              <div className="flex items-baseline justify-between gap-3 mb-3">
                <h3 className="text-[14px] sm:text-[15px] font-medium text-[#1C1713] leading-snug">
                  {card.question}
                </h3>
                <span
                  className={`text-[10px] font-medium tracking-[0.06em] uppercase whitespace-nowrap flex-shrink-0 ${
                    card.highlight ? "text-[#E8735A]" : "text-[#9B8E82]"
                  }`}
                >
                  {card.type}
                </span>
              </div>
              <blockquote className="text-[13px] sm:text-[14px] text-[#3A3530] leading-[1.65] font-light flex-1">
                &ldquo;{card.excerpt}&rdquo;
              </blockquote>
            </article>
          </ScrollReveal>
        ))}
      </div>

      <ScrollReveal delay={3}>
        <p className="text-[14px] sm:text-[15px] text-[#7A6F65] max-w-[640px] mt-10 leading-relaxed">
          One kit. Built from one conversation with you. Every answer in your
          voice, ready to practice.
        </p>
      </ScrollReveal>
    </section>
  );
}
