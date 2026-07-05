# AI Integration Guide

PropIntel's scoring engine is built with a deliberate swap point: replace one
function and the entire app gets real AI analysis with no other changes
required.

---

## How the Current Engine Works

`lib/analysisService.ts` exports a single function:

```ts
export function analyzeProperty(
  property: Property,
  mortgageRatePct: number,
): AnalysisResult
```

This is the **only** function the rest of the app calls. The API route
(`app/api/analyze-property/route.ts`) calls it. The server page (`app/page.tsx`)
calls it to pre-score all 50 listings for the map pins.

The current implementation is a deterministic rules engine (v2). It computes
metrics from real scraped data, scores value and opportunity on 0–100 scales,
and returns a structured `AnalysisResult`.

The `generatedBy` field in every result identifies who produced it:
- Rules engine: `"rules-engine-v2"`
- Claude: you would set this to the model ID, e.g. `"claude-opus-4-5"`

---

## The Swap Point

The comment at the top of `lib/analysisService.ts` states this explicitly:

> This is the abstraction boundary for AI: replace the body of `analyzeProperty`
> with a Claude `generateObject` call returning the same `AnalysisResult` shape
> — no API route or UI changes required.

The `AnalysisResult` type (in `lib/types.ts`) is the contract. As long as
Claude returns a value that matches that shape, every component — the score
bars, the action plan, the recommendation badge — renders correctly.

---

## API Setup

### 1. Get an Anthropic API key

Go to [console.anthropic.com](https://console.anthropic.com), create an account,
and generate an API key. The key starts with `sk-ant-`.

### 2. Add the key to your environment

```bash
# Local development
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" >> .env.local

# Production (Vercel)
vercel env add ANTHROPIC_API_KEY production
```

The `@anthropic-ai/sdk` package is already installed (`package.json`).

---

## How to Implement the Claude Swap

Here is a complete drop-in replacement for the body of `analyzeProperty` in
`lib/analysisService.ts`. This follows the Anthropic SDK's structured-output
pattern.

```ts
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

export async function analyzeProperty(
  property: Property,
  mortgageRatePct: number = DEFAULT_MORTGAGE_RATE_PCT,
): Promise<AnalysisResult> {
  const prompt = buildPrompt(property, mortgageRatePct);

  const message = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  // Parse the JSON Claude returns
  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = JSON.parse(text) as AnalysisResult;
  return { ...parsed, generatedBy: "claude-opus-4-5" };
}
```

Note: the function signature becomes `async`. You would need to update all
call sites (`app/page.tsx`, `app/api/analyze-property/route.ts`) to `await` it.
The API route already uses `async/await`. `app/page.tsx` is already an async
Server Component.

---

## Prompt Strategy

A well-structured prompt is the difference between useful analysis and generic
advice. Give Claude the same inputs the rules engine uses.

```ts
function buildPrompt(p: Property, mortgageRatePct: number): string {
  return `
You are a real estate investment analyst. Analyze this listing and return a
JSON object that exactly matches the AnalysisResult schema. No other text.

LISTING DATA:
- Address: ${p.address}, ${p.neighborhood} (${p.zip})
- Price: $${p.price.toLocaleString()}
- Size: ${p.beds}bd/${p.baths}ba, ${p.sqft.toLocaleString()} sqft
- Price/sqft: $${Math.round(p.price / p.sqft)}
- ZIP median price/sqft: $${p.neighborhoodAvgPricePerSqft}
- Zestimate: ${p.zestimate ? "$" + p.zestimate.toLocaleString() : "not available"}
- Days on market: ${p.daysOnMarket}
- Price cuts: ${p.priceCutCount} (last cut: ${p.lastCutPct ?? "none"})
- Estimated rent: $${p.estimatedRent}/mo (source: ${p.rentSource})
- Property tax: $${p.propertyTaxAnnual}/yr
- HOA: $${p.hoaMonthly}/mo
- Year built: ${p.yearBuilt}
- Condition: ${p.condition}
- Current 30-yr mortgage rate: ${mortgageRatePct}%
- Listing description excerpt: "${p.description.slice(0, 400)}"

SCORING RULES:
- scoreValue (0–100): how cheap vs. comps. 50 = at market. Below comps = higher.
- scoreOpportunity (0–100): forward upside. Price cuts, days on market, value-add keywords.
- overallScore: 55% value + 45% opportunity.
- recommendation: "Strong Buy" (70+), "Worth a Look" (50–69), "Pass" (<50).
  Downgrade Strong Buy to Worth a Look if 5+ risk factors.

Return ONLY valid JSON matching this TypeScript interface:
{
  propertyId: "${p.id}",
  scoreValue: number,
  scoreOpportunity: number,
  overallScore: number,
  recommendation: "Strong Buy" | "Worth a Look" | "Pass",
  highlights: string[],   // 1–4 bullet points, specific numbers
  riskFactors: string[],  // 0–6 items, specific numbers
  actionPlan: string[],   // 2–4 numbered steps
  summary: string,        // 2–3 sentence paragraph
  metrics: {
    pricePerSqft: number,
    neighborhoodAvgPricePerSqft: number,
    pricePerSqftDeltaPct: number,
    grossRentMultiplier: number,
    capRatePct: number,
    rentToPricePct: number,
    meetsOnePercentRule: boolean,
    ageYears: number | null,
    estMonthlyCashFlow: number,
    discountToZestimatePct: number | null,
  },
  generatedBy: "claude-opus-4-5"
}
`.trim();
}
```

---

## Fallback Mechanism

The current rules engine is a reliable fallback. A clean approach is to try
Claude and fall back on any error:

```ts
export async function analyzeProperty(
  property: Property,
  mortgageRatePct: number = DEFAULT_MORTGAGE_RATE_PCT,
): Promise<AnalysisResult> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      return await analyzeWithClaude(property, mortgageRatePct);
    } catch (err) {
      console.error("Claude analysis failed, falling back to rules engine:", err);
    }
  }
  return analyzeWithRules(property, mortgageRatePct); // existing logic
}
```

This means:
- In development without a key: always uses the rules engine.
- In production with a key: uses Claude, falls back to rules on error.
- The `generatedBy` field tells you which ran.

---

## Cost Estimation

Using `claude-opus-4-5` with the prompt above:

| Item | Tokens | Cost (approximate) |
|---|---|---|
| Input (prompt) | ~600 | $0.009 |
| Output (JSON) | ~400 | $0.012 |
| **Per property** | **~1,000** | **~$0.021** |
| 50 properties (full page load) | ~50,000 | ~$1.05 |

Notes:
- `claude-haiku-4-5` costs roughly 25x less and is appropriate for this task.
- The rules engine runs in <1 ms per property and costs nothing.
- If you use Claude only when a user opens a property (on-demand via the API
  route), the cost is $0.02 per click, not per page load.
- Always set `max_tokens` to cap runaway responses.

---

## How to Test Locally

```bash
# 1. Add your key
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env.local

# 2. Start the dev server
npm run dev

# 3. Test the API route directly
curl -X POST http://localhost:3000/api/analyze-property \
  -H "Content-Type: application/json" \
  -d '{"propertyId": "prop_001"}'

# 4. Check the generatedBy field in the response
# "rules-engine-v2" = rules engine ran
# "claude-opus-4-5"  = Claude ran
```

---

## How to Modify Scoring Prompts

The prompt is plain text — no magic. To change what Claude reasons about:

1. Open `lib/analysisService.ts` (or wherever you put the Claude implementation).
2. Edit the `buildPrompt` function.
3. Restart the dev server (`npm run dev`).
4. Test with the curl command above.

Examples of useful modifications:
- Add a neighborhood crime-score field to the prompt if you add that data.
- Change the scoring weights (currently 55/45 value/opportunity).
- Ask Claude to produce a longer narrative in the `summary` field.
- Add a new field to `AnalysisResult` (update `lib/types.ts` first, then the
  prompt schema, then the UI components that render it).

---

## Token Usage Monitoring

In the Anthropic console ([console.anthropic.com](https://console.anthropic.com)):
- **Usage** tab: daily token consumption and cost.
- **Limits**: set monthly spend limits to avoid surprise bills.

In your code, the SDK response object includes usage:

```ts
const message = await client.messages.create({ ... });
console.log(message.usage);
// { input_tokens: 612, output_tokens: 387 }
```

Log this to your observability platform to track cost per property over time.
