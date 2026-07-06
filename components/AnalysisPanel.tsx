"use client";

import type { Property, AnalysisResult } from "@/lib/types";
import { usd, usdCompact, scoreTone, recTone } from "@/lib/format";
import { useLang } from "./LanguageProvider";
import { HeartButton } from "./FavoritesProvider";
import PhotoCarousel from "./PhotoCarousel";
import PropertyMap from "./PropertyMap";
import ScoreGauge from "./ScoreGauge";

function ScoreBar({ label, score }: { label: string; score: number }) {
  const tone = scoreTone(score);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
        <span className={`font-mono text-sm font-bold ${tone.text}`}>{score}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${tone.bar} transition-[width] duration-700 ease-out`}
          style={{ width: `${score}%` }}
        />
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

function Skeleton() {
  const { t } = useLang();
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
      <div className="h-20 rounded-xl bg-slate-100" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-slate-100" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-slate-100" style={{ width: `${90 - i * 8}%` }} />
        ))}
      </div>
      <p className="text-center text-sm text-slate-400">{t("panel.analyzing")}</p>
    </div>
  );
}

export default function AnalysisPanel({
  property,
  analysis,
  loading,
  onClose,
}: {
  property: Property;
  analysis: AnalysisResult | null;
  loading: boolean;
  onClose: () => void;
}) {
  const { t } = useLang();
  const m = analysis?.metrics;
  const rec = analysis ? recTone(analysis.recommendation) : null;

  const facts: [string, string][] = [
    [t("card.beds"), String(property.beds)],
    [t("card.baths"), String(property.baths)],
    [t("card.sqft"), property.sqft.toLocaleString()],
    [t("card.built"), property.yearBuilt ? String(property.yearBuilt) : "—"],
  ];
  if (property.lotSqft > 0) facts.push(["Lot", `${property.lotSqft.toLocaleString()} sqft`]);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {t("panel.back")}
          </button>
          <div className="hidden min-w-0 flex-1 items-baseline justify-center gap-2 truncate md:flex">
            <span className="truncate text-sm font-semibold text-slate-900">{property.address}</span>
            <span className="flex-none font-mono text-sm text-slate-500">{usd(property.price)}</span>
          </div>
          <HeartButton id={property.id} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Hero gallery */}
        <div className="mx-auto max-w-6xl sm:px-5 sm:pt-5">
          <div className="overflow-hidden sm:rounded-2xl">
            <PhotoCarousel photos={property.photos} alt={property.address} />
          </div>
        </div>

        {/* Title + facts */}
        <div className="mx-auto max-w-6xl px-5 pt-6">
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

        {loading || !analysis || !m ? (
          <Skeleton />
        ) : (
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-3">
            {/* LEFT — full analysis + details */}
            <div className="space-y-7 lg:col-span-2">
              <p className="text-[15px] leading-relaxed text-slate-600">{analysis.summary}</p>

              {/* Scores */}
              <div className="space-y-4">
                <ScoreBar label={t("panel.value")} score={analysis.scoreValue} />
                <ScoreBar label={t("panel.opportunity")} score={analysis.scoreOpportunity} />
              </div>

              {/* Underwriting */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("panel.underwriting")}</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Metric
                    label={t("metric.ppsf")}
                    value={`$${m.pricePerSqft}`}
                    hint={t("metric.vsAvg", { v: `${m.pricePerSqftDeltaPct > 0 ? "+" : ""}${m.pricePerSqftDeltaPct}` })}
                    good={m.pricePerSqftDeltaPct <= 0}
                  />
                  <Metric label={t("metric.cap")} value={`${m.capRatePct}%`} good={m.capRatePct >= 4} />
                  <Metric label={t("metric.rent")} value={`${m.rentToPricePct}%`} good={m.rentToPricePct >= 0.6} />
                  <Metric label={t("metric.grm")} value={`${m.grossRentMultiplier}`} />
                  <Metric label={t("metric.cashflow")} value={`${usdCompact(m.estMonthlyCashFlow)}/mo`} good={m.estMonthlyCashFlow >= 0} />
                  <Metric
                    label={t("metric.age")}
                    value={m.ageYears != null ? `${m.ageYears} yrs` : "—"}
                    good={m.ageYears != null ? m.ageYears <= 30 : null}
                  />
                </div>
              </div>

              {/* Rent: per-property (RentCast) + area (ZORI) */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-700">{t("panel.rentEst")}</div>
                    <div className="text-[11px] text-slate-400">{t("panel.rentEstSrc")}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-bold text-emerald-700">{usd(property.estimatedRent)}/mo</div>
                    {property.rentLow != null && property.rentHigh != null && (
                      <div className="font-mono text-[11px] text-slate-400">
                        {usd(property.rentLow)}–{usd(property.rentHigh)}
                      </div>
                    )}
                  </div>
                </div>
                {property.areaRent != null && (
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-slate-700">{t("panel.areaRent")}</div>
                      <div className="text-[11px] text-slate-400">
                        {t("panel.areaRentSrc", {
                          date: property.areaRentAsOf
                            ? new Date(property.areaRentAsOf).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                            : "",
                        })}
                      </div>
                    </div>
                    <div className="font-mono text-lg font-bold text-slate-700">{usd(property.areaRent)}/mo</div>
                  </div>
                )}
              </div>

              {/* Highlights + Risks */}
              <div className="grid gap-6 sm:grid-cols-2">
                {analysis.highlights.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">{t("panel.highlights")}</h3>
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
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">{t("panel.risks")}</h3>
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

              {/* Action plan */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("panel.actionPlan")}</h3>
                <ol className="space-y-2">
                  {analysis.actionPlan.map((step, i) => (
                    <li key={i} className="flex gap-3 text-sm text-slate-700">
                      <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{i + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* From the listing */}
              {property.description && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("panel.listingDesc")}</h3>
                  <p className="text-sm leading-relaxed text-slate-600">{property.description}</p>
                  <p className="mt-2 text-[11px] text-slate-400">{t("panel.listingNote")}</p>
                </div>
              )}

              {/* Location */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t("panel.location")}</h3>
                <PropertyMap
                  lat={property.lat}
                  lng={property.lng}
                  title={`Map of ${property.address}`}
                  className="h-72"
                />
              </div>

              {/* Provenance + disclaimer */}
              <div className="space-y-1 border-t border-slate-100 pt-4">
                <p className="font-mono text-[11px] text-slate-400">{t("panel.engine")}: {analysis.generatedBy}</p>
                <p className="max-w-[72ch] text-[11px] leading-relaxed text-slate-400">{t("panel.disclaimer")}</p>
              </div>
            </div>

            {/* RIGHT — sticky deal snapshot + actions */}
            <aside className="lg:col-span-1">
              <div className="space-y-4 lg:sticky lg:top-6">
                <div className="rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className={`flex items-center gap-4 rounded-xl px-4 py-4 ring-1 ${rec!.bg} ${rec!.ring}`}>
                    <ScoreGauge score={analysis.overallScore} tone={rec!} />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t("panel.dealScore")}</p>
                      <p className={`flex items-center gap-1.5 text-lg font-bold leading-tight ${rec!.text}`}>
                        <span className={`h-2 w-2 rounded-full ${rec!.dot}`} />
                        {t(`verdict.${analysis.recommendation}`)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">{t("panel.dealScoreHint")}</p>
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    {[
                      [t("metric.cap"), `${m.capRatePct}%`],
                      [t("metric.cashflow"), `${usdCompact(m.estMonthlyCashFlow)}`],
                      [t("panel.rentEst"), `${usdCompact(property.estimatedRent)}`],
                    ].map(([label, value]) => (
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
                    {t("panel.contactCta")}
                  </a>
                  <div className="mt-2 flex gap-2">
                    <a href={property.zillowSearchUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">
                      {t("panel.zillow")}
                    </a>
                    <a href={property.mapUrl} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">
                      {t("panel.map")}
                    </a>
                  </div>

                  {/* Contact */}
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    {property.contact?.agent ? (
                      <p className="text-sm text-slate-700">
                        {t("panel.listedBy")} <span className="font-semibold">{property.contact.agent}</span>
                        {property.contact.broker ? `, ${property.contact.broker}` : ""}
                        {property.contact.agentPhone && (
                          <>
                            {" · "}
                            <a href={`tel:${property.contact.agentPhone}`} className="font-medium text-emerald-700 hover:underline">
                              {property.contact.agentPhone}
                            </a>
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs leading-relaxed text-slate-500">{t("panel.contactNote")}</p>
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
