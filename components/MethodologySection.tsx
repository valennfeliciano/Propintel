"use client";

import market from "@/data/market.json";
import { useLang } from "./LanguageProvider";

export default function MethodologySection() {
  const { t } = useLang();

  const blocks = [
    { n: "01", title: t("method.value.title"), body: t("method.value.body") },
    { n: "02", title: t("method.opp.title"), body: t("method.opp.body") },
    { n: "03", title: t("method.cap.title"), body: t("method.cap.body") },
    { n: "04", title: t("method.verdict.title"), body: t("method.verdict.body") },
  ];

  const assumptions = [
    { label: t("method.assumptions.down"), value: "20%" },
    { label: t("method.assumptions.rate"), value: `${market.mortgage30.value}%`, note: t("method.assumptions.rateNote") },
    { label: t("method.assumptions.term"), value: t("method.assumptions.years") },
    { label: t("method.assumptions.opex"), value: "30%" },
  ];

  return (
    <section id="method" className="scroll-mt-20 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-5 py-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          {t("nav.method")}
        </p>
        <h2 className="mt-2 max-w-2xl text-2xl font-bold text-slate-900 sm:text-3xl">
          {t("method.title")}
        </h2>
        <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-slate-600">{t("method.intro")}</p>

        <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {blocks.map((b) => (
            <div key={b.n} className="flex gap-4">
              <span className="font-mono text-sm font-bold text-emerald-600/70">{b.n}</span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{b.title}</h3>
                <p className="mt-1.5 max-w-[58ch] text-sm leading-relaxed text-slate-600">{b.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stated assumptions */}
        <div className="mt-10">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("method.assumptions.title")}
          </h3>
          <div className="flex flex-wrap gap-3">
            {assumptions.map((a) => (
              <div key={a.label} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5">
                <div className="font-mono text-base font-bold text-slate-900">{a.value}</div>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">{a.label}</div>
                {a.note && <div className="mt-0.5 text-[10px] font-medium text-emerald-600">{a.note}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
