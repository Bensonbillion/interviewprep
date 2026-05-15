"use client";
import { useEffect, useRef } from "react";

const ROWS = [
  { cat: "Pre-call Research", desc: "5/5: Cites specific Samsara products (Vehicle Telematics, AI Dash Cams, Connected Operations Cloud) tied to the prospect's industry. Common mistake: generic \"I checked your website.\"", filled: 5, med: false },
  { cat: "MEDDICC Qualification", desc: "5/5: Surfaces all 7 letters during discovery, with Economic Buyer named on the call. Common mistake: skipping Economic Buyer or Decision Process.", filled: 5, med: false },
  { cat: "TED Discovery", desc: "5/5: Opens every question with Tell me / Explain / Describe. Quantifies pain in dollars or hours. Common mistake: closed-ended yes/no chains.", filled: 4, med: false },
  { cat: "Challenger Reframe", desc: "5/5: Brings a Commercial Insight that reframes how the prospect thinks about fleet safety or operations cost. Teaches, tailors, takes control.", filled: 5, med: false },
  { cat: "Stakeholder Mapping", desc: "5/5: Maps Fleet Manager → Director of Safety → VP Operations → CFO. Explicit multi-thread plan. Common mistake: mapping only the recruiter's contact.", filled: 3, med: true },
  { cat: "Impact Quantification", desc: "5/5: Lands a dollar number on the call — accidents avoided, fuel savings, insurance premium reduction, ELD compliance fines. Common mistake: pain that stays qualitative.", filled: 4, med: false },
  { cat: "Next Steps", desc: "5/5: Confirmed next step on the call — Mutual Action Plan, stakeholder demo invite, dated follow-up. Common mistake: \"I'll send some materials.\"", filled: 5, med: false },
];

export function CompanyGrid() {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.querySelectorAll(".sc-row").forEach((row, i) => { setTimeout(() => row.classList.add("in"), i * 140); });
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-[#1C1713] px-6 sm:px-14 pb-16">
      <p className="text-center text-[11px] font-medium tracking-[0.12em] uppercase text-[rgba(247,246,243,0.2)] mb-5">
        Built from Samsara&apos;s reported interview signals · MEDDICC + Challenger
      </p>
      <div ref={cardRef} className="bg-[#201E1A] border border-[#3A3530] rounded-2xl p-5 sm:p-7 max-w-[760px] mx-auto relative overflow-hidden animate-glow-pulse">
        <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
          <div className="h-full w-[40%]" style={{ background: "linear-gradient(90deg,transparent,rgba(232,115,90,0.4),transparent)", animation: "shimmer 3s 0.8s ease infinite" }} />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 pb-4 border-b border-[#3A3530] gap-2">
          <span className="text-[13px] font-medium text-[rgba(247,246,243,0.85)]">Samsara · Account Executive · Discovery Mock Call</span>
          <span className="text-[10px] bg-[rgba(232,115,90,0.15)] text-[#E8735A] px-[10px] py-[3px] rounded-full font-medium tracking-[0.05em]">7 evaluation areas</span>
        </div>
        <div className="flex flex-col gap-3">
          {ROWS.map((row, i) => (
            <div key={i} className="sc-row flex items-start gap-[14px]">
              <div className={`w-[7px] h-[7px] rounded-full flex-shrink-0 mt-[5px] ${row.med ? "bg-[#5B8A6E]" : "bg-[#E8735A]"}`} />
              <div className="text-[12px] font-medium text-[rgba(247,246,243,0.85)] min-w-[110px] flex-shrink-0">{row.cat}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-[rgba(247,246,243,0.4)] leading-[1.55] mb-2">{row.desc}</p>
                <div className="flex gap-[3px]">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className={`h-[3px] flex-1 rounded-sm ${n <= row.filled ? (row.med ? "bg-[#5B8A6E]" : "bg-[#E8735A]") : "bg-[#3A3530]"}`} />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 pt-[14px] border-t border-[#3A3530] text-[11px] text-[rgba(247,246,243,0.2)] text-center">
          Synthesized from Glassdoor + RepVue interview reports · evaluates all 7 areas
        </p>
      </div>
    </div>
  );
}
