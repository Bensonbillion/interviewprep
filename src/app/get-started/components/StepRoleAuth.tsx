"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { trackEvent } from "@/lib/tracking/events";
import type { RoleType } from "@/types";
import { RoleCard } from "./RoleCard";
import { MobileSamplePreview } from "./MobileSamplePreview";

const SP_ROLE_KEY = "sp_gs_role";

const ROLE_OPTIONS: { id: RoleType; label: string; sublabel: string }[] = [
  { id: "sdr_bdr", label: "SDR / BDR", sublabel: "Sales Development Rep" },
  { id: "account_executive", label: "Account Executive", sublabel: "Closing / quota-carrying" },
  { id: "account_manager_csm", label: "AM / CSM", sublabel: "Post-sale relationships" },
  { id: "other_sales", label: "Other Sales", sublabel: "Manager, VP, Partnerships..." },
];

interface StepRoleAuthProps {
  onRoleChange?: (role: RoleType) => void;
}

export function StepRoleAuth({ onRoleChange }: StepRoleAuthProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<RoleType | null>(null);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(SP_ROLE_KEY) as RoleType | null;
    if (saved) {
      setRole(saved);
      onRoleChange?.(saved);
    }

    const callbackError = searchParams.get("error");
    if (callbackError) setError(callbackError);

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthed(!!user);
      setUserEmail(user?.email ?? null);
    });
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveRole = (r: RoleType) => {
    setRole(r);
    localStorage.setItem(SP_ROLE_KEY, r);
    onRoleChange?.(r);
  };

  const handleContinueAuthed = () => {
    if (!role) return;
    router.push("/get-started/resume");
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsAuthed(false);
    setUserEmail(null);
  };

  const handleGoogle = async () => {
    if (!role) return;
    setOauthLoading(true);
    setError("");
    trackEvent({ name: "sign_up_initiated", properties: { method: "google" } });
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(
          "/get-started/resume"
        )}`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setOauthLoading(false);
    }
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !email) return;
    setEmailLoading(true);
    setError("");
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(
          "/get-started/resume"
        )}`,
      },
    });
    if (otpError) {
      setError(otpError.message);
    } else {
      setEmailSent(true);
    }
    setEmailLoading(false);
  };

  if (isAuthed === null) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-7 h-7 animate-spin text-[#4A7AFF]" />
      </div>
    );
  }

  const authDisabled = !role;

  return (
    <div className="space-y-5">
      {/* Role cards — headline above serves as the label, no duplicate needed */}
      <div className="grid grid-cols-2 gap-2.5">
        {ROLE_OPTIONS.map((r) => (
          <RoleCard
            key={r.id}
            label={r.label}
            sublabel={r.sublabel}
            selected={role === r.id}
            onClick={() => saveRole(r.id)}
          />
        ))}
      </div>

      {/* Mobile sample preview — below role cards, above auth */}
      <MobileSamplePreview selectedRole={role} />

      {/* Auth / signed-in section */}
      {isAuthed ? (
        <div className="space-y-3">
          {/* Compact signed-in state */}
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-sm font-medium">✓</span>
              <span className="text-sm text-[#0F172A]">
                Signed in as <strong className="font-medium">{userEmail}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-[#94A3B8] hover:text-red-500 mt-1 ml-5 transition-colors"
            >
              Not you? Sign out
            </button>
          </div>
          <Button className="w-full" disabled={authDisabled} onClick={handleContinueAuthed}>
            Continue →
          </Button>
        </div>
      ) : emailSent ? (
        <div className="bg-[#ECFDF5] border border-[#6EE7B7] rounded-xl p-5 text-center">
          <p className="font-semibold text-[#065F46] mb-1">Check your email</p>
          <p className="text-sm text-[#047857]">
            We sent a link to <strong>{email}</strong>. Click it to continue to Step 2.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wide text-center">
            Sign in to save your prep
          </p>

          {/* Google OAuth */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleGoogle}
            disabled={authDisabled || oauthLoading}
          >
            {oauthLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#DBEAFE]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-[#94A3B8]">or email</span>
            </div>
          </div>

          <form onSubmit={handleEmail} className="space-y-2.5">
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={authDisabled}
              required
            />
            <Button
              type="submit"
              variant="outline"
              className="w-full"
              disabled={authDisabled || emailLoading || !email}
            >
              {emailLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...
                </>
              ) : (
                "Send login link"
              )}
            </Button>
          </form>

          {authDisabled && (
            <p className="text-xs text-center text-[#94A3B8]">Select a role above to continue</p>
          )}
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        </div>
      )}
    </div>
  );
}
