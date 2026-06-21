"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Property, AnalysisResult } from "@/lib/types";
import type { NeighborhoodSummary } from "@/lib/data";
import { usdCompact } from "@/lib/format";
import { useLang, LanguageToggle } from "./LanguageProvider";
import PropertyCard from "./PropertyCard";
import AnalysisPanel from "./AnalysisPanel";
import MarketSection from "./MarketSection";
import MethodologySection from "./MethodologySection";

type SortKey = "featured" | "priceAsc" | "priceDesc" | "newest";

const SORT_KEYS: SortKey[] = ["featured", "priceAsc", "priceDesc", "newest"];

export interface DashboardStats {
  total: number;
  neighborhoods: number;
  medianPrice: number;
  opportunities: number;
}

export default function Dashboard({
  properties,
  neighborhoods,
  stats,
}: {
  properties: Property[];
  neighborhoods: NeighborhoodSummary[];
  stats: DashboardStats;
}) {
  const { t } = useLang();
  const [activeHood, setActiveHood] = useState<string>("All");
  const [sort, setSort] = useState<SortKey>("featured");

  const [panelProp, setPanelProp] = useState<Property | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const reqId = useRef(0);

  const close = useCallback(() => {
    setVisible(false);
    setError(null);
    setTimeout(() => {
      setPanelProp(null);
      setAnalysis(null);
    }, 300);
  }, []);

  const analyze = useCallback(async (p: Property) => {
    const id = ++reqId.current;
    setPanelProp(p);
    setAnalysis(null);
    setError(null);
    setLoading(true);
    setVisible(true);
    try {
      // Minimum visible "analyzing" beat so the skeleton never just flickers.
      const [res] = await Promise.all([
        fetch("/api/analyze-property", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ propertyId: p.id }),
        }),
        new Promise((r) => setTimeout(r, 350)),
      ]);
      if (id !== reqId.current) return; // a newer request superseded this one
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      setAnalysis((await res.json()) as AnalysisResult);
    } catch (e) {
      if (id !== reqId.current) return;
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  // Close on Escape.
  useEffect(() => {
    if (!panelProp) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelProp, close]);

  const filtered = properties
    .filter((p) => activeHood === "All" || p.neighborhood === activeHood)
    .sort((a, b) => {
      switch (sort) {
        case "priceAsc":
          return a.price - b.price;
        case "priceDesc":
          return b.price - a.price;
        case "newest":
          return b.yearBuilt - a.yearBuilt;
        default:
          return 0;
      }
    });

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950">
        <div className="bg-grid absolute inset-0 opacity-40" />
        <div className="relative mx-auto w-full max-w-6xl px-5 py-12 sm:py-16">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-emerald-400">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6" />
              </svg>
              <span className="text-sm font-semibold uppercase tracking-widest">{t("hero.eyebrow")}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-3">
              <nav className="hidden items-center gap-1 sm:flex">
                <a href="#market" className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
                  {t("nav.market")}
                </a>
                <a href="#method" className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
                  {t("nav.method")}
                </a>
              </nav>
              <LanguageToggle />
            </div>
          </div>
          <h1 className="mt-6 max-w-2xl text-3xl font-bold leading-tight text-white sm:text-4xl">
            {t("hero.title")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            {t("hero.subtitle")}
          </p>
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t("hero.realData")}
          </p>

          <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: t("hero.stat.properties"), value: String(stats.total) },
              { label: t("hero.stat.neighborhoods"), value: String(stats.neighborhoods) },
              { label: t("hero.stat.median"), value: usdCompact(stats.medianPrice) },
              { label: t("hero.stat.opportunities"), value: String(stats.opportunities) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                <dd className="font-mono text-xl font-bold text-white">{s.value}</dd>
                <dt className="text-[11px] uppercase tracking-wide text-slate-400">{s.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* Controls */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-background/85 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <FilterPill
              label={`${t("controls.all")} (${stats.total})`}
              active={activeHood === "All"}
              onClick={() => setActiveHood("All")}
            />
            {neighborhoods.map((n) => (
              <FilterPill
                key={n.name}
                label={`${n.name} (${n.count})`}
                active={activeHood === n.name}
                onClick={() => setActiveHood(n.name)}
              />
            ))}
            <div className="ml-auto flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
              {SORT_KEYS.map((k) => (
                <button
                  key={k}
                  onClick={() => setSort(k)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    sort === k ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  {t(`sort.${k}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6">
        <p className="mb-4 text-sm text-slate-500">
          {t("controls.showing", {
            n: filtered.length,
            scope:
              activeHood === "All"
                ? t("controls.scope.all")
                : t("controls.scope.in", { name: activeHood }),
          })}
        </p>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              onAnalyze={analyze}
              isActive={panelProp?.id === p.id}
            />
          ))}
        </div>
      </main>

      <MarketSection />
      <MethodologySection />

      {/* Slide-over */}
      {panelProp && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Property analysis">
          <div
            onClick={close}
            className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300 ${
              visible ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            className={`absolute right-0 top-0 h-full w-full max-w-md overflow-hidden shadow-2xl transition-transform duration-300 ease-out ${
              visible ? "translate-x-0" : "translate-x-full"
            }`}
          >
            {error ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 bg-white p-8 text-center">
                <p className="text-sm text-rose-600">{error}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => analyze(panelProp)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                  >
                    {t("panel.retry")}
                  </button>
                  <button
                    onClick={close}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {t("panel.close")}
                  </button>
                </div>
              </div>
            ) : (
              <AnalysisPanel
                property={panelProp}
                analysis={analysis}
                loading={loading}
                onClose={close}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-emerald-600 text-white"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
