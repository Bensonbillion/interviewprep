import Link from "next/link";
import { ScrollReveal } from "./ScrollReveal";

const TRUST = ["No credit card", "Free forever plan", "Resume stays private", "Works in 5 minutes"];

export function FinalCTA() {
  return (
    <section className="px-6 sm:px-14 py-24 bg-[#1C1713] text-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 600px 300px at 50% 50%,rgba(232,115,90,0.07) 0%,transparent 70%)" }} />
      <div className="relative z-10">
        <ScrollReveal><p className="text-[11px] font-medium tracking-[0.12em] uppercase text-[#E8735A] mb-5">Ready when you are</p></ScrollReveal>
        <ScrollReveal delay={1}><h2 className="font-[family-name:var(--font-serif)] text-[40px] sm:text-[58px] leading-[1.05] tracking-[-1.2px] text-[#F7F6F3] max-w-[700px] mx-auto mb-5">Walk in knowing<br /><em className="text-[#E8735A] not-italic">exactly why they should hire you.</em></h2></ScrollReveal>
        <ScrollReveal delay={2}><p className="text-[15px] sm:text-[17px] text-[rgba(247,246,243,0.5)] max-w-[460px] mx-auto mb-10 leading-relaxed font-light">SalesPrep builds it from where you&apos;ve been. Five minutes to your first kit.</p></ScrollReveal>
        <ScrollReveal delay={3}>
          <Link href="/get-started">
            <button type="button" className="relative overflow-hidden bg-[#E8735A] text-white text-[16px] font-medium px-10 py-4 rounded-full border-none cursor-pointer hover:bg-[#C85A42] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(232,115,90,0.35)] transition-all duration-200 group">
              <span className="relative z-10">Build my prep kit →</span>
              <span className="absolute inset-0 w-[40%] bg-white/15 skew-x-[-20deg] -translate-x-full group-hover:[animation:shimmer_0.5s_ease_forwards]" />
            </button>
          </Link>
          <p className="text-[12px] text-[rgba(247,246,243,0.2)] mt-4">Your first kit is free · Upgrade for unlimited</p>
        </ScrollReveal>
        <ScrollReveal delay={4}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 mt-11 pt-10 border-t border-[rgba(247,246,243,0.06)]">
            {TRUST.map((item) => (<div key={item} className="flex items-center gap-[7px] text-[13px] text-[rgba(247,246,243,0.3)]"><div className="w-1 h-1 rounded-full bg-[#E8735A] opacity-50" />{item}</div>))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
