"use client";

import { useState } from "react";

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
 * Sits below a visual divider in a recessed zone (muted background, smaller type).
 * Uses pills/tabs (not accordions) because these are different *types* of
 * supplementary content, not different depths of the same content.
 *
 * Allows multiple tabs to remain open — users may need to reference proof points
 * while reading follow-up Q&A simultaneously.
 */
export function SupportingMaterial({ tabs, onTabChange }: SupportingMaterialProps) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  if (tabs.length === 0) return null;

  return (
    <div className="mt-6">
      {/* Visual divider between Tier 1 and Tier 2 */}
      <div className="border-t border-stone-200 dark:border-white/10 mb-4" />

      {/* Segmented pills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                const next = isActive ? null : tab.id;
                setActiveTab(next);
                if (next) onTabChange?.(next);
              }}
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

      {/* Active tab content — renders in color-coded container */}
      {activeTab && (() => {
        const tab = tabs.find((t) => t.id === activeTab);
        if (!tab) return null;
        return (
          <div
            className={`rounded-xl p-4 text-sm animate-in fade-in duration-200 ${tab.accentClass}`}
          >
            {tab.content}
          </div>
        );
      })()}
    </div>
  );
}
