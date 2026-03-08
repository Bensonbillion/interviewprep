"use client";

import { useState, useEffect } from "react";
import type { RoleType } from "@/types";
import { SAMPLE_ANSWERS } from "./sampleAnswers";

interface MobileSamplePreviewProps {
  selectedRole: RoleType | null;
}

const TRUNCATE_LENGTH = 200;

export function MobileSamplePreview({ selectedRole }: MobileSamplePreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const sample = SAMPLE_ANSWERS[selectedRole ?? "sdr_bdr"];
  const contentKey = selectedRole ?? "sdr_bdr";

  // Collapse back to truncated when role changes
  useEffect(() => {
    setExpanded(false);
  }, [selectedRole]);

  const needsTruncation = sample.tellMeAboutYourself.length > TRUNCATE_LENGTH;
  const displayText = expanded
    ? sample.tellMeAboutYourself
    : sample.tellMeAboutYourself.slice(0, TRUNCATE_LENGTH) + (needsTruncation ? "..." : "");

  return (
    <div className="md:hidden mt-4">
      <div
        key={contentKey}
        className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-xl p-4 animate-fade-in-content"
      >
        <p className="text-xs font-semibold text-[#4A7AFF] flex items-center gap-1.5 mb-2">
          ✦ Example: {sample.contextName} → {sample.contextRole} at {sample.contextCompany}
        </p>

        <blockquote className="text-sm text-[#475569] leading-relaxed">
          &ldquo;{displayText}&rdquo;
        </blockquote>

        {needsTruncation && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-[#4A7AFF] font-medium mt-2 hover:text-[#3B5FE6] transition-colors"
          >
            {expanded ? "Show less" : "See full example"}
          </button>
        )}
      </div>
    </div>
  );
}
