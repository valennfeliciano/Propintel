"use client";

import market from "@/data/market.json";
import { useLang } from "./LanguageProvider";
import RateExplorer from "./RateExplorer";

function fmtDate(iso: string, lang: string) {
  return new Date(iso).toLocaleDateString(lang === "es" ? "es-ES" : "en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function MarketSection() {
  const { t, lang } = useLang();
  const m = market;

  const rateChange = (s: { change: number }) =>
    `${s.change < 0 ? "↓" : "↑"} ${Math.abs(s.change)} pts`;
  const signed = (n: number) => `${n > 0 ? "+" : ""}${n}%`;

  const stats = [
    { headline: `${m.mortgage30.value}%`, sub: rateChange(m.mortgage30), asOf: m.mortgage30.asOf, label: t("market.m.mortgage"), cadence: "weekly" },
    { headline: `${m.fedFunds.value}%`, sub: rateChange(m.fedFunds), asOf: m.fedFunds.asOf, label: t("market.m.fed"), cadence: "monthly" },
    { headline: signed(m.austinHPI.change), sub: t("market.yoy", { v: "" }).trim(), asOf: m.austinHPI.asOf, label: t("market.m.austin"), cadence: "quarterly" },
    { headline: signed(m.nationalHPI.change), sub: t("market.yoy", { v: "" }).trim(), asOf: m.nationalHPI.asOf, label: t("market.m.national"), cadence: "monthly" },
  ];

  const factors = [
    { title: t("market.factors.rates.title"), body: t("market.factors.rates.body") },
    { title: t("market.factors.fed.title"), body: t("market.factors.fed.body") },
    { title: t("market.factors.prices.title"), body: t("market.factors.prices.body") },
  ];

  return (
    <section id="market" className="scroll-mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-6xl px-5 py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">{t("nav.market")}</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-bold text-slate-900 sm:text-3xl">{t("market.title")}</h2>
        <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-slate-600">{t("market.intro")}</p>

        {/* Real FRED figures */}
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white p-5">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-slate-900">{s.headline}</span>
                <span className="font-mono text-xs text-slate-400">{s.sub}</span>
              </div>
              <div className="mt-1 text-sm font-medium text-slate-700">{s.label}</div>
              <div className="mt-0.5 text-[11px] text-slate-400">
                {t("market.asOf", { date: fmtDate(s.asOf, lang) })} · {t("market.cadence.label", { freq: t(`market.cadence.${s.cadence}`) })}
              </div>
            </div>
          ))}
        </div>

        {/* Freshness / snapshot honesty */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <h3 className="text-sm font-bold text-slate-900">{t("market.freshness.title")}</h3>
          <p className="mt-1.5 max-w-[72ch] text-sm leading-relaxed text-slate-600">{t("market.freshness.body")}</p>
        </div>

        {/* Interactive: how a rate change moves the math */}
        <div className="mt-8">
          <RateExplorer />
        </div>

        {/* What moves each factor */}
        <div className="mt-12">
          <h3 className="text-lg font-bold text-slate-900">{t("market.factors.title")}</h3>
          <div className="mt-5 grid gap-x-10 gap-y-7 sm:grid-cols-3">
            {factors.map((f) => (
              <div key={f.title}>
                <h4 className="text-sm font-bold text-slate-900">{f.title}</h4>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 font-mono text-[11px] text-slate-400">{t("market.source")}</p>
      </div>
    </section>
  );
}
