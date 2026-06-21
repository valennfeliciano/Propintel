import type {
  Property,
  AnalysisResult,
  AnalysisMetrics,
  Recommendation,
} from "./types";

// ---------------------------------------------------------------------------
// Investment analysis engine (rules v1)
//
// This is the abstraction boundary for AI. Today `analyzeProperty` runs an
// explainable, domain-aware rules engine. To swap in Claude later, replace the
// body of `analyzeProperty` with a model call that returns the same
// `AnalysisResult` shape — no API route or UI changes required:
//
//   const { object } = await generateObject({
//     model: 'claude-sonnet-4-6',
//     schema: analysisResultSchema,
//     prompt: buildPrompt(property),
//   });
//   return object;
// ---------------------------------------------------------------------------

const CURRENT_YEAR = 2026;
const ENGINE_ID = "rules-engine-v1";

// Financing assumptions for the cash-flow estimate (transparent on purpose).
const DOWN_PAYMENT_PCT = 0.2;
const MORTGAGE_RATE = 0.07;
const LOAN_TERM_YEARS = 30;
// Operating expense load beyond taxes + HOA (vacancy, maintenance, insurance, mgmt).
const OPEX_RATIO = 0.3;

const fmtMoney = (n: number) => {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
};
const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;

function monthlyMortgagePayment(principal: number): number {
  const r = MORTGAGE_RATE / 12;
  const n = LOAN_TERM_YEARS * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

function computeMetrics(p: Property): AnalysisMetrics {
  const pricePerSqft = p.price / p.sqft;
  const pricePerSqftDeltaPct =
    ((pricePerSqft - p.neighborhoodAvgPricePerSqft) /
      p.neighborhoodAvgPricePerSqft) *
    100;

  const annualRent = p.estimatedRent * 12;
  const grossRentMultiplier = p.price / annualRent;

  // Net operating income → cap rate (excludes financing, includes taxes/HOA/opex).
  const operatingExpenses =
    p.propertyTaxAnnual + p.hoaMonthly * 12 + annualRent * OPEX_RATIO;
  const noi = annualRent - operatingExpenses;
  const capRatePct = (noi / p.price) * 100;

  const rentToPricePct = (p.estimatedRent / p.price) * 100;
  const meetsOnePercentRule = rentToPricePct >= 1;

  // Rough levered monthly cash flow.
  const loan = p.price * (1 - DOWN_PAYMENT_PCT);
  const debtService = monthlyMortgagePayment(loan);
  const estMonthlyCashFlow = noi / 12 - debtService;

  return {
    pricePerSqft: Math.round(pricePerSqft),
    neighborhoodAvgPricePerSqft: p.neighborhoodAvgPricePerSqft,
    pricePerSqftDeltaPct: Math.round(pricePerSqftDeltaPct * 10) / 10,
    grossRentMultiplier: Math.round(grossRentMultiplier * 10) / 10,
    capRatePct: Math.round(capRatePct * 10) / 10,
    rentToPricePct: Math.round(rentToPricePct * 100) / 100,
    meetsOnePercentRule,
    ageYears: CURRENT_YEAR - p.yearBuilt,
    estMonthlyCashFlow: Math.round(estMonthlyCashFlow),
  };
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

// Value score: how far below comps + supporting income metrics. 50 = priced at comps.
function scoreValue(p: Property, m: AnalysisMetrics): number {
  // Each 1% below neighborhood $/sqft ≈ +2.2 points (and vice-versa).
  let score = 50 - m.pricePerSqftDeltaPct * 2.2;
  if (m.capRatePct >= 5) score += 8;
  else if (m.capRatePct >= 4) score += 4;
  else if (m.capRatePct < 2.5) score -= 6;
  if (m.meetsOnePercentRule) score += 6;
  return Math.round(clamp(score));
}

// Opportunity score: forward upside — momentum, negotiation leverage, value-add.
function scoreOpportunity(p: Property, m: AnalysisMetrics): number {
  let score = 0;
  score += clamp(p.neighborhoodDemandScore, 0, 100) * 0.35; // demand
  score += clamp(p.neighborhoodTrendPct * 3.5, 0, 35); // appreciation momentum
  if (p.daysOnMarket > 90) score += 14; // strong negotiation leverage
  else if (p.daysOnMarket > 45) score += 8;
  // Value-add: a cosmetic fixer in a high-demand pocket has real forced-equity upside.
  if (
    (p.condition === "Fair" || p.condition === "Needs Work") &&
    p.neighborhoodDemandScore >= 75
  ) {
    score += 12;
  }
  if (m.pricePerSqftDeltaPct < -8) score += 6; // already below comps
  return Math.round(clamp(score));
}

function buildHighlights(p: Property, m: AnalysisMetrics): string[] {
  const out: string[] = [];
  if (m.pricePerSqftDeltaPct <= -7) {
    out.push(
      `Undervalued: ${pct(Math.abs(m.pricePerSqftDeltaPct))} below the ${p.neighborhood} average of ${fmtMoney(
        p.neighborhoodAvgPricePerSqft,
      )}/sqft.`,
    );
  }
  if (p.neighborhoodTrendPct >= 7) {
    out.push(
      `Strong momentum — ${p.neighborhood} is up ${pct(p.neighborhoodTrendPct, 0)} YoY with a ${p.neighborhoodDemandScore}/100 demand score.`,
    );
  }
  if (p.daysOnMarket > 60) {
    out.push(
      `On market ${p.daysOnMarket} days — likely room to negotiate below ask.`,
    );
  }
  if (m.capRatePct >= 4) {
    out.push(`Healthy projected cap rate of ${pct(m.capRatePct)} after expenses — strong for this market.`);
  }
  if (m.meetsOnePercentRule) {
    out.push(`Meets the 1% rule (${pct(m.rentToPricePct, 2)} rent-to-price) — rare in this market.`);
  }
  if (
    (p.condition === "Fair" || p.condition === "Needs Work") &&
    p.neighborhoodDemandScore >= 75
  ) {
    out.push(
      `Value-add play: cosmetic updates in a high-demand pocket can force equity quickly.`,
    );
  }
  if (p.condition === "Excellent" && out.length < 2) {
    out.push(`Turnkey condition — minimal deferred maintenance to underwrite.`);
  }
  if (out.length === 0) {
    out.push(`Priced near comps in an established ${p.neighborhood} location.`);
  }
  return out;
}

function buildRiskFactors(p: Property, m: AnalysisMetrics): string[] {
  const out: string[] = [];
  if (m.pricePerSqftDeltaPct >= 10) {
    out.push(
      `Priced ${pct(m.pricePerSqftDeltaPct)} above the ${p.neighborhood} average $/sqft — thin margin of safety.`,
    );
  }
  if (m.ageYears > 55 && p.condition !== "Excellent") {
    out.push(
      `Built ${p.yearBuilt} (${m.ageYears} yrs) — budget for roof, HVAC, plumbing and foundation.`,
    );
  }
  if (p.propertyTaxAnnual / p.price > 0.018) {
    out.push(
      `High property-tax burden (${fmtMoney(p.propertyTaxAnnual)}/yr, ~${pct((p.propertyTaxAnnual / p.price) * 100)} of value) compresses cash flow.`,
    );
  }
  if (p.hoaMonthly >= 250) {
    out.push(`HOA ${fmtMoney(p.hoaMonthly)}/mo (${fmtMoney(p.hoaMonthly * 12)}/yr) erodes net returns.`);
  }
  if (m.rentToPricePct < 0.5) {
    out.push(
      `Weak rent-to-price (${pct(m.rentToPricePct, 2)}/mo) — an appreciation bet, not a cash-flow asset.`,
    );
  }
  if (p.daysOnMarket > 120) {
    out.push(`Stale listing (${p.daysOnMarket} days) — investigate why it hasn't sold.`);
  }
  if (m.capRatePct < 3) {
    out.push(`Low projected cap rate (${pct(m.capRatePct)}) — returns depend on appreciation.`);
  }
  if (p.condition === "Needs Work") {
    out.push(`Condition: Needs Work — get firm rehab bids before writing an offer.`);
  }
  return out;
}

function buildActionPlan(
  p: Property,
  m: AnalysisMetrics,
  rec: Recommendation,
): string[] {
  const plan: string[] = [];

  if (rec === "Pass") {
    plan.push(
      `Skip at ask. Re-engage only if the price drops below ${fmtMoney(p.neighborhoodAvgPricePerSqft * p.sqft * 0.95)} (5% under comps).`,
    );
  } else {
    const targetDiscount = p.daysOnMarket > 90 ? 0.93 : 0.97;
    plan.push(
      `Open at ${fmtMoney(p.price * targetDiscount)} (${pct((1 - targetDiscount) * 100, 0)} under ask)${
        p.daysOnMarket > 90 ? " — the long days-on-market support an aggressive offer." : "."
      }`,
    );
  }

  if (p.condition === "Fair" || p.condition === "Needs Work") {
    plan.push(
      `Get contractor bids for a cosmetic-to-moderate rehab and re-underwrite the after-repair value against ${p.neighborhood} comps.`,
    );
  }
  if (m.ageYears > 45) {
    plan.push(`Order a full inspection focused on roof, HVAC, electrical panel and foundation given the ${m.ageYears}-year age.`);
  }
  plan.push(
    m.estMonthlyCashFlow >= 0
      ? `Underwrite the hold: ~${fmtMoney(m.estMonthlyCashFlow)}/mo cash flow at 20% down plus ${pct(p.neighborhoodTrendPct, 0)} expected appreciation.`
      : `Model a 3–5 yr hold leaning on ${pct(p.neighborhoodTrendPct, 0)} appreciation; confirm reserves to cover the ${fmtMoney(Math.abs(m.estMonthlyCashFlow))}/mo shortfall.`,
  );
  plan.push(`Verify rent comps and tax assessment before removing contingencies.`);
  return plan;
}

function recommend(overall: number, riskCount: number): Recommendation {
  // Score-driven bands; a risk-heavy profile knocks a Strong Buy down a notch.
  if (overall >= 70) return riskCount >= 5 ? "Worth a Look" : "Strong Buy";
  if (overall >= 50) return "Worth a Look";
  return "Pass";
}

function buildSummary(
  p: Property,
  m: AnalysisMetrics,
  rec: Recommendation,
): string {
  const valueWord =
    m.pricePerSqftDeltaPct <= -5
      ? "below"
      : m.pricePerSqftDeltaPct >= 5
        ? "above"
        : "in line with";
  return (
    `This ${p.beds}bd/${p.baths}ba ${p.propertyType.toLowerCase()} in ${p.neighborhood} is priced ${valueWord} ` +
    `comps at ${fmtMoney(m.pricePerSqft)}/sqft (area avg ${fmtMoney(m.neighborhoodAvgPricePerSqft)}). ` +
    `Projected cap rate ${pct(m.capRatePct)}, ${pct(m.rentToPricePct, 2)} rent-to-price, ` +
    `${p.neighborhood} trending +${pct(p.neighborhoodTrendPct, 0)} YoY. Verdict: ${rec}.`
  );
}

/**
 * Analyze a property for investment potential.
 * Swap this implementation for a Claude call to upgrade the analysis — the
 * return shape is the contract the rest of the app depends on.
 */
export function analyzeProperty(property: Property): AnalysisResult {
  const metrics = computeMetrics(property);
  const value = scoreValue(property, metrics);
  const opportunity = scoreOpportunity(property, metrics);
  const overall = Math.round(value * 0.55 + opportunity * 0.45);

  const highlights = buildHighlights(property, metrics);
  const riskFactors = buildRiskFactors(property, metrics);
  const recommendation = recommend(overall, riskFactors.length);
  const actionPlan = buildActionPlan(property, metrics, recommendation);
  const summary = buildSummary(property, metrics, recommendation);

  return {
    propertyId: property.id,
    scoreValue: value,
    scoreOpportunity: opportunity,
    overallScore: overall,
    recommendation,
    highlights,
    riskFactors,
    actionPlan,
    summary,
    metrics,
    generatedBy: ENGINE_ID,
  };
}
