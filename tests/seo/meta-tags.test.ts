import { describe, it, expect } from "vitest";
import {
  softwareApplicationSchema,
  organizationSchema,
  faqPageSchema,
  breadcrumbSchema,
  howToSchema,
} from "@/lib/seo/structured-data";

// ═══════════════════════════════════════════════════════════════════════════════
// Structured Data Schema Tests (unit — no server required)
// ═══════════════════════════════════════════════════════════════════════════════

describe("Structured Data Schemas", () => {
  // ── SoftwareApplication ─────────────────────────────────────────────

  describe("softwareApplicationSchema", () => {
    const schema = softwareApplicationSchema();

    it("has correct @type", () => {
      expect(schema["@type"]).toBe("SoftwareApplication");
    });

    it("has @context", () => {
      expect(schema["@context"]).toBe("https://schema.org");
    });

    it('includes name "SalesPrep AI"', () => {
      expect(schema.name).toBe("SalesPrep AI");
    });

    it("has applicationCategory", () => {
      expect(schema.applicationCategory).toBe("BusinessApplication");
    });

    it("has a free offer", () => {
      expect(schema.offers).toBeDefined();
      expect(schema.offers.price).toBe("0");
      expect(schema.offers.priceCurrency).toBe("USD");
    });
  });

  // ── Organization ────────────────────────────────────────────────────

  describe("organizationSchema", () => {
    const schema = organizationSchema();

    it("has correct @type", () => {
      expect(schema["@type"]).toBe("Organization");
    });

    it("has correct URL", () => {
      expect(schema.url).toBe("https://salesprep.roadmapengine.ai");
    });

    it("has logo URL", () => {
      expect(schema.logo).toContain("salesprep.roadmapengine.ai");
    });

    it("has social media links", () => {
      expect(schema.sameAs).toBeInstanceOf(Array);
      expect(schema.sameAs.length).toBeGreaterThanOrEqual(2);
      expect(schema.sameAs.some((u: string) => u.includes("twitter"))).toBe(
        true
      );
      expect(schema.sameAs.some((u: string) => u.includes("linkedin"))).toBe(
        true
      );
    });
  });

  // ── FAQPage ─────────────────────────────────────────────────────────

  describe("faqPageSchema", () => {
    const items = [
      { question: "What is SalesPrep AI?", answer: "An interview prep tool." },
      { question: "Is it free?", answer: "Yes, 3 free prep kits." },
    ];
    const schema = faqPageSchema(items);

    it("has correct @type", () => {
      expect(schema["@type"]).toBe("FAQPage");
    });

    it("has @context", () => {
      expect(schema["@context"]).toBe("https://schema.org");
    });

    it("maps items to Question schema", () => {
      expect(schema.mainEntity).toHaveLength(2);
      expect(schema.mainEntity[0]["@type"]).toBe("Question");
      expect(schema.mainEntity[0].name).toBe("What is SalesPrep AI?");
    });

    it("each question has an acceptedAnswer", () => {
      for (const q of schema.mainEntity) {
        expect(q.acceptedAnswer).toBeDefined();
        expect(q.acceptedAnswer["@type"]).toBe("Answer");
        expect(q.acceptedAnswer.text).toBeTruthy();
      }
    });

    it("returns empty mainEntity for empty items", () => {
      const empty = faqPageSchema([]);
      expect(empty.mainEntity).toEqual([]);
    });
  });

  // ── BreadcrumbList ──────────────────────────────────────────────────

  describe("breadcrumbSchema", () => {
    const items = [
      { name: "Home", url: "https://salesprep.roadmapengine.ai" },
      { name: "Companies", url: "https://salesprep.roadmapengine.ai/companies" },
      {
        name: "Salesforce SDR",
        url: "https://salesprep.roadmapengine.ai/companies/salesforce/sdr",
      },
    ];
    const schema = breadcrumbSchema(items);

    it("has correct @type", () => {
      expect(schema["@type"]).toBe("BreadcrumbList");
    });

    it("has positions starting at 1", () => {
      expect(schema.itemListElement[0].position).toBe(1);
      expect(schema.itemListElement[1].position).toBe(2);
      expect(schema.itemListElement[2].position).toBe(3);
    });

    it("preserves item names and URLs", () => {
      expect(schema.itemListElement[0].name).toBe("Home");
      expect(schema.itemListElement[2].name).toBe("Salesforce SDR");
      expect(schema.itemListElement[2].item).toContain("salesforce/sdr");
    });

    it("each item has ListItem type", () => {
      for (const item of schema.itemListElement) {
        expect(item["@type"]).toBe("ListItem");
      }
    });
  });

  // ── HowTo ──────────────────────────────────────────────────────────

  describe("howToSchema", () => {
    const schema = howToSchema({
      name: "How to Prepare",
      description: "Prep for your interview",
      totalTime: "PT2M",
      steps: [
        { name: "Step 1", text: "Enter your details" },
        { name: "Step 2", text: "Get your prep kit" },
        { name: "Step 3", text: "Practice" },
      ],
    });

    it("has correct @type", () => {
      expect(schema["@type"]).toBe("HowTo");
    });

    it("has name and description", () => {
      expect(schema.name).toBe("How to Prepare");
      expect(schema.description).toBe("Prep for your interview");
    });

    it("has totalTime", () => {
      expect(schema.totalTime).toBe("PT2M");
    });

    it("maps steps with positions", () => {
      expect(schema.step).toHaveLength(3);
      expect(schema.step[0].position).toBe(1);
      expect(schema.step[0]["@type"]).toBe("HowToStep");
      expect(schema.step[2].position).toBe(3);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Robots.txt Configuration Tests (unit — tests the config object)
// ═══════════════════════════════════════════════════════════════════════════════

describe("robots.ts Configuration", () => {
  // Import the function at runtime to test its return value
  let robotsFn: () => { rules: Array<{ userAgent: string; allow: string; disallow: string[] }>; sitemap: string };

  it("can import robots function", async () => {
    const mod = await import("@/app/robots");
    robotsFn = mod.default;
    expect(typeof robotsFn).toBe("function");
  });

  it("returns sitemap URL pointing to salesprep.roadmapengine.ai", async () => {
    const mod = await import("@/app/robots");
    const config = mod.default();
    expect(config.sitemap).toBe("https://salesprep.roadmapengine.ai/sitemap.xml");
  });

  it("allows root path", async () => {
    const mod = await import("@/app/robots");
    const config = mod.default();
    const rule = config.rules[0];
    expect(rule.allow).toBe("/");
  });

  it("disallows /prep/ (user sessions)", async () => {
    const mod = await import("@/app/robots");
    const config = mod.default();
    const rule = config.rules[0];
    expect(rule.disallow).toContain("/prep/");
  });

  it("disallows /dashboard (authenticated area)", async () => {
    const mod = await import("@/app/robots");
    const config = mod.default();
    const rule = config.rules[0];
    expect(rule.disallow).toContain("/dashboard");
  });

  it("disallows /api/ (backend)", async () => {
    const mod = await import("@/app/robots");
    const config = mod.default();
    const rule = config.rules[0];
    expect(rule.disallow).toContain("/api/");
  });

  it("disallows /admin/ (admin panel)", async () => {
    const mod = await import("@/app/robots");
    const config = mod.default();
    const rule = config.rules[0];
    expect(rule.disallow).toContain("/admin/");
  });

  it("uses wildcard user agent", async () => {
    const mod = await import("@/app/robots");
    const config = mod.default();
    expect(config.rules[0].userAgent).toBe("*");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SEO Metadata Validation (static analysis of metadata exports)
// ═══════════════════════════════════════════════════════════════════════════════

describe("SEO Metadata Requirements", () => {
  // ── Homepage metadata (from page.tsx) ──────────────────────────────

  it("homepage has title containing SalesPrep AI", async () => {
    const mod = await import("@/app/page");
    expect(mod.metadata.title).toContain("SalesPrep AI");
  });

  it("homepage has meta description between 50-160 chars", async () => {
    const mod = await import("@/app/page");
    const desc = mod.metadata.description as string;
    expect(desc.length).toBeGreaterThanOrEqual(50);
    expect(desc.length).toBeLessThanOrEqual(160);
  });

  it("homepage has Open Graph title", async () => {
    const mod = await import("@/app/page");
    expect(mod.metadata.openGraph?.title).toBeTruthy();
  });

  it("homepage has Open Graph type", async () => {
    const mod = await import("@/app/page");
    expect(mod.metadata.openGraph?.type).toBe("website");
  });

  it("homepage has canonical URL", async () => {
    const mod = await import("@/app/page");
    expect(mod.metadata.alternates?.canonical).toBe("/");
  });

  // ── Root layout metadata (global defaults) ─────────────────────────
  // layout.tsx uses Next.js font functions that can't run in Vitest,
  // so we test the metadata contract by reading the file as text.

  describe("Root Layout Global Metadata", () => {
    let layoutSource: string;

    it("can read layout source", async () => {
      const fs = await import("fs");
      const path = await import("path");
      layoutSource = fs.readFileSync(
        path.resolve("src/app/layout.tsx"),
        "utf-8"
      );
      expect(layoutSource).toBeTruthy();
    });

    it("has title template with SalesPrep AI", () => {
      expect(layoutSource).toContain("SalesPrep AI");
      expect(layoutSource).toMatch(/template:\s*["']%s.*SalesPrep AI/);
    });

    it("has global description", () => {
      expect(layoutSource).toMatch(/description:\s*\n?\s*["']/);
    });

    it("has keywords array with sales-related terms", () => {
      expect(layoutSource).toContain("SDR");
      expect(layoutSource).toContain("BDR");
      expect(layoutSource).toContain("sales");
      expect(layoutSource).toMatch(/keywords:\s*\[/);
    });

    it("has Open Graph configuration with image", () => {
      expect(layoutSource).toContain("openGraph");
      expect(layoutSource).toContain("og-default.png");
      expect(layoutSource).toContain("1200");
      expect(layoutSource).toContain("630");
    });

    it("has Twitter Card configuration", () => {
      expect(layoutSource).toContain("twitter");
      expect(layoutSource).toContain("summary_large_image");
      expect(layoutSource).toContain("@SalesPrepAI");
    });

    it("has robots configuration allowing indexing", () => {
      expect(layoutSource).toContain("index: true");
      expect(layoutSource).toContain("follow: true");
    });

    it("has metadataBase set to salesprep.roadmapengine.ai", () => {
      expect(layoutSource).toContain("salesprep.roadmapengine.ai");
      expect(layoutSource).toContain("metadataBase");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Tracking Module Unit Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("Tracking: Consent Module", () => {
  it("consentDefaultsScript sets all consent to denied", async () => {
    const { consentDefaultsScript } = await import("@/lib/tracking/consent");
    const script = consentDefaultsScript();
    expect(script).toContain("analytics_storage");
    expect(script).toContain("'denied'");
    expect(script).toContain("ad_storage");
    expect(script).toContain("ad_user_data");
    expect(script).toContain("ad_personalization");
  });

  it("consentDefaultsScript sets wait_for_update", async () => {
    const { consentDefaultsScript } = await import("@/lib/tracking/consent");
    const script = consentDefaultsScript();
    expect(script).toContain("wait_for_update");
    expect(script).toContain("500");
  });

  it("consentDefaultsScript enables ads_data_redaction", async () => {
    const { consentDefaultsScript } = await import("@/lib/tracking/consent");
    const script = consentDefaultsScript();
    expect(script).toContain("ads_data_redaction");
    expect(script).toContain("true");
  });

  it("consentDefaultsScript enables url_passthrough", async () => {
    const { consentDefaultsScript } = await import("@/lib/tracking/consent");
    const script = consentDefaultsScript();
    expect(script).toContain("url_passthrough");
    expect(script).toContain("true");
  });

  it("consentDefaultsScript initializes dataLayer", async () => {
    const { consentDefaultsScript } = await import("@/lib/tracking/consent");
    const script = consentDefaultsScript();
    expect(script).toContain("window.dataLayer = window.dataLayer || []");
  });

  it("consentDefaultsScript defines gtag function", async () => {
    const { consentDefaultsScript } = await import("@/lib/tracking/consent");
    const script = consentDefaultsScript();
    expect(script).toContain("function gtag()");
  });
});

describe("Tracking: Attribution Module", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("captureAttribution stores last-touch data", async () => {
    const { captureAttribution } = await import("@/lib/tracking/attribution");

    // Simulate URL with UTM params
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...window.location,
        search: "?utm_source=google&utm_medium=cpc&utm_campaign=test",
        pathname: "/",
      },
    });

    captureAttribution();

    const stored = localStorage.getItem("sp_last_touch");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.utm_source).toBe("google");
    expect(parsed.utm_medium).toBe("cpc");
    expect(parsed.utm_campaign).toBe("test");
  });

  it("captureAttribution sets first-touch only once", async () => {
    const { captureAttribution } = await import("@/lib/tracking/attribution");

    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...window.location,
        search: "?utm_source=google&utm_medium=cpc",
        pathname: "/landing",
      },
    });

    captureAttribution();
    const firstVisit = JSON.parse(
      localStorage.getItem("sp_first_touch")!
    );

    // Second visit with different UTM
    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...window.location,
        search: "?utm_source=facebook&utm_medium=social",
        pathname: "/other",
      },
    });

    captureAttribution();

    const firstTouch = JSON.parse(
      localStorage.getItem("sp_first_touch")!
    );
    const lastTouch = JSON.parse(
      localStorage.getItem("sp_last_touch")!
    );

    // First touch should be unchanged
    expect(firstTouch.utm_source).toBe("google");
    // Last touch should be updated
    expect(lastTouch.utm_source).toBe("facebook");
  });

  it("captureAttribution includes timestamp", async () => {
    const { captureAttribution } = await import("@/lib/tracking/attribution");

    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, search: "", pathname: "/" },
    });

    captureAttribution();

    const stored = JSON.parse(localStorage.getItem("sp_last_touch")!);
    expect(stored.timestamp).toBeTruthy();
    // Should be ISO string
    expect(() => new Date(stored.timestamp)).not.toThrow();
  });

  it("getAttribution returns null when no data stored", async () => {
    const { getAttribution } = await import("@/lib/tracking/attribution");
    const { firstTouch, lastTouch } = getAttribution();
    expect(firstTouch).toBeNull();
    expect(lastTouch).toBeNull();
  });

  it("getAttributionProperties flattens touch data", async () => {
    const { captureAttribution, getAttributionProperties } = await import(
      "@/lib/tracking/attribution"
    );

    Object.defineProperty(window, "location", {
      writable: true,
      value: {
        ...window.location,
        search: "?utm_source=google&utm_medium=cpc",
        pathname: "/",
      },
    });

    captureAttribution();

    const props = getAttributionProperties();
    expect(props.first_touch_source).toBe("google");
    expect(props.last_touch_source).toBe("google");
    expect(props.first_touch_medium).toBe("cpc");
    expect(props.landing_page).toBe("/");
  });
});

describe("Tracking: Event Definitions", () => {
  it("trackEvent pushes to dataLayer", async () => {
    const { trackEvent } = await import("@/lib/tracking/events");

    window.dataLayer = [];
    trackEvent({ name: "page_view", properties: { page_path: "/" } });

    expect(window.dataLayer.length).toBeGreaterThan(0);
    const event = window.dataLayer.find(
      (e: Record<string, unknown>) => e.event === "page_view"
    );
    expect(event).toBeDefined();
    expect(event?.page_path).toBe("/");
  });

  it("trackEvent includes event_id for deduplication", async () => {
    const { trackEvent } = await import("@/lib/tracking/events");

    window.dataLayer = [];
    trackEvent({ name: "sign_up", properties: { method: "google" } });

    const event = window.dataLayer.find(
      (e: Record<string, unknown>) => e.event === "sign_up"
    );
    expect(event?.event_id).toBeTruthy();
    expect(typeof event?.event_id).toBe("string");
  });

  it("trackEvent assigns default value for sign_up", async () => {
    const { trackEvent } = await import("@/lib/tracking/events");

    window.dataLayer = [];
    trackEvent({ name: "sign_up", properties: { method: "google" } });

    const event = window.dataLayer.find(
      (e: Record<string, unknown>) => e.event === "sign_up"
    );
    expect(event?.value).toBe(10);
  });

  it("trackEvent assigns default value for first_prep_kit_created", async () => {
    const { trackEvent } = await import("@/lib/tracking/events");

    window.dataLayer = [];
    trackEvent({
      name: "first_prep_kit_created",
      properties: { company: "Salesforce" },
    });

    const event = window.dataLayer.find(
      (e: Record<string, unknown>) => e.event === "first_prep_kit_created"
    );
    expect(event?.value).toBe(49);
  });

  it("trackEvent includes user_id when provided", async () => {
    const { trackEvent } = await import("@/lib/tracking/events");

    window.dataLayer = [];
    trackEvent(
      { name: "page_view" },
      { userId: "user-123", userEmail: "test@example.com" }
    );

    const event = window.dataLayer.find(
      (e: Record<string, unknown>) => e.event === "page_view"
    );
    expect(event?.user_id).toBe("user-123");
  });
});
