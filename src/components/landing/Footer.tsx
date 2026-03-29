import Link from "next/link";

export function Footer() {
  return (
    <footer className="flex flex-col sm:flex-row items-center justify-between px-6 sm:px-14 py-7 border-t border-[#E8E4DF] bg-[#F7F6F3] gap-4">
      <div className="font-[family-name:var(--font-serif)] text-[15px] text-[#1C1713]">SalesPrep <span className="text-[#E8735A]">AI</span></div>
      <div className="flex gap-5">
        {["Privacy", "Terms", "Contact"].map((link) => (<Link key={link} href={`/${link.toLowerCase()}`} className="text-[12px] text-[#9B8E82] hover:text-[#1C1713] transition-colors">{link}</Link>))}
      </div>
      <p className="text-[12px] text-[#9B8E82]">© 2026 SalesPrep AI</p>
    </footer>
  );
}
