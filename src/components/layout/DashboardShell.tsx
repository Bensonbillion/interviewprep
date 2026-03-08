"use client";

import { Sidebar } from "./Sidebar";
import { MobileTabBar } from "./MobileTabBar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100vh-56px)]">
      {/* Desktop sidebar */}
      <Sidebar className="hidden md:flex" />

      {/* Main content */}
      <main className="flex-1 bg-cream-dark min-h-full pb-20 md:pb-0">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <MobileTabBar className="md:hidden" />
    </div>
  );
}
