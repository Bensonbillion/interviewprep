"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Zap, CreditCard } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";
import { CREDIT_PACKS, CREDIT_COSTS, type PackId } from "@/lib/stripe-shared";
import { createClient } from "@/lib/supabase/client";

export default function BillingPage() {
  const { balance, loading: creditsLoading, refresh } = useCredits();
  const [loadingPack, setLoadingPack] = useState<PackId | null>(null);
  const [purchases, setPurchases] = useState<
    Array<{
      id: string;
      pack_id: string;
      credits_added: number;
      amount_cents: number;
      created_at: string;
    }>
  >([]);
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  // Refresh credits after successful purchase
  useEffect(() => {
    if (success) refresh();
  }, [success, refresh]);

  // Fetch purchase history
  useEffect(() => {
    async function fetchHistory() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("credit_purchases")
        .select("id, pack_id, credits_added, amount_cents, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      setPurchases(data || []);
    }
    fetchHistory();
  }, [success]);

  const handlePurchase = async (packId: PackId) => {
    setLoadingPack(packId);
    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });

      const { url, error } = await response.json();

      if (error) {
        alert(error);
        return;
      }

      window.location.href = url;
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoadingPack(null);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Success banner */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
          <span>✓</span>
          Credits added to your account!
        </div>
      )}

      {canceled && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-medium flex items-center gap-2">
          <span>↩</span>
          Purchase canceled. No charge was made.
        </div>
      )}

      {/* Current balance */}
      <div className="p-6 rounded-[var(--card-radius)] bg-[var(--bg-card)] shadow-card border border-stone-200/50 dark:border-white/5">
        <div className="flex items-center gap-2.5 mb-1">
          <Zap className="w-5 h-5 text-coral" />
          <p className="text-sm font-semibold text-[var(--text-primary)]">Your balance</p>
        </div>
        <p className="text-4xl font-bold text-[var(--text-primary)] mt-2">
          {creditsLoading ? "—" : balance}
          <span className="text-lg font-normal text-[var(--text-tertiary)] ml-1.5">
            credit{balance !== 1 ? "s" : ""}
          </span>
        </p>
        <div className="mt-3 flex gap-4 text-xs text-[var(--text-tertiary)]">
          <span>Full kit = {CREDIT_COSTS.full_kit} credits</span>
          <span>·</span>
          <span>Single answer = {CREDIT_COSTS.single_answer} credit</span>
          <span>·</span>
          <span>Refinement = {CREDIT_COSTS.refinement} credit</span>
        </div>
      </div>

      {/* Credit packs */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <CreditCard className="w-5 h-5 text-[var(--text-tertiary)]" />
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Buy Credits</h2>
        </div>

        <div className="grid gap-3">
          {(Object.entries(CREDIT_PACKS) as [PackId, (typeof CREDIT_PACKS)[PackId]][]).map(
            ([id, pack]) => (
              <div
                key={id}
                className={`relative p-5 rounded-[var(--card-radius)] bg-[var(--bg-card)] shadow-card border transition-all duration-150 ${
                  "popular" in pack
                    ? "border-coral/30 dark:border-coral/20"
                    : "border-stone-200/50 dark:border-white/5"
                }`}
              >
                {"popular" in pack && (
                  <span className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-coral text-white">
                    MOST POPULAR
                  </span>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)]">
                      {pack.name}
                    </h3>
                    <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                      {pack.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handlePurchase(id)}
                    disabled={loadingPack !== null}
                    className={`shrink-0 ml-4 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 min-h-[44px] ${
                      loadingPack === id
                        ? "bg-stone-200 dark:bg-white/10 text-stone-400 dark:text-white/30 cursor-wait"
                        : "bg-stone-900 dark:bg-cream-50 text-cream-50 dark:text-stone-900 hover:opacity-90 active:scale-[0.98]"
                    }`}
                  >
                    {loadingPack === id ? "Loading..." : pack.priceDisplay}
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Purchase history */}
      {purchases.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Purchase History</h2>
          <div className="space-y-2">
            {purchases.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-[var(--bg-card)] shadow-card border border-stone-200/50 dark:border-white/5 text-sm"
              >
                <div>
                  <span className="font-medium text-[var(--text-primary)]">
                    +{p.credits_added} credits
                  </span>
                  <span className="text-[var(--text-tertiary)] ml-2">
                    {CREDIT_PACKS[p.pack_id as PackId]?.name || p.pack_id}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[var(--text-primary)] font-medium">
                    ${(p.amount_cents / 100).toFixed(2)}
                  </span>
                  <span className="block text-[11px] text-[var(--text-tertiary)]">
                    {new Date(p.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
