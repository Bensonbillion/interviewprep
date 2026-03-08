"use client";

import { Sparkles } from "lucide-react";
import type { RoleType } from "@/types";
import { SAMPLE_ANSWERS } from "./sampleAnswers";

interface SampleAnswerPreviewProps {
  selectedRole?: RoleType | null;
}

export function SampleAnswerPreview({ selectedRole }: SampleAnswerPreviewProps) {
  const sample = SAMPLE_ANSWERS[selectedRole ?? "sdr_bdr"];
  // Stable key: null and sdr_bdr share the same key so selecting SDR doesn't re-animate
  const contentKey = selectedRole ?? "sdr_bdr";

  return (
    <div className="hidden md:block">
      <div className="bg-white rounded-2xl border border-[#DBEAFE] shadow-[0_4px_24px_rgba(74,122,255,0.08)] overflow-hidden">
        {/* Header */}
        <div className="bg-[#4A7AFF] px-5 py-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-white" />
          <span className="text-sm font-semibold text-white">Example prep kit output</span>
        </div>

        {/* Content — key change triggers remount → CSS fade-in animation plays */}
        <div key={contentKey} className="p-5 space-y-4 animate-fade-in-content">
          {/* Context line */}
          <p className="text-xs text-[#94A3B8]">
            {sample.contextName} → {sample.contextRole} at{" "}
            <span className="font-medium text-[#64748B]">{sample.contextCompany}</span>
          </p>

          {/* Tell me about yourself */}
          <div>
            <p className="text-xs font-semibold text-[#4A7AFF] uppercase tracking-wide mb-2">
              Tell me about yourself
            </p>
            <blockquote className="text-sm text-[#475569] leading-relaxed border-l-2 border-[#BFDBFE] pl-4">
              &ldquo;
              {sample.tellMeAboutYourself.split("\n\n").map((para, i) => (
                <span key={i}>
                  {i > 0 && (
                    <>
                      <br />
                      <br />
                    </>
                  )}
                  {para}
                </span>
              ))}
              &rdquo;
            </blockquote>
          </div>

          {/* Second question */}
          <div className="border-t border-[#EFF6FF] pt-4">
            <p className="text-xs font-semibold text-[#4A7AFF] uppercase tracking-wide mb-2">
              {sample.secondQuestion}
            </p>
            <blockquote className="text-sm text-[#475569] leading-relaxed border-l-2 border-[#BFDBFE] pl-4">
              &ldquo;{sample.secondAnswer}&rdquo;
            </blockquote>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#F8FBFF] px-5 py-3 border-t border-[#DBEAFE]">
          <p className="text-xs text-[#94A3B8] text-center">
            Your answers will be built from{" "}
            <strong className="text-[#64748B]">your resume</strong> ·{" "}
            personalized for{" "}
            <strong className="text-[#64748B]">your target company</strong>
          </p>
        </div>
      </div>

      <p className="text-xs text-[#94A3B8] text-center mt-3">
        Every answer is different — built from your actual experience
      </p>
    </div>
  );
}
