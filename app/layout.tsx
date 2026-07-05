import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const BASE_URL = "https://property-intelligence-nu.vercel.app";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),

  // --- Title with child-route template ---
  title: {
    default: "PropIntel — Investment Property Intelligence",
    template: "%s | PropIntel",
  },

  description:
    "AI-style scoring that surfaces undervalued rental properties, cross-referenced against live FRED economic data, so you can spot hidden value before the market does.",

  keywords: [
    "investment property",
    "real estate investing",
    "rental property analysis",
    "property intelligence",
    "cap rate calculator",
    "cash flow analysis",
    "undervalued properties",
    "FRED economic data",
    "real estate ROI",
    "property scoring",
  ],

  authors: [{ name: "PropIntel" }],
  creator: "PropIntel",

  // --- Canonical URL ---
  alternates: {
    canonical: "/",
  },

  // --- Open Graph ---
  openGraph: {
    type: "website",
    url: BASE_URL,
    siteName: "PropIntel",
    title: "PropIntel — Investment Property Intelligence",
    description:
      "AI-style scoring that surfaces undervalued rental properties, cross-referenced against live FRED economic data, so you can spot hidden value before the market does.",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png", // resolved to BASE_URL/og-image.png via metadataBase
        width: 1200,
        height: 630,
        alt: "PropIntel — Investment Property Intelligence dashboard showing property scores and economic indicators",
      },
    ],
  },

  // --- Twitter / X card ---
  twitter: {
    card: "summary_large_image",
    title: "PropIntel — Investment Property Intelligence",
    description:
      "AI-style scoring that surfaces undervalued rental properties, cross-referenced against live FRED economic data.",
    images: ["/og-image.png"],
  },

  // --- Crawling directives (also handled by robots.txt, belt-and-suspenders) ---
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// JSON-LD structured data for Organization schema
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PropIntel",
  url: BASE_URL,
  description:
    "Investment property intelligence platform that scores rental properties using AI-style analysis and live FRED economic data.",
  sameAs: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* JSON-LD: Organization schema for search engines and AI crawlers */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
          }}
        />
        {children}
      </body>
    </html>
  );
}
