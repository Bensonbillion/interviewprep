"use client";

/**
 * Credit management — localStorage-backed, no auth required for v1.0.
 * 3 free credits per user. Each stage generation = 1 credit.
 * Payment/Stripe integration is P1 (out of scope for v1.0).
 */

const STORAGE_KEY = "salesprep_credits";
const FREE_CREDITS = 3;

export interface CreditState {
  used: number;
  total: number;
  sessions: string[];
}

export function getCredits(): CreditState {
  if (typeof window === "undefined") return { used: 0, total: FREE_CREDITS, sessions: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { used: 0, total: FREE_CREDITS, sessions: [] };
    return JSON.parse(raw) as CreditState;
  } catch {
    return { used: 0, total: FREE_CREDITS, sessions: [] };
  }
}

export function getRemainingCredits(): number {
  const state = getCredits();
  return Math.max(0, state.total - state.used);
}

export function hasCreditsRemaining(): boolean {
  return getRemainingCredits() > 0;
}

export function consumeCredit(sessionId: string): CreditState {
  const state = getCredits();
  const updated: CreditState = {
    used: state.used + 1,
    total: state.total,
    sessions: [...state.sessions, sessionId],
  };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  return updated;
}

export const CREDIT_PACKAGES = [
  {
    name: "Single Round",
    credits: 10,
    price: 9,
    description: "Prep for one specific interview round",
    tag: null,
  },
  {
    name: "Full Interview",
    credits: 30,
    price: 19,
    description: "Complete prep for all 4 rounds at one company",
    tag: "Best value",
  },
  {
    name: "Job Search",
    credits: 75,
    price: 39,
    description: "Active job seekers interviewing at multiple companies",
    tag: null,
  },
  {
    name: "Unlimited",
    credits: null,
    price: 49,
    description: "Unlimited generations. Cancel anytime.",
    tag: "Power users",
    monthly: true,
  },
] as const;
