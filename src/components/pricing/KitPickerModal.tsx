"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrepSummary {
  id: string;
  companyName: string;
  targetRole: string;
  stage: string;
  createdAt: number;
}

interface KitPickerModalProps {
  tierLabel: string;
  onSelect: (kitId: string) => void;
  onClose: () => void;
}

const STAGE_LABEL: Record<string, string> = {
  recruiter: "Recruiter Screen",
  hiring_manager: "Hiring Manager",
  role_play: "Cold Call / Roleplay",
  panel: "Panel / Final",
  take_home: "Take-Home Assignment",
};

/**
 * Inline kit picker that opens when a logged-in user clicks single_round
 * or full_interview on bare /pricing without a kit_id query param. Reads
 * the existing /api/sessions endpoint, lets the user pick which kit to
 * apply the purchase to, and fires the parent's onSelect with the kit id.
 *
 * Fourth state — no kits at all: a "Start your first prep kit" CTA that
 * routes to /get-started. We do this rather than disabling tier buttons
 * (the proposal called this Option B vs Option A) so visitor-facing copy
 * stays honest: "you need a kit first; here's how" beats a dead button.
 */
export function KitPickerModal({ tierLabel, onSelect, onClose }: KitPickerModalProps) {
  const [kits, setKits] = useState<PrepSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((d: { sessions?: PrepSummary[]; error?: string }) => {
        if (canceled) return;
        if (d.error) setError(d.error);
        else setKits(d.sessions ?? []);
      })
      .catch(() => {
        if (!canceled) setError("Couldn't load your kits");
      });
    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kitpicker-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#0F172A]"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-6">
          <h2 id="kitpicker-title" className="text-xl font-bold text-[#0F172A]">
            Which kit is {tierLabel} for?
          </h2>
          <p className="text-sm text-[#64748B] mt-1">
            We&apos;ll lock this purchase to that kit&apos;s company so the entitlement
            covers the right interview.
          </p>

          <div className="mt-5 max-h-80 overflow-y-auto pr-1">
            {error && (
              <p className="text-sm text-red-600 py-6 text-center">{error}</p>
            )}
            {kits === null && !error && (
              <p className="text-sm text-[#94A3B8] py-6 text-center">Loading…</p>
            )}
            {kits && kits.length === 0 && (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-[#475569]">
                  You don&apos;t have a prep kit yet — start one and the purchase
                  will lock to it.
                </p>
                <Link href="/get-started">
                  <Button className="gap-1">
                    Start your first prep kit <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            )}
            {kits && kits.length > 0 && (
              <ul className="divide-y divide-[#E2E8F8]">
                {kits.map((k) => (
                  <li key={k.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(k.id)}
                      className="w-full text-left py-3 px-2 hover:bg-[#F8FAFF] transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-[#0F172A] truncate">
                          {k.companyName || "(unnamed company)"}
                        </p>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          {k.targetRole} · {STAGE_LABEL[k.stage] ?? k.stage}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-[#94A3B8] mt-1 flex-shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
