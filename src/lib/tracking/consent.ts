/**
 * Google Consent Mode v2 implementation.
 *
 * Consent defaults fire BEFORE GTM loads (via inline script in layout).
 * This module manages user consent state and updates gtag accordingly.
 */

const CONSENT_KEY = "sp_consent";

export type ConsentState = "granted" | "denied";

export interface ConsentPreferences {
  analytics_storage: ConsentState;
  ad_storage: ConsentState;
  ad_user_data: ConsentState;
  ad_personalization: ConsentState;
}

const DEFAULT_CONSENT: ConsentPreferences = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
};

const GRANTED_CONSENT: ConsentPreferences = {
  analytics_storage: "granted",
  ad_storage: "granted",
  ad_user_data: "granted",
  ad_personalization: "granted",
};

/**
 * Get the current consent preferences from localStorage.
 */
export function getConsent(): ConsentPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    return stored ? (JSON.parse(stored) as ConsentPreferences) : null;
  } catch {
    return null;
  }
}

/**
 * Save consent preferences and update gtag.
 */
export function setConsent(prefs: ConsentPreferences) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, JSON.stringify(prefs));
  updateGtagConsent(prefs);
}

/**
 * Accept all tracking.
 */
export function acceptAll() {
  setConsent(GRANTED_CONSENT);
}

/**
 * Decline all tracking.
 */
export function declineAll() {
  setConsent(DEFAULT_CONSENT);
}

/**
 * Check if user has made a consent choice.
 */
export function hasConsentChoice(): boolean {
  return getConsent() !== null;
}

/**
 * Push consent update to gtag.
 */
function updateGtagConsent(prefs: ConsentPreferences) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (gtag) {
    gtag("consent", "update", prefs);
  }
}

/**
 * Generate the inline consent defaults script.
 * This MUST run before GTM loads.
 */
export function consentDefaultsScript(): string {
  return `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('consent', 'default', {
      analytics_storage: 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted',
      wait_for_update: 500
    });
    gtag('set', 'ads_data_redaction', true);
    gtag('set', 'url_passthrough', true);
  `.trim();
}
