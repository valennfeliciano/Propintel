import type { Recommendation } from "./types";

export const usd = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

/** Compact price, e.g. $1.09M / $742K / -$4K */
export const usdCompact = (n: number) => {
  const sign = n < 0 ? "-" : "";
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${sign}$${Math.round(a / 1_000)}K`;
  return usd(n);
};

export const num = (n: number) => n.toLocaleString("en-US");

/** 0–100 score → a tailwind text/bg/ring palette. */
export function scoreTone(score: number) {
  if (score >= 70)
    return { text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200", bar: "bg-emerald-500" };
  if (score >= 50)
    return { text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200", bar: "bg-amber-500" };
  return { text: "text-rose-700", bg: "bg-rose-50", ring: "ring-rose-200", bar: "bg-rose-500" };
}

export function recTone(rec: Recommendation) {
  switch (rec) {
    case "Strong Buy":
      return { text: "text-emerald-700", bg: "bg-emerald-50", ring: "ring-emerald-200", dot: "bg-emerald-500" };
    case "Worth a Look":
      return { text: "text-amber-700", bg: "bg-amber-50", ring: "ring-amber-200", dot: "bg-amber-500" };
    case "Pass":
      return { text: "text-slate-600", bg: "bg-slate-100", ring: "ring-slate-200", dot: "bg-slate-400" };
  }
}
