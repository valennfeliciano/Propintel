import { getAllProperties, getNeighborhoods } from "@/lib/data";
import { analyzeProperty } from "@/lib/analysisService";
import { getMarket } from "@/lib/market";
import Dashboard, { type DashboardStats } from "@/components/Dashboard";
import type { MapPoint } from "@/components/ListingsMap";
import { LanguageProvider } from "@/components/LanguageProvider";
import { FavoritesProvider } from "@/components/FavoritesProvider";

// ISR: revalidate once per day, aligned with FRED data refresh.
// The build output already shows "Revalidate: 1d" but this export makes the
// intent explicit and ensures the segment config is canonical.
export const revalidate = 86400;

export default async function Home() {
  const market = await getMarket();
  const rate = market.mortgage30.value; // live FRED rate, drives the math
  const properties = getAllProperties();
  const neighborhoods = getNeighborhoods();

  // Score every listing once; reuse for the opportunity count and the map pins.
  // analyzeProperty is async (Claude AI path with rules-engine fallback).
  const analyzed = await Promise.all(
    properties.map(async (p) => ({ p, a: await analyzeProperty(p, rate) })),
  );
  const prices = [...properties.map((p) => p.price)].sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)];
  const opportunities = analyzed.filter(({ a }) => a.recommendation !== "Pass").length;

  const mapPoints: MapPoint[] = analyzed.map(({ p, a }) => ({
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    address: p.address,
    price: p.price,
    recommendation: a.recommendation,
    overallScore: a.overallScore,
  }));

  const stats: DashboardStats = {
    total: properties.length,
    neighborhoods: neighborhoods.length,
    medianPrice,
    opportunities,
  };

  return (
    <LanguageProvider>
      <FavoritesProvider>
        <Dashboard
          properties={properties}
          neighborhoods={neighborhoods}
          stats={stats}
          market={market}
          mapPoints={mapPoints}
        />
      </FavoritesProvider>
    </LanguageProvider>
  );
}
