import propertiesJson from "@/data/properties.json";
import type { Property } from "./types";

// Single source of truth for property data. Swapping to a DB or live feed later
// only touches this file — callers use the functions below.
const properties = propertiesJson as Property[];

export function getAllProperties(): Property[] {
  return properties;
}

export function getPropertyById(id: string): Property | undefined {
  return properties.find((p) => p.id === id);
}

export interface NeighborhoodSummary {
  name: string;
  count: number;
  medianPrice: number;
  avgPricePerSqft: number;
  trendPct: number;
  demandScore: number;
}

export function getNeighborhoods(): NeighborhoodSummary[] {
  const map = new Map<string, NeighborhoodSummary>();
  for (const p of properties) {
    if (!map.has(p.neighborhood)) {
      map.set(p.neighborhood, {
        name: p.neighborhood,
        count: 0,
        medianPrice: p.neighborhoodMedianPrice,
        avgPricePerSqft: p.neighborhoodAvgPricePerSqft,
        trendPct: p.neighborhoodTrendPct,
        demandScore: p.neighborhoodDemandScore,
      });
    }
    map.get(p.neighborhood)!.count += 1;
  }
  return [...map.values()].sort((a, b) => b.demandScore - a.demandScore);
}
