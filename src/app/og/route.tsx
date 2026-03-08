import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "SalesPrep AI";
  const subtitle =
    searchParams.get("subtitle") || "AI Interview Prep for Tech Sales";

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        <div
          style={{
            color: "#4A7AFF",
            fontSize: 24,
            marginBottom: 20,
            fontWeight: 600,
          }}
        >
          SalesPrep AI
        </div>
        <div
          style={{
            color: "#ffffff",
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 1.2,
            maxWidth: "80%",
          }}
        >
          {title}
        </div>
        <div
          style={{
            color: "#94a3b8",
            fontSize: 24,
            marginTop: 20,
          }}
        >
          {subtitle}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
