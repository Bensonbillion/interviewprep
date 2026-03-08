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
    <footer className="bg-[#1A1A1A] py-12 border-t border-[#333]">
      <div className="max-w-6xl mx-auto px-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-serif text-lg text-white">
              SalesPrep AI
            </Link>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed max-w-[220px] font-sans">
              AI interview preparation for tech sales candidates.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 font-sans">
              Product
            </p>
            <ul className="space-y-2">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors font-sans"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 font-sans">
              Support
            </p>
            <ul className="space-y-2">
              {SUPPORT_LINKS.map((l) => (
                <li key={l.href}>
                  {l.href.startsWith("mailto:") ? (
                    <a
                      href={l.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors font-sans"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      className="text-sm text-gray-400 hover:text-white transition-colors font-sans"
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
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 font-sans">
              Follow us
            </p>
            <ul className="space-y-2">
              {SOCIAL_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-white transition-colors font-sans"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500 font-sans">
            &copy; 2026 SalesPrep AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
