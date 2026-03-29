"use client";
import { useEffect, useState } from "react";
import { ScrollReveal } from "./ScrollReveal";

const PHASES = [
  { phase: "TECHNICAL PAIN · Phase 4 of 9", q: "Walk me through what happens when a deal slips — from when your rep flags it to when leadership finds out. What does that gap look like?", listen: "Delayed visibility, manual updates, surprise in forecast review" },
  { phase: "PERSONAL PAIN · Phase 5 of 9", q: "What part of managing your reps' pipeline takes up more time than it should for you personally?", listen: "Manual CRM updates, building forecast reports, coaching without call data" },
  { phase: "BUSINESS PAIN · Phase 6 of 9", q: "If you could see every deal risk in real time — before it became a missed quarter — what would that mean for your forecast accuracy?", listen: "Let them calculate the value — this is the PBO moment" },
];
const PILLS = ["Flow Mode", "Call Mode", "Cue Card Mode", "Rescue Deck"];

export function Testimonials() {
  const [ph, setPh] = useState(0);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const t = setInterval(() => { setFading(true); setTimeout(() => { setPh((p) => (p + 1) % PHASES.length); setFading(false); }, 320); }, 3800);
    return () => clearInterval(t);
  }, []);
  const cur = PHASES[ph];

  return (
    <section className="px-6 sm:px-14 py-20 border-b border-[#E8E4DF] overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <ScrollReveal scale threshold={0.2}>
          <div className="flex justify-center animate-float-phone">
            <div className="bg-[#0A0A0F] rounded-[36px] p-5 max-w-[280px] w-full border-[6px] border-[#2A2A2E] relative overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-[#0A0A0F] rounded-b-2xl z-10" />
              <div className="absolute inset-0 pointer-events-none overflow-hidden"><div className="w-full h-10 animate-scan-line" style={{ background: "linear-gradient(180deg,transparent,rgba(232,115,90,0.04),transparent)" }} /></div>
              <div className="relative pt-2 min-h-[320px]">
                <div className="flex justify-between items-center mb-2.5"><span className="text-[10px] text-[rgba(232,115,90,0.5)]">← Exit</span><span className="text-[10px] font-mono text-[rgba(247,246,243,0.2)]">4:18</span></div>
                <div className="h-[2px] bg-[#1A1A20] rounded-full mb-5"><div className="h-full bg-[#E8735A] rounded-full w-[42%] transition-all duration-500" /></div>
                <p className="text-[9px] font-medium uppercase tracking-[0.1em] text-[#F59E0B] text-center mb-[14px] transition-all duration-300" style={{ opacity: fading ? 0 : 1, transform: fading ? "translateY(6px)" : "translateY(0)" }}>{cur.phase}</p>
                <p className="font-[family-name:var(--font-serif)] text-[19px] leading-[1.45] text-[#E8E8E8] text-center px-1 mb-[18px] transition-all duration-300" style={{ opacity: fading ? 0 : 1, transform: fading ? "translateY(6px)" : "translateY(0)", transitionDelay: "0.05s" }}>{cur.q}</p>
                <div className="flex items-start gap-2 p-[10px] bg-[rgba(245,158,11,0.07)] border-l-2 border-[#F59E0B] mb-5 transition-opacity duration-300" style={{ opacity: fading ? 0 : 1, transitionDelay: "0.1s" }}>
                  <span className="text-[9px] font-medium text-[#F59E0B] flex-shrink-0 uppercase tracking-[0.06em] mt-[1px]">Listen</span>
                  <span className="text-[10px] text-[rgba(245,158,11,0.65)] leading-[1.5]">{cur.listen}</span>
                </div>
                <div className="flex items-center justify-center gap-1">
                  {[0, 1, 2, 3, 4, 5].map((i) => (<div key={i} className={`h-1 rounded-full transition-all duration-300 ${i < ph ? "w-2 bg-[#10B981]" : i === ph ? "w-[18px] bg-[#E8E8E8]" : "w-2 bg-[#2A2B3D]"}`} />))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={1}>
          <p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#E8735A] mb-[14px]">Live mode</p>
          <h3 className="font-[family-name:var(--font-serif)] text-[30px] sm:text-[36px] leading-[1.1] tracking-[-0.5px] text-[#1C1713] mb-4">During your call,<br />one tap at a time.</h3>
          <p className="text-[15px] leading-[1.7] text-[#7A6F65] mb-4 font-light">Live mode turns your phone into a co-pilot. One question. Read it. Deliver it. Tap. The next line appears. All 9 phases — opener to close — fully sequenced.</p>
          <p className="text-[13px] leading-[1.7] text-[#7A6F65] mb-6">If they open with the problem before you ask — there&apos;s a rescue deck. If the conversation drifts — there&apos;s a bridge line. Every scenario covered.</p>
          <div className="flex flex-wrap gap-2">
            {PILLS.map((pill) => (<span key={pill} className="text-[12px] font-medium px-3 py-[5px] rounded-full border border-[#E8E4DF] text-[#7A6F65]">{pill}</span>))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
