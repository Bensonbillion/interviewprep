import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-[#FDFCFA] pt-24 pb-16 md:pt-32 md:pb-20">
      <div className="max-w-6xl mx-auto px-5 text-center">
        {/* Eyebrow */}
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#9C9590] mb-6">
          AI-POWERED INTERVIEW PREP
        </p>

        {/* Headline */}
        <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl text-[#1A1A1A] leading-[1.1] tracking-tight">
          Walk into your sales interview
          <br />
          feeling ready.
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-[#6B6560] mt-6 max-w-xl mx-auto leading-relaxed font-sans">
          Personalized prep kits for SDR, BDR, and AE candidates.
          Company-specific questions. Answers that sound like you.
        </p>

        {/* CTA */}
        <div id="hero-cta" className="mt-10">
          <Link
            href="/get-started"
            className="inline-flex items-center justify-center
                       bg-[#E8735A] hover:bg-[#D4614A] text-white
                       px-8 py-4 text-lg font-medium rounded-full
                       shadow-md hover:shadow-lg transition-all duration-300 min-h-[52px]"
          >
            Start prepping &mdash; it&apos;s free &rarr;
          </Link>
        </div>

        {/* Micro-copy */}
        <p className="text-sm text-[#9C9590] mt-4">
          Free forever plan &middot; No credit card &middot; 2 minutes to your first kit
        </p>

        {/* Social proof company names */}
        <div className="mt-12">
          <p className="text-sm text-[#9C9590] mb-3">
            Trusted by candidates interviewing at
          </p>
          <p className="text-sm text-[#9C9590]">
            Salesforce &middot; HubSpot &middot; Datadog &middot; Gong &middot; Outreach &middot; CrowdStrike
          </p>
        </div>
      </div>
    </section>
  );
}
