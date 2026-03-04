import { DashboardShell } from "@/components/layout/DashboardShell";

export default function PrepSessionLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
