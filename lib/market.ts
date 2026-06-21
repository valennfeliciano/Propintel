import fallback from "@/data/market.json";

// Live macro data from FRED, revalidated daily (Next.js ISR). The committed
// data/market.json is the build-time snapshot AND the runtime fallback if FRED
// is unreachable, so the site (and the math) never breaks.

export interface MarketSeries {
  seriesId: string;
  label: string;
  asOf: string;
  value: number;
  yearAgoDate: string;
  yearAgoValue: number;
  change: number;
  changeUnit: string;
}

export interface MarketData {
  _source: string;
  _note: string;
  _live?: boolean;
  mortgage30: MarketSeries;
  fedFunds: MarketSeries;
  austinHPI: MarketSeries;
  nationalHPI: MarketSeries;
}

const SERIES = [
  { key: "mortgage30", id: "MORTGAGE30US", kind: "rate", label: "30-yr fixed mortgage rate" },
  { key: "fedFunds", id: "FEDFUNDS", kind: "rate", label: "Federal funds rate" },
  { key: "austinHPI", id: "ATNHPIUS12420Q", kind: "index", label: "Austin home price index" },
  { key: "nationalHPI", id: "CSUSHPINSA", kind: "index", label: "U.S. national home price index" },
] as const;

const REVALIDATE_SECONDS = 60 * 60 * 24; // daily

async function fetchSeries(id: string): Promise<{ date: string; value: number }[]> {
  const res = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) throw new Error(`FRED ${id} ${res.status}`);
  const csv = await res.text();
  return csv
    .trim()
    .split("\n")
    .slice(1)
    .map((l) => l.split(","))
    .map(([date, v]) => ({ date, value: parseFloat(v) }))
    .filter((r) => Number.isFinite(r.value));
}

function valueAround(rows: { date: string; value: number }[], targetMs: number) {
  let best = rows[0];
  let bestDiff = Infinity;
  for (const r of rows) {
    const d = Math.abs(new Date(r.date).getTime() - targetMs);
    if (d < bestDiff) { bestDiff = d; best = r; }
  }
  return best;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Live FRED data (cached 24h). Falls back to the committed snapshot on any error. */
export async function getMarket(): Promise<MarketData> {
  try {
    const out = {
      _source: (fallback as MarketData)._source,
      _note: "Live from FRED, revalidated daily.",
      _live: true,
    } as MarketData;
    for (const s of SERIES) {
      const rows = await fetchSeries(s.id);
      if (!rows.length) throw new Error(`empty ${s.id}`);
      const latest = rows[rows.length - 1];
      const prior = valueAround(rows, new Date(latest.date).getTime() - 365 * 24 * 3600 * 1000);
      out[s.key] = {
        seriesId: s.id,
        label: s.label,
        asOf: latest.date,
        value: latest.value,
        yearAgoDate: prior.date,
        yearAgoValue: prior.value,
        change: s.kind === "rate" ? r1(latest.value - prior.value) : r1(((latest.value - prior.value) / prior.value) * 100),
        changeUnit: s.kind === "rate" ? "pts" : "pct",
      };
    }
    return out;
  } catch {
    return { ...(fallback as MarketData), _live: false };
  }
}
