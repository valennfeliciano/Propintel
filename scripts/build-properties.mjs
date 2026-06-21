// Transforms the raw Zillow scrape + real ZIP comp table into the app's
// Property schema. Real fields pass through; a few are derived transparently
// (condition from description language, rent estimate when no Zestimate,
// property tax fallback). Re-run after re-scraping:
//
//   node scripts/build-properties.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
const raw = JSON.parse(readFileSync(join(dataDir, "zillow-raw.json"), "utf8"));
const comps = JSON.parse(readFileSync(join(dataDir, "comps.json"), "utf8")).byZip;
// Verbatim Zillow listing copy (preferred over the condensed raw text).
const verbatim = JSON.parse(readFileSync(join(dataDir, "descriptions.json"), "utf8")).byZpid;

const CURRENT_YEAR = 2026;

// ZIP → human area label (groups listings that share a ZIP).
const ZIP_AREA = {
  "78704": "South Congress / Barton Hills",
  "78717": "Avery Ranch / NW",
  "78727": "North Austin / Tech Corridor",
  "78736": "Southwest Hills",
  "78737": "Hill Country / Dripping Springs",
  "78738": "Bee Cave / Lake Travis",
  "78739": "Circle C / SW Austin",
  "78744": "Southeast Austin",
  "78747": "Far South / Onion Creek",
  "78748": "Far South Austin",
  "78753": "North Austin",
  "78758": "North Austin / Quail Creek",
};

const parseLot = (s) => {
  if (!s) return 0;
  const n = parseFloat(String(s).replace(/,/g, ""));
  if (!isFinite(n)) return 0;
  return /acre/i.test(s) ? Math.round(n * 43560) : Math.round(n);
};

const estRent = (price) => {
  const r =
    price < 400000 ? 0.006 :
    price < 700000 ? 0.005 :
    price < 1200000 ? 0.004 :
    price < 2000000 ? 0.0033 : 0.0028;
  return Math.round((price * r) / 25) * 25;
};

// Condition parsed from the real listing description + age.
const NEEDS_WORK = /re-level|foundation movement|fixer|as-is|as is|investors?\s+(are\s+)?welcome|ready for your renovation|needs?\s+(work|updating|repair|tlc)|bring your/i;
const UPDATED = /renovat|remodel|fully updated|completely updated|turn[\s-]?key|move[\s-]?in ready|new construction|immaculate/i;

function deriveCondition(desc, ageYears) {
  if (NEEDS_WORK.test(desc)) return "Needs Work";
  if (UPDATED.test(desc)) return ageYears != null && ageYears <= 6 ? "Excellent" : "Good";
  if (ageYears == null) return "Good";
  if (ageYears <= 8) return "Excellent";
  if (ageYears <= 35) return "Good";
  if (ageYears <= 55) return "Fair";
  return "Fair";
}

const properties = raw.map((r, i) => {
  const ageYears = r.yearBuilt ? CURRENT_YEAR - r.yearBuilt : null;
  const comp = comps[r.zip] || {};
  const rentZ = r.rentZestimate;
  const q = encodeURIComponent(`${r.street}, ${r.city}, ${r.state} ${r.zip}`);
  return {
    id: `prop_${String(i + 1).padStart(3, "0")}`,
    address: r.street,
    city: r.city,
    state: r.state,
    zip: r.zip,
    neighborhood: ZIP_AREA[r.zip] || `Austin ${r.zip}`,
    propertyType: "Single-Family",
    price: r.price,
    beds: r.beds,
    baths: r.baths,
    sqft: r.sqft,
    lotSqft: parseLot(r.lotSize),
    yearBuilt: r.yearBuilt ?? null,
    condition: deriveCondition(r.description || "", ageYears),
    daysOnMarket: r.daysOnZillow ?? 0,
    estimatedRent: rentZ ?? estRent(r.price),
    rentSource: rentZ ? "zillow" : "estimated",
    propertyTaxAnnual: r.taxAnnual ?? Math.round((r.price * 0.019) / 50) * 50,
    hoaMonthly: r.hoa ?? 0,
    neighborhoodAvgPricePerSqft: comp.medianPpsf ?? Math.round(r.price / r.sqft),
    neighborhoodMedianPrice: comp.medianPrice ?? r.price,
    zestimate: r.zestimate ?? null,
    priceCutCount: r.priceCutCount ?? 0,
    lastCutPct: r.lastCutPct ?? null,
    lat: r.lat,
    lng: r.lng,
    description: verbatim[r.zpid] ?? r.description,
    imageUrl: r.photos[0],
    photos: r.photos,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${q}`,
    detailUrl: r.url,
    zillowSearchUrl: r.url,
  };
});

writeFileSync(join(dataDir, "properties.json"), JSON.stringify(properties, null, 2) + "\n");
console.log(`Wrote ${properties.length} properties to data/properties.json`);
