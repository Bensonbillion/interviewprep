"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/tracking/events";
import { getConsent } from "@/lib/tracking/consent";
import { captureAttribution, getAttributionProperties } from "@/lib/tracking/attribution";

/**
 * Client component that tracks SPA page views on route changes.
 * Also restores consent state, captures UTM attribution, and
 * detects signup conversion param from auth callback.
 */
export function GTMPageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const signupFired = useRef(false);

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

  // Capture UTM attribution on every route change
  useEffect(() => {
    captureAttribution();
  }, [pathname, searchParams]);

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

  // Detect ?signup=1 from auth callback and fire sign_up event with attribution
  useEffect(() => {
    if (signupFired.current) return;
    if (searchParams.get("signup") === "1") {
      signupFired.current = true;

      const attribution = getAttributionProperties();
      trackEvent({
        name: "sign_up",
        properties: {
          method: "google",
          value: 10,
          ...attribution,
        },
      });

      // Save attribution to user record in Supabase (best-effort)
      fetch("/api/user/attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attribution),
      }).catch(() => {});

      // Clean the URL without triggering a navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("signup");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  return null;
}
