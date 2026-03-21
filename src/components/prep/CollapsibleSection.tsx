"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  children: React.ReactNode;
}

/**
 * Inline "Show full version" / "Show less" toggle for answer zone.
 *
 * Follows NNGroup research:
 * - Entire header row is tappable (min 48dp per Material Design)
 * - Smooth 200ms animation
 * - Never auto-collapses other sections
 * - Chevron rotates to indicate state
 */
export function CollapsibleSection({
  title,
  defaultOpen = false,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    onToggle?.(next);
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-1.5 py-2 text-left select-none group min-h-[48px] text-sm font-medium text-coral hover:text-coral-dark dark:text-[var(--coral-text)] dark:hover:text-coral transition-colors"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        />
        <span>{isOpen ? title.replace(/^Show /, "Hide ") : title}</span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isOpen ? "max-h-[4000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pb-2">{children}</div>
      </div>
    </div>
  );
}
