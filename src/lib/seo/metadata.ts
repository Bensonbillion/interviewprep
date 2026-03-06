/**
 * Centralized metadata helpers for consistent SEO across all pages.
 */

import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salesprep.ai";

/**
 * Build page-level metadata with consistent defaults.
 */
export function buildMetadata(params: {
  title: string;
  description: string;
  path: string;
  ogImageParams?: Record<string, string>;
  noIndex?: boolean;
}): Metadata {
  const url = `${BASE_URL}${params.path}`;
  const ogParams = new URLSearchParams(params.ogImageParams ?? {});
  const ogImage = ogParams.toString()
    ? `${BASE_URL}/opengraph-image?${ogParams.toString()}`
    : `${BASE_URL}/opengraph-image`;

  return {
    title: params.title,
    description: params.description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: params.title,
      description: params.description,
      url,
      type: "website",
      siteName: "SalesPrep AI",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: params.title,
      description: params.description,
      images: [ogImage],
    },
    robots: params.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

/**
 * Build metadata for company x role programmatic pages.
 */
export function buildCompanyRoleMetadata(
  companyName: string,
  roleName: string,
  roleFullName: string,
  companySlug: string,
  roleSlug: string
): Metadata {
  const title = `${companyName} ${roleName} Interview Questions & Prep (2026)`;
  const description = `Prepare for your ${companyName} ${roleFullName} interview. Company-specific questions, sample answers, interview process breakdown, and insider tips. Start free.`;

  return buildMetadata({
    title,
    description,
    path: `/companies/${companySlug}/${roleSlug}`,
    ogImageParams: { company: companyName, role: roleName },
  });
}

/**
 * Build metadata for company index pages.
 */
export function buildCompanyMetadata(
  companyName: string,
  companySlug: string,
  tagline: string
): Metadata {
  return buildMetadata({
    title: `${companyName} Interview Prep — Questions, Process & Tips`,
    description: `Everything you need to ace your ${companyName} interview. ${companyName} is ${tagline}. Get company-specific prep kits, real interview questions, and salary data.`,
    path: `/companies/${companySlug}`,
    ogImageParams: { company: companyName, role: "Sales" },
  });
}
