import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans, JetBrains_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { JsonLd } from "@/components/seo/JsonLd";
import { softwareApplicationSchema } from "@/lib/seo/structured-data";
import { AnalyticsScripts, GTMNoScript } from "@/components/tracking/AnalyticsScripts";
import { GTMPageViewTracker } from "@/components/tracking/GTMProvider";
import { ConsentBanner } from "@/components/tracking/ConsentBanner";

const dmSerif = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salesprep.ai";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: "%s | SalesPrep AI",
    default: "SalesPrep AI — AI Interview Prep for Tech Sales",
  },
  description:
    "Nail your SDR, BDR, or AE interview with AI-powered prep kits. Company-specific questions, mock cold call practice, and personalized answers. Free to start.",
  keywords: [
    "SDR interview prep",
    "BDR interview questions",
    "sales interview preparation",
    "tech sales interview",
    "mock cold call practice",
    "sales development representative",
    "AI interview prep",
    "SaaS sales interview",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "SalesPrep AI",
    title: "SalesPrep AI — AI Interview Prep for Tech Sales",
    description:
      "Nail your SDR, BDR, or AE interview with AI-powered prep kits. Company-specific questions, mock cold call practice, and personalized answers.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "SalesPrep AI — AI Interview Prep for Tech Sales",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@SalesPrepAI",
    creator: "@SalesPrepAI",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
  verification: {
    google: "GOOGLE_SITE_VERIFICATION_CODE",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? "";

  return (
    <html lang="en">
      <head>
        <JsonLd data={softwareApplicationSchema()} />
        <AnalyticsScripts nonce={nonce} />
      </head>
      <body className={`${dmSerif.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}>
        <GTMNoScript />
        <Suspense fallback={null}>
          <GTMPageViewTracker />
        </Suspense>
        <Navbar />
        {children}
        <ConsentBanner />
      </body>
    </html>
  );
}
