"use client";

import { useState } from "react";
import market from "@/data/market.json";
import { useLang } from "./LanguageProvider";

const LOAN = 400_000; // illustrative loan amount
const BUDGET = 2_500; // illustrative monthly budget

// Standard 30-year fixed amortization.
const payment = (loan: number, ratePct: number) => {
  const r = ratePct / 100 / 12;
  return (loan * r) / (1 - (1 + r) ** -360);
};
// Inverse: the largest loan a fixed monthly payment can service.
const maxLoan = (budget: number, ratePct: number) => {
  const r = ratePct / 100 / 12;
  return (budget * (1 - (1 + r) ** -360)) / r;
};
const usd0 = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const signed = (n: number, money = true) =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${money ? usd0(Math.abs(n)) : `${Math.abs(Math.round(n))}%`}`;

function Result({
  label,
  value,
  delta,
  bad,
  baseRate,
}: {
  label: string;
  value: string;
  delta: string;
  bad: boolean;
  baseRate: number;
}) {
  const { t } = useLang();
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="font-mono text-xl font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-600">{label}</div>
      <div className={`mt-1 font-mono text-[11px] ${bad ? "text-rose-600" : "text-emerald-600"}`}>
        {t("market.explore.vsToday", { delta, rate: baseRate.toFixed(2) })}
      </div>
    </div>
  );
}

export default function RateExplorer() {
  const { t } = useLang();
  const base = market.mortgage30.value; // real current rate from FRED
  const [rate, setRate] = useState(base);

  const payNow = payment(LOAN, rate);
  const payDelta = payNow - payment(LOAN, base);
  const bpNow = maxLoan(BUDGET, rate);
  const bpDelta = bpNow - maxLoan(BUDGET, base);

  const perPoint = payment(LOAN, base + 1) - payment(LOAN, base);
  const bpDropPct = ((maxLoan(BUDGET, base) - maxLoan(BUDGET, base + 1)) / maxLoan(BUDGET, base)) * 100;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="text-sm font-bold text-slate-900">{t("market.explore.title")}</h3>
      <p className="mt-1.5 max-w-[64ch] text-sm leading-relaxed text-slate-600">
        {t("market.explore.intro")}
      </p>

      <div className="mt-5 flex items-baseline gap-2">
        <span className="font-mono text-3xl font-bold tabular-nums text-slate-900">{rate.toFixed(2)}%</span>
        <span className="text-xs text-slate-400">{t("market.explore.rateLabel")}</span>
      </div>
      <input
        type="range"
        min={3.5}
        max={9}
        step={0.05}
        value={rate}
        onChange={(e) => setRate(parseFloat(e.target.value))}
        aria-label={t("market.explore.rateLabel")}
        className="mt-3 w-full accent-emerald-600"
      />
      <div className="mt-1 flex justify-between font-mono text-[11px] text-slate-400">
        <span>3.5%</span>
        <button onClick={() => setRate(base)} className="transition-colors hover:text-emerald-600">
          {t("market.explore.today", { rate: base.toFixed(2) })}
        </button>
        <span>9%</span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Result
          label={t("market.explore.payment")}
          value={`${usd0(payNow)}/mo`}
          delta={signed(payDelta)}
          bad={payDelta > 0}
          baseRate={base}
        />
        <Result
          label={t("market.explore.buyingPower")}
          value={usd0(bpNow)}
          delta={signed(bpDelta)}
          bad={bpDelta < 0}
          baseRate={base}
        />
      </div>

      <p className="mt-5 text-xs leading-relaxed text-slate-500">
        {t("market.explore.takeaway", { pay: usd0(perPoint), bp: `${Math.round(bpDropPct)}%` })}
      </p>
    </div>
  );
}
