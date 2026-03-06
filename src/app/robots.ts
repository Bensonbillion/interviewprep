import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salesprep.ai";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/auth/",
          "/dashboard/",
          "/prep/",
          "/report/",
          "/onboarding/",
          "/practice/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
