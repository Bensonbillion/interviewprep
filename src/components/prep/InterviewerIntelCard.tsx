"use client";

import { useState } from "react";
import { User, ChevronDown, ChevronUp, Target, MessageSquare, Lightbulb, HelpCircle } from "lucide-react";
import type { InterviewerDossier } from "@/types";

interface InterviewerIntelCardProps {
  dossiers: InterviewerDossier[];
}

function SingleDossier({ dossier }: { dossier: InterviewerDossier }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border border-[#DBEAFE] rounded-2xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-primary-500" />
          </div>
          <div>
            <p className="font-semibold text-ink text-sm leading-snug">{dossier.name}</p>
            {dossier.roleTitle && (
              <p className="text-xs text-ink-muted mt-0.5">{dossier.roleTitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-medium text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full">
            Interviewer Intel
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-ink-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-ink-muted" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-[#EFF6FF] pt-4 space-y-4">
          {/* Background */}
          {dossier.background && (
            <p className="text-sm text-ink-light leading-relaxed">{dossier.background}</p>
          )}

          {/* Conversational style */}
          {dossier.conversationalStyle && (
            <div className="bg-amber-50/60 border-l-2 border-amber-300 px-3 py-2 rounded-r-lg">
              <p className="text-xs font-medium text-amber-800 mb-0.5">Interview style</p>
              <p className="text-xs text-amber-700 leading-snug">{dossier.conversationalStyle}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            {/* Likely focus areas */}
            {dossier.likelyFocusAreas?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Target className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
                    What they assess
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {dossier.likelyFocusAreas.map((area, i) => (
                    <li key={i} className="text-sm text-ink-light flex items-start gap-2">
                      <span className="text-primary-400 flex-shrink-0 mt-0.5 font-bold text-xs">{i + 1}.</span>
                      <span className="leading-snug">{area}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggested topics to reference */}
            {dossier.suggestedTopicsToReference?.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
                    Things that resonate
                  </p>
                </div>
                <ul className="space-y-1.5">
                  {dossier.suggestedTopicsToReference.map((topic, i) => (
                    <li key={i} className="text-sm text-ink-light flex items-start gap-2">
                      <span className="text-amber-400 flex-shrink-0 mt-0.5">•</span>
                      <span className="leading-snug">{topic}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Likely questions */}
          {dossier.likelyQuestions?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <HelpCircle className="w-3.5 h-3.5 text-ink-muted flex-shrink-0" />
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wide">
                  Questions they&apos;re likely to ask
                </p>
              </div>
              <div className="space-y-1.5">
                {dossier.likelyQuestions.map((q, i) => (
                  <div key={i} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                    <MessageSquare className="w-3 h-3 text-ink-muted flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-ink-light leading-snug">{q}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function InterviewerIntelCard({ dossiers }: InterviewerIntelCardProps) {
  if (!dossiers || dossiers.length === 0) return null;

  return (
    <div className="space-y-3">
      {dossiers.map((dossier, i) => (
        <SingleDossier key={i} dossier={dossier} />
      ))}
    </div>
  );
}
