"use client";

import { Sidebar } from "./Sidebar";
import { MobileTabBar } from "./MobileTabBar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[var(--bg-page)]">
      <div className="flex">
        {/* Desktop sidebar — SOLID, not glass */}
        <Sidebar className="hidden md:flex" />

        {/* Main content — constrained width for readability */}
        <main className="flex-1 min-w-0 pb-20 md:pb-0">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileTabBar className="md:hidden" />
    </div>
  );
}
