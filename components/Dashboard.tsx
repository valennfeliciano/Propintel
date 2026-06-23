"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Property, AnalysisResult } from "@/lib/types";
import type { NeighborhoodSummary } from "@/lib/data";
import type { MarketData } from "@/lib/market";
import { usdCompact } from "@/lib/format";
import { useLang, LanguageToggle } from "./LanguageProvider";
import { useFavorites } from "./FavoritesProvider";
import PropertyCard from "./PropertyCard";
import AnalysisPanel from "./AnalysisPanel";
import MarketSection from "./MarketSection";
import MethodologySection from "./MethodologySection";
import ListingsMap, { type MapPoint } from "./ListingsMap";

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
  market,
  mapPoints,
}: {
  properties: Property[];
  neighborhoods: NeighborhoodSummary[];
  stats: DashboardStats;
  market: MarketData;
  mapPoints: MapPoint[];
}) {
  const { t } = useLang();
  const { count: favCount, isFavorite } = useFavorites();
  const [activeHood, setActiveHood] = useState<string>("All");
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("featured");
  const [view, setView] = useState<"grid" | "map">("grid");
  const [search, setSearch] = useState("");
  const [hideControls, setHideControls] = useState(false);

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

  // Auto-hide the (tall) filter bar on scroll-down; reveal on scroll-up, near
  // the top, or when the mouse approaches the top edge. Keeps listings visible
  // while scrolling (especially on mobile) without losing the filters.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 160) setHideControls(false);
      else if (y > lastY + 8) setHideControls(true);
      else if (y < lastY - 8) setHideControls(false);
      lastY = y;
    };
    const onMove = (e: MouseEvent) => {
      if (e.clientY < 90) setHideControls(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  const q = search.trim().toLowerCase();
  const matchesSearch = (p: Property) =>
    `${p.address} ${p.neighborhood} ${p.city} ${p.state} ${p.zip}`.toLowerCase().includes(q);
  const filtered = properties
    .filter((p) => {
      if (savedOnly) return isFavorite(p.id) && (!q || matchesSearch(p));
      if (q) return matchesSearch(p);
      return activeHood === "All" || p.neighborhood === activeHood;
    })
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
  const visibleIds = new Set(filtered.map((p) => p.id));

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
      <div
        className={`sticky top-0 z-20 border-b border-slate-200 bg-background/85 backdrop-blur transition-transform duration-300 ease-out ${
          hideControls ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="mx-auto w-full max-w-6xl px-5 py-3">
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-slate-400" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSavedOnly(false);
              }}
              placeholder={t("search.placeholder")}
              aria-label={t("search.placeholder")}
              className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label={t("search.clear")}
                className="flex-none rounded p-1 text-slate-400 transition-colors hover:text-slate-700"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {/* Row 1: scope + view/sort (compact, always one line) */}
          <div className="flex items-center gap-2">
            <FilterPill
              label={`${t("controls.all")} (${stats.total})`}
              active={!savedOnly && activeHood === "All"}
              onClick={() => {
                setActiveHood("All");
                setSavedOnly(false);
              }}
            />
            <button
              onClick={() => setSavedOnly(true)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                savedOnly ? "bg-rose-500 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
              </svg>
              {t("controls.saved")} ({favCount})
            </button>
            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
                {(["grid", "map"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      view === v ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {t(`view.${v}`)}
                  </button>
                ))}
              </div>
              {view === "grid" && (
                <div className="hidden items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 sm:flex">
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
              )}
            </div>
          </div>
          {/* Row 2: neighborhoods in a single horizontal-scroll strip (keeps the
              bar compact — no more wall of pills covering the listings) */}
          <div className="mt-2 -mx-5 flex gap-2 overflow-x-auto px-5 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {neighborhoods.map((n) => (
              <FilterPill
                key={n.name}
                label={`${n.name} (${n.count})`}
                active={!savedOnly && activeHood === n.name}
                onClick={() => {
                  setActiveHood(n.name);
                  setSavedOnly(false);
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-6">
        <p className="mb-4 text-sm text-slate-500">
          {t("controls.showing", {
            n: filtered.length,
            scope: q
              ? t("controls.scope.search", { q: search.trim() })
              : savedOnly
                ? t("controls.scope.saved")
                : activeHood === "All"
                  ? t("controls.scope.all")
                  : t("controls.scope.in", { name: activeHood }),
          })}
        </p>
        {view === "map" ? (
          <ListingsMap
            points={mapPoints.filter((mp) => visibleIds.has(mp.id))}
            onSelect={(id) => {
              const p = properties.find((x) => x.id === id);
              if (p) analyze(p);
            }}
          />
        ) : (savedOnly || q) && filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300" aria-hidden>
              {q ? (
                <>
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </>
              ) : (
                <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
              )}
            </svg>
            <p className="text-sm font-medium text-slate-600">{q ? t("search.emptyTitle") : t("saved.emptyTitle")}</p>
            <p className="max-w-xs text-xs text-slate-400">{q ? t("search.emptyBody") : t("saved.emptyBody")}</p>
          </div>
        ) : (
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
        )}
      </main>

      <MarketSection market={market} />
      <MethodologySection />

      {/* Full-page property view */}
      {panelProp && (
        <div
          className={`fixed inset-0 z-50 bg-white transition-opacity duration-200 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Property analysis"
        >
          {error ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
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
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-emerald-600 text-white"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}
