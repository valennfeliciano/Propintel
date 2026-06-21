"use client";

import market from "@/data/market.json";
import { useLang } from "./LanguageProvider";

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
    { headline: `${m.mortgage30.value}%`, sub: rateChange(m.mortgage30), asOf: m.mortgage30.asOf, label: t("market.m.mortgage"), down: m.mortgage30.change < 0 },
    { headline: `${m.fedFunds.value}%`, sub: rateChange(m.fedFunds), asOf: m.fedFunds.asOf, label: t("market.m.fed"), down: m.fedFunds.change < 0 },
    { headline: signed(m.austinHPI.change), sub: t("market.yoy", { v: "" }).trim(), asOf: m.austinHPI.asOf, label: t("market.m.austin"), down: m.austinHPI.change < 0 },
    { headline: signed(m.nationalHPI.change), sub: t("market.yoy", { v: "" }).trim(), asOf: m.nationalHPI.asOf, label: t("market.m.national"), down: m.nationalHPI.change < 0 },
  ];

  return (
    <section id="market" className="scroll-mt-20 border-t border-slate-200 bg-white">
      <div className="mx-auto w-full max-w-6xl px-5 py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          {t("nav.market")}
        </p>
        <h2 className="mt-2 max-w-2xl text-2xl font-bold text-slate-900 sm:text-3xl">
          {t("market.title")}
        </h2>
        <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-slate-600">
          {t("market.intro")}
        </p>

        {/* Real FRED figures */}
        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white p-5">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-slate-900">{s.headline}</span>
                <span className="font-mono text-xs text-slate-400">{s.sub}</span>
              </div>
              <div className="mt-1 text-sm font-medium text-slate-700">{s.label}</div>
              <div className="mt-0.5 text-[11px] text-slate-400">{t("market.asOf", { date: fmtDate(s.asOf, lang) })}</div>
            </div>
          ))}
        </div>

        {/* Explanation */}
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t("market.chain.title")}</h3>
            <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-slate-600">{t("market.chain.body")}</p>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{t("market.austin.title")}</h3>
            <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-slate-600">{t("market.austin.body")}</p>
          </div>
        </div>

        <p className="mt-8 font-mono text-[11px] text-slate-400">{t("market.source")}</p>
      </div>
    </section>
  );
}
