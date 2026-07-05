import type { MetadataRoute } from "next";

const BASE_URL = "https://property-intelligence-nu.vercel.app";

// Revalidate daily — matches the FRED ISR cadence so the sitemap's
// lastModified timestamps stay in sync with fresh economic data.
export const revalidate = 86400; // 24 hours in seconds

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
