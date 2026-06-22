// Pulls a REAL per-property long-term rent estimate (rent AVM) for each listing
// from RentCast, and caches it to data/rentcast.json. This replaces the modeled
// rent in the cap-rate / cash-flow math with a market-based per-property figure.
//
//   node scripts/build-rent.mjs
//
// The API key is read from .env.local (RENTCAST_API_KEY) and used ONLY here at
// build time. The cached output contains no key and is safe to commit.
// Free tier: 50 calls/month; this uses 15 (one per listing).

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// --- read key from .env.local (no extra deps) ---
const envText = readFileSync(join(root, ".env.local"), "utf8");
const KEY = (envText.match(/^RENTCAST_API_KEY=(.+)$/m) || [])[1]?.trim();
if (!KEY) throw new Error("RENTCAST_API_KEY missing from .env.local");

const raw = JSON.parse(readFileSync(join(root, "data", "zillow-raw.json"), "utf8"));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rentFor(p) {
  const params = new URLSearchParams({
    address: `${p.street}, ${p.city}, ${p.state} ${p.zip}`,
    propertyType: "Single Family",
    bedrooms: String(p.beds),
    bathrooms: String(p.baths),
    squareFootage: String(p.sqft),
    compCount: "10",
  });
  const res = await fetch(`https://api.rentcast.io/v1/avm/rent/long-term?${params}`, {
    headers: { "X-Api-Key": KEY, Accept: "application/json" },
  });
  const j = await res.json();
  if (!res.ok || typeof j.rent !== "number") {
    throw new Error(`${res.status} ${j.error || ""} ${j.message || ""}`.trim());
  }
  return { rent: Math.round(j.rent), low: Math.round(j.rentRangeLow), high: Math.round(j.rentRangeHigh), comps: (j.comparables || []).length };
}

// Incremental: keep already-cached rents and only fetch listings we don't have
// yet, so re-runs (e.g. after adding listings) spend the minimum API calls.
let byZpid = {};
try { byZpid = JSON.parse(readFileSync(join(root, "data", "rentcast.json"), "utf8")).byZpid || {}; } catch { /* first run */ }
const startCount = Object.keys(byZpid).length;
const failures = [];
for (const p of raw) {
  if (byZpid[p.zpid]) continue; // already cached — skip to save an API call
  try {
    byZpid[p.zpid] = await rentFor(p);
    console.log(`  ${p.zpid} ${p.street}: $${byZpid[p.zpid].rent}/mo (${byZpid[p.zpid].low}-${byZpid[p.zpid].high}, ${byZpid[p.zpid].comps} comps)`);
  } catch (e) {
    failures.push({ zpid: p.zpid, street: p.street, error: String(e) });
    console.log(`  ${p.zpid} ${p.street}: FAILED — ${e}`);
  }
  await sleep(300); // be polite to the API
}

const out = {
  _source: "RentCast long-term rent AVM (api.rentcast.io). Per-property estimate; cached at build time.",
  asOf: new Date().toISOString().slice(0, 10),
  byZpid,
};
writeFileSync(join(root, "data", "rentcast.json"), JSON.stringify(out, null, 2) + "\n");
const fetched = Object.keys(byZpid).length - startCount;
console.log(`\nFetched ${fetched} new (had ${startCount}); ${Object.keys(byZpid).length}/${raw.length} cached to data/rentcast.json` + (failures.length ? ` (${failures.length} failed)` : ""));
