"use client";
import { useEffect, useRef } from "react";

const ROWS = [
  { cat: "Industry Pain", desc: "5/5: References 2+ specific pain points with data before the call. Common mistake: treating it like a generic sales call.", filled: 5, med: false },
  { cat: "Persona Pain", desc: "5/5: Deep understanding of VP Sales daily reality — pipeline visibility, forecast accuracy, rep productivity.", filled: 4, med: false },
  { cat: "Active Listening", desc: '5/5: Reflects back every answer before the next question. Uses mirroring. Says "tell me more" consistently.', filled: 5, med: false },
  { cat: "Current State", desc: "5/5: Complete picture of team size, tools, CRM usage, call recording workflow, and coaching cadence.", filled: 3, med: true },
  { cat: "Business Pain", desc: "5/5: Gets a dollar number on the table. Calculates cost of inaction. Common mistake: ending without a quantified pain.", filled: 4, med: false },
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
        Actual Gong AE scoring rubric — built into every prep kit
      </p>
      <div ref={cardRef} className="bg-[#201E1A] border border-[#3A3530] rounded-2xl p-5 sm:p-7 max-w-[760px] mx-auto relative overflow-hidden animate-glow-pulse">
        <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
          <div className="h-full w-[40%]" style={{ background: "linear-gradient(90deg,transparent,rgba(232,115,90,0.4),transparent)", animation: "shimmer 3s 0.8s ease infinite" }} />
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 pb-4 border-b border-[#3A3530] gap-2">
          <span className="text-[13px] font-medium text-[rgba(247,246,243,0.85)]">Gong · Account Executive · Discovery Mock Call</span>
          <span className="text-[10px] bg-[rgba(232,115,90,0.15)] text-[#E8735A] px-[10px] py-[3px] rounded-full font-medium tracking-[0.05em]">7 scoring categories</span>
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
          Gong · Account Executive Interview · Commercial Sales · evaluates all 7 categories
        </p>
      </div>
    </div>
  );
}
