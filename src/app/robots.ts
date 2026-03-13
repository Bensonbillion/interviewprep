import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/prep/",
          "/dashboard",
          "/api/",
          "/admin/",
          "/get-started/building/",
        ],
      },
    ],
    sitemap: "https://interviewprep.roadmapengine.ai/sitemap.xml",
  };
}
