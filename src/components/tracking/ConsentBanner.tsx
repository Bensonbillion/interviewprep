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
    if (hasConsentChoice()) return;
    // Delay to avoid interrupting first impression
    const timer = setTimeout(() => setShow(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 md:flex md:items-center md:justify-between">
      <p className="text-sm text-gray-300 mb-3 md:mb-0 md:mr-4">
        We use cookies to understand how you use SalesPrep and improve your experience.
      </p>
      <div className="flex gap-3 shrink-0">
        <button
          onClick={() => { declineAll(); setShow(false); }}
          className="text-sm text-gray-400 hover:text-white px-4 py-2 transition-colors"
        >
          Decline
        </button>
        <button
          onClick={() => { acceptAll(); setShow(false); }}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
