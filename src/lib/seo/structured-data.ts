/**
 * Schema.org structured data generators for SEO.
 */

// ---- SoftwareApplication ----

export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "SalesPrep AI",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "AI-powered interview preparation platform for tech sales professionals",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free plan with 3 prep kits",
    },
  };
}

// ---- Organization ----

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "SalesPrep AI",
    url: "https://interviewprep.roadmapengine.ai",
    logo: "https://interviewprep.roadmapengine.ai/logo.png",
    sameAs: [
      "https://twitter.com/SalesPrepAI",
      "https://linkedin.com/company/salesprep-ai",
      "https://tiktok.com/@salesprep.ai",
    ],
  };
}

// ---- FAQPage ----

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

// ---- BreadcrumbList ----

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

// ---- HowTo ----

export interface HowToStep {
  name: string;
  text: string;
}

export function howToSchema(params: {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string;
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
