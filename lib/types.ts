// Core domain types shared across data, the analysis engine, and the UI.

export type PropertyCondition = "Excellent" | "Good" | "Fair" | "Needs Work";

export type PropertyType = "Single-Family" | "Condo" | "Townhouse";

export interface Property {
  id: string; // e.g. "prop_001"
  address: string;
  city: string;
  state: string;
  zip: string;
  neighborhood: string;
  propertyType: PropertyType;

  price: number;
  beds: number;
  baths: number;
  sqft: number;
  lotSqft: number;
  yearBuilt: number;
  condition: PropertyCondition;
  daysOnMarket: number;

  // Investment inputs
  estimatedRent: number; // monthly, market rent estimate
  propertyTaxAnnual: number;
  hoaMonthly: number;

  // Real neighborhood comps — median across the ZIP (Zillow aggregate).
  neighborhoodAvgPricePerSqft: number;
  neighborhoodMedianPrice: number;

  // Real signals scraped from the listing.
  zestimate: number | null;
  rentSource: "zillow" | "estimated";
  priceCutCount: number;
  lastCutPct: number | null; // % of the most recent price reduction (negative)
  lat: number;
  lng: number;

  description: string;
  imageUrl: string; // primary photo
  photos: string[]; // full gallery
  mapUrl: string;
  detailUrl: string; // real Zillow listing URL
  zillowSearchUrl: string;
}

export type Recommendation = "Strong Buy" | "Worth a Look" | "Pass";

export interface AnalysisMetrics {
  pricePerSqft: number;
  neighborhoodAvgPricePerSqft: number;
  pricePerSqftDeltaPct: number; // vs. neighborhood avg (negative = below comps)
  grossRentMultiplier: number;
  capRatePct: number; // projected, after operating expenses
  rentToPricePct: number; // monthly rent / price
  meetsOnePercentRule: boolean;
  ageYears: number | null;
  estMonthlyCashFlow: number; // rough, 20% down, ~7% rate, 30yr
  discountToZestimatePct: number | null; // price vs Zestimate (negative = below)
}

export interface AnalysisResult {
  propertyId: string;
  scoreValue: number; // 0-100, how undervalued vs. comps
  scoreOpportunity: number; // 0-100, upside potential
  overallScore: number; // 0-100, blended
  recommendation: Recommendation;
  highlights: string[];
  riskFactors: string[];
  actionPlan: string[];
  summary: string;
  metrics: AnalysisMetrics;
  // Provenance — flips to a Claude model id when the engine is swapped out.
  generatedBy: string;
}
