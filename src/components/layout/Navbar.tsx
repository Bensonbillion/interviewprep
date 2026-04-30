"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { LogoFull } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { useCredits } from "@/hooks/useCredits";

export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCreditBreakdown, setShowCreditBreakdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const creditRef = useRef<HTMLDivElement>(null);
  const { balance: credits, loading: creditsLoading } = useCredits();
  const prevCreditsRef = useRef<number | null>(null);
  const [creditFlash, setCreditFlash] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!showCreditBreakdown) return;
    const handleOutside = (e: MouseEvent) => {
      if (creditRef.current && !creditRef.current.contains(e.target as Node)) {
        setShowCreditBreakdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [showCreditBreakdown]);

  useEffect(() => {
    if (creditsLoading) return;
    if (prevCreditsRef.current !== null && credits < prevCreditsRef.current) {
      // Conditional flash with timer cleanup is a legitimate effect pattern;
      // refactoring away the setState would break the auto-clear timeout.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCreditFlash(true);
      const t = setTimeout(() => setCreditFlash(false), 800);
      return () => clearTimeout(t);
    }
    prevCreditsRef.current = credits;
  }, [credits, creditsLoading]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setDropdownOpen(false);
    router.push("/");
  };

  const getInitials = (u: User): string => {
    const name =
      (u.user_metadata?.full_name as string | undefined) ??
      (u.user_metadata?.name as string | undefined);
    if (name) {
      const parts = name.trim().split(/\s+/);
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0][0].toUpperCase();
    }
    return (u.email?.[0] ?? "?").toUpperCase();
  };

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  return (
    <nav
      className={[
        "fixed top-0 left-0 right-0 z-50",
        "h-14 px-4 sm:px-6",
        "flex items-center justify-between",
        "bg-[var(--glass-bg)]",
        "[backdrop-filter:var(--glass-blur)]",
        "[-webkit-backdrop-filter:var(--glass-blur)]",
        "border-b border-[var(--glass-border)]",
        "shadow-glass",
        "supports-[not(backdrop-filter:blur(1px))]:bg-[var(--bg-page)]/95",
        "will-change-[backdrop-filter]",
        "[transform:translateZ(0)]",
      ].join(" ")}
    >
      {/* Logo */}
      <Link
        href={user ? "/dashboard" : "/"}
        className="hover:opacity-80 transition-opacity"
      >
        <LogoFull size="sm" />
      </Link>

      {/* Right side */}
      {user ? (
        <div className="flex items-center gap-2">
          {/* Credit pill with breakdown dropdown */}
          {!creditsLoading && (
            <div className="relative" ref={creditRef}>
              {/* Desktop */}
              <button
                onClick={() => setShowCreditBreakdown((o) => !o)}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                  creditFlash
                    ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 scale-110"
                    : credits === 0
                    ? "bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400"
                    : "bg-[var(--coral-bg)] border border-[var(--coral-border)] text-coral-dark dark:text-[var(--coral-text)]"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{credits} credit{credits !== 1 ? "s" : ""}</span>
              </button>

              {/* Mobile */}
              <button
                onClick={() => setShowCreditBreakdown((o) => !o)}
                className={`sm:hidden flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                  creditFlash
                    ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 scale-110"
                    : credits === 0
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                    : "bg-[var(--coral-bg)] border border-[var(--coral-border)] text-coral-dark dark:text-[var(--coral-text)]"
                }`}
              >
                <Zap className="w-3 h-3" />
                {credits}
              </button>

              {/* Breakdown dropdown */}
              {showCreditBreakdown && (
                <div className="absolute right-0 top-9 w-56 bg-[var(--bg-card)] border border-stone-200 dark:border-white/10 rounded-2xl shadow-lg p-4 z-50">
                  <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">Your Credits: {credits}</p>
                  <div className="space-y-1.5 text-xs text-[var(--text-tertiary)] mb-3">
                    <p className="font-medium text-[var(--text-secondary)]">What costs credits:</p>
                    <p>New prep kit: <span className="font-medium text-[var(--text-primary)]">1 credit</span></p>
                    <p>Answer refinement: <span className="font-medium text-[var(--text-primary)]">1 credit</span></p>
                    <p className="opacity-70">(first 3 per answer free)</p>
                  </div>
                  <div className="border-t border-stone-200 dark:border-white/10 pt-3 space-y-1 text-xs text-[var(--text-tertiary)]">
                    <p>Manual edits: <span className="font-medium text-[var(--success)]">always free</span></p>
                    <p>Copying answers: <span className="font-medium text-[var(--success)]">free</span></p>
                  </div>
                  <Link
                    href="/dashboard/billing"
                    className="mt-3 block text-xs font-medium text-[var(--coral)] hover:opacity-80"
                    onClick={() => setShowCreditBreakdown(false)}
                  >
                    Get more credits &rarr;
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Dark mode toggle */}
          <ThemeToggle />

          {/* Avatar + dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center rounded-full focus:outline-none"
              aria-label="Account menu"
            >
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-white/10 text-[var(--text-secondary)] flex items-center justify-center text-sm font-semibold select-none">
                  {getInitials(user)}
                </div>
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-11 w-56 bg-[var(--bg-card)] border border-stone-200 dark:border-white/10 rounded-2xl shadow-lg py-2 z-50">
                <p className="px-4 py-2 text-sm text-[var(--text-tertiary)] truncate">{user.email}</p>
                <div className="border-t border-stone-200 dark:border-white/10 my-1" />
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-stone-100/60 dark:hover:bg-white/5 transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  My Prep Kits
                </Link>
                <Link
                  href="/dashboard/billing"
                  className="block px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-stone-100/60 dark:hover:bg-white/5 transition-colors"
                  onClick={() => setDropdownOpen(false)}
                >
                  Credits &amp; Billing
                </Link>
                <div className="border-t border-stone-200 dark:border-white/10 my-1" />
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--error)] hover:bg-[var(--error-bg)] transition-colors"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Link
            href="/blog"
            className="text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors hidden sm:block"
          >
            Blog
          </Link>
          <Link
            href="/auth/login"
            className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors hidden sm:block"
          >
            Sign In
          </Link>
          <ThemeToggle />
          <Link
            href="/get-started"
            className="bg-coral hover:bg-coral-dark text-white text-sm font-medium rounded-full px-5 py-2 transition-all duration-200"
          >
            Get Started
          </Link>
        </div>
      )}
    </nav>
  );
}
