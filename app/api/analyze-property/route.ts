import { NextResponse } from "next/server";
import { getPropertyById } from "@/lib/data";
import { analyzeProperty } from "@/lib/analysisService";
import { getMarket } from "@/lib/market";

// POST /api/analyze-property  { propertyId: string }
// Returns an AnalysisResult for the property.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const propertyId =
    body && typeof body === "object" && "propertyId" in body
      ? (body as { propertyId?: unknown }).propertyId
      : undefined;

  if (typeof propertyId !== "string" || propertyId.length === 0) {
    return NextResponse.json(
      { error: "Missing or invalid 'propertyId'." },
      { status: 400 },
    );
  }

  const property = getPropertyById(propertyId);
  if (!property) {
    return NextResponse.json(
      { error: `Property '${propertyId}' not found.` },
      { status: 404 },
    );
  }

  const market = await getMarket();
  const analysis = await analyzeProperty(property, market.mortgage30.value);

  // The analysis result for a given property is deterministic for a given
  // mortgage rate, which itself only changes daily. Cache at the CDN edge for
  // 24 hours with a 1-hour stale-while-revalidate window so returning users
  // get instant responses without waiting for the Serverless Function cold-start.
  // This is safe because property data and market rates are both ISR-refreshed
  // on the same 24-hour cadence as the home page.
  return NextResponse.json(analysis, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600",
    },
  });
}
