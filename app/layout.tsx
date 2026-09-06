import type { Metadata, Viewport } from "next";

import "./globals.css";
import { lodge, locationLabel } from "@/data/macheo";
import { seo } from "@/data/site";
import StructuredData from "@/components/StructuredData";

/**
 * Base for resolving relative OG/canonical URLs. Use NEXT_PUBLIC_SITE_URL
 * once the official domain is known; until then the current origin is used,
 * so no domain is invented.
 */
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: seo.title,
    template: `%s | ${lodge.name}`,
  },
  description: seo.description,
  keywords: [...seo.keywords],
  applicationName: lodge.name,
  ...(lodge.legalName ? { authors: [{ name: lodge.legalName }] } : {}),
  category: "travel",
  openGraph: {
    type: "website",
    title: seo.title,
    description: seo.description,
    siteName: lodge.name,
    locale: "en_RW",
    images: [
      {
        url: "/images/macheo/hero-lake.jpg",
        width: 2048,
        height: 1152,
        alt: "Lake Kivu at golden hour, seen from the hills around Macheo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    "geo.placename": locationLabel,
    "geo.region": "RW",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#101f16",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="skipLink">
          Skip to content
        </a>
        {children}
        <StructuredData />
      </body>
    </html>
  );
}
