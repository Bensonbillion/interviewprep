"use client";
import { useEffect, useRef } from "react";
import { ScrollReveal } from "./ScrollReveal";

const BAD = [
  "Generic discovery questions not tied to any methodology",
  "No awareness of the 7 scoring categories the grader is using",
  "No trap questions — no knowledge of Gong's differentiators",
  '"I recommend Gong\'s Revenue Intelligence platform" — the phrase that fails the interview',
  "No live co-pilot. You're on your own when it goes off-script.",
];
const GOOD = [
  { s: "Challenger framework", r: " built into every question and recommendation" },
  { s: "All 7 scoring categories", r: " with what a 5/5 looks like for each" },
  { s: "Trap questions", r: " that position your differentiators as buyer requirements — invisibly" },
  { s: "Capability-based recommendations", r: " — describe what it does, never name the product" },
  { s: "Live mode teleprompter", r: " — 9-phase GPS from opener to close on your phone" },
];

export function WhySalesPrep() {
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        el.querySelectorAll("[data-bad]").forEach((item, i) => { setTimeout(() => item.classList.add("in"), i * 100); });
        el.querySelectorAll("[data-good]").forEach((item, i) => { setTimeout(() => item.classList.add("in"), i * 100 + 50); });
        observer.unobserve(el);
      }
    }, { threshold: 0.2 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="px-6 sm:px-14 py-20 bg-[#1C1713] border-y border-[#2C2825]">
      <ScrollReveal><p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#E8735A] mb-[14px]">Why not just use ChatGPT</p></ScrollReveal>
      <ScrollReveal delay={1}><h2 className="font-[family-name:var(--font-serif)] text-[36px] sm:text-[46px] leading-[1.08] tracking-[-0.8px] text-[#F7F6F3] max-w-[560px] mb-2">Generic prep gets<br />generic results.</h2></ScrollReveal>
      <ScrollReveal delay={2}><p className="text-[16px] leading-relaxed font-light mb-12 text-[rgba(247,246,243,0.45)] max-w-[480px]">ChatGPT doesn&apos;t know Gong&apos;s scoring rubric. It doesn&apos;t know they use Challenger. It doesn&apos;t know what the grader is specifically listening for.</p></ScrollReveal>
      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-[#201E1A] border border-[#3A3530] rounded-[14px] p-6 hover:border-[#5A5550] transition-colors duration-300">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[rgba(247,246,243,0.3)] mb-[14px]">ChatGPT gives you</p>
          {BAD.map((text, i) => (
            <div key={i} data-bad="" className="ins-item flex items-start gap-[10px] mb-3 last:mb-0">
              <div className="w-4 h-4 rounded-full bg-[#3A3530] flex items-center justify-center text-[9px] text-[rgba(247,246,243,0.3)] flex-shrink-0 mt-[2px]">✕</div>
              <p className="text-[13px] text-[rgba(247,246,243,0.5)] leading-[1.55]">{text}</p>
            </div>
          ))}
        </div>
        <div className="bg-[#201E1A] border border-[#3A3530] rounded-[14px] p-6 hover:border-[#5A5550] transition-colors duration-300">
          <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#E8735A] mb-[14px]">SalesPrep gives you</p>
          {GOOD.map((item, i) => (
            <div key={i} data-good="" className="ins-item flex items-start gap-[10px] mb-3 last:mb-0">
              <div className="w-4 h-4 rounded-full bg-[rgba(232,115,90,0.15)] flex items-center justify-center text-[9px] text-[#E8735A] flex-shrink-0 mt-[2px]">✓</div>
              <p className="text-[13px] text-[rgba(247,246,243,0.5)] leading-[1.55]"><span className="text-[rgba(247,246,243,0.85)] font-normal">{item.s}</span>{item.r}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
