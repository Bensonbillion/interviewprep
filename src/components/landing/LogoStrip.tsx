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
    <section className="bg-[#1a1a1a] border-t border-[#2a2a2a] py-8">
      <div className="max-w-[1120px] mx-auto px-5">
        <p className="text-xs font-medium text-[#666] uppercase tracking-widest text-center mb-5">
          Candidates hired at
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
          {COMPANIES.map((c) => (
            <Link
              key={c.slug}
              href={`/companies/${c.slug}`}
              className="text-sm md:text-base font-bold text-[#555] hover:text-[#4A7AFF] transition-colors select-none"
            >
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
