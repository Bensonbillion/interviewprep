"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TIERS, TIER_IDS, type TierId, formatPrice, tierNeedsKitScope } from "@/lib/stripe-tiers";
import { Footer } from "@/components/landing/Footer";
import { createClient } from "@/lib/supabase/client";
import { KitPickerModal } from "@/components/pricing/KitPickerModal";

/**
 * v3 pricing page.
 *
 * Three one-time tiers — Single Round $9, Full Interview $24 (hero,
 * "Most Popular"), Job Search Pass $49. Buttons fire Stripe Checkout
 * via /api/stripe/checkout. Scope-at-purchase is resolved server-side
 * from a kit_id; the client never sends company/round strings.
 *
 * Honest-copy contract (per Session 3 brief):
 *   • No banner for logged-out visitors.
 *   • No "Coming soon" anywhere.
 *   • No "ROI framing:" internal annotations.
 *   • Logged-in entitlement/legacy-credit state surfaces here as small
 *     accurate badges via /api/user/entitlements + /api/user/credits.
 *
 * Bare /pricing without ?kit_id= for the two scoped tiers → KitPickerModal
 * lets the user pick. With no kits, the modal CTAs to /get-started.
 *
 * Logged-out tier click → /auth/login?redirectTo=<this page with intent>.
 *
 * Refund line copy is a placeholder marked for Session 10 reconciliation
 * with the Terms rewrite.
 */
export default function PricingPage() {
  const searchParams = useSearchParams();
  const kitIdFromQuery = searchParams.get("kit_id") ?? undefined;

  const [authReady, setAuthReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [busy, setBusy] = useState<TierId | null>(null);
  const [pickerFor, setPickerFor] = useState<TierId | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Logged-in state — small honest badges so people aren't told
  // "Buy unlimited" when they already have an active pass.
  const [activePass, setActivePass] = useState<{ expires_at: string } | null>(null);
  const [activeFullInterview, setActiveFullInterview] = useState<string[]>([]);
  const [legacyCreditBalance, setLegacyCreditBalance] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetch("/api/user/entitlements")
      .then((r) => r.json())
      .then((d: { entitlements?: Array<{ type: string; company_scope: string | null; expires_at: string | null }> }) => {
        const ents = d.entitlements ?? [];
        const pass = ents.find((e) => e.type === "search_pass" && e.expires_at);
        setActivePass(pass ? { expires_at: pass.expires_at as string } : null);
        setActiveFullInterview(
          ents.filter((e) => e.type === "full_interview" && e.company_scope).map((e) => e.company_scope as string)
        );
      })
      .catch(() => {/* fail silent — empty badges */});
    fetch("/api/user/credits")
      .then((r) => r.json())
      .then((d: { balance?: number }) => setLegacyCreditBalance(d.balance ?? 0))
      .catch(() => setLegacyCreditBalance(null));
  }, [isLoggedIn]);

  const cancelled = searchParams.get("canceled") === "true";

  const tiers = useMemo(() => TIER_IDS.map((id) => TIERS[id]), []);

  async function launchCheckout(tier: TierId, kitId: string | undefined) {
    setError(null);
    setBusy(tier);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, kit_id: kitId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Couldn't start checkout. Try again in a moment.");
        setBusy(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Couldn't start checkout. Try again in a moment.");
      setBusy(null);
    }
  }

  function handleTierClick(tier: TierId) {
    setError(null);
    if (!authReady) return;

    if (!isLoggedIn) {
      const redirectTo = encodeURIComponent(
        `/pricing?tier=${tier}${kitIdFromQuery ? `&kit_id=${kitIdFromQuery}` : ""}`
      );
      window.location.href = `/auth/login?redirectTo=${redirectTo}`;
      return;
    }

    if (tier === "search_pass") {
      void launchCheckout(tier, undefined);
      return;
    }

    if (kitIdFromQuery) {
      void launchCheckout(tier, kitIdFromQuery);
      return;
    }

    // No kit_id and the tier needs one — open the picker.
    setPickerFor(tier);
  }

  // After login → /pricing?tier=... rehydrates the intent automatically.
  useEffect(() => {
    if (!authReady || !isLoggedIn) return;
    const intent = searchParams.get("tier");
    if (intent && (TIER_IDS as string[]).includes(intent)) {
      handleTierClick(intent as TierId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, isLoggedIn]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F0F7FF]">
      <main className="flex-1 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="mb-6 gap-1 -ml-2 text-[#4A7AFF] hover:text-[#3B5FE6]">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          </Link>

          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-[#0F172A] mb-3">Pick the prep you need</h1>
            <p className="text-[#64748B] max-w-md mx-auto">
              One-time payment. No subscription, no auto-renewal.
            </p>

            {/* Honest logged-in state — only renders for authenticated users. */}
            {isLoggedIn && activePass && (
              <p className="mt-3 text-sm text-[#0EA5E9]">
                Active Job Search Pass — expires {new Date(activePass.expires_at).toLocaleDateString()}.
              </p>
            )}
            {isLoggedIn && activeFullInterview.length > 0 && !activePass && (
              <p className="mt-3 text-sm text-[#0EA5E9]">
                Full Interview active for {activeFullInterview.join(", ")}.
              </p>
            )}
            {isLoggedIn && legacyCreditBalance !== null && legacyCreditBalance > 0 && (
              <p className="mt-1 text-xs text-[#64748B]">
                You also have {legacyCreditBalance} legacy credit{legacyCreditBalance === 1 ? "" : "s"} remaining.
              </p>
            )}
          </div>

          {cancelled && (
            <p className="text-center text-sm text-[#94A3B8] mb-6">
              Checkout canceled. No charge.
            </p>
          )}
          {error && (
            <p className="text-center text-sm text-red-600 mb-6">{error}</p>
          )}

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {tiers.map((tier) => (
              <Card
                key={tier.id}
                className={`relative bg-white ${
                  tier.popular ? "border-2 border-[#4A7AFF] shadow-lg md:scale-105" : "border border-[#DBEAFE]"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-xs font-bold bg-[#4A7AFF] text-white px-3 py-1 rounded-full whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardContent className="p-6 pt-7">
                  <p className="font-bold text-[#0F172A] text-lg">{tier.label}</p>
                  <p className="text-sm text-[#64748B] mt-1 min-h-[40px]">{tier.description}</p>
                  <p className="text-3xl font-bold text-[#0F172A] mt-4">
                    {formatPrice(tier.priceCents)}
                    <span className="text-sm font-normal text-[#94A3B8]"> one-time</span>
                  </p>
                  <Button
                    className="w-full mt-5"
                    variant={tier.popular ? "default" : "outline"}
                    onClick={() => handleTierClick(tier.id)}
                    disabled={busy !== null}
                  >
                    {busy === tier.id ? "Loading…" : `Get ${tier.label}`}
                  </Button>
                  {tierNeedsKitScope(tier.id) && (
                    <p className="text-xs text-[#94A3B8] text-center mt-2">
                      {kitIdFromQuery ? "Will apply to your selected kit." : "We'll ask which kit when you check out."}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Money-back guarantee — placeholder copy flagged for Session 10. */}
          {/* TODO(Session 10): confirm exact window + wording against the
              terms.ts §5.4 rewrite. Do not invent a different window here. */}
          <p className="text-center text-sm text-[#64748B] mb-2">
            Didn&rsquo;t help? Full refund within 14 days.
          </p>

          {/* Tier coverage at a glance — replaces the old "What 1 credit unlocks" block. */}
          <div className="bg-white rounded-xl border border-[#DBEAFE] p-6 mt-6">
            <h3 className="font-semibold text-[#0F172A] mb-3">What each tier covers</h3>
            <ul className="space-y-2 text-sm text-[#475569]">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
                <span><strong>Single Round</strong> — one round kit at one company.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
                <span><strong>Full Interview</strong> — every round and Live Mode at one company.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#10B981] flex-shrink-0 mt-0.5" />
                <span><strong>Job Search Pass</strong> — unlimited kits at any company for 30 days.</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />

      {pickerFor && (
        <KitPickerModal
          tierLabel={TIERS[pickerFor].label}
          onSelect={(kitId) => {
            const tier = pickerFor;
            setPickerFor(null);
            void launchCheckout(tier, kitId);
          }}
          onClose={() => setPickerFor(null)}
        />
      )}
    </div>
  );
}
