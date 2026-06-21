import { getAllProperties, getNeighborhoods } from "@/lib/data";
import { analyzeProperty } from "@/lib/analysisService";
import Dashboard, { type DashboardStats } from "@/components/Dashboard";

export default function Home() {
  const properties = getAllProperties();
  const neighborhoods = getNeighborhoods();

  const prices = [...properties.map((p) => p.price)].sort((a, b) => a - b);
  const medianPrice = prices[Math.floor(prices.length / 2)];
  const opportunities = properties.filter(
    (p) => analyzeProperty(p).recommendation !== "Pass",
  ).length;

  const stats: DashboardStats = {
    total: properties.length,
    neighborhoods: neighborhoods.length,
    medianPrice,
    opportunities,
  };

  return (
    <Dashboard properties={properties} neighborhoods={neighborhoods} stats={stats} />
  );
}
