import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  breadcrumbSchema,
  faqPageSchema,
} from "@/lib/seo/structured-data";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salesprep.ai";

interface SeoPage {
  id: string;
  company_slug: string;
  role_slug: string;
  company_name: string;
  role_title: string;
  meta_title: string;
  meta_description: string;
  h1_title: string;
  company_overview: string;
  interview_process: { steps: { title: string; description: string }[] } | null;
  questions: { category: string; items: string[] }[];
  preparation_tips: string[] | null;
  company_values: string[] | null;
  salary_data: { role: string; min: number; max: number; currency: string } | null;
  faqs: { question: string; answer: string }[] | null;
  updated_at: string;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

async function getPage(company: string, role: string): Promise<SeoPage | null> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("company_seo_pages")
    .select("*")
    .eq("company_slug", company)
    .eq("role_slug", role)
    .eq("is_published", true)
    .single();
  return data as SeoPage | null;
}

export async function generateStaticParams() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("company_seo_pages")
    .select("company_slug, role_slug")
    .eq("is_published", true);

  return (data ?? []).map((row) => ({
    company: row.company_slug,
    role: row.role_slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ company: string; role: string }>;
}): Promise<Metadata> {
  const { company, role } = await params;
  const page = await getPage(company, role);
  if (!page) return {};

  const url = `${BASE_URL}/companies/${company}/${role}`;

  return {
    title: page.meta_title,
    description: page.meta_description,
    alternates: { canonical: url },
    openGraph: {
      title: page.meta_title,
      description: page.meta_description,
      url,
      type: "article",
      images: [
        {
          url: `/og?title=${encodeURIComponent(page.company_name)}&subtitle=${encodeURIComponent(page.role_title + " Interview Prep")}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export const revalidate = 3600; // ISR: revalidate every hour

export default async function CompanyRolePage({
  params,
}: {
  params: Promise<{ company: string; role: string }>;
}) {
  const { company, role } = await params;
  const page = await getPage(company, role);
  if (!page) notFound();

  const breadcrumbs = [
    { name: "Home", url: BASE_URL },
    { name: "Companies", url: `${BASE_URL}/companies` },
    { name: page.company_name, url: `${BASE_URL}/companies/${company}/${role}` },
  ];

  return (
    <main className="bg-[#0B1120] min-h-screen text-gray-100">
      <JsonLd data={breadcrumbSchema(breadcrumbs)} />
      {page.faqs && page.faqs.length > 0 && (
        <JsonLd data={faqPageSchema(page.faqs)} />
      )}

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="max-w-3xl mx-auto px-5 pt-8">
        <ol className="flex items-center gap-2 text-sm text-gray-400">
          <li>
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/companies" className="hover:text-white transition-colors">
              Companies
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-gray-200 truncate" aria-current="page">
            {page.company_name} {page.role_title}
          </li>
        </ol>
      </nav>

      <article className="max-w-3xl mx-auto px-5 py-12">
        {/* H1 */}
        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight">
          {page.h1_title}
        </h1>

        {/* Company Overview */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-white mb-3">
            About {page.company_name}
          </h2>
          <p className="text-gray-300 leading-relaxed">{page.company_overview}</p>
        </section>

        {/* Company Values */}
        {page.company_values && page.company_values.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-semibold text-white mb-3">
              {page.company_name} Core Values
            </h2>
            <ul className="grid gap-2">
              {page.company_values.map((value) => (
                <li
                  key={value}
                  className="flex items-start gap-2 text-gray-300"
                >
                  <span className="text-blue-400 mt-1 shrink-0">&#10003;</span>
                  {value}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Interview Process */}
        {page.interview_process?.steps && page.interview_process.steps.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-white mb-4">
              {page.company_name} {page.role_title} Interview Process
            </h2>
            <ol className="relative border-l border-gray-700 ml-3 space-y-6">
              {page.interview_process.steps.map((step, i) => (
                <li key={i} className="ml-6">
                  <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="text-base font-semibold text-white">
                    {step.title}
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">{step.description}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Questions */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-white mb-4">
            Common {page.company_name} {page.role_title} Interview Questions
          </h2>
          <div className="space-y-6">
            {page.questions.map((cat) => (
              <div key={cat.category}>
                <h3 className="text-base font-semibold text-blue-300 mb-2">
                  {cat.category}
                </h3>
                <ul className="space-y-2">
                  {cat.items.map((q) => (
                    <li
                      key={q}
                      className="bg-[#131C31] rounded-lg px-4 py-3 text-gray-200 text-sm"
                    >
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Preparation Tips */}
        {page.preparation_tips && page.preparation_tips.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-white mb-3">
              Preparation Tips
            </h2>
            <ul className="space-y-2">
              {page.preparation_tips.map((tip) => (
                <li
                  key={tip}
                  className="flex items-start gap-2 text-gray-300 text-sm"
                >
                  <span className="text-blue-400 mt-0.5 shrink-0">&#9679;</span>
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Salary Data */}
        {page.salary_data && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-white mb-3">
              {page.role_title} Salary at {page.company_name}
            </h2>
            <div className="bg-[#131C31] rounded-lg p-5 inline-block">
              <p className="text-gray-400 text-sm">Estimated base salary range</p>
              <p className="text-2xl font-bold text-white mt-1">
                {page.salary_data.currency === "USD" ? "$" : page.salary_data.currency}
                {page.salary_data.min.toLocaleString()} &ndash; {page.salary_data.currency === "USD" ? "$" : ""}
                {page.salary_data.max.toLocaleString()}
              </p>
            </div>
          </section>
        )}

        {/* FAQ */}
        {page.faqs && page.faqs.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <dl className="space-y-4">
              {page.faqs.map((faq) => (
                <div key={faq.question} className="bg-[#131C31] rounded-lg p-4">
                  <dt className="font-semibold text-white text-sm">
                    {faq.question}
                  </dt>
                  <dd className="text-gray-400 text-sm mt-2">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* CTA */}
        <section className="mt-12 bg-gradient-to-br from-[#1E3A5F] to-[#4A7AFF] rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white">
            Prep for your {page.company_name} interview
          </h2>
          <p className="text-blue-200 mt-2">
            Get a personalized prep kit with answers tailored to {page.company_name}&rsquo;s
            interview style.
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
      </article>
    </main>
  );
}
