import { Check } from "lucide-react";

const BEATS = [
  "Uses your actual resume",
  "Researches your target company",
  "Sounds like you, not AI",
];

export function ProductMockup() {
  return (
    <div
      className="bg-[#FDFCFA] rounded-2xl p-5 md:p-7 w-full max-w-[600px] mx-auto text-left
                 border border-[#E8E4DE] shadow-lg"
    >
      <div className="h-1 bg-gradient-to-r from-[#E8735A] to-[#F4A27A] rounded-full mb-4" />

      <p className="text-xs font-semibold text-[#E8735A] uppercase tracking-widest font-sans">
        AI Interview Prep Kit
      </p>

      <div className="mt-3 flex flex-col gap-1">
        <span className="inline-flex self-start bg-[#F0EDE6] rounded-full px-3 py-1.5 text-sm font-medium text-[#1A1A1A] font-sans">
          Marcus Chen &rarr; SDR at Gong
        </span>
        <p className="text-xs text-[#9C9590] pl-1 font-sans">Round: Recruiter Screen</p>
      </div>

      <p className="text-base font-semibold text-[#1A1A1A] mt-4 font-sans">
        &ldquo;Tell me about yourself&rdquo;
      </p>

      <blockquote className="border-l-2 border-[#E8E4DE] pl-4 mt-3 text-sm text-[#6B6560] leading-relaxed font-sans">
        &ldquo;Over the past two years managing a 200+ cover territory at Toast,
        I consistently hit 118% of quota by focusing on restaurant groups going
        through tech transitions. I&rsquo;m excited about Gong because your
        revenue intelligence platform solves the exact coaching gap I saw
        first-hand&hellip;&rdquo;
      </blockquote>

      <div className="mt-4 space-y-1.5">
        {BEATS.map((beat) => (
          <div key={beat} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-[#5BAD7A] shrink-0 mt-0.5" />
            <span className="text-xs text-[#6B6560] font-sans">{beat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
