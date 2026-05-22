import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-[#1C1713] px-6 sm:px-14 pt-[88px] pb-20 overflow-hidden relative">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 800px 400px at 50% 100%,rgba(232,115,90,0.06) 0%,transparent 70%)",
        }}
      />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-16 items-center max-w-[1200px] mx-auto">
        {/* ── Copy column ── */}
        <div className="text-center lg:text-left">
          <p
            className="text-[11px] font-medium tracking-[0.14em] uppercase text-[#E8735A] mb-6"
            style={{ animation: "fadeUp 0.6s 0.1s ease both" }}
          >
            AI interview prep · Tech sales
          </p>

          <h1
            className="font-[family-name:var(--font-serif)] text-[40px] sm:text-[52px] lg:text-[58px] leading-[1.06] tracking-[-1.4px] text-[#F7F6F3] mb-5"
            style={{ animation: "fadeUp 0.7s 0.2s ease both" }}
          >
            Your best interview answer
            <br />
            is hiding in the job
            <br />
            <em className="text-[#E8735A] not-italic">you&rsquo;re leaving.</em>
          </h1>

          <p
            className="text-[15px] sm:text-[17px] leading-[1.65] text-[rgba(247,246,243,0.6)] max-w-[520px] mx-auto lg:mx-0 mb-9 font-light"
            style={{ animation: "fadeUp 0.7s 0.35s ease both" }}
          >
            SalesPrep builds your answers from something generic tools miss: how
            the company you&rsquo;re leaving actually competes with the company
            you&rsquo;re joining. For SDRs, BDRs, and AEs.
          </p>

          <div
            className="flex flex-col sm:flex-row items-center lg:items-start lg:justify-start justify-center gap-3 mb-[18px]"
            style={{ animation: "fadeUp 0.7s 0.45s ease both" }}
          >
            <Link href="/get-started">
              <button
                type="button"
                className="relative overflow-hidden bg-[#E8735A] text-white text-[15px] font-medium px-8 py-[14px] rounded-full border-none cursor-pointer hover:bg-[#C85A42] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(232,115,90,0.35)] transition-all duration-200 group"
              >
                <span className="relative z-10">
                  Build my prep kit — it&rsquo;s free →
                </span>
                <span className="absolute inset-0 w-[40%] bg-white/15 skew-x-[-20deg] -translate-x-full group-hover:[animation:shimmer_0.5s_ease_forwards]" />
              </button>
            </Link>
            <a href="#how-it-works">
              <button
                type="button"
                className="bg-transparent text-[rgba(247,246,243,0.5)] text-[13px] px-5 py-[14px] rounded-full cursor-pointer border border-[rgba(247,246,243,0.15)] hover:border-[rgba(247,246,243,0.35)] hover:text-[rgba(247,246,243,0.75)] transition-all duration-200"
              >
                See how it works
              </button>
            </a>
          </div>

          <p
            className="text-[12px] text-[rgba(247,246,243,0.3)] tracking-[0.03em]"
            style={{ animation: "fadeUp 0.7s 0.55s ease both" }}
          >
            Free forever plan · No credit card · 5 minutes to your first kit
          </p>
        </div>

        {/* ── Sample-answer card ── */}
        <div
          className="relative"
          style={{ animation: "fadeUp 0.7s 0.5s ease both" }}
        >
          <SampleAnswerCard />
        </div>
      </div>
    </section>
  );
}

/**
 * The hero's sample-answer card. Shows a real "tell me about yourself"
 * close drawn from the verified Motive→Samsara fixture — the excerpt a
 * candidate could not have gotten from a generic chatbot, because it
 * depends on knowing how the two companies actually compete.
 *
 * Not a fake browser chrome, not a fake glow. One card, real type, an
 * honest "example" tag. The words do the work.
 */
function SampleAnswerCard() {
  return (
    <div className="bg-[#F7F6F3] border border-[#E8E4DF] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] overflow-hidden">
      <div className="bg-[#E8735A] px-5 py-2.5 flex items-center gap-2">
        <span className="text-white text-[13px] leading-none">✦</span>
        <span className="text-[12px] font-medium text-white tracking-[0.02em]">
          Sample answer
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <p className="text-[10px] font-medium tracking-[0.1em] uppercase text-[#E8735A] mb-3">
          Tell me about yourself
        </p>

        <blockquote className="text-[15px] sm:text-[16px] text-[#1C1713] leading-[1.6] font-light">
          &ldquo;I spent three years at Motive watching buyers choose Samsara.
          I know exactly why they choose it — and I want to be the one making
          that case at Samsara.&rdquo;
        </blockquote>

        <div className="mt-5 pt-4 border-t border-[#E8E4DF]">
          <p className="text-[11px] text-[#7A6F65] leading-relaxed">
            From the kit of an AE moving from{" "}
            <span className="font-medium text-[#1C1713]">Motive</span> to{" "}
            <span className="font-medium text-[#1C1713]">Samsara</span>. Built
            because SalesPrep researched how the two companies actually
            compete — and asked the candidate what they saw.
          </p>
        </div>
      </div>
    </div>
  );
}
