import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

import { getAllProperties, getPropertyById } from "@/lib/data";
import { analyzeProperty } from "@/lib/analysisService";
import { getMarket } from "@/lib/market";
import { usd, usdCompact, scoreTone, recTone } from "@/lib/format";
import PropertyMap from "@/components/PropertyMap";
import PhotoCarousel from "@/components/PhotoCarousel";
import ShareButton from "@/components/ShareButton";

const BASE_URL = "https://property-intelligence-nu.vercel.app";

// Pre-build all 50 property pages at deploy time.
export function generateStaticParams() {
  return getAllProperties().map((p) => ({ id: p.id }));
}

// Revalidate weekly — property listings change infrequently; fresh FRED rates
// keep the math current without hammering the API.
export const revalidate = 604800;

// ---------------------------------------------------------------------------
// Dynamic per-property metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const property = getPropertyById(id);
  if (!property) return { title: "Property not found" };

  const market = await getMarket();
  const analysis = await analyzeProperty(property, market.mortgage30.value);
  const m = analysis.metrics;

  const title = `${property.address} – Investment Analysis`;
  const description =
    `${property.beds}bd/${property.baths}ba ${property.propertyType.toLowerCase()} in ` +
    `${property.neighborhood}, Austin TX. Listed at ${usd(property.price)}. ` +
    `Cap rate ${m.capRatePct}%, est. cash flow ${usdCompact(m.estMonthlyCashFlow)}/mo. ` +
    `Verdict: ${analysis.recommendation}.`;

  const canonicalUrl = `${BASE_URL}/property/${id}`;
  const ogImage = property.imageUrl || `${BASE_URL}/og-image.png`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      url: canonicalUrl,
      siteName: "PropIntel",
      title: `${title} | PropIntel`,
      description,
      locale: "en_US",
      images: [{ url: ogImage, width: 960, height: 640, alt: `Photo of ${property.address}` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | PropIntel`,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
  };
}

// ---------------------------------------------------------------------------
// Server-only sub-components (no "use client")
// ---------------------------------------------------------------------------

function ScoreBar({ label, score }: { label: string; score: number }) {
  const tone = scoreTone(score);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <span className={`font-mono text-sm font-bold ${tone.text}`}>{score}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  good,
}: {
  label: string;
  value: string;
  hint?: string;
  good?: boolean | null;
}) {
  const tone = good == null ? "text-slate-900" : good ? "text-emerald-700" : "text-rose-700";
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <div className={`font-mono text-base font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = getPropertyById(id);
  if (!property) notFound();

  const market = await getMarket();
  const rate = market.mortgage30.value;

  // Main analysis — awaited (analyzeProperty is async).
  const analysis = await analyzeProperty(property, rate);
  const m = analysis.metrics;
  const rec = recTone(analysis.recommendation);

  // Similar properties: same neighborhood, up to 3, excluding self.
  // Pre-compute analyses in parallel so the page renders in one server pass.
  const allProperties = getAllProperties();
  const similarProperties = allProperties
    .filter((p) => p.neighborhood === property.neighborhood && p.id !== property.id)
    .slice(0, 3);

  const similarWithAnalysis = await Promise.all(
    similarProperties.map(async (p) => {
      const simAnalysis = await analyzeProperty(p, rate);
      const ppsf = p.price / p.sqft;
      const deltaPct =
        ((ppsf - p.neighborhoodAvgPricePerSqft) / p.neighborhoodAvgPricePerSqft) * 100;
      return { property: p, analysis: simAnalysis, deltaPct };
    }),
  );

  const facts: [string, string][] = [
    ["Beds", String(property.beds)],
    ["Baths", String(property.baths)],
    ["Sqft", property.sqft.toLocaleString()],
    ["Built", property.yearBuilt ? String(property.yearBuilt) : "—"],
  ];
  if (property.lotSqft > 0) facts.push(["Lot", `${property.lotSqft.toLocaleString()} sqft`]);

  const canonicalUrl = `${BASE_URL}/property/${id}`;

  // JSON-LD: RealEstateListing schema
  const realEstateJsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.address,
    description: analysis.summary,
    url: canonicalUrl,
    image: property.photos.length > 0 ? property.photos : [property.imageUrl],
    datePosted: new Date().toISOString().split("T")[0],
    offers: { "@type": "Offer", price: property.price, priceCurrency: "USD", availability: "https://schema.org/InStock" },
    address: {
      "@type": "PostalAddress",
      streetAddress: property.address,
      addressLocality: property.city,
      addressRegion: property.state,
      postalCode: property.zip,
      addressCountry: "US",
    },
    numberOfRooms: property.beds + property.baths,
    floorSize: { "@type": "QuantitativeValue", value: property.sqft, unitCode: "SqFt" },
    yearBuilt: property.yearBuilt || undefined,
    additionalProperty: [
      { "@type": "PropertyValue", name: "Cap Rate", value: `${m.capRatePct}%` },
      { "@type": "PropertyValue", name: "Estimated Monthly Cash Flow", value: usdCompact(m.estMonthlyCashFlow) },
      { "@type": "PropertyValue", name: "Price per Sqft", value: `$${m.pricePerSqft}` },
      { "@type": "PropertyValue", name: "Overall Score", value: String(analysis.overallScore) },
      { "@type": "PropertyValue", name: "Recommendation", value: analysis.recommendation },
    ],
  };

  // JSON-LD: BreadcrumbList schema
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "PropIntel", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: property.neighborhood, item: `${BASE_URL}/?neighborhood=${encodeURIComponent(property.neighborhood)}` },
      { "@type": "ListItem", position: 3, name: property.address, item: canonicalUrl },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(realEstateJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="flex min-h-screen flex-col bg-white">
        {/* Sticky top nav + breadcrumb */}
        <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M15 18l-6-6 6-6" />
              </svg>
              All properties
            </Link>
            <nav aria-label="Breadcrumb" className="hidden items-center gap-1.5 text-xs text-slate-400 md:flex">
              <Link href="/" className="hover:text-slate-700">PropIntel</Link>
              <span aria-hidden="true">/</span>
              <span className="text-slate-600">{property.neighborhood}</span>
              <span aria-hidden="true">/</span>
              <span className="max-w-[220px] truncate font-medium text-slate-900">{property.address}</span>
            </nav>
            <span className="hidden flex-none font-mono text-sm font-bold text-slate-900 md:block">
              {usd(property.price)}
            </span>
          </div>
        </header>

        {/* Hero gallery */}
        <div className="mx-auto w-full max-w-6xl sm:px-5 sm:pt-5">
          <div className="overflow-hidden sm:rounded-2xl">
            <PhotoCarousel photos={property.photos} alt={property.address} />
          </div>
        </div>

        {/* Address + facts bar */}
        <div className="mx-auto w-full max-w-6xl px-5 pt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
            {property.neighborhood} · {property.propertyType}
          </p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">{property.address}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {property.city}, {property.state} {property.zip}
              </p>
            </div>
            <div className="font-mono text-2xl font-bold text-slate-900 sm:text-3xl">{usd(property.price)}</div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-y border-slate-100 py-3 text-sm">
            {facts.map(([label, value]) => (
              <div key={label}>
                <span className="font-mono font-semibold text-slate-900">{value}</span>{" "}
                <span className="text-slate-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Main analysis grid */}
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-8 lg:grid-cols-3">
          {/* LEFT — detailed analysis */}
          <div className="space-y-7 lg:col-span-2">
            <p className="text-[15px] leading-relaxed text-slate-600">{analysis.summary}</p>

            <div className="space-y-4">
              <ScoreBar label="Value score" score={analysis.scoreValue} />
              <ScoreBar label="Opportunity score" score={analysis.scoreOpportunity} />
            </div>

            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Underwriting</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Metric label="Price/sqft" value={`$${m.pricePerSqft}`} hint={`${m.pricePerSqftDeltaPct > 0 ? "+" : ""}${m.pricePerSqftDeltaPct}% vs avg`} good={m.pricePerSqftDeltaPct <= 0} />
                <Metric label="Cap rate" value={`${m.capRatePct}%`} good={m.capRatePct >= 4} />
                <Metric label="Rent/price" value={`${m.rentToPricePct}%`} good={m.rentToPricePct >= 0.6} />
                <Metric label="GRM" value={`${m.grossRentMultiplier}`} />
                <Metric label="Cash flow/mo" value={`${usdCompact(m.estMonthlyCashFlow)}/mo`} good={m.estMonthlyCashFlow >= 0} />
                <Metric label="Age" value={m.ageYears != null ? `${m.ageYears} yrs` : "—"} good={m.ageYears != null ? m.ageYears <= 30 : null} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-700">Rent estimate</div>
                  <div className="text-[11px] text-slate-400">
                    Per-property ({property.rentSource === "rentcast" ? "RentCast" : property.rentSource === "zillow" ? "Zillow" : "modeled"})
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-lg font-bold text-emerald-700">{usd(property.estimatedRent)}/mo</div>
                  {property.rentLow != null && property.rentHigh != null && (
                    <div className="font-mono text-[11px] text-slate-400">{usd(property.rentLow)}–{usd(property.rentHigh)}</div>
                  )}
                </div>
              </div>
              {property.areaRent != null && (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-700">Typical area rent</div>
                    <div className="text-[11px] text-slate-400">
                      Zillow ZORI{property.areaRentAsOf ? ` · ${new Date(property.areaRentAsOf).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}
                    </div>
                  </div>
                  <div className="font-mono text-lg font-bold text-slate-700">{usd(property.areaRent!)}/mo</div>
                </div>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {analysis.highlights.length > 0 && (
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">Highlights</h2>
                  <ul className="space-y-2">
                    {analysis.highlights.map((h, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 text-emerald-500">✓</span>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.riskFactors.length > 0 && (
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">Risk factors</h2>
                  <ul className="space-y-2">
                    {analysis.riskFactors.map((r, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 text-amber-500">!</span>
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Action plan</h2>
              <ol className="space-y-2">
                {analysis.actionPlan.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-700">
                    <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {property.description && (
              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">From the listing</h2>
                <p className="text-sm leading-relaxed text-slate-600">{property.description}</p>
                <p className="mt-2 text-[11px] text-slate-400">
                  Listing prose is scraped verbatim from Zillow and may not reflect the current state of the property.
                </p>
              </div>
            )}

            <div>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Location</h2>
              <PropertyMap
                query={`${property.address}, ${property.city}, ${property.state} ${property.zip}`}
                title={`Map of ${property.address}`}
                className="h-72"
              />
            </div>

            <div className="space-y-1 border-t border-slate-100 pt-4">
              <p className="font-mono text-[11px] text-slate-400">Engine: {analysis.generatedBy}</p>
              <p className="max-w-[72ch] text-[11px] leading-relaxed text-slate-400">
                Analysis is algorithmic and for informational purposes only. It does not constitute financial, legal, or real-estate advice. Verify all data independently before making investment decisions.
              </p>
            </div>
          </div>

          {/* RIGHT — sticky deal snapshot sidebar */}
          <aside className="lg:col-span-1">
            <div className="space-y-4 lg:sticky lg:top-20">
              <div className="rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 ring-1 ${rec.bg} ${rec.ring}`}>
                  <span className={`flex items-center gap-2 text-base font-bold ${rec.text}`}>
                    <span className={`h-2.5 w-2.5 rounded-full ${rec.dot}`} />
                    {analysis.recommendation}
                  </span>
                  <span>
                    <span className="font-mono text-2xl font-bold text-slate-900">{analysis.overallScore}</span>
                    <span className="ml-1 text-xs text-slate-400">/100</span>
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {(
                    [
                      ["Cap rate", `${m.capRatePct}%`],
                      ["Cash flow", usdCompact(m.estMonthlyCashFlow)],
                      ["Rent est.", usdCompact(property.estimatedRent)],
                    ] as [string, string][]
                  ).map(([label, value]) => (
                    <div key={label} className="rounded-lg bg-slate-50 px-1 py-2">
                      <div className="font-mono text-sm font-bold text-slate-900">{value}</div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
                    </div>
                  ))}
                </dl>

                <a
                  href={property.detailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
                >
                  View listing on Zillow
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>

                <div className="mt-2 flex gap-2">
                  <a href={property.zillowSearchUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">
                    Comps
                  </a>
                  <a href={property.mapUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">
                    Map
                  </a>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  {property.contact?.agent ? (
                    <p className="text-sm text-slate-700">
                      Listed by <span className="font-semibold">{property.contact.agent}</span>
                      {property.contact.broker ? `, ${property.contact.broker}` : ""}
                      {property.contact.agentPhone && (
                        <> · <a href={`tel:${property.contact.agentPhone}`} className="font-medium text-emerald-700 hover:underline">{property.contact.agentPhone}</a></>
                      )}
                    </p>
                  ) : (
                    <p className="text-xs leading-relaxed text-slate-500">Contact details available on the Zillow listing page.</p>
                  )}
                </div>
              </div>

              {/* Share button — client island (clipboard / navigator.share) */}
              <ShareButton url={canonicalUrl} address={property.address} />
            </div>
          </aside>
        </div>

        {/* Similar properties in the same neighborhood */}
        {similarWithAnalysis.length > 0 && (
          <section className="border-t border-slate-100 bg-slate-50/50 px-5 py-10">
            <div className="mx-auto max-w-6xl">
              <h2 className="mb-5 text-base font-semibold text-slate-900">More in {property.neighborhood}</h2>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {similarWithAnalysis.map(({ property: p, analysis: simAnalysis, deltaPct }) => {
                  const simRec = recTone(simAnalysis.recommendation);
                  const below = deltaPct < 0;
                  return (
                    <Link
                      key={p.id}
                      href={`/property/${p.id}`}
                      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-slate-200/60"
                    >
                      <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                        <Image
                          src={p.imageUrl}
                          alt={p.address}
                          fill
                          sizes="(max-width: 768px) 100vw, 360px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          unoptimized
                          loading="lazy"
                        />
                        <div className={`absolute left-3 top-3 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${simRec.bg} ${simRec.ring} ${simRec.text}`}>
                          {simAnalysis.recommendation}
                        </div>
                      </div>
                      <div className="flex flex-1 flex-col gap-3 p-4">
                        <div>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="font-mono text-lg font-bold text-slate-900">{usdCompact(p.price)}</span>
                            <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${below ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                              {below ? "▼" : "▲"} {Math.abs(deltaPct).toFixed(0)}% vs comps
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm font-medium text-slate-700">{p.address}</p>
                          <p className="text-xs text-slate-400">{p.beds}bd · {p.baths}ba · {p.sqft.toLocaleString()} sqft</p>
                        </div>
                        <span className="mt-auto text-xs font-medium text-emerald-700 group-hover:underline">View analysis →</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
              <div className="mt-6 text-center">
                <Link href="/" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                  View all 50 properties
                </Link>
              </div>
            </div>
          </section>
        )}

        <footer className="border-t border-slate-100 bg-slate-50 px-5 py-6 text-center text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} PropIntel · Data sourced from Zillow and FRED · For informational purposes only</p>
        </footer>
      </div>
    </>
  );
}
