"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  BookOpen,
  Sparkles,
  Mic2,
  FlaskConical,
  LineChart,
  MessageSquare,
  ChevronLeft,
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: BarChart2, exact: true },
  { href: "/admin/knowledge", label: "Knowledge Sources", icon: BookOpen },
  { href: "/admin/examples", label: "Golden Examples", icon: Sparkles },
  { href: "/admin/voice", label: "Voice & Style", icon: Mic2 },
  { href: "/admin/prompts", label: "Prompt Lab", icon: FlaskConical },
  { href: "/admin/quality", label: "Quality Dashboard", icon: LineChart },
  { href: "/admin/feedback", label: "Feedback Intelligence", icon: MessageSquare },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-w-56 h-screen sticky top-0 bg-gray-900 text-white flex flex-col overflow-y-auto">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4 border-b border-gray-800">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">
          SalesPrep
        </p>
        <p className="text-sm font-semibold text-white">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-white/10 text-white font-medium"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Back to app */}
      <div className="px-3 pb-5 border-t border-gray-800 pt-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/5"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to App
        </Link>
      </div>
    </aside>
  );
}
