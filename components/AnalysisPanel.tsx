"use client";

import type { Property, AnalysisResult } from "@/lib/types";
import { usd, usdCompact, scoreTone, recTone } from "@/lib/format";
import { useLang } from "./LanguageProvider";
import { HeartButton } from "./FavoritesProvider";
import PhotoCarousel from "./PhotoCarousel";

function ScoreBar({ label, score }: { label: string; score: number }) {
  const tone = scoreTone(score);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </span>
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
  const tone =
    good == null ? "text-slate-900" : good ? "text-emerald-700" : "text-rose-700";
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
      <div className={`font-mono text-base font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      {hint && <div className="mt-0.5 text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
}

function Skeleton() {
  const { t } = useLang();
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-3">
        {[100, 80].map((w) => (
          <div
            key={w}
            className="relative h-4 overflow-hidden rounded bg-slate-100"
            style={{ width: `${w}%` }}
          >
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white to-transparent" />
          </div>
        ))}
      </div>
      <div className="h-24 rounded-xl bg-slate-100" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-slate-100" />
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 rounded bg-slate-100" />
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

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
            {property.neighborhood} · {property.propertyType}
          </p>
          <h2 className="text-lg font-bold text-slate-900">{property.address}</h2>
          <p className="font-mono text-sm text-slate-500">
            {usd(property.price)} · {property.beds}bd / {property.baths}ba ·{" "}
            {property.sqft.toLocaleString()} sqft
          </p>
        </div>
        <div className="flex flex-none items-center gap-1.5">
          <HeartButton id={property.id} />
          <button
            onClick={onClose}
            aria-label={t("panel.close")}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <PhotoCarousel photos={property.photos} alt={property.address} />
        {loading || !analysis || !m ? (
          <Skeleton />
        ) : (
          <div className="space-y-6 p-6">
          {/* Verdict */}
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 ring-1 ${rec!.bg} ${rec!.ring}`}>
            <div className="flex items-center gap-2.5">
              <span className={`h-2.5 w-2.5 rounded-full ${rec!.dot}`} />
              <span className={`text-base font-bold ${rec!.text}`}>
                {t(`verdict.${analysis.recommendation}`)}
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono text-2xl font-bold text-slate-900">
                {analysis.overallScore}
              </span>
              <span className="ml-1 text-xs text-slate-400">/100 {t("panel.overall")}</span>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-slate-600">{analysis.summary}</p>

          {/* Scores */}
          <div className="space-y-4">
            <ScoreBar label={t("panel.value")} score={analysis.scoreValue} />
            <ScoreBar label={t("panel.opportunity")} score={analysis.scoreOpportunity} />
          </div>

          {/* Metrics */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("panel.underwriting")}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <Metric
                label={t("metric.ppsf")}
                value={`$${m.pricePerSqft}`}
                hint={t("metric.vsAvg", { v: `${m.pricePerSqftDeltaPct > 0 ? "+" : ""}${m.pricePerSqftDeltaPct}` })}
                good={m.pricePerSqftDeltaPct <= 0}
              />
              <Metric label={t("metric.cap")} value={`${m.capRatePct}%`} good={m.capRatePct >= 4} />
              <Metric label={t("metric.rent")} value={`${m.rentToPricePct}%`} good={m.rentToPricePct >= 0.6} />
              <Metric label={t("metric.grm")} value={`${m.grossRentMultiplier}`} />
              <Metric
                label={t("metric.cashflow")}
                value={`${usdCompact(m.estMonthlyCashFlow)}/mo`}
                good={m.estMonthlyCashFlow >= 0}
              />
              <Metric
                label={t("metric.age")}
                value={m.ageYears != null ? `${m.ageYears} yrs` : "—"}
                good={m.ageYears != null ? m.ageYears <= 30 : null}
              />
            </div>
          </div>

          {/* Real area rent (Zillow ZORI) */}
          {property.areaRent != null && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-3">
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
              <div className="font-mono text-lg font-bold text-emerald-700">{usd(property.areaRent)}/mo</div>
            </div>
          )}

          {/* Highlights */}
          {analysis.highlights.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                {t("panel.highlights")}
              </h3>
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

          {/* Risks */}
          {analysis.riskFactors.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">
                {t("panel.risks")}
              </h3>
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

          {/* Action plan */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("panel.actionPlan")}
            </h3>
            <ol className="space-y-2">
              {analysis.actionPlan.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-700">
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* From the listing (verbatim Zillow copy) */}
          {property.description && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t("panel.listingDesc")}
              </h3>
              <p className="text-sm leading-relaxed text-slate-600">{property.description}</p>
              <p className="mt-2 text-[11px] text-slate-400">{t("panel.listingNote")}</p>
            </div>
          )}

          {/* External links */}
          <div className="flex gap-2">
            <a
              href={property.zillowSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {t("panel.zillow")}
            </a>
            <a
              href={property.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              {t("panel.map")}
            </a>
          </div>

          {/* Contact the people in charge of the listing */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("panel.contact")}
            </h3>
            {property.contact?.agent ? (
              <p className="text-sm text-slate-700">
                {t("panel.listedBy")}{" "}
                <span className="font-semibold">{property.contact.agent}</span>
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
            <a
              href={property.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              {t("panel.contactCta")}
            </a>
          </div>

          {/* Provenance + disclaimer */}
          <div className="space-y-1 border-t border-slate-100 pt-4">
            <p className="font-mono text-[11px] text-slate-400">
              {t("panel.engine")}: {analysis.generatedBy}
            </p>
            <p className="text-[11px] leading-relaxed text-slate-400">
              {t("panel.disclaimer")}
            </p>
          </div>
          </div>
        )}
      </div>
    </div>
  );
}
