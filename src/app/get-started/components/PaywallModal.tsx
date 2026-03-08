"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface PaywallModalProps {
  onClose: () => void;
}

export function PaywallModal({ onClose }: PaywallModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl px-5 py-6 safe-area-pb shadow-[0_-8px_40px_rgba(0,0,0,0.12)] animate-fade-in-up">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#94A3B8] hover:text-[#0F172A]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="max-w-sm mx-auto text-center space-y-4">
          <div className="inline-block bg-[#EFF6FF] text-[#2563EB] text-sm font-medium px-3 py-1.5 rounded-full">
            You&apos;ve used your 3 free credits
          </div>
          <h3 className="text-xl font-bold text-[#0F172A]">Keep your prep momentum</h3>
          <p className="text-sm text-[#64748B]">
            Credits don&apos;t expire. No subscriptions. Buy what you need for your job search.
          </p>
          <Link href="/pricing" className="block">
            <Button className="w-full">See credit packs →</Button>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-[#94A3B8] hover:text-[#64748B] w-full"
          >
            Maybe later
          </button>
        </div>
      </div>
    </>
  );
}
