import Link from "next/link";

const COMPANIES = [
  { name: "Salesforce", slug: "salesforce" },
  { name: "HubSpot", slug: "hubspot" },
  { name: "Datadog", slug: "datadog" },
  { name: "Gong", slug: "gong" },
  { name: "Outreach", slug: "outreach" },
  { name: "CrowdStrike", slug: "crowdstrike" },
  { name: "Snowflake", slug: "snowflake" },
  { name: "MongoDB", slug: "mongodb" },
];

export function LogoStrip() {
  return (
    <section className="bg-[#F7F5F0] py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-5">
        {/* Section headline */}
        <h2 className="font-serif text-3xl text-[#1A1A1A] text-center mb-10">
          See it in action
        </h2>

        {/* Product preview */}
        <div className="flex justify-center">
          {/* Inline the mockup import to avoid circular deps —
              ProductMockup is imported in page.tsx indirectly */}
          <div
            className="bg-[#FDFCFA] rounded-2xl p-5 md:p-7 w-full max-w-[600px] text-left
                       border border-[#E8E4DE] shadow-lg"
          >
            <div className="h-1 bg-gradient-to-r from-[#E8735A] to-[#F4A27A] rounded-full mb-4" />
            <p className="text-xs font-semibold text-[#E8735A] uppercase tracking-widest font-sans">
              AI Interview Prep Kit
            </p>
            <div className="mt-3 flex flex-col gap-1">
              <span className="inline-flex self-start bg-[#F0EDE6] rounded-full px-3 py-1.5 text-sm font-medium text-[#1A1A1A] font-sans">
                Marcus Chen &rarr; SDR at Gong
              </span>
              <p className="text-xs text-[#9C9590] pl-1 font-sans">Round: Recruiter Screen</p>
            </div>
            <p className="text-base font-semibold text-[#1A1A1A] mt-4 font-sans">
              &ldquo;Tell me about yourself&rdquo;
            </p>
            <blockquote className="border-l-2 border-[#E8E4DE] pl-4 mt-3 text-sm text-[#6B6560] leading-relaxed font-sans">
              &ldquo;Over the past two years managing a 200+ cover territory at Toast,
              I consistently hit 118% of quota by focusing on restaurant groups going
              through tech transitions. I&rsquo;m excited about Gong because your
              revenue intelligence platform solves the exact coaching gap I saw
              first-hand&hellip;&rdquo;
            </blockquote>
          </div>
        </div>

        {/* Feature callouts */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-8">
          <span className="text-sm text-[#6B6560] font-sans">&#10003; Uses your actual resume</span>
          <span className="text-sm text-[#6B6560] font-sans">&#10003; Researches your target company</span>
          <span className="text-sm text-[#6B6560] font-sans">&#10003; Sounds like you, not AI</span>
        </div>

        {/* Company links below */}
        <div className="mt-16 pt-10 border-t border-[#E8E4DE]">
          <p className="text-xs font-medium text-[#9C9590] uppercase tracking-widest text-center mb-5">
            Candidates hired at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {COMPANIES.map((c) => (
              <Link
                key={c.slug}
                href={`/companies/${c.slug}`}
                className="text-sm md:text-base font-semibold text-[#9C9590] hover:text-[#E8735A] transition-colors select-none"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
