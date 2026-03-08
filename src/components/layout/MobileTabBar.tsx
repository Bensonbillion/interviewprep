"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Plus, Settings } from "lucide-react";

interface TabItemProps {
  icon: React.ElementType;
  label: string;
  href: string;
  isAction?: boolean;
}

function TabItem({ icon: Icon, label, href, isAction }: TabItemProps) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  if (isAction) {
    return (
      <Link
        href={href}
        className="flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px]"
      >
        <div className="w-10 h-10 rounded-full bg-[#FF6B4A] flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-0.5 min-w-[48px] min-h-[48px] transition-colors ${
        isActive ? "text-primary-500" : "text-ink-muted"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </Link>
  );
}

export function MobileTabBar({ className = "" }: { className?: string }) {
  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 z-50 pb-[env(safe-area-inset-bottom)] ${className}`}
    >
      <div className="flex items-center justify-around h-14 px-2">
        <TabItem icon={Home} label="Home" href="/dashboard" />
        <TabItem icon={FileText} label="Preps" href="/prep" />
        <TabItem icon={Plus} label="New" href="/get-started" isAction />
        <TabItem icon={Settings} label="Settings" href="/dashboard/settings" />
      </div>
    </nav>
  );
}
