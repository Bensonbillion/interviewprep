"use client";

import { FileText, ArrowRight, AlertCircle } from "lucide-react";

export interface TakehomeSession {
  id: string;
  companyName: string;
  stageName: string | null;
  createdAt: string;
}

interface TakehomeSelectorProps {
  sessions: TakehomeSession[];
  onSelect: (sessionId: string) => void;
  onSkip: () => void;
}

export function TakehomeSelector({ sessions, onSelect, onSkip }: TakehomeSelectorProps) {
  if (sessions.length === 0) {
    return <TakehomeFallback onSkip={onSkip} />;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1C1713] mb-1">
        Which submission are you defending?
      </h2>
      <p className="text-sm text-[#5C5347] mb-5">
        We&apos;ll read what you submitted and prep you for questions about it.
      </p>

      <div className="space-y-2.5">
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className="w-full text-left p-4 rounded-xl border-2 border-[#E8E4DF] bg-white hover:border-[#E8735A] hover:bg-[#FEF0EB]/30 transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#F5F2ED] group-hover:bg-[#E8735A]/10 flex items-center justify-center flex-shrink-0 transition-colors">
                <FileText className="w-4 h-4 text-[#9B8E82] group-hover:text-[#E8735A] transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1C1713] truncate">
                  {s.companyName}
                </p>
                <p className="text-xs text-[#9B8E82] mt-0.5">
                  {s.stageName ?? "Take-home assignment"} · {formatDate(s.createdAt)}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#C5BDB5] group-hover:text-[#E8735A] flex-shrink-0 transition-colors" />
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="mt-4 text-xs text-[#9B8E82] hover:text-[#5C5347] transition-colors"
      >
        I don&apos;t see my submission → paste it manually
      </button>
    </div>
  );
}

function TakehomeFallback({ onSkip }: { onSkip: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 rounded-full bg-[#F5F2ED] flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-5 h-5 text-[#9B8E82]" />
      </div>
      <h2 className="text-lg font-semibold text-[#1C1713] mb-2">
        We don&apos;t have your submission yet
      </h2>
      <p className="text-sm text-[#5C5347] leading-relaxed max-w-sm mx-auto mb-6">
        To build your defense prep, we need to read what you submitted.
        You can paste it in the next step, or create the take-home first
        and come back.
      </p>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={onSkip}
          className="px-5 py-2.5 bg-[#E8735A] text-white text-sm font-medium rounded-xl hover:bg-[#C85A42] transition-colors"
        >
          Paste my submission
        </button>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}
