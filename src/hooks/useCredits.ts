"use client";

import { useState, useEffect, useCallback } from "react";

const CREDIT_REFRESH_EVENT = "salesprep:credits-changed";

interface CreditsState {
  balance: number;
  loading: boolean;
  refresh: () => void;
}

export function useCredits(): CreditsState {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetch("/api/user/credits")
      .then((r) => r.json())
      .then((d: { balance?: number }) => setBalance(d.balance ?? 0))
      .catch(() => setBalance(0))
      .finally(() => setLoading(false));
  }, [tick]);

  // Listen for cross-component refresh events
  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener(CREDIT_REFRESH_EVENT, handler);
    return () => window.removeEventListener(CREDIT_REFRESH_EVENT, handler);
  }, []);

  // Refresh locally AND broadcast to all other useCredits instances
  const refresh = useCallback(() => {
    setTick((t) => t + 1);
    window.dispatchEvent(new Event(CREDIT_REFRESH_EVENT));
  }, []);

  return { balance, loading, refresh };
}
