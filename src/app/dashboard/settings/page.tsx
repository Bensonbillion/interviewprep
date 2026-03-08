"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace("/auth/login?redirectTo=/dashboard/settings");
        return;
      }
      setUser(user);
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-7 h-7 animate-spin text-primary-500" />
      </div>
    );
  }

  const fullName =
    (user?.user_metadata?.full_name as string | undefined) ??
    (user?.user_metadata?.name as string | undefined) ??
    "";

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-ink">Settings</h1>
        <p className="text-sm text-ink-muted mt-1">Manage your account preferences.</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-3 mb-4">
          <User className="w-5 h-5 text-[#4A7AFF]" />
          <p className="text-sm font-semibold text-ink">Account</p>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <span className="text-ink-muted">Name</span>
            <span className="text-ink font-medium">{fullName || "—"}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-50">
            <span className="text-ink-muted">Email</span>
            <span className="text-ink font-medium">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-ink-muted">Sign-in method</span>
            <span className="text-ink font-medium capitalize">
              {user?.app_metadata?.provider ?? "email"}
            </span>
          </div>
        </div>
      </div>

      <p className="text-xs text-ink-muted text-center">
        Additional settings coming soon — name editing, notifications, and more.
      </p>
    </div>
  );
}
