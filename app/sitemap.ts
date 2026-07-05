import type { MetadataRoute } from "next";
import { getAllProperties } from "@/lib/data";

const BASE_URL = "https://property-intelligence-nu.vercel.app";

// Revalidate weekly — property pages change infrequently; the home page still
// revalidates daily via its own ISR cadence. Weekly keeps the sitemap fresh
// without hammering the build cache.
export const revalidate = 604800; // 7 days in seconds

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const properties = getAllProperties();

  const propertyRoutes: MetadataRoute.Sitemap = properties.map((p) => ({
    url: `${BASE_URL}/property/${p.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    ...propertyRoutes,
  ];
}
