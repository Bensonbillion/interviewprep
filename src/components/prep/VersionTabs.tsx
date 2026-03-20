"use client";

import { useState } from "react";

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
}

interface VersionTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onTabChange?: (tabId: string) => void;
}

/**
 * Tabbed content switcher for answer versions (30-second / Full answer).
 * Shows a single tab's content at a time with an underline indicator.
 * If only one tab has content, renders it directly without the tab bar.
 */
export function VersionTabs({ tabs, defaultTab, onTabChange }: VersionTabsProps) {
  // Filter out tabs with no content
  const visibleTabs = tabs.filter((t) => t.content !== null && t.content !== undefined);

  const resolvedDefault = visibleTabs.find((t) => t.id === defaultTab)?.id ?? visibleTabs[0]?.id ?? "";
  const [activeTab, setActiveTab] = useState(resolvedDefault);

  if (visibleTabs.length === 0) return null;

  // Single tab — no tab UI needed
  if (visibleTabs.length === 1) {
    return <div>{visibleTabs[0].content}</div>;
  }

  const activeContent = visibleTabs.find((t) => t.id === activeTab)?.content ?? visibleTabs[0]?.content;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-stone-100 dark:border-white/5 mb-4">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              onTabChange?.(tab.id);
            }}
            className={`px-3 py-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-coral rounded-t" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>{activeContent}</div>
    </div>
  );
}
