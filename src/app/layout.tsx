import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { JsonLd } from "@/components/seo/JsonLd";
import { softwareApplicationSchema } from "@/lib/seo/structured-data";
import { AnalyticsScripts, GTMNoScript } from "@/components/tracking/AnalyticsScripts";
import { GTMPageViewTracker } from "@/components/tracking/GTMProvider";
import { ConsentBanner } from "@/components/tracking/ConsentBanner";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://salesprep.ai";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: "%s | SalesPrep AI",
    default: "SalesPrep AI — AI Interview Prep for Tech Sales Professionals",
  },
  description:
    "Ace your tech sales interview with AI-powered practice. Company-specific questions, real-time feedback, and proven frameworks for SDR, BDR, and AE candidates.",
  keywords:
    "sales interview prep, SDR interview questions, BDR interview questions, AE interview preparation, tech sales interview, cold call role play prep, sales interview answers, mock sales interview",
  openGraph: {
    type: "website",
    siteName: "SalesPrep AI",
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@SalesPrepAI",
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
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <JsonLd data={softwareApplicationSchema()} />
        <AnalyticsScripts />
      </head>
      <body className={`${jakarta.variable} ${geistMono.variable} antialiased`}>
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
