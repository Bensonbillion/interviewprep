import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { metaCapiSchema } from "@/lib/validation/schemas";

const PIXEL_ID = process.env.META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;

/**
 * POST /api/tracking/meta-capi
 *
 * Server-side Meta Conversions API endpoint.
 * Sends events to Meta's servers for iOS 14.5+ resilience.
 * Deduplicates with browser Pixel via shared event_id.
 * No user auth — fires for anonymous visitors too.
 */
export async function POST(req: NextRequest) {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return NextResponse.json({ ok: true }); // Silently skip if not configured
  }

  try {
    const body = await req.json();
    const parsed = metaCapiSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: true }); // Never fail tracking
    }

    const {
      eventName,
      eventId,
      email,
      sourceUrl,
    } = parsed.data;
    const { value, currency, fbp, fbc, userAgent } = body;

    // Hash email with SHA-256 (Meta requirement)
    const hashedEmail = email
      ? sha256(email.toLowerCase().trim())
      : undefined;

    const userData: Record<string, unknown> = {};
    if (hashedEmail) userData.em = [hashedEmail];
    if (fbp) userData.fbp = fbp;
    if (fbc) userData.fbc = fbc;
    if (userAgent) userData.client_user_agent = userAgent;

    // Get IP from request headers
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip");
    if (clientIp) userData.client_ip_address = clientIp;

    const eventData: Record<string, unknown> = {
      event_name: eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source_url: sourceUrl,
      action_source: "website",
      user_data: userData,
    };

    if (value) {
      eventData.custom_data = { value, currency: currency ?? "USD" };
    }

    const response = await fetch(
      `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [eventData] }),
      }
    );

    if (!response.ok) {
      console.warn("Meta CAPI error:", await response.text());
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("Meta CAPI failed:", err);
    return NextResponse.json({ ok: true }); // Never fail the user request
  }
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}
