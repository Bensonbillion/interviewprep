import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const TOP_COMPANIES = [
  { slug: "salesforce", name: "Salesforce" },
  { slug: "hubspot", name: "HubSpot" },
  { slug: "datadog", name: "Datadog" },
  { slug: "gong", name: "Gong" },
  { slug: "snowflake", name: "Snowflake" },
  { slug: "crowdstrike", name: "CrowdStrike" },
  { slug: "mongodb", name: "MongoDB" },
  { slug: "cloudflare", name: "Cloudflare" },
];

interface CompanyLink {
  company_slug: string;
  company_name: string;
  role_slug: string;
  role_title: string;
}

export async function CompanyGrid() {
  let links: CompanyLink[] = [];

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await supabase
      .from("company_seo_pages")
      .select("company_slug, company_name, role_slug, role_title")
      .eq("is_published", true)
      .in(
        "company_slug",
        TOP_COMPANIES.map((c) => c.slug),
      )
      .order("company_name")
      .limit(24);
    links = (data as CompanyLink[] | null) ?? [];
  } catch {
    // Fail silently — section just won't show links
  }

  if (links.length === 0) return null;

  // Group by company
  const grouped = new Map<string, { name: string; roles: { slug: string; title: string }[] }>();
  for (const l of links) {
    const existing = grouped.get(l.company_slug);
    if (existing) {
      existing.roles.push({ slug: l.role_slug, title: l.role_title });
    } else {
      grouped.set(l.company_slug, {
        name: l.company_name,
        roles: [{ slug: l.role_slug, title: l.role_title }],
      });
    }
  }

  return (
    <section className="bg-[#FDFCFA] py-16 md:py-20 border-t border-[#E8E4DE]">
      <div className="max-w-6xl mx-auto px-5">
        <h2 className="font-serif text-2xl md:text-3xl text-[#1A1A1A] text-center">
          Prep for top SaaS companies
        </h2>
        <p className="text-[#6B6560] text-center mt-3 max-w-lg mx-auto font-sans">
          Company-specific interview questions, process breakdowns, and tips.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-10">
          {Array.from(grouped.entries()).map(([slug, company]) => (
            <div
              key={slug}
              className="bg-[#F7F5F0] rounded-2xl p-5 border border-[#E8E4DE] hover:shadow-md transition-all duration-300"
            >
              <h3 className="font-semibold text-[#1A1A1A] text-sm font-sans">
                {company.name}
              </h3>
              <ul className="mt-2 space-y-1">
                {company.roles.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/companies/${slug}/${r.slug}`}
                      className="text-[#E8735A] hover:text-[#D4614A] text-xs transition-colors font-sans"
                    >
                      {r.title} &rarr;
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/companies"
            className="text-[#E8735A] hover:text-[#D4614A] text-sm font-medium transition-colors font-sans"
          >
            View all company guides &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}
