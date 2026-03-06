import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * Dynamic OG image generator.
 *
 * Usage:
 *   /opengraph-image?title=...&subtitle=...
 *   /opengraph-image?company=Salesforce&role=SDR
 *
 * Generates 1200x630 share cards for social media.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const company = searchParams.get("company");
  const role = searchParams.get("role");
  const title = searchParams.get("title");
  const subtitle = searchParams.get("subtitle");

  // Determine display text
  let heading: string;
  let subheading: string;

  if (company && role) {
    heading = `${company} ${role} Interview Prep`;
    subheading = `Company-specific questions, sample answers, and insider tips for your ${company} ${role} interview.`;
  } else if (title) {
    heading = title;
    subheading = subtitle ?? "AI-powered interview prep for tech sales professionals.";
  } else {
    heading = "Nail Your Tech Sales Interview";
    subheading = "AI-powered prep kits for SDR, BDR & AE candidates. Personalized answers from your resume.";
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Logo / Brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "22px",
              fontWeight: 800,
            }}
          >
            S
          </div>
          <span style={{ color: "#94a3b8", fontSize: "24px", fontWeight: 600 }}>
            SalesPrep AI
          </span>
        </div>

        {/* Heading */}
        <div
          style={{
            fontSize: company ? "56px" : "64px",
            fontWeight: 800,
            color: "#f8fafc",
            lineHeight: 1.1,
            marginBottom: "20px",
            maxWidth: "900px",
          }}
        >
          {heading}
        </div>

        {/* Subheading */}
        <div
          style={{
            fontSize: "26px",
            color: "#94a3b8",
            lineHeight: 1.4,
            maxWidth: "800px",
          }}
        >
          {subheading}
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            right: "0",
            height: "6px",
            background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #ec4899)",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
