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
  const analysis = analyzeProperty(property, market.mortgage30.value);
  return NextResponse.json(analysis);
}
