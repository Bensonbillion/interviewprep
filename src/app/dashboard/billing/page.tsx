"use client";

import Link from "next/link";
import { CreditCard, Zap } from "lucide-react";
import { useCredits } from "@/hooks/useCredits";

export default function BillingPage() {
  const { balance, loading } = useCredits();

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-ink">Credits &amp; Billing</h1>
        <p className="text-sm text-ink-muted mt-1">Manage your prep kit credits.</p>
      </div>

      {/* Current balance */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 mb-1">
          <Zap className="w-5 h-5 text-[#4A7AFF]" />
          <p className="text-sm font-semibold text-ink">Current balance</p>
        </div>
        <p className="text-4xl font-bold text-ink mt-2">
          {loading ? "—" : balance}
        </p>
        <p className="text-sm text-ink-muted mt-0.5">
          credit{balance !== 1 ? "s" : ""} remaining
        </p>
      </div>

      {/* Credit packages */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-5 h-5 text-[#4A7AFF]" />
          <p className="text-sm font-semibold text-ink">Buy more credits</p>
        </div>
        <div className="space-y-3">
          {[
            { name: "3 Prep Kits", credits: 3, price: "$9", per: "$3/kit" },
            { name: "10 Prep Kits", credits: 10, price: "$19", per: "$1.90/kit", tag: "Popular" },
            { name: "25 Prep Kits", credits: 25, price: "$39", per: "$1.56/kit" },
            { name: "Unlimited", credits: null, price: "$49/mo", per: "All you can prep", tag: "Best value" },
          ].map((pkg) => (
            <div
              key={pkg.name}
              className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-[#4A7AFF] transition-colors cursor-pointer"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink">{pkg.name}</p>
                  {pkg.tag && (
                    <span className="text-xs font-medium text-[#4A7AFF] bg-[#EEF4FF] px-1.5 py-0.5 rounded-full">
                      {pkg.tag}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-muted mt-0.5">{pkg.per}</p>
              </div>
              <p className="text-base font-bold text-ink">{pkg.price}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-ink-muted mt-4 text-center">
          Stripe payment coming soon ·{" "}
          <Link href="/dashboard" className="text-[#4A7AFF] hover:underline">
            Back to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
