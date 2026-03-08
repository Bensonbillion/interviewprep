"use client";

import { useState, useEffect, useCallback } from "react";

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

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { balance, loading, refresh };
}
