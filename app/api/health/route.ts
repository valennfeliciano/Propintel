import { NextResponse } from "next/server";
import snapshot from "@/data/market.json";

// Health check endpoint — used by monitoring tools and uptime checks.
// Returns build metadata and FRED snapshot freshness so that alerting
// systems can distinguish "app is up but FRED is stale" from a real outage.

export const dynamic = "force-dynamic"; // always a fresh response, never cached

export async function GET(req: Request) {
  const snap = snapshot as { mortgage30?: { asOf?: string }; _source?: string };

  // Fast-path for cron warm-pings: skip the outbound FRED probe so the
  // keep-warm request resolves in <10 ms instead of up to 4 s.
  // The Vercel cron scheduler sets Authorization: Bearer <CRON_SECRET>.
  const isCronPing =
    req.headers.get("authorization") ===
    `Bearer ${process.env.CRON_SECRET ?? ""}`;

  if (isCronPing) {
    return NextResponse.json(
      { status: "ok", warm: true, timestamp: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  }

  // Probe FRED reachability with a lightweight HEAD request (no body to parse).
  let fredReachable = false;
  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 4000);
    const res = await fetch(
      "https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US",
      { method: "HEAD", signal: ctrl.signal }
    );
    clearTimeout(timeout);
    fredReachable = res.ok;
  } catch {
    fredReachable = false;
  }

  const body = {
    status: "ok",
    timestamp: new Date().toISOString(),
    fred: {
      reachable: fredReachable,
      snapshotAsOf: snap.mortgage30?.asOf ?? null,
    },
    build: {
      nodeVersion: process.version,
    },
  };

  return NextResponse.json(body, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
