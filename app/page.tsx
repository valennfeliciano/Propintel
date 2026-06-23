import { getAllProperties, getNeighborhoods } from "@/lib/data";
import { analyzeProperty } from "@/lib/analysisService";
import { getMarket } from "@/lib/market";
import Dashboard, { type DashboardStats } from "@/components/Dashboard";
import type { MapPoint } from "@/components/ListingsMap";
import { LanguageProvider } from "@/components/LanguageProvider";
import { FavoritesProvider } from "@/components/FavoritesProvider";

export default async function Home() {
  const market = await getMarket();
  const rate = market.mortgage30.value; // live FRED rate, drives the math
  const properties = getAllProperties();
  const neighborhoods = getNeighborhoods();

  // Score every listing once; reuse for the opportunity count and the map pins.
  const analyzed = properties.map((p) => ({ p, a: analyzeProperty(p, rate) }));
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
