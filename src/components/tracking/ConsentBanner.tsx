"use client";

import { useState, useEffect } from "react";
import { hasConsentChoice, acceptAll, declineAll } from "@/lib/tracking/consent";

/**
 * Minimal consent banner — not a full-screen popup (Google penalizes those on mobile).
 * Shows once, stores choice, never shows again.
 */
export function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Small delay to avoid layout shift on first paint
    const timer = setTimeout(() => {
      if (!hasConsentChoice()) setShow(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 flex justify-center pointer-events-none">
      <div className="pointer-events-auto w-full max-w-lg bg-white border border-gray-200 rounded-2xl shadow-lg p-4 flex items-center gap-3">
        <p className="text-sm text-gray-600 flex-1">
          We use cookies to improve your experience and measure site performance.
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => { declineAll(); setShow(false); }}
            className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Decline
          </button>
          <button
            onClick={() => { acceptAll(); setShow(false); }}
            className="px-4 py-1.5 text-sm font-medium bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
