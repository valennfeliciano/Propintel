"use client";

import Image from "next/image";
import type { Property } from "@/lib/types";
import { usdCompact, num } from "@/lib/format";
import { useLang } from "./LanguageProvider";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-sm font-semibold text-slate-900">{value}</span>
      <span className="text-[11px] uppercase tracking-wide text-slate-400">{label}</span>
    </div>
  );
}

export default function PropertyCard({
  property,
  onAnalyze,
  isActive,
}: {
  property: Property;
  onAnalyze: (p: Property) => void;
  isActive: boolean;
}) {
  const { t } = useLang();
  const ppsf = property.price / property.sqft;
  const deltaPct =
    ((ppsf - property.neighborhoodAvgPricePerSqft) /
      property.neighborhoodAvgPricePerSqft) *
    100;
  const below = deltaPct < 0;

  return (
    <article
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-200/60 ${
        isActive ? "border-emerald-400 ring-2 ring-emerald-200" : "border-slate-200"
      }`}
    >
      <div className="relative h-44 w-full overflow-hidden bg-slate-100">
        <Image
          src={property.imageUrl}
          alt={property.address}
          fill
          sizes="(max-width: 768px) 100vw, 360px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          unoptimized
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
            {property.neighborhood}
          </span>
        </div>
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 backdrop-blur">
          {property.propertyType}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-mono text-xl font-bold text-slate-900">
              {usdCompact(property.price)}
            </span>
            <span
              className={`rounded-md px-2 py-0.5 text-xs font-semibold ${
                below ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
              }`}
              title={`$${Math.round(ppsf)}/sqft vs $${property.neighborhoodAvgPricePerSqft}/sqft area avg`}
            >
              {below ? "▼" : "▲"} {Math.abs(deltaPct).toFixed(0)}% {t("card.vsComps")}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-medium text-slate-700">
            {property.address}
          </p>
          <p className="text-xs text-slate-400">
            {property.city}, {property.state} {property.zip}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 border-t border-slate-100 pt-3">
          <Stat label={t("card.beds")} value={String(property.beds)} />
          <Stat label={t("card.baths")} value={String(property.baths)} />
          <Stat label={t("card.sqft")} value={num(property.sqft)} />
          <Stat label={t("card.built")} value={property.yearBuilt ? String(property.yearBuilt) : "—"} />
        </div>

        <button
          onClick={() => onAnalyze(property)}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 3v4M3 5h4M6 17v4M4 19h4M13 3l2.5 6.5L22 12l-6.5 2.5L13 21l-2.5-6.5L4 12l6.5-2.5L13 3z" />
          </svg>
          {t("card.analyze")}
        </button>
      </div>
    </article>
  );
}
