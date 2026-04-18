"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // Password login state
  const [passwordEmail, setPasswordEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const supabase = createClient();

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send login link");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordEmail || !password) return;
    setPasswordLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: passwordEmail,
        password,
      });
      if (error) throw error;
      window.location.href = redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleGoogleOAuth = async () => {
    setOauthLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
      setOauthLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F0F7FF] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <Link href="/">
            <button className="flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#0F172A] mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Home
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-[#0F172A]">Sign in</h1>
          <p className="text-sm text-[#64748B] mt-1">
            Save your prep kits and pick up where you left off.
          </p>
        </div>

        {sent ? (
          <div className="bg-[#ECFDF5] border border-[#6EE7B7] rounded-xl p-5 text-center">
            <p className="font-semibold text-[#065F46] mb-1">Check your email</p>
            <p className="text-sm text-[#047857]">
              We sent a login link to <strong>{email}</strong>. Click it to sign in.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google OAuth */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleGoogleOAuth}
              disabled={oauthLoading}
            >
              {oauthLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                <span className="bg-[#F0F7FF] px-3 text-[#94A3B8]">or</span>
              </div>
            </div>

            {/* Magic link */}
            <form onSubmit={handleMagicLink} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#475569]">Email address</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</>
                ) : (
                  "Send login link"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#DBEAFE]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#F0F7FF] px-3 text-[#94A3B8]">or sign in with password</span>
              </div>
            </div>

            {/* Password login */}
            <form onSubmit={handlePasswordLogin} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-[#475569]">Email</Label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={passwordEmail}
                  onChange={(e) => setPasswordEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-[#475569]">Password</Label>
                <Input
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" variant="outline" className="w-full" disabled={passwordLoading}>
                {passwordLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Signing in...</>
                ) : (
                  "Sign in with password"
                )}
              </Button>
            </form>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </div>
        )}

        <p className="text-xs text-center text-[#94A3B8]">
          Your first 3 prep kits are free. No credit card required.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
