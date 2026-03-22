"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";

interface MaterialTab {
  id: string;
  label: string;
  icon: string;
  content: React.ReactNode;
  accentClass: string; // Tailwind classes for color-coded container
}

interface SupportingMaterialProps {
  tabs: MaterialTab[];
  onTabChange?: (tabId: string) => void;
}

/**
 * Tier 2 — Supporting material zone with segmented pills.
 *
 * Sits below a visual divider in a recessed zone (muted background, 14px type).
 * Multiple pills can be open simultaneously — users may need to reference
 * proof points while reading follow-up Q&A (NNGroup: never auto-collapse).
 *
 * Includes Expand All / Collapse All to prevent excessive tapping
 * across 3+ sections (NNGroup recommendation for 5+ sections).
 */
export function SupportingMaterial({ tabs, onTabChange }: SupportingMaterialProps) {
  const [openTabs, setOpenTabs] = useState<Set<string>>(new Set());

  if (tabs.length === 0) return null;

  const allOpen = tabs.every((t) => openTabs.has(t.id));

  const toggleTab = (id: string) => {
    setOpenTabs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        onTabChange?.(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allOpen) {
      setOpenTabs(new Set());
    } else {
      setOpenTabs(new Set(tabs.map((t) => t.id)));
    }
  };

  return (
    <div className="mt-6">
      {/* Visual divider — 1px #E5E7EB with 24px vertical margin */}
      <div className="border-t border-[#E5E7EB] dark:border-white/10 mb-6" />

      {/* Header row with Expand/Collapse All */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[14px] font-semibold text-[#6B7280] dark:text-[var(--text-tertiary)] leading-[1.43]">
          Supporting material
        </p>
        {tabs.length > 1 && (
          <button
            type="button"
            onClick={toggleAll}
            className="inline-flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <ChevronsUpDown className="w-3 h-3" />
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {/* Segmented pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {tabs.map((tab) => {
          const isActive = openTabs.has(tab.id);
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => toggleTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-full border transition-colors min-h-[36px] ${
                isActive
                  ? "border-stone-300 dark:border-white/20 bg-stone-100 dark:bg-white/10 text-[var(--text-primary)]"
                  : "border-stone-200/60 dark:border-white/10 text-[var(--text-tertiary)] hover:border-stone-300 hover:text-[var(--text-secondary)] hover:bg-stone-50 dark:hover:bg-white/5"
              }`}
            >
              <span className="text-sm leading-none">{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Open tab contents — multiple can be visible simultaneously */}
      <div className="space-y-3">
        {tabs
          .filter((tab) => openTabs.has(tab.id))
          .map((tab) => (
            <div
              key={tab.id}
              className={`rounded-xl p-4 text-[14px] leading-[1.57] text-[#4B5563] dark:text-[var(--text-secondary)] ${tab.accentClass}`}
            >
              {tab.content}
            </div>
          ))}
      </div>
    </div>
  );
}
