"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

const PREVIEW_LENGTH = 200;

interface JobDescriptionAccordionProps {
  value: string;
  isAutoFilled: boolean;
  onChange: (v: string) => void;
}

export function JobDescriptionAccordion({
  value,
  isAutoFilled,
  onChange,
}: JobDescriptionAccordionProps) {
  const [expanded, setExpanded] = useState(false);

  // Auto-filled but not yet expanded — show green collapsed preview
  if (isAutoFilled && value && !expanded) {
    const preview = value.slice(0, PREVIEW_LENGTH);
    const truncated = value.length > PREVIEW_LENGTH;
    return (
      <div className="bg-green-50/50 border border-green-200 rounded-xl p-3.5">
        <p className="text-xs font-semibold text-green-600 mb-2">
          ✓ Job description extracted from listing
        </p>
        <p className="text-sm text-[#475569] leading-relaxed">
          &ldquo;{preview}{truncated ? "..." : ""}&rdquo;
        </p>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs text-[#4A7AFF] font-medium mt-2 hover:text-[#3B5FE6] transition-colors"
        >
          Show more / Edit
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1.5 text-sm text-[#4A7AFF] font-medium hover:text-[#3B5FE6] transition-colors"
      >
        <ChevronRight
          className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        />
        {isAutoFilled && value
          ? "Job description extracted"
          : "Add job description for better results"}
        <span className="text-[#94A3B8] font-normal">(optional)</span>
      </button>

      {expanded && (
        <div className="space-y-1.5 mt-2">
          <textarea
            placeholder="Paste the job description here for more targeted answers..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full min-h-[120px] p-3 border border-[#DBEAFE] rounded-xl text-sm resize-y outline-none focus:ring-2 focus:ring-[#4A7AFF]/20 focus:border-[#4A7AFF] transition-all placeholder:text-[#94A3B8]"
            style={{ fontSize: "16px" }}
          />
          <p className="text-xs text-[#94A3B8]">
            Adding the job description improves answer relevance by ~40%.
          </p>
        </div>
      )}
    </div>
  );
}
