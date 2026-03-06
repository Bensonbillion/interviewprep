import type { MetadataRoute } from "next";
import { TOP_COMPANIES } from "@/lib/seo/companies";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salesprep.ai";
const ROLES = ["sdr", "bdr", "account-executive", "account-manager", "customer-success-manager"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/get-started`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];

  // Company x role programmatic pages
  const companyRolePages: MetadataRoute.Sitemap = TOP_COMPANIES.flatMap((company) =>
    ROLES.map((role) => ({
      url: `${BASE_URL}/companies/${company.slug}/${role}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }))
  );

  // Company index pages
  const companyPages: MetadataRoute.Sitemap = TOP_COMPANIES.map((company) => ({
    url: `${BASE_URL}/companies/${company.slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...companyPages, ...companyRolePages];
}
