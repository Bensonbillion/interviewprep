import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema } from "@/lib/seo/structured-data";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salesprep.ai";

export const metadata: Metadata = {
  title: "Interview Prep by Company",
  description:
    "Browse interview prep guides for top tech companies. Get company-specific questions, interview process breakdowns, and AI-powered prep kits.",
  alternates: { canonical: `${BASE_URL}/companies` },
  openGraph: {
    title: "Interview Prep by Company | SalesPrep AI",
    description:
      "Browse interview prep guides for top tech companies. Get company-specific questions and AI-powered prep kits.",
    url: `${BASE_URL}/companies`,
  },
};

interface CompanyGroup {
  company_slug: string;
  company_name: string;
  roles: { role_slug: string; role_title: string }[];
}

export const revalidate = 3600;

export default async function CompaniesIndexPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );

  const { data: pages } = await supabase
    .from("company_seo_pages")
    .select("company_slug, company_name, role_slug, role_title")
    .eq("is_published", true)
    .order("company_name");

  // Group by company
  const groupMap = new Map<string, CompanyGroup>();
  for (const p of pages ?? []) {
    const existing = groupMap.get(p.company_slug);
    if (existing) {
      existing.roles.push({ role_slug: p.role_slug, role_title: p.role_title });
    } else {
      groupMap.set(p.company_slug, {
        company_slug: p.company_slug,
        company_name: p.company_name,
        roles: [{ role_slug: p.role_slug, role_title: p.role_title }],
      });
    }
  }
  const companies = Array.from(groupMap.values());

  const breadcrumbs = [
    { name: "Home", url: BASE_URL },
    { name: "Companies", url: `${BASE_URL}/companies` },
  ];

  return (
    <main className="bg-[#0B1120] min-h-screen text-gray-100">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />

      <div className="max-w-5xl mx-auto px-5 py-12">
        <h1 className="text-3xl md:text-4xl font-bold text-white">
          Interview Prep by Company
        </h1>
        <p className="text-gray-400 mt-3 max-w-2xl">
          Browse interview prep guides for top tech sales roles. Each guide includes
          common questions, interview process breakdowns, and tips from real candidates.
        </p>

        {companies.length === 0 ? (
          <div className="mt-12 text-center">
            <p className="text-gray-400">
              Company guides are coming soon. In the meantime, get started with a
              personalized prep kit.
            </p>
            <Link
              href="/get-started"
              className="inline-block mt-6 bg-blue-600 hover:bg-blue-500 text-white
                         font-semibold px-6 py-3 rounded-full transition-colors"
            >
              Create your prep kit &rarr;
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-10">
            {companies.map((company) => (
              <div
                key={company.company_slug}
                className="bg-[#131C31] rounded-xl p-5 border border-gray-800 hover:border-blue-500/40 transition-colors"
              >
                <h2 className="text-lg font-semibold text-white">
                  {company.company_name}
                </h2>
                <ul className="mt-3 space-y-1.5">
                  {company.roles.map((r) => (
                    <li key={r.role_slug}>
                      <Link
                        href={`/companies/${company.company_slug}/${r.role_slug}`}
                        className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                      >
                        {r.role_title} &rarr;
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <section className="mt-16 bg-gradient-to-br from-[#1E3A5F] to-[#4A7AFF] rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white">
            Don&rsquo;t see your company?
          </h2>
          <p className="text-blue-200 mt-2">
            SalesPrep AI creates personalized prep kits for any company. Enter your
            target company and get custom answers in 5 minutes.
          </p>
          <Link
            href="/get-started"
            className="inline-block mt-6 bg-white text-[#1E3A5F] hover:bg-blue-50
                       font-semibold px-8 py-3 rounded-full text-lg
                       shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-200"
          >
            Start practicing free &rarr;
          </Link>
        </section>
      </div>
    </main>
  );
}
