/**
 * Injects JSON-LD structured data into the page <head>.
 *
 * Usage:
 *   <JsonLd data={faqPageSchema(items)} />
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
