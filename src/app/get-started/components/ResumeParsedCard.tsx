import type { ParsedResume } from "@/types";

interface ResumeParsedCardProps {
  resume: ParsedResume;
  onClear: () => void;
}

function deriveHeadline(resume: ParsedResume): string {
  const title = resume.roles[0]?.title;
  const totalMonths = resume.roles.reduce((sum, r) => sum + (r.durationMonths ?? 0), 0);
  const years = Math.round(totalMonths / 12);
  if (title && years > 0) return `${title} · ${years}+ yrs`;
  return title ?? "";
}

export function ResumeParsedCard({ resume, onClear }: ResumeParsedCardProps) {
  const allBullets = resume.roles.flatMap((r) => r.bullets);
  const metricCount = allBullets.filter((b) => b.quantified).length;
  const signalCount = allBullets.filter((b) => b.salesRelevanceScore >= 7).length;
  const headline = deriveHeadline(resume);

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-5 relative animate-fade-in">
      {/* Clear button */}
      <button
        type="button"
        onClick={onClear}
        className="absolute top-4 right-4 text-xs text-[#94A3B8] hover:text-red-500 transition-colors"
      >
        ✕ Clear
      </button>

      {/* Status */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-green-600 text-sm font-medium">✓</span>
        <span className="text-sm font-semibold text-green-700">Resume analyzed</span>
      </div>

      {/* Name + headline */}
      {resume.personalInfo.name && (
        <p className="text-lg font-bold text-[#0F172A]">{resume.personalInfo.name}</p>
      )}
      {headline && (
        <p className="text-sm text-[#475569] mt-0.5">{headline}</p>
      )}

      {/* Badges — the star of the show */}
      <div className="flex flex-wrap gap-2 mt-4">
        <span className="inline-flex items-center px-3 py-1.5 bg-white border border-green-200 rounded-lg text-sm font-medium text-[#0F172A]">
          {resume.roles.length} role{resume.roles.length !== 1 ? "s" : ""}
        </span>
        <span className="inline-flex items-center px-3 py-1.5 bg-white border border-green-200 rounded-lg text-sm font-medium text-[#0F172A]">
          {metricCount} quantified metrics
        </span>
        <span className="inline-flex items-center px-3 py-1.5 bg-white border border-green-200 rounded-lg text-sm font-medium text-[#0F172A]">
          {signalCount} sales signals
        </span>
      </div>

      {/* Live value signal */}
      <p className="text-sm text-green-600 font-medium mt-4 flex items-center gap-1.5">
        ✓ Found {signalCount} sales signals to personalize your prep kit
      </p>
    </div>
  );
}
