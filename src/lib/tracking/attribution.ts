/**
 * UTM capture and multi-touch attribution.
 *
 * Captures UTM parameters + referrer on every visit.
 * Stores first-touch (never overwritten) and last-touch (always updated).
 * Both are passed to the backend on conversion events.
 */

const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

const FIRST_TOUCH_KEY = "sp_first_touch";
const LAST_TOUCH_KEY = "sp_last_touch";

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landing_page?: string;
  timestamp: string;
}

/**
 * Capture UTM parameters and referrer from the current URL.
 * Call on every page view / route change.
 *
 * - Always updates last touch.
 * - Only sets first touch if it doesn't exist yet.
 */
export function captureAttribution() {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const hasUtm = UTM_PARAMS.some((p) => params.has(p));

  // Build attribution object
  const attribution: Attribution = {
    timestamp: new Date().toISOString(),
    referrer: document.referrer || undefined,
    landing_page: window.location.pathname,
  };

  if (hasUtm) {
    for (const p of UTM_PARAMS) {
      const val = params.get(p);
      if (val) {
        // Safe assignment — p is always a key of Attribution
        (attribution as unknown as Record<string, string>)[p] = val;
      }
    }
  }

  // Always update last touch
  try {
    localStorage.setItem(LAST_TOUCH_KEY, JSON.stringify(attribution));

    // Only set first touch once
    if (!localStorage.getItem(FIRST_TOUCH_KEY)) {
      localStorage.setItem(FIRST_TOUCH_KEY, JSON.stringify(attribution));
    }
  } catch {
    // localStorage may be unavailable in private browsing
  }
}

/**
 * Get stored first-touch and last-touch attribution.
 */
export function getAttribution(): {
  firstTouch: Attribution | null;
  lastTouch: Attribution | null;
} {
  if (typeof window === "undefined") {
    return { firstTouch: null, lastTouch: null };
  }

  try {
    const first = localStorage.getItem(FIRST_TOUCH_KEY);
    const last = localStorage.getItem(LAST_TOUCH_KEY);
    return {
      firstTouch: first ? (JSON.parse(first) as Attribution) : null,
      lastTouch: last ? (JSON.parse(last) as Attribution) : null,
    };
  } catch {
    return { firstTouch: null, lastTouch: null };
  }
}

/**
 * Flatten attribution into properties suitable for trackEvent.
 */
export function getAttributionProperties(): Record<string, string | undefined> {
  const { firstTouch, lastTouch } = getAttribution();
  return {
    first_touch_source: firstTouch?.utm_source,
    first_touch_medium: firstTouch?.utm_medium,
    first_touch_campaign: firstTouch?.utm_campaign,
    last_touch_source: lastTouch?.utm_source,
    last_touch_medium: lastTouch?.utm_medium,
    last_touch_campaign: lastTouch?.utm_campaign,
    landing_page: firstTouch?.landing_page,
    referrer: firstTouch?.referrer,
  };
}
