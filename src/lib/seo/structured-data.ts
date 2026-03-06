/**
 * Schema.org structured data generators for SEO.
 *
 * Four types implemented:
 * - SoftwareApplication (site-wide)
 * - FAQPage (interview question pages)
 * - BreadcrumbList (navigation)
 * - HowTo (prep guides)
 */

// ─── SoftwareApplication ─────────────────────────────────────────────────────

export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SalesPrep AI",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AI-powered interview preparation for tech sales professionals. Company-specific questions, real-time feedback, and proven frameworks for SDR, BDR, and AE candidates.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier available",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.8",
      ratingCount: "127",
      bestRating: "5",
      worstRating: "1",
    },
  };
}

// ─── FAQPage ─────────────────────────────────────────────────────────────────

export interface FAQItem {
  question: string;
  answer: string;
}

export function faqPageSchema(items: FAQItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

// ─── BreadcrumbList ──────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// ─── HowTo ───────────────────────────────────────────────────────────────────

export interface HowToStep {
  name: string;
  text: string;
}

export function howToSchema(params: {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string; // ISO 8601 duration, e.g. "PT5M"
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: params.name,
    description: params.description,
    totalTime: params.totalTime,
    step: params.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
}

// ─── Helper: inject as <script type="application/ld+json"> ─────────────────

export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data);
}
