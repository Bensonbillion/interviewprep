import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getAllPosts } from "@/lib/blog";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salesprep.ai";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/get-started`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/companies`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  // Company x role programmatic pages
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: seoPages } = await supabase
    .from("company_seo_pages")
    .select("company_slug, role_slug, updated_at")
    .eq("is_published", true);

  const companyPages: MetadataRoute.Sitemap = (seoPages ?? []).map((p) => ({
    url: `${BASE_URL}/companies/${p.company_slug}/${p.role_slug}`,
    lastModified: p.updated_at,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Blog posts from MDX files
  const blogPosts: MetadataRoute.Sitemap = getAllPosts().map((p) => ({
    url: `${BASE_URL}/blog/${p.frontmatter.slug}`,
    lastModified: p.frontmatter.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...companyPages, ...blogPosts];
}
