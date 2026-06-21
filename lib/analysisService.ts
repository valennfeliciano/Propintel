import type {
  Property,
  AnalysisResult,
  AnalysisMetrics,
  Recommendation,
} from "./types";

// ---------------------------------------------------------------------------
// Investment analysis engine (rules v2 — real data)
//
// Reasons over REAL scraped signals: price-per-sqft vs. the ZIP's median comp,
// price vs. Zillow Zestimate, price-cut history, days on market, and value-add
// language parsed from the actual listing description.
//
// This is the abstraction boundary for AI: replace the body of
// `analyzeProperty` with a Claude `generateObject` call returning the same
// `AnalysisResult` shape — no API route or UI changes required.
// ---------------------------------------------------------------------------

const CURRENT_YEAR = 2026;
const ENGINE_ID = "rules-engine-v2";

const DOWN_PAYMENT_PCT = 0.2;
const MORTGAGE_RATE = 0.07;
const LOAN_TERM_YEARS = 30;
const OPEX_RATIO = 0.3; // vacancy, maintenance, insurance, management

const VALUE_ADD =
  /investors?\s+(are\s+)?welcome|re-level|foundation movement|fixer|as[\s-]?is|ready for your renovation|needs?\s+(work|updating|repair|tlc)|bring your|sweat equity/i;

const fmtMoney = (n: number) => {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;
};
const pct = (n: number, digits = 1) => `${n.toFixed(digits)}%`;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function monthlyMortgagePayment(principal: number): number {
  const r = MORTGAGE_RATE / 12;
  const n = LOAN_TERM_YEARS * 12;
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

  const operatingExpenses =
    p.propertyTaxAnnual + p.hoaMonthly * 12 + annualRent * OPEX_RATIO;
  const noi = annualRent - operatingExpenses;
  const capRatePct = (noi / p.price) * 100;

  const rentToPricePct = (p.estimatedRent / p.price) * 100;

  const loan = p.price * (1 - DOWN_PAYMENT_PCT);
  const estMonthlyCashFlow = noi / 12 - monthlyMortgagePayment(loan);

  const discountToZestimatePct =
    p.zestimate && p.zestimate > 0
      ? ((p.price - p.zestimate) / p.zestimate) * 100
      : null;

  return {
    pricePerSqft: Math.round(pricePerSqft),
    neighborhoodAvgPricePerSqft: p.neighborhoodAvgPricePerSqft,
    pricePerSqftDeltaPct: Math.round(pricePerSqftDeltaPct * 10) / 10,
    grossRentMultiplier: Math.round(grossRentMultiplier * 10) / 10,
    capRatePct: Math.round(capRatePct * 10) / 10,
    rentToPricePct: Math.round(rentToPricePct * 100) / 100,
    meetsOnePercentRule: rentToPricePct >= 1,
    ageYears: p.yearBuilt ? CURRENT_YEAR - p.yearBuilt : null,
    estMonthlyCashFlow: Math.round(estMonthlyCashFlow),
    discountToZestimatePct:
      discountToZestimatePct == null
        ? null
        : Math.round(discountToZestimatePct * 10) / 10,
  };
}

// Value: priced below comps + below Zestimate + supporting income.
function scoreValue(p: Property, m: AnalysisMetrics): number {
  let s = 50 - m.pricePerSqftDeltaPct * 2.0;
  if (m.discountToZestimatePct != null) s -= m.discountToZestimatePct * 1.4;
  if (m.capRatePct >= 5) s += 8;
  else if (m.capRatePct >= 4) s += 4;
  else if (m.capRatePct < 2.5) s -= 6;
  if (m.meetsOnePercentRule) s += 6;
  return Math.round(clamp(s));
}

// Opportunity: forward upside from REAL motivation/leverage signals.
function scoreOpportunity(p: Property, m: AnalysisMetrics, valueAdd: boolean): number {
  let s = 22;
  s += Math.min(p.priceCutCount * 6, 18); // each cut = more motivated seller
  if (p.lastCutPct != null) s += Math.min(Math.abs(p.lastCutPct), 12);
  if (p.daysOnMarket > 90) s += 14;
  else if (p.daysOnMarket > 45) s += 8;
  else if (p.daysOnMarket > 21) s += 4;
  if (valueAdd) s += 12; // forced-equity potential
  if (m.pricePerSqftDeltaPct < -8) s += 8;
  if (m.discountToZestimatePct != null && m.discountToZestimatePct < -3) s += 8;
  return Math.round(clamp(s));
}

function buildHighlights(p: Property, m: AnalysisMetrics, valueAdd: boolean): string[] {
  const out: string[] = [];
  if (m.pricePerSqftDeltaPct <= -7)
    out.push(
      `Undervalued: ${pct(Math.abs(m.pricePerSqftDeltaPct))} below the ${p.neighborhood} median of ${fmtMoney(p.neighborhoodAvgPricePerSqft)}/sqft.`,
    );
  if (m.discountToZestimatePct != null && m.discountToZestimatePct <= -3)
    out.push(
      `Listed ${pct(Math.abs(m.discountToZestimatePct))} below Zillow's Zestimate of ${fmtMoney(p.zestimate!)}.`,
    );
  if (p.priceCutCount > 0)
    out.push(
      `Seller cut the price ${p.priceCutCount} time${p.priceCutCount > 1 ? "s" : ""}${p.lastCutPct != null ? ` (latest ${pct(p.lastCutPct)})` : ""} — motivated.`,
    );
  if (p.daysOnMarket > 60)
    out.push(`On market ${p.daysOnMarket} days — likely room to negotiate below ask.`);
  if (m.capRatePct >= 4)
    out.push(`Healthy projected cap rate of ${pct(m.capRatePct)} — strong for this market.`);
  if (valueAdd)
    out.push(`Value-add: the listing flags renovation/investor upside — force equity on improvement.`);
  if (m.meetsOnePercentRule)
    out.push(`Meets the 1% rule (${pct(m.rentToPricePct, 2)} rent-to-price) — rare here.`);
  if (p.condition === "Excellent" && out.length < 2)
    out.push(`Turnkey condition — minimal deferred maintenance to underwrite.`);
  if (out.length === 0)
    out.push(`Priced near comps in an established ${p.neighborhood} location.`);
  return out;
}

function buildRiskFactors(p: Property, m: AnalysisMetrics): string[] {
  const out: string[] = [];
  if (m.pricePerSqftDeltaPct >= 10)
    out.push(
      `Priced ${pct(m.pricePerSqftDeltaPct)} above the ${p.neighborhood} median $/sqft — thin margin of safety.`,
    );
  if (m.discountToZestimatePct != null && m.discountToZestimatePct >= 5)
    out.push(`Listed ${pct(m.discountToZestimatePct)} above Zillow's Zestimate — paying over estimated value.`);
  if (p.propertyTaxAnnual / p.price > 0.018)
    out.push(
      `High property-tax burden (${fmtMoney(p.propertyTaxAnnual)}/yr, ~${pct((p.propertyTaxAnnual / p.price) * 100)} of value) compresses cash flow.`,
    );
  if (p.hoaMonthly >= 250)
    out.push(`HOA ${fmtMoney(p.hoaMonthly)}/mo (${fmtMoney(p.hoaMonthly * 12)}/yr) erodes net returns.`);
  if (m.rentToPricePct < 0.5)
    out.push(`Weak rent-to-price (${pct(m.rentToPricePct, 2)}/mo) — an appreciation bet, not a cash-flow asset.`);
  if (p.daysOnMarket > 120)
    out.push(`Stale listing (${p.daysOnMarket} days) — investigate why it hasn't sold.`);
  if (m.capRatePct < 3)
    out.push(`Low projected cap rate (${pct(m.capRatePct)}) — returns depend on appreciation.`);
  if (/foundation movement|re-level/i.test(p.description))
    out.push(`Listing notes foundation movement — get a structural inspection and repair bid.`);
  if (p.condition === "Needs Work")
    out.push(`Condition: Needs Work — get firm rehab bids before writing an offer.`);
  if (m.ageYears != null && m.ageYears > 55 && p.condition !== "Excellent")
    out.push(`Built ${p.yearBuilt} (${m.ageYears} yrs) — budget for roof, HVAC and major systems.`);
  return out;
}

function buildActionPlan(p: Property, m: AnalysisMetrics, rec: Recommendation, valueAdd: boolean): string[] {
  const plan: string[] = [];
  if (rec === "Pass") {
    plan.push(
      `Skip at ask. Re-engage only below ${fmtMoney(p.neighborhoodAvgPricePerSqft * p.sqft * 0.95)} (5% under the ZIP median $/sqft).`,
    );
  } else {
    const discount = p.daysOnMarket > 90 || p.priceCutCount >= 2 ? 0.93 : 0.97;
    plan.push(
      `Open at ${fmtMoney(p.price * discount)} (${pct((1 - discount) * 100, 0)} under ask)${
        p.priceCutCount >= 2
          ? ` — ${p.priceCutCount} prior cuts signal a flexible seller.`
          : p.daysOnMarket > 90
            ? " — the long days-on-market support an aggressive offer."
            : "."
      }`,
    );
  }
  if (valueAdd || p.condition === "Needs Work")
    plan.push(`Get contractor bids and re-underwrite the after-repair value against ${p.neighborhood} comps.`);
  if (m.ageYears != null && m.ageYears > 45)
    plan.push(`Order a full inspection (roof, HVAC, electrical, foundation) given the ${m.ageYears}-year age.`);
  plan.push(
    m.estMonthlyCashFlow >= 0
      ? `Underwrite the hold: ~${fmtMoney(m.estMonthlyCashFlow)}/mo cash flow at 20% down.`
      : `Plan for a ${fmtMoney(Math.abs(m.estMonthlyCashFlow))}/mo carry at 20% down — confirm reserves or more money down.`,
  );
  plan.push(
    p.rentSource === "zillow"
      ? `Validate the ${fmtMoney(p.estimatedRent)}/mo Zillow rent estimate against live comps before closing.`
      : `Pull real rent comps — the ${fmtMoney(p.estimatedRent)}/mo rent here is modeled, not a Zestimate.`,
  );
  return plan;
}

function recommend(overall: number, riskCount: number): Recommendation {
  if (overall >= 70) return riskCount >= 5 ? "Worth a Look" : "Strong Buy";
  if (overall >= 50) return "Worth a Look";
  return "Pass";
}

function buildSummary(p: Property, m: AnalysisMetrics, rec: Recommendation): string {
  const valueWord =
    m.pricePerSqftDeltaPct <= -5 ? "below" : m.pricePerSqftDeltaPct >= 5 ? "above" : "in line with";
  const zClause =
    m.discountToZestimatePct != null
      ? ` ${m.discountToZestimatePct <= 0 ? `${pct(Math.abs(m.discountToZestimatePct))} below` : `${pct(m.discountToZestimatePct)} above`} Zestimate.`
      : "";
  const cutClause = p.priceCutCount > 0 ? ` ${p.priceCutCount} price cut${p.priceCutCount > 1 ? "s" : ""} so far.` : "";
  return (
    `This ${p.beds}bd/${p.baths}ba ${p.propertyType.toLowerCase()} in ${p.neighborhood} (${p.zip}) is priced ${valueWord} ` +
    `comps at ${fmtMoney(m.pricePerSqft)}/sqft (ZIP median ${fmtMoney(m.neighborhoodAvgPricePerSqft)}).${zClause} ` +
    `Projected cap rate ${pct(m.capRatePct)} on ${p.rentSource === "zillow" ? "Zillow-estimated" : "modeled"} rent of ${fmtMoney(p.estimatedRent)}/mo.${cutClause} Verdict: ${rec}.`
  );
}

/**
 * Analyze a real listing for investment potential.
 * Swap this implementation for a Claude call to upgrade the analysis — the
 * return shape is the contract the rest of the app depends on.
 */
export function analyzeProperty(property: Property): AnalysisResult {
  const metrics = computeMetrics(property);
  const valueAdd = VALUE_ADD.test(property.description) || property.condition === "Needs Work";

  const value = scoreValue(property, metrics);
  const opportunity = scoreOpportunity(property, metrics, valueAdd);
  const overall = Math.round(value * 0.55 + opportunity * 0.45);

  const highlights = buildHighlights(property, metrics, valueAdd);
  const riskFactors = buildRiskFactors(property, metrics);
  const recommendation = recommend(overall, riskFactors.length);
  const actionPlan = buildActionPlan(property, metrics, recommendation, valueAdd);
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
