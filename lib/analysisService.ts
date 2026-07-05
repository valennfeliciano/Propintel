import type {
  Property,
  AnalysisResult,
  AnalysisMetrics,
  Recommendation,
} from "./types";
import market from "@/data/market.json";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Investment analysis engine — Claude AI + rules-engine fallback
//
// Primary path: analyzeProperty() calls Claude (claude-opus-4-6) with all
// property and market signals. Claude returns a structured AnalysisResult
// JSON object, which is validated against the contract before returning.
//
// Fallback path: If ANTHROPIC_API_KEY is absent, Claude is unavailable, or
// the response fails schema validation, the function transparently falls back
// to the deterministic rules engine (rules-engine-v2). No API route or UI
// changes are required — the contract is identical either way.
//
// This is the abstraction boundary noted in the original source: swap the
// body of `analyzeProperty` for a Claude call, keep the AnalysisResult shape.
// ---------------------------------------------------------------------------

const CURRENT_YEAR = 2026;
const ENGINE_ID = "rules-engine-v2";
// Exact model string — do not add date suffixes.
const CLAUDE_MODEL = "claude-opus-4-6";

const DOWN_PAYMENT_PCT = 0.2;
const DEFAULT_MORTGAGE_RATE_PCT = market.mortgage30.value;
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

function monthlyMortgagePayment(principal: number, ratePct: number): number {
  const r = ratePct / 100 / 12;
  const n = LOAN_TERM_YEARS * 12;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

// ---------------------------------------------------------------------------
// Shared metrics computation — used by both the Claude path (for the prompt
// context) and the rules-engine fallback.
// ---------------------------------------------------------------------------

function computeMetrics(p: Property, ratePct: number): AnalysisMetrics {
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
  const estMonthlyCashFlow = noi / 12 - monthlyMortgagePayment(loan, ratePct);

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

// ---------------------------------------------------------------------------
// Rules engine — kept intact as the fallback. No changes from v2.
// ---------------------------------------------------------------------------

function scoreValue(p: Property, m: AnalysisMetrics): number {
  let s = 50 - m.pricePerSqftDeltaPct * 2.0;
  if (m.discountToZestimatePct != null) s -= m.discountToZestimatePct * 1.4;
  if (m.capRatePct >= 5) s += 8;
  else if (m.capRatePct >= 4) s += 4;
  else if (m.capRatePct < 2.5) s -= 6;
  if (m.meetsOnePercentRule) s += 6;
  return Math.round(clamp(s));
}

function scoreOpportunity(p: Property, m: AnalysisMetrics, valueAdd: boolean): number {
  let s = 22;
  s += Math.min(p.priceCutCount * 6, 18);
  if (p.lastCutPct != null) s += Math.min(Math.abs(p.lastCutPct), 12);
  if (p.daysOnMarket > 90) s += 14;
  else if (p.daysOnMarket > 45) s += 8;
  else if (p.daysOnMarket > 21) s += 4;
  if (valueAdd) s += 12;
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
    p.rentSource === "estimated"
      ? `Pull real rent comps — the ${fmtMoney(p.estimatedRent)}/mo rent here is modeled.`
      : `Confirm the ${fmtMoney(p.estimatedRent)}/mo ${p.rentSource === "rentcast" ? "RentCast" : "Zillow"} rent estimate against live comps before closing.`,
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
    `Projected cap rate ${pct(m.capRatePct)} on ${p.rentSource === "rentcast" ? "RentCast-estimated" : p.rentSource === "zillow" ? "Zillow-estimated" : "modeled"} rent of ${fmtMoney(p.estimatedRent)}/mo.${cutClause} Verdict: ${rec}.`
  );
}

/**
 * Pure rules-engine path — guaranteed to return a valid AnalysisResult with
 * no network I/O. Called directly when Claude is unavailable.
 */
function analyzeWithRulesEngine(
  property: Property,
  mortgageRatePct: number,
): AnalysisResult {
  const metrics = computeMetrics(property, mortgageRatePct);
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

// ---------------------------------------------------------------------------
// Claude integration
// ---------------------------------------------------------------------------

/**
 * Builds the prompt sent to Claude. Strategy:
 *
 * 1. System prompt establishes Claude as an expert real-estate investment
 *    analyst who must ONLY return valid JSON — no prose, no markdown fences.
 *    This is critical because the response is parsed directly.
 *
 * 2. User message provides all numeric signals pre-computed (metrics) so
 *    Claude doesn't need to do arithmetic — it focuses on interpreting signals,
 *    surfacing nuanced risk/upside language, and explaining the "why" behind
 *    the verdict. This also keeps token usage predictable.
 *
 * 3. Scores and recommendation thresholds are spelled out in the prompt so
 *    Claude's output is calibrated to the same 0-100 scale and verdict labels
 *    the UI already understands:
 *      Strong Buy  ≥ 70 (and fewer than 5 risk factors)
 *      Worth a Look  50–69
 *      Pass          < 50
 *
 * 4. Output schema is inlined in the system prompt so Claude knows exactly
 *    which fields to produce and in what format. No guessing.
 *
 * Token budget: ~800 input tokens per request (property data + system prompt).
 * Output is typically 400–600 tokens. Total cost per analysis ≈ $0.017 at
 * Opus 4.6 rates ($5/M in, $25/M out).
 */
function buildClaudePrompt(
  p: Property,
  m: AnalysisMetrics,
  mortgageRatePct: number,
): { system: string; userMessage: string } {
  const valueAdd = VALUE_ADD.test(p.description) || p.condition === "Needs Work";

  const system = `You are an expert real-estate investment analyst specializing in residential income properties. \
Your job is to analyze a property listing and return a structured investment analysis.

SCORING RULES (strictly follow these):
- scoreValue (0-100): How undervalued the property is vs. neighborhood comps and Zestimate. \
  Higher = more undervalued. Start at 50 (fair value), adjust based on price signals.
- scoreOpportunity (0-100): Forward upside potential from motivated-seller signals, value-add potential, \
  days on market, price cuts. Higher = more opportunity.
- overallScore (0-100): Weighted blend — 55% scoreValue + 45% scoreOpportunity. Round to nearest integer.
- recommendation: MUST be exactly one of: "Strong Buy", "Worth a Look", "Pass"
  - "Strong Buy": overallScore >= 70 AND fewer than 5 risk factors
  - "Worth a Look": overallScore 50-69, OR overallScore >= 70 with 5+ risk factors
  - "Pass": overallScore < 50

OUTPUT FORMAT: Return ONLY a valid JSON object — no markdown, no code fences, no prose before or after. \
The object must have exactly these fields:
{
  "propertyId": string,
  "scoreValue": integer 0-100,
  "scoreOpportunity": integer 0-100,
  "overallScore": integer 0-100,
  "recommendation": "Strong Buy" | "Worth a Look" | "Pass",
  "highlights": string[] (2-5 items, concrete investment positives with specific numbers),
  "riskFactors": string[] (0-6 items, concrete risks with specific numbers),
  "actionPlan": string[] (3-5 actionable steps with specific dollar amounts or percentages),
  "summary": string (2-3 sentences, objective snapshot: price vs comps, cap rate, verdict),
  "metrics": {
    "pricePerSqft": integer,
    "neighborhoodAvgPricePerSqft": integer,
    "pricePerSqftDeltaPct": number (1 decimal),
    "grossRentMultiplier": number (1 decimal),
    "capRatePct": number (1 decimal),
    "rentToPricePct": number (2 decimals),
    "meetsOnePercentRule": boolean,
    "ageYears": integer | null,
    "estMonthlyCashFlow": integer,
    "discountToZestimatePct": number | null (1 decimal, negative = below Zestimate)
  },
  "generatedBy": "${CLAUDE_MODEL}"
}`;

  const userMessage = `Analyze this investment property and return the JSON analysis object.

PROPERTY:
- ID: ${p.id}
- Address: ${p.address}, ${p.city}, ${p.state} ${p.zip}
- Neighborhood: ${p.neighborhood}
- Type: ${p.propertyType} | ${p.beds}bd/${p.baths}ba | ${p.sqft.toLocaleString()} sqft | Lot: ${p.lotSqft.toLocaleString()} sqft
- Built: ${p.yearBuilt} (${m.ageYears ?? "unknown"} years old) | Condition: ${p.condition}
- Ask price: $${p.price.toLocaleString()}
- Zestimate: ${p.zestimate ? `$${p.zestimate.toLocaleString()}` : "N/A"}
- Days on market: ${p.daysOnMarket}
- Price cuts: ${p.priceCutCount}${p.lastCutPct != null ? ` (latest: ${p.lastCutPct.toFixed(1)}%)` : ""}
- HOA: $${p.hoaMonthly}/mo | Property tax: $${p.propertyTaxAnnual.toLocaleString()}/yr
- Value-add signals: ${valueAdd ? "YES" : "None detected"}
- Description excerpt: "${p.description.slice(0, 400)}${p.description.length > 400 ? "..." : ""}"

RENTAL INCOME:
- Estimated rent: $${p.estimatedRent.toLocaleString()}/mo (source: ${p.rentSource})${p.rentLow != null && p.rentHigh != null ? ` | RentCast range: $${p.rentLow.toLocaleString()}–$${p.rentHigh.toLocaleString()}/mo` : ""}
- Area rent (ZIP ZORI): ${p.areaRent ? `$${p.areaRent.toLocaleString()}/mo as of ${p.areaRentAsOf}` : "N/A"}

NEIGHBORHOOD COMPS:
- Neighborhood avg $/sqft: $${p.neighborhoodAvgPricePerSqft.toLocaleString()}
- Neighborhood median price: $${p.neighborhoodMedianPrice.toLocaleString()}

PRE-COMPUTED METRICS (use these exact numbers — do not recompute):
- pricePerSqft: $${m.pricePerSqft} (${m.pricePerSqftDeltaPct > 0 ? "+" : ""}${m.pricePerSqftDeltaPct}% vs neighborhood avg)
- grossRentMultiplier: ${m.grossRentMultiplier}
- capRatePct: ${m.capRatePct}%
- rentToPricePct: ${m.rentToPricePct}% (meetsOnePercentRule: ${m.meetsOnePercentRule})
- estMonthlyCashFlow: $${m.estMonthlyCashFlow} (20% down, ${mortgageRatePct}% rate, 30yr, 30% OPEX)
- discountToZestimatePct: ${m.discountToZestimatePct != null ? `${m.discountToZestimatePct}%` : "N/A"}

MARKET CONTEXT:
- 30-yr fixed mortgage rate: ${mortgageRatePct}%

Return ONLY the JSON object.`;

  return { system, userMessage };
}

/**
 * Validates that a Claude response object conforms to the AnalysisResult
 * contract. Returns the typed result or null if validation fails.
 *
 * We check every required field explicitly so a partial or hallucinated
 * response doesn't silently produce bad UI data.
 */
function validateClaudeResponse(
  raw: unknown,
  expectedPropertyId: string,
): AnalysisResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  // Required top-level string fields
  if (r.propertyId !== expectedPropertyId) return null;
  if (
    r.recommendation !== "Strong Buy" &&
    r.recommendation !== "Worth a Look" &&
    r.recommendation !== "Pass"
  )
    return null;
  if (typeof r.summary !== "string" || r.summary.length === 0) return null;
  if (typeof r.generatedBy !== "string") return null;

  // Required numeric scores
  if (
    typeof r.scoreValue !== "number" ||
    typeof r.scoreOpportunity !== "number" ||
    typeof r.overallScore !== "number"
  )
    return null;
  if (
    r.scoreValue < 0 || r.scoreValue > 100 ||
    r.scoreOpportunity < 0 || r.scoreOpportunity > 100 ||
    r.overallScore < 0 || r.overallScore > 100
  )
    return null;

  // Arrays
  if (!Array.isArray(r.highlights) || r.highlights.length === 0) return null;
  if (!Array.isArray(r.riskFactors)) return null;
  if (!Array.isArray(r.actionPlan) || r.actionPlan.length === 0) return null;

  // Metrics sub-object
  if (!r.metrics || typeof r.metrics !== "object") return null;
  const mt = r.metrics as Record<string, unknown>;
  if (
    typeof mt.pricePerSqft !== "number" ||
    typeof mt.neighborhoodAvgPricePerSqft !== "number" ||
    typeof mt.pricePerSqftDeltaPct !== "number" ||
    typeof mt.grossRentMultiplier !== "number" ||
    typeof mt.capRatePct !== "number" ||
    typeof mt.rentToPricePct !== "number" ||
    typeof mt.meetsOnePercentRule !== "boolean" ||
    typeof mt.estMonthlyCashFlow !== "number"
  )
    return null;
  if (mt.ageYears !== null && typeof mt.ageYears !== "number") return null;
  if (
    mt.discountToZestimatePct !== null &&
    typeof mt.discountToZestimatePct !== "number"
  )
    return null;

  // Verify recommendation is consistent with overallScore
  const score = r.overallScore as number;
  const riskCount = (r.riskFactors as unknown[]).length;
  const expectedRec = recommend(score, riskCount);
  if (r.recommendation !== expectedRec) {
    // Claude may have reasoned differently — trust the score and correct it.
    r.recommendation = expectedRec;
  }

  return raw as AnalysisResult;
}

/**
 * Calls Claude to analyze the property. Returns a validated AnalysisResult
 * or throws if the API call or response validation fails.
 */
async function analyzeWithClaude(
  property: Property,
  mortgageRatePct: number,
  metrics: AnalysisMetrics,
): Promise<AnalysisResult> {
  const client = new Anthropic({
    // ANTHROPIC_API_KEY is read from the environment automatically.
    // Never hardcode the key here.
  });

  const { system, userMessage } = buildClaudePrompt(property, metrics, mortgageRatePct);

  // Streaming with finalMessage() — prevents HTTP timeouts on large outputs
  // and allows us to process the complete response as a single object.
  // We use adaptive thinking so Claude can reason carefully about nuanced
  // investment signals without a fixed token budget.
  const stream = client.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system,
    messages: [{ role: "user", content: userMessage }],
  });

  const message = await stream.finalMessage();

  // Extract the text block — Claude should return exactly one text block
  // containing the JSON object (thinking blocks are separate).
  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude response contained no text block");
  }

  // Strip any accidental markdown fences Claude might add despite instructions.
  const raw = textBlock.text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Claude returned non-JSON text: ${(err as Error).message}`);
  }

  const validated = validateClaudeResponse(parsed, property.id);
  if (!validated) {
    throw new Error("Claude response failed schema validation");
  }

  return validated;
}

// ---------------------------------------------------------------------------
// Public API — identical signature to the original. No callers change.
// ---------------------------------------------------------------------------

/**
 * Analyze a real listing for investment potential.
 *
 * Primary path: Claude (claude-opus-4-6) with adaptive thinking.
 * Fallback: deterministic rules engine (rules-engine-v2) if:
 *   - ANTHROPIC_API_KEY is not set
 *   - Claude API call fails (network, rate limit, server error)
 *   - Claude response fails schema validation
 *
 * The AnalysisResult.generatedBy field tells callers which path was used:
 *   "claude-opus-4-6"  → Claude AI analysis
 *   "rules-engine-v2"  → fallback rules engine
 */
export async function analyzeProperty(
  property: Property,
  mortgageRatePct: number = DEFAULT_MORTGAGE_RATE_PCT,
): Promise<AnalysisResult> {
  // Skip Claude entirely if no API key — fail fast, no wasted latency.
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn(
      "[analyzeProperty] ANTHROPIC_API_KEY not set — using rules engine fallback.",
    );
    return analyzeWithRulesEngine(property, mortgageRatePct);
  }

  // Pre-compute metrics once. Both Claude (for prompt context) and the
  // fallback use the same numbers — guarantees consistency.
  const metrics = computeMetrics(property, mortgageRatePct);

  try {
    const result = await analyzeWithClaude(property, mortgageRatePct, metrics);
    return result;
  } catch (err) {
    // Structured error logging so production logs are debuggable.
    const message = err instanceof Error ? err.message : String(err);
    const isRateLimit = err instanceof Anthropic.RateLimitError;
    const isAuth = err instanceof Anthropic.AuthenticationError;

    console.error(
      `[analyzeProperty] Claude failed (${isRateLimit ? "rate-limited" : isAuth ? "auth error" : "error"}): ${message}. Falling back to rules engine.`,
    );

    return analyzeWithRulesEngine(property, mortgageRatePct);
  }
}
