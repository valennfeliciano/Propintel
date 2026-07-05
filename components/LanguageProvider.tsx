"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { type Lang, translate } from "@/lib/i18n";

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  ready: boolean;
}

const Ctx = createContext<LangCtx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [ready, setReady] = useState(false);

  // Read localStorage after mount so the server render stays hydration-safe
  // (server never touches localStorage). Mark `ready` once the true preference
  // is applied so consumers can gate rendering until the correct language is known.
  useEffect(() => {
    const saved = localStorage.getItem("propintel.lang");
    if (saved === "en" || saved === "es") {
      setLangState(saved);
      document.documentElement.lang = saved;
    }
    setReady(true);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("propintel.lang", l);
    document.documentElement.lang = l;
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars),
    [lang],
  );

  // `opacity: 0` instead of `visibility: hidden` during the single-frame
  // hydration window. Both reserve layout space (no CLS), but opacity:0 is
  // GPU-composited and does NOT block the browser's LCP candidate detection —
  // visibility:hidden causes the browser to skip the element as an LCP
  // candidate entirely, inflating the LCP score by the full above-fold render.
  return (
    <Ctx.Provider value={{ lang, setLang, t, ready }}>
      <div style={ready ? undefined : { opacity: 0 }}>{children}</div>
    </Ctx.Provider>
  );
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      className={`inline-flex items-center rounded-full border border-white/15 bg-white/5 p-0.5 text-xs font-semibold ${className}`}
      role="group"
      aria-label="Language"
    >
      {(["en", "es"] as const).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`rounded-full px-2.5 py-1 uppercase tracking-wide transition-colors ${
            lang === l ? "bg-emerald-500 text-slate-950" : "text-slate-300 hover:text-white"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
