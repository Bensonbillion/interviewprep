"use client";

import { useState } from "react";
import { Markdown } from "@/components/prep/Markdown";
import { SpeakingTime } from "@/components/prep/SpeakingTime";
import type { AnswerType } from "@/types";

interface AnswerVersion {
  title: string;
  content: string;
}

interface AnswerTabsProps {
  versions: AnswerVersion[];
  stage: string;
  answerType: AnswerType;
}

/**
 * Tab pills for switching between 30-second and Full answer versions.
 * Only renders tabs if versions.length > 1; otherwise renders content directly.
 */
export function AnswerTabs({ versions, stage, answerType }: AnswerTabsProps) {
  // Default: short version for recruiter, full for others
  const defaultTab =
    stage === "recruiter" ? 0 : Math.min(1, versions.length - 1);
  const [activeTab, setActiveTab] = useState(defaultTab);

  if (versions.length === 0) return null;

  const showTabs = versions.length > 1;
  const active = versions[Math.min(activeTab, versions.length - 1)];

  return (
    <div>
      {showTabs && (
        <div className="flex gap-1 mb-4" role="tablist">
          {versions.map((v, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={activeTab === i}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 text-[13px] font-medium rounded-full transition-all duration-200 cursor-pointer ${
                activeTab === i
                  ? "bg-warm-800 text-white"
                  : "bg-transparent border border-cream-300 text-warm-700 hover:bg-cream-50"
              }`}
            >
              {v.title}
            </button>
          ))}
        </div>
      )}

      <div className="max-w-[60ch]" style={{ fontSize: "15px", lineHeight: "1.7" }}>
        <Markdown
          content={active.content}
          className="prose-p:text-[15px] prose-p:leading-[1.7] prose-li:text-[15px]"
        />
      </div>

      <SpeakingTime text={active.content} answerType={answerType} />
    </div>
  );
}
