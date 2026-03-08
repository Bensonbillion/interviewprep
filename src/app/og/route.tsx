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
          background: "linear-gradient(135deg, #1A1A1A 0%, #2a2520 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px",
        }}
      >
        {/* S Monogram + Wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
          {/* Icon */}
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "14px",
              background: "#FDFCFA",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <span style={{ fontSize: "36px", color: "#1A1A1A", fontWeight: 400, lineHeight: 1 }}>
              S
            </span>
            <div
              style={{
                position: "absolute",
                top: "6px",
                right: "6px",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#E8735A",
              }}
            />
          </div>
          {/* Wordmark */}
          <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "28px", color: "#FDFCFA", fontWeight: 400 }}>
              SalesPrep
            </span>
            <span style={{ fontSize: "28px", color: "#E8735A", fontWeight: 500 }}>
              AI
            </span>
          </div>
        </div>

        <div
          style={{
            color: "#FDFCFA",
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
            color: "#9C9590",
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
