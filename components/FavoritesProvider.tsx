"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

interface FavCtx {
  favorites: string[];
  isFavorite: (id: string) => boolean;
  toggle: (id: string) => void;
  count: number;
  ready: boolean;
}

const Ctx = createContext<FavCtx | null>(null);
const KEY = "propintel.favorites";

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(saved)) setFavorites(saved.filter((x) => typeof x === "string"));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  return (
    <Ctx.Provider value={{ favorites, isFavorite, toggle, count: favorites.length, ready }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFavorites(): FavCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}

export function HeartButton({ id, className = "" }: { id: string; className?: string }) {
  const { isFavorite, toggle } = useFavorites();
  const fav = isFavorite(id);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggle(id);
      }}
      aria-pressed={fav}
      aria-label={fav ? "Remove from saved" : "Save property"}
      className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur transition-colors ${
        fav ? "bg-rose-500 text-white" : "bg-slate-900/55 text-white hover:bg-slate-900/80"
      } ${className}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={fav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1L12 21l7.7-7.6 1.1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    </button>
  );
}
