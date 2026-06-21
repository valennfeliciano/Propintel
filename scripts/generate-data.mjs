// Generates a realistic, internally-consistent curated dataset of 50 Austin-area
// investment properties. Deterministic (seeded) so re-running produces the same file.
//
//   node scripts/generate-data.mjs
//
// NOTE: This is *curated sample data*, not a live Zillow scrape. Numbers are
// generated around real per-neighborhood baselines so the analysis engine has
// genuine signal (some listings are truly under-/over-priced relative to comps).

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CURRENT_YEAR = 2026;

// --- deterministic RNG (xorshift32) ---------------------------------------
function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
const rng = makeRng(20260621);
const rand = (min, max) => min + rng() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const roundTo = (n, step) => Math.round(n / step) * step;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// --- neighborhood baselines (the "comps") ---------------------------------
// avgPpsf: avg $/sqft · median: median sale price · trend: YoY % · demand: 0-100
// rentRatio: typical monthly-rent / price (cheaper areas rent better relative to price)
const NEIGHBORHOODS = [
  { name: "Tarrytown",      zip: "78703", avgPpsf: 550, median: 1600000, trend: 4,  demand: 78, rentRatio: 0.0038, streets: ["Exposition Blvd", "Pecos St", "Windsor Rd"] },
  { name: "Zilker",         zip: "78704", avgPpsf: 520, median: 1300000, trend: 6,  demand: 85, rentRatio: 0.0042, streets: ["Bluebonnet Ln", "Kinney Ave", "Treadwell St"] },
  { name: "Bouldin Creek",  zip: "78704", avgPpsf: 560, median: 1200000, trend: 5,  demand: 82, rentRatio: 0.0042, streets: ["Newning Ave", "Eldridge Ave", "Christopher St"] },
  { name: "South Congress", zip: "78704", avgPpsf: 540, median: 1100000, trend: 7,  demand: 88, rentRatio: 0.0044, streets: ["Milton St", "Gibson St", "Mary St"] },
  { name: "Hyde Park",      zip: "78751", avgPpsf: 480, median: 950000,  trend: 5,  demand: 80, rentRatio: 0.0046, streets: ["Avenue B", "Avenue G", "Duval St"] },
  { name: "North Loop",     zip: "78751", avgPpsf: 450, median: 820000,  trend: 6,  demand: 79, rentRatio: 0.0048, streets: ["Ave F", "Bull Creek Rd", "53rd St"] },
  { name: "Mueller",        zip: "78723", avgPpsf: 400, median: 750000,  trend: 4,  demand: 75, rentRatio: 0.0050, streets: ["Threadgill St", "Berkman Dr", "Mattie St"] },
  { name: "Cherrywood",     zip: "78722", avgPpsf: 470, median: 880000,  trend: 6,  demand: 81, rentRatio: 0.0048, streets: ["Maplewood Ave", "Poquito St", "38th St"] },
  { name: "Govalle",        zip: "78702", avgPpsf: 430, median: 700000,  trend: 9,  demand: 84, rentRatio: 0.0052, streets: ["Tillery St", "Bolm Rd", "Gardner Rd"] },
  { name: "Crestview",      zip: "78757", avgPpsf: 420, median: 720000,  trend: 5,  demand: 77, rentRatio: 0.0052, streets: ["Arroyo Seco", "Justin Ln", "Romeria Dr"] },
  { name: "Allandale",      zip: "78757", avgPpsf: 440, median: 780000,  trend: 4,  demand: 74, rentRatio: 0.0050, streets: ["Shoal Creek Blvd", "Greenlawn Pkwy", "Twin Oaks Dr"] },
  { name: "Windsor Park",   zip: "78723", avgPpsf: 360, median: 620000,  trend: 7,  demand: 76, rentRatio: 0.0068, streets: ["Berkman Dr", "Pinehurst Dr", "Carson Creek"] },
  { name: "East Riverside", zip: "78741", avgPpsf: 300, median: 480000,  trend: 8,  demand: 70, rentRatio: 0.0080, streets: ["Wickersham Ln", "Parker Ln", "Vargas Rd"] },
  { name: "St. Johns",      zip: "78752", avgPpsf: 310, median: 450000,  trend: 10, demand: 72, rentRatio: 0.0082, streets: ["Reservation Rd", "Crestland Dr", "Lansing Dr"] },
  { name: "Montopolis",     zip: "78741", avgPpsf: 290, median: 420000,  trend: 11, demand: 71, rentRatio: 0.0085, streets: ["Montopolis Dr", "Vargas Rd", "Riverwood Rd"] },
];

const TYPES = ["Single-Family", "Single-Family", "Single-Family", "Townhouse", "Condo"]; // weighted toward SFH

function conditionFor(yearBuilt) {
  const age = CURRENT_YEAR - yearBuilt;
  const r = rng();
  if (age <= 8) return r < 0.8 ? "Excellent" : "Good";
  if (age <= 25) return r < 0.5 ? "Good" : r < 0.85 ? "Excellent" : "Fair";
  if (age <= 50) return r < 0.45 ? "Good" : r < 0.8 ? "Fair" : "Needs Work";
  return r < 0.35 ? "Good" : r < 0.7 ? "Fair" : "Needs Work";
}

function describe(p, nb) {
  const hooks = {
    Excellent: `Turnkey ${p.propertyType.toLowerCase()} in ${nb.name} — updated systems and finishes throughout.`,
    Good: `Well-maintained ${p.propertyType.toLowerCase()} in ${nb.name} with solid bones and minor updates needed.`,
    Fair: `Dated but livable ${p.propertyType.toLowerCase()} in ${nb.name} — clear cosmetic value-add potential.`,
    "Needs Work": `Fixer in ${nb.name} priced for renovation — strong upside for a value-add buyer.`,
  };
  return hooks[p.condition];
}

const properties = [];
for (let i = 0; i < 50; i++) {
  const nb = NEIGHBORHOODS[i % NEIGHBORHOODS.length];
  const id = `prop_${String(i + 1).padStart(3, "0")}`;
  const propertyType = pick(TYPES);

  const sqft = roundTo(randInt(900, 3200), 10);
  const ppsfFactor = 0.78 + rng() * 0.44; // 0.78–1.22 of neighborhood avg
  const pricePerSqft = nb.avgPpsf * ppsfFactor;
  const price = roundTo(sqft * pricePerSqft, 1000);

  const beds = clamp(Math.round(sqft / 650), 2, 5);
  const baths = clamp(beds - (rng() < 0.4 ? 1 : 0) + (rng() < 0.4 ? 0.5 : 0), 1, 4);
  const yearBuilt = randInt(1925, 2024);
  const condition = conditionFor(yearBuilt);
  const daysOnMarket = Math.floor(rng() * rng() * 175) + 2; // skewed low, occasional stale listing

  const estimatedRent = roundTo(price * nb.rentRatio * (0.9 + rng() * 0.2), 25);
  const propertyTaxAnnual = roundTo(price * 0.019, 50); // ~1.9%, realistic TX burden
  const hoaMonthly =
    propertyType === "Condo" ? randInt(180, 520)
    : propertyType === "Townhouse" ? randInt(80, 240)
    : rng() < 0.1 ? randInt(20, 60) : 0;
  const lotSqft = propertyType === "Condo" ? 0 : roundTo(randInt(4000, 12000), 100);

  const address = `${randInt(100, 9899)} ${pick(nb.streets)}`;
  const query = encodeURIComponent(`${address}, ${"Austin"}, TX ${nb.zip}`);

  const p = {
    id,
    address,
    city: "Austin",
    state: "TX",
    zip: nb.zip,
    neighborhood: nb.name,
    propertyType,
    price,
    beds,
    baths,
    sqft,
    lotSqft,
    yearBuilt,
    condition,
    daysOnMarket,
    estimatedRent,
    propertyTaxAnnual,
    hoaMonthly,
    neighborhoodAvgPricePerSqft: nb.avgPpsf,
    neighborhoodMedianPrice: nb.median,
    neighborhoodTrendPct: nb.trend,
    neighborhoodDemandScore: nb.demand,
    description: "",
    imageUrl: `https://picsum.photos/seed/${id}/800/600`,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${query}`,
    zillowSearchUrl: `https://www.zillow.com/homes/${query}_rb/`,
  };
  p.description = describe(p, nb);
  properties.push(p);
}

const out = join(__dirname, "..", "data", "properties.json");
writeFileSync(out, JSON.stringify(properties, null, 2) + "\n");
console.log(`Wrote ${properties.length} properties to ${out}`);
