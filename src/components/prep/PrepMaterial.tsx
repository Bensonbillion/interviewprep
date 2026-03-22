"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface PrepMaterialProps {
  icon: string;
  title: string;
  count: string;
  type: "proof" | "followup" | "coaching";
  children: React.ReactNode;
}

const TINT_CLASSES: Record<PrepMaterialProps["type"], string> = {
  proof: "bg-[#EAF3DE] rounded-lg p-3 md:p-4",
  followup: "", // no tint
  coaching: "bg-[#FAEEDA] rounded-lg p-3 md:p-4",
};

const TEXT_CLASSES: Record<PrepMaterialProps["type"], string> = {
  proof: "text-[#27500A]",
  followup: "text-[var(--text-primary)]",
  coaching: "text-[#633806]",
};

/**
 * Single accordion section for prep material (proof points, follow-ups, coaching).
 * Collapsed by default. Tinted container based on type.
 */
export function PrepMaterial({ icon, title, count, type, children }: PrepMaterialProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-cream-300 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center min-h-[44px] py-2.5 hover:bg-cream-50 transition-colors duration-150 text-left"
      >
        <span className="text-sm leading-none w-5 flex-shrink-0">{icon}</span>
        <span className="text-[14px] font-medium text-[var(--text-primary)] ml-2">
          {title}
        </span>
        {count && (
          <span className="text-[12px] text-warm-500 ml-2">{count}</span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-warm-500 ml-auto flex-shrink-0 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="pl-7 pb-3">
          <div className={`${TINT_CLASSES[type]} text-[13px] ${TEXT_CLASSES[type]}`}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
