import { DashboardShell } from "@/components/layout/DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        {children}
      </div>
    </DashboardShell>
  );
}
