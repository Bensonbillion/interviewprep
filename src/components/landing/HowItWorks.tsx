import { FileText, Building2, MessageCircle, GitMerge, Layers, ArrowRight } from "lucide-react";
import { ScrollReveal } from "./ScrollReveal";

/**
 * Four stages of the actual pipeline, shown — not named.
 *
 * Stage 1 = Positioning Engine (shown as a resume↔company relationship line)
 * Stage 2 = Insight Interview (shown as a mock Q&A exchange)
 * Stage 3 = Narrative Spine (shown as captured answers converging into a thread)
 * Stage 4 = Kit generation (shown as a stack of multi-type cards)
 *
 * The internal names never appear. The work each step does is visible
 * in the small inline-SVG / Tailwind visuals next to the copy.
 */

interface Step {
  n: string;
  title: string;
  body: string;
  visual: React.ReactNode;
}

const STEPS: Step[] = [
  {
    n: "01",
    title: "It reads your situation.",
    body: "Your resume and your target company. SalesPrep works out how they relate — competitor, adjacent, a step up, a switch — because that changes everything about how you should answer.",
    visual: <StageOneVisual />,
  },
  {
    n: "02",
    title: "It interviews you.",
    body: "SalesPrep asks the questions a sharp sales coach would — the ones only you can answer. The best material is in your head, not your resume.",
    visual: <StageTwoVisual />,
  },
  {
    n: "03",
    title: "It builds one story.",
    body: "Your answers become one coherent story — so every part of your kit sounds like the same prepared person, not six disconnected scripts.",
    visual: <StageThreeVisual />,
  },
  {
    n: "04",
    title: "You get your kit.",
    body: "A full prep kit — every question they'll ask, answered in your voice. Ready to practice tonight.",
    visual: <StageFourVisual />,
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
        <h2 className="font-[family-name:var(--font-serif)] text-[36px] sm:text-[46px] leading-[1.08] tracking-[-0.8px] text-[#1C1713] max-w-[640px] mb-3">
          Four stages.
          <br />
          Built end to end on what you actually bring.
        </h2>
      </ScrollReveal>
      <ScrollReveal delay={2}>
        <p className="text-[16px] leading-relaxed text-[#7A6F65] max-w-[540px] mb-14 font-light">
          Most prep tools jump from your resume straight to an answer. SalesPrep
          stops three more times — because each step gets you something the next
          one needs.
        </p>
      </ScrollReveal>

      <div className="space-y-12 sm:space-y-16 max-w-[1100px]">
        {STEPS.map((step, i) => (
          <ScrollReveal key={step.n} delay={(Math.min(i + 1, 3) as 1 | 2 | 3)}>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-8 md:gap-12 items-center">
              {/* Copy side */}
              <div className={i % 2 === 0 ? "md:order-1" : "md:order-2"}>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="font-[family-name:var(--font-serif)] text-[40px] text-[#E8E4DF] leading-none">
                    {step.n}
                  </span>
                  <h3 className="text-[22px] sm:text-[26px] font-[family-name:var(--font-serif)] text-[#1C1713] leading-tight">
                    {step.title}
                  </h3>
                </div>
                <p className="text-[15px] sm:text-[16px] leading-[1.7] text-[#7A6F65] font-light max-w-[440px]">
                  {step.body}
                </p>
              </div>

              {/* Visual side */}
              <div className={i % 2 === 0 ? "md:order-2" : "md:order-1"}>
                {step.visual}
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}

// ─── Visuals ────────────────────────────────────────────────────────────────
// Each visual is a small flat composition — no heavy illustration, nothing
// claiming to be a screenshot. Just enough geometry to make the step idea
// visible.

function StageOneVisual() {
  return (
    <div className="bg-white border border-[#E8E4DF] rounded-2xl p-6 sm:p-8">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
        {/* Resume card */}
        <div className="bg-[#F7F6F3] border border-[#E8E4DF] rounded-lg p-3 flex flex-col items-center text-center">
          <FileText className="w-5 h-5 text-[#9B8E82] mb-2" />
          <p className="text-[11px] font-medium text-[#1C1713]">Your resume</p>
          <p className="text-[10px] text-[#9B8E82] mt-0.5">3 yrs · AE · Motive</p>
        </div>
        {/* Connecting line + label */}
        <div className="flex flex-col items-center gap-1">
          <svg width="44" height="20" viewBox="0 0 44 20" className="text-[#E8735A]">
            <path d="M 2 10 H 42" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="22" cy="10" r="3" fill="currentColor" />
          </svg>
        </div>
        {/* Company card */}
        <div className="bg-[#F7F6F3] border border-[#E8E4DF] rounded-lg p-3 flex flex-col items-center text-center">
          <Building2 className="w-5 h-5 text-[#9B8E82] mb-2" />
          <p className="text-[11px] font-medium text-[#1C1713]">Your target</p>
          <p className="text-[10px] text-[#9B8E82] mt-0.5">Samsara · AE role</p>
        </div>
      </div>
      <div className="mt-5 pt-4 border-t border-[#F1ECE6]">
        <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-[#9B8E82] mb-1.5">
          Relationship detected
        </p>
        <p className="text-[13px] text-[#1C1713] font-medium">
          Direct competitor → lean on lived competitive experience
        </p>
      </div>
    </div>
  );
}

function StageTwoVisual() {
  return (
    <div className="bg-white border border-[#E8E4DF] rounded-2xl p-6 sm:p-7 space-y-4">
      {/* Bot question */}
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-[#FEF0EB] flex items-center justify-center flex-shrink-0">
          <MessageCircle className="w-4 h-4 text-[#E8735A]" />
        </div>
        <div className="flex-1 bg-[#FEF0EB] border border-[#F1C9BD] rounded-lg p-3">
          <p className="text-[10px] font-medium tracking-[0.08em] uppercase text-[#E8735A] mb-1.5">
            SalesPrep
          </p>
          <p className="text-[13px] text-[#1C1713] leading-[1.55]">
            Walk me through a specific deal where Samsara was the named competitor.
            What was the deciding factor the buyer used — and what did you do?
          </p>
        </div>
      </div>
      {/* Candidate answer */}
      <div className="flex items-start gap-3 pl-8">
        <div className="flex-1 bg-[#F7F6F3] border border-[#E8E4DF] rounded-lg p-3">
          <p className="text-[10px] font-medium tracking-[0.08em] uppercase text-[#9B8E82] mb-1.5">
            You
          </p>
          <p className="text-[13px] text-[#1C1713] leading-[1.55] italic">
            &ldquo;Hill &amp; Sons, 120 trucks in Texas. Safety director was
            leaning Samsara because of the equipment-yard visibility…&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

function StageThreeVisual() {
  return (
    <div className="bg-white border border-[#E8E4DF] rounded-2xl p-6 sm:p-8">
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Captured answers fanning in */}
        <div className="flex flex-col gap-2 flex-1">
          <div className="bg-[#F7F6F3] border border-[#E8E4DF] rounded-md px-2.5 py-1.5">
            <p className="text-[10px] text-[#7A6F65] truncate">
              Hill &amp; Sons — yard objection…
            </p>
          </div>
          <div className="bg-[#F7F6F3] border border-[#E8E4DF] rounded-md px-2.5 py-1.5">
            <p className="text-[10px] text-[#7A6F65] truncate">
              Phoenix logistics — 73% reframe…
            </p>
          </div>
          <div className="bg-[#F7F6F3] border border-[#E8E4DF] rounded-md px-2.5 py-1.5">
            <p className="text-[10px] text-[#7A6F65] truncate">
              Lost the VP-Ops deal — what changed…
            </p>
          </div>
        </div>
        <GitMerge className="w-6 h-6 text-[#E8735A] flex-shrink-0 rotate-90" />
        {/* Single coherent story */}
        <div className="bg-[#1C1713] text-white rounded-lg p-3 flex-1">
          <p className="text-[9px] font-medium tracking-[0.1em] uppercase text-[#E8735A] mb-1.5">
            Your thesis
          </p>
          <p className="text-[12px] leading-[1.5] text-[rgba(247,246,243,0.9)]">
            Three years against Samsara. I want to sell from the side I watched
            win.
          </p>
        </div>
      </div>
    </div>
  );
}

function StageFourVisual() {
  const CARDS = [
    { label: "Tell me about yourself", tag: "Personal arc" },
    { label: "Why Samsara?", tag: "Competitive" },
    { label: "Deal you lost", tag: "Behavioral STAR" },
    { label: "Objection: no SaaS exp.", tag: "Handling" },
    { label: "Questions to ask", tag: "Discovery" },
  ];
  return (
    <div className="bg-white border border-[#E8E4DF] rounded-2xl p-6 sm:p-7">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-4 h-4 text-[#E8735A]" />
        <p className="text-[11px] font-medium tracking-[0.08em] uppercase text-[#E8735A]">
          Your kit — 5 of 12 cards shown
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CARDS.map((card) => (
          <div
            key={card.label}
            className="bg-[#F7F6F3] border border-[#E8E4DF] rounded-md px-3 py-2.5 flex items-center justify-between gap-2"
          >
            <p className="text-[12px] text-[#1C1713] font-medium truncate">
              {card.label}
            </p>
            <ArrowRight className="w-3.5 h-3.5 text-[#9B8E82] flex-shrink-0" />
          </div>
        ))}
      </div>
      <p className="text-[11px] text-[#9B8E82] mt-4 pt-3 border-t border-[#F1ECE6]">
        Practice the whole interview — not one clever answer.
      </p>
    </div>
  );
}
