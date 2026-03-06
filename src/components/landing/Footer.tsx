import Link from "next/link";

const PRODUCT_LINKS = [
  { label: "Get Started", href: "/get-started" },
  { label: "Companies", href: "/companies" },
  { label: "Blog", href: "/blog" },
  { label: "Pricing", href: "/pricing" },
];

const SUPPORT_LINKS = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Contact", href: "mailto:support@salesprep.ai" },
];

const SOCIAL_LINKS = [
  { label: "LinkedIn", href: "https://linkedin.com/company/salesprep-ai" },
  { label: "TikTok", href: "https://tiktok.com/@salesprep.ai" },
  { label: "Twitter", href: "https://twitter.com/SalesPrepAI" },
];

export function Footer() {
  return (
    <footer className="bg-[#111] py-10 border-t border-[#2a2a2a]">
      <div className="max-w-[1120px] mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-lg font-bold text-[#4A7AFF]">
              SalesPrep AI
            </Link>
            <p className="text-xs text-[#666] mt-2 leading-relaxed max-w-[200px]">
              AI interview preparation for tech sales candidates.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">
              Product
            </p>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-[#999] hover:text-[#e0e0e0] transition-colors"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">
              Support
            </p>
            <ul className="space-y-2">
              {SUPPORT_LINKS.map((l) => (
                <li key={l.href}>
                  {l.href.startsWith("mailto:") ? (
                    <a
                      href={l.href}
                      className="text-sm text-[#999] hover:text-[#e0e0e0] transition-colors"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      className="text-sm text-[#999] hover:text-[#e0e0e0] transition-colors"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <p className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">
              Follow us
            </p>
            <ul className="space-y-2">
              {SOCIAL_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#999] hover:text-[#e0e0e0] transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#2a2a2a] text-center">
          <p className="text-xs text-[#555]">
            &copy; 2026 SalesPrep AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
