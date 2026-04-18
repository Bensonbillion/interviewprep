import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Interview Mode — SalesPrep AI",
  robots: "noindex",
};

/**
 * Live mode layout — strips ALL chrome (header, sidebar, footer).
 * Full screen, dark, phone-optimized.
 */
export default function LiveModeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0A0A0F",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}
