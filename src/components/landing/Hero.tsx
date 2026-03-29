import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-[#1C1713] px-6 sm:px-14 pt-[88px] pb-20 text-center overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 800px 400px at 50% 100%,rgba(232,115,90,0.06) 0%,transparent 70%)" }} />

      <p className="text-[11px] font-medium tracking-[0.14em] uppercase text-[#E8735A] mb-6 relative z-10"
        style={{ animation: "fadeUp 0.6s 0.1s ease both" }}>
        AI interview prep · Tech sales
      </p>

      <h1 className="font-[family-name:var(--font-serif)] text-[40px] sm:text-[56px] lg:text-[64px] leading-[1.06] tracking-[-1.5px] text-[#F7F6F3] max-w-[820px] mx-auto mb-3 relative z-10"
        style={{ animation: "fadeUp 0.7s 0.2s ease both" }}>
        Your interviewer<br />has a scorecard.<br />
        <em className="text-[#E8735A] not-italic">Now you do too.</em>
      </h1>

      <p className="text-[15px] sm:text-[17px] leading-[1.65] text-[rgba(247,246,243,0.55)] max-w-[540px] mx-auto mb-11 font-light relative z-10"
        style={{ animation: "fadeUp 0.7s 0.35s ease both" }}>
        SalesPrep reads your resume, researches how your{" "}
        <span className="text-[rgba(247,246,243,0.85)]">specific company</span>{" "}
        interviews, and builds a full prep kit around their exact scoring criteria.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-[18px] relative z-10"
        style={{ animation: "fadeUp 0.7s 0.45s ease both" }}>
        <Link href="/get-started">
          <button type="button" className="relative overflow-hidden bg-[#E8735A] text-white text-[15px] font-medium px-8 py-[14px] rounded-full border-none cursor-pointer hover:bg-[#C85A42] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(232,115,90,0.35)] transition-all duration-200 group">
            <span className="relative z-10">Build my prep kit — it&apos;s free →</span>
            <span className="absolute inset-0 w-[40%] bg-white/15 skew-x-[-20deg] -translate-x-full group-hover:[animation:shimmer_0.5s_ease_forwards]" />
          </button>
        </Link>
        <a href="#how-it-works">
          <button type="button" className="bg-transparent text-[rgba(247,246,243,0.5)] text-[13px] px-5 py-[14px] rounded-full cursor-pointer border border-[rgba(247,246,243,0.15)] hover:border-[rgba(247,246,243,0.35)] hover:text-[rgba(247,246,243,0.75)] transition-all duration-200">
            See how it works
          </button>
        </a>
      </div>

      <p className="text-[12px] text-[rgba(247,246,243,0.3)] tracking-[0.03em] relative z-10"
        style={{ animation: "fadeUp 0.7s 0.55s ease both" }}>
        Free forever plan · No credit card · 5 minutes to your first kit
      </p>
    </section>
  );
}
