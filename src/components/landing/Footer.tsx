import Link from "next/link";

export function Footer() {
  return (
    <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 sm:px-14 py-7 border-t border-[#E8E4DF] dark:border-white/10 bg-[#F7F6F3] dark:bg-[var(--bg-page)]">
      <div className="flex items-center gap-2 text-[12px] text-[#9B8E82]">
        <Link
          href="/privacy"
          className="hover:text-[#1C1713] dark:hover:text-white transition-colors"
        >
          Privacy
        </Link>
        <span aria-hidden="true">·</span>
        <Link
          href="/terms"
          className="hover:text-[#1C1713] dark:hover:text-white transition-colors"
        >
          Terms
        </Link>
        <span aria-hidden="true">·</span>
        <a
          href="mailto:hello@roadmapengine.ai"
          className="hover:text-[#1C1713] dark:hover:text-white transition-colors"
        >
          hello@roadmapengine.ai
        </a>
      </div>
      <p className="text-[12px] text-[#9B8E82]">
        © 2026 SalesPrep AI · Roadmap Engine Inc.
      </p>
    </footer>
  );
}
