// Pulls REAL macro data from FRED (Federal Reserve Economic Data, St. Louis Fed)
// — free, public, no API key — to anchor the analysis math and the educational
// section in actual economic conditions. Re-run to refresh:
//
//   node scripts/build-market.mjs
//
// Series:
//   MORTGAGE30US     30-yr fixed mortgage rate (Freddie Mac PMMS), weekly
//   FEDFUNDS         Effective federal funds rate, monthly
//   ATNHPIUS12420Q   Austin–Round Rock–San Marcos home price index, quarterly
//   CSUSHPINSA       S&P CoreLogic Case-Shiller U.S. national HPI, monthly

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SERIES = [
  { key: "mortgage30", id: "MORTGAGE30US", perYear: 52, kind: "rate", label: "30-yr fixed mortgage rate" },
  { key: "fedFunds", id: "FEDFUNDS", perYear: 12, kind: "rate", label: "Federal funds rate" },
  { key: "austinHPI", id: "ATNHPIUS12420Q", perYear: 4, kind: "index", label: "Austin home price index" },
  { key: "nationalHPI", id: "CSUSHPINSA", perYear: 12, kind: "index", label: "U.S. national home price index" },
];

async function fetchSeries(id) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`;
  const csv = await fetch(url).then((r) => r.text());
  return csv
    .trim()
    .split("\n")
    .slice(1)
    .map((l) => l.split(","))
    .map(([date, v]) => ({ date, value: parseFloat(v) }))
    .filter((r) => Number.isFinite(r.value));
}

function valueAround(rows, targetMs) {
  let best = rows[0];
  let bestDiff = Infinity;
  for (const r of rows) {
    const d = Math.abs(new Date(r.date).getTime() - targetMs);
    if (d < bestDiff) { bestDiff = d; best = r; }
  }
  return best;
}

const out = { _source: "Federal Reserve Economic Data (FRED), Federal Reserve Bank of St. Louis", _note: "Public series, no API key. Re-run scripts/build-market.mjs to refresh." };

for (const s of SERIES) {
  const rows = await fetchSeries(s.id);
  const latest = rows[rows.length - 1];
  const oneYearAgoMs = new Date(latest.date).getTime() - 365 * 24 * 3600 * 1000;
  const prior = valueAround(rows, oneYearAgoMs);
  const round1 = (n) => Math.round(n * 10) / 10;
  out[s.key] = {
    seriesId: s.id,
    label: s.label,
    asOf: latest.date,
    value: latest.value,
    yearAgoDate: prior.date,
    yearAgoValue: prior.value,
    // rates: change in percentage points; indexes: year-over-year %
    change:
      s.kind === "rate"
        ? round1(latest.value - prior.value)
        : round1(((latest.value - prior.value) / prior.value) * 100),
    changeUnit: s.kind === "rate" ? "pts" : "pct",
  };
}

writeFileSync(join(__dirname, "..", "data", "market.json"), JSON.stringify(out, null, 2) + "\n");
console.log("Wrote data/market.json:");
console.log(JSON.stringify(out, null, 2));
