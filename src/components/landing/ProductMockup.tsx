import { Check } from "lucide-react";

const BEATS = [
  "Uses your actual experience",
  "Researched Gong\u2019s ICP + product",
  "Structured for recruiter screens",
];

export function ProductMockup() {
  return (
    <div
      className="bg-white rounded-2xl p-5 md:p-7 w-full text-left"
      style={{
        boxShadow:
          "0 4px 40px rgba(74,122,255,0.18), 0 0 80px rgba(74,122,255,0.06)",
      }}
    >
      <div className="h-1 bg-gradient-to-r from-[#4A7AFF] to-[#60A5FA] rounded-full mb-4" />

      <p className="text-xs font-semibold text-[#4A7AFF] uppercase tracking-widest">
        AI Interview Prep Kit
      </p>

      <div className="mt-3 flex flex-col gap-1">
        <span className="inline-flex self-start bg-[#EFF6FF] rounded-full px-3 py-1.5 text-sm font-medium text-[#1D4ED8]">
          Marcus Chen &rarr; SDR at Gong
        </span>
        <p className="text-xs text-[#94A3B8] pl-1">Round: Recruiter Screen</p>
      </div>

      <p className="text-base font-semibold text-[#0F172A] mt-4">
        &ldquo;Tell me about yourself&rdquo;
      </p>

      <blockquote className="border-l-2 border-[#BFDBFE] pl-4 mt-3 text-sm text-[#475569] leading-relaxed">
        &ldquo;Over the past two years managing a 200+ cover territory at Toast,
        I consistently hit 118% of quota by focusing on restaurant groups going
        through tech transitions. I&rsquo;m excited about Gong because your
        revenue intelligence platform solves the exact coaching gap I saw
        first-hand&hellip;&rdquo;
      </blockquote>

      <div className="mt-4 space-y-1.5">
        {BEATS.map((beat) => (
          <div key={beat} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
            <span className="text-xs text-[#475569]">{beat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
