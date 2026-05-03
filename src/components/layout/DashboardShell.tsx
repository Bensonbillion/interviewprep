"use client";

import { Sidebar } from "./Sidebar";
import { MobileTabBar } from "./MobileTabBar";
import { Footer } from "@/components/landing/Footer";

interface DashboardShellProps {
  children: React.ReactNode;
  /**
   * Whether to render the global Footer at the bottom of the main column.
   * Off by default — prep session and live-mode pages need every pixel.
   * Dashboard pages (which are not focus-mode) should opt in.
   */
  showFooter?: boolean;
}

export function DashboardShell({ children, showFooter = false }: DashboardShellProps) {
  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[var(--bg-page)]">
      <div className="flex">
        {/* Desktop sidebar — SOLID, not glass */}
        <Sidebar className="hidden md:flex" />

        {/* Main content + optional footer column */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 pb-20 md:pb-0">{children}</div>
          {showFooter && <Footer />}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileTabBar className="md:hidden" />
    </div>
  );
}
