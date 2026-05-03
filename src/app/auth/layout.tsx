import { Footer } from "@/components/landing/Footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-page)]">
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
