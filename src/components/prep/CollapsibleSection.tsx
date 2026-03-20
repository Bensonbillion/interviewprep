"use client";

import { useState, useRef } from "react";
import { ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  children: React.ReactNode;
}

/**
 * Smooth accordion section with animated height + chevron rotation.
 * Replaces <details>/<summary> with a controlled, accessible component.
 */
export function CollapsibleSection({
  title,
  icon,
  defaultOpen = false,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);

  const toggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    onToggle?.(next);
  };

  return (
    <div className="border-t border-stone-100 dark:border-white/5">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-2 py-3 text-left select-none group min-h-[44px]"
      >
        <ChevronRight
          className={`w-3.5 h-3.5 text-[var(--text-tertiary)] transition-transform duration-200 ${
            isOpen ? "rotate-90" : ""
          }`}
        />
        {icon && <span className="text-sm">{icon}</span>}
        <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
          {title}
        </span>
      </button>
      <div
        ref={contentRef}
        className={`overflow-hidden transition-all duration-200 ease-out ${
          isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="pb-3">{children}</div>
      </div>
    </div>
  );
}
