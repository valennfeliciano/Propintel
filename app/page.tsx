import { getAllProperties, getNeighborhoods } from "@/lib/data";
import { analyzeProperty } from "@/lib/analysisService";
import { getMarket } from "@/lib/market";
import Dashboard, { type DashboardStats } from "@/components/Dashboard";
import { LanguageProvider } from "@/components/LanguageProvider";
import { FavoritesProvider } from "@/components/FavoritesProvider";

export default async function Home() {
  const market = await getMarket();
  const rate = market.mortgage30.value; // live FRED rate, drives the math
  const properties = getAllProperties();
  const neighborhoods = getNeighborhoods();

  const prices = [...properties.map((p) => p.price)].sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)];
  const opportunities = properties.filter(
    (p) => analyzeProperty(p, rate).recommendation !== "Pass",
  ).length;

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
        />
      </FavoritesProvider>
    </LanguageProvider>
  );
}
