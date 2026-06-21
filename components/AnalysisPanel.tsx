import type { Property, AnalysisResult } from "@/lib/types";
import { usd, usdCompact, scoreTone, recTone } from "@/lib/format";

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
      <p className="text-center text-sm text-slate-400">Analyzing property…</p>
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
        <button
          onClick={onClose}
          aria-label="Close analysis"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {loading || !analysis || !m ? (
        <Skeleton />
      ) : (
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* Verdict */}
          <div className={`flex items-center justify-between rounded-xl px-4 py-3 ring-1 ${rec!.bg} ${rec!.ring}`}>
            <div className="flex items-center gap-2.5">
              <span className={`h-2.5 w-2.5 rounded-full ${rec!.dot}`} />
              <span className={`text-base font-bold ${rec!.text}`}>
                {analysis.recommendation}
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono text-2xl font-bold text-slate-900">
                {analysis.overallScore}
              </span>
              <span className="ml-1 text-xs text-slate-400">/100 overall</span>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-slate-600">{analysis.summary}</p>

          {/* Scores */}
          <div className="space-y-4">
            <ScoreBar label="Value (vs. comps)" score={analysis.scoreValue} />
            <ScoreBar label="Opportunity (upside)" score={analysis.scoreOpportunity} />
          </div>

          {/* Metrics */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Underwriting
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <Metric
                label="$/sqft"
                value={`$${m.pricePerSqft}`}
                hint={`${m.pricePerSqftDeltaPct > 0 ? "+" : ""}${m.pricePerSqftDeltaPct}% vs avg`}
                good={m.pricePerSqftDeltaPct <= 0}
              />
              <Metric label="Cap rate" value={`${m.capRatePct}%`} good={m.capRatePct >= 4} />
              <Metric label="Rent/price" value={`${m.rentToPricePct}%`} good={m.rentToPricePct >= 0.6} />
              <Metric label="GRM" value={`${m.grossRentMultiplier}`} />
              <Metric
                label="Est. cash flow"
                value={`${usdCompact(m.estMonthlyCashFlow)}/mo`}
                good={m.estMonthlyCashFlow >= 0}
              />
              <Metric
                label="Age"
                value={m.ageYears != null ? `${m.ageYears} yrs` : "—"}
                good={m.ageYears != null ? m.ageYears <= 30 : null}
              />
            </div>
          </div>

          {/* Highlights */}
          {analysis.highlights.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Highlights
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
                Risk factors
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
              Action plan
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

          {/* External links */}
          <div className="flex gap-2">
            <a
              href={property.zillowSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Search on Zillow ↗
            </a>
            <a
              href={property.mapUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              View on map ↗
            </a>
          </div>

          {/* Provenance + disclaimer */}
          <div className="space-y-1 border-t border-slate-100 pt-4">
            <p className="font-mono text-[11px] text-slate-400">
              engine: {analysis.generatedBy}
            </p>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Educational analysis on curated sample data — not financial advice.
              Verify all figures independently before transacting.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
