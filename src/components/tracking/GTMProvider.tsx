"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/tracking/events";
import { getConsent } from "@/lib/tracking/consent";

/**
 * Client component that tracks SPA page views on route changes.
 * Also restores consent state on mount.
 */
export function GTMPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Restore consent state on mount
  useEffect(() => {
    const prefs = getConsent();
    if (prefs) {
      const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
      if (gtag) {
        gtag("consent", "update", prefs);
      }
    }
  }, []);

  // Track page views on route change
  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: {
        page_path: pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ""),
        page_title: document.title,
      },
    });
  }, [pathname, searchParams]);

  return null;
}
