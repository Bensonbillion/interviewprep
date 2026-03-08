/**
 * Unified event tracking layer.
 *
 * Single function that pushes to GTM data layer, fires Meta Pixel events,
 * and triggers server-side CAPI for high-value conversions. All ad platform
 * pixels read from the data layer via GTM tags.
 */

// ---- Event definitions ----

export type TrackingEvent =
  | { name: "page_view"; properties?: { page_path?: string; page_title?: string } }
  | { name: "landing_page_view"; properties?: { page_path?: string; variant?: string } }
  | { name: "sign_up_initiated"; properties?: { method?: string } }
  | { name: "sign_up"; properties: { method: string; value?: number } }
  | { name: "first_prep_kit_created"; properties: { company?: string; role?: string; value?: number } }
  | { name: "prep_kit_created"; properties: { company?: string; role?: string; stage?: string } }
  | { name: "prep_kit_opened"; properties: { company?: string; role?: string } }
  | { name: "purchase"; properties: { value: number; currency: string; plan?: string } }
  | { name: "credit_purchased"; properties: { value: number; currency: string; package?: string } }
  | { name: "answer_generated"; properties: { answer_type: string; company?: string } }
  | { name: "answer_copied"; properties: { answer_type: string } }
  | { name: "report_submitted"; properties: { company?: string; stage?: string } }
  | { name: "outcome_updated"; properties: { outcome: string; company?: string } };

export interface UserContext {
  userId?: string;
  userEmail?: string;
}

// ---- GTM data layer ----

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    fbq?: (...args: unknown[]) => void;
  }
}

function pushToDataLayer(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({
    event,
    ...properties,
  });
}

// ---- Meta Pixel bridge ----

const META_EVENT_MAP: Record<string, string> = {
  page_view: "PageView",
  landing_page_view: "ViewContent",
  sign_up_initiated: "InitiateCheckout",
  sign_up: "CompleteRegistration",
  first_prep_kit_created: "Lead",
  purchase: "Purchase",
  credit_purchased: "Purchase",
};

function fireMetaPixel(eventName: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.fbq) return;
  const metaEvent = META_EVENT_MAP[eventName];
  if (!metaEvent) return;

  const params: Record<string, unknown> = { ...properties };
  if (properties?.value) {
    params.value = properties.value;
    params.currency = (properties.currency as string) ?? "USD";
  }

  window.fbq("track", metaEvent, params);
}

// ---- Event value map (for ad platform bidding) ----

const DEFAULT_VALUES: Record<string, number> = {
  sign_up: 10,
  first_prep_kit_created: 49,
};

// ---- Main tracking function ----

/**
 * Track a conversion/behavioral event across all platforms.
 *
 * Usage:
 *   trackEvent({ name: "sign_up", properties: { method: "google" } })
 *   trackEvent({ name: "sign_up", properties: { method: "google" } }, { userId: "...", userEmail: "..." })
 */
export function trackEvent(event: TrackingEvent, user?: UserContext) {
  const properties: Record<string, unknown> = {
    ...event.properties,
    value: (event.properties as Record<string, unknown>)?.value ?? DEFAULT_VALUES[event.name],
    event_id: `${event.name}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  };

  if (user?.userId) properties.user_id = user.userId;

  // 1. GTM data layer (GA4, Google Ads, LinkedIn tags all read from here)
  pushToDataLayer(event.name, properties);

  // 2. Meta Pixel (client-side, deduped with CAPI via event_id)
  fireMetaPixel(event.name, properties);

  // 3. Server-side CAPI (for high-value events — iOS resilience)
  if (
    event.name === "sign_up" ||
    event.name === "purchase" ||
    event.name === "credit_purchased" ||
    event.name === "first_prep_kit_created"
  ) {
    fireServerCapi(event.name, properties, user?.userEmail).catch(() => {});
  }
}

// ---- Server-side Meta CAPI ----

async function fireServerCapi(
  eventName: string,
  properties: Record<string, unknown>,
  userEmail?: string,
) {
  const metaEvent = META_EVENT_MAP[eventName];
  if (!metaEvent) return;

  try {
    await fetch("/api/tracking/meta-capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: metaEvent,
        eventId: properties.event_id,
        value: properties.value,
        currency: (properties.currency as string) ?? "USD",
        email: userEmail,
        fbp: getCookie("_fbp"),
        fbc: getCookie("_fbc"),
        userAgent: navigator.userAgent,
        sourceUrl: window.location.href,
      }),
    });
  } catch {
    // Non-blocking — CAPI failures are silent
  }
}

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match?.[2];
}
