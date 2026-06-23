"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { usdCompact } from "@/lib/format";
import { useLang } from "./LanguageProvider";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  address: string;
  price: number;
  recommendation: "Strong Buy" | "Worth a Look" | "Pass";
  overallScore: number;
}

const COLORS: Record<string, string> = {
  "Strong Buy": "#059669", // emerald-600
  "Worth a Look": "#d97706", // amber-600
  Pass: "#64748b", // slate-500
};

export default function ListingsMap({
  points,
  onSelect,
}: {
  points: MapPoint[];
  onSelect: (id: string) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const { t, lang } = useLang();

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !el || (el as unknown as { _leaflet_id?: number })._leaflet_id) return;
      map = L.map(el, { scrollWheelZoom: false }).setView([30.27, -97.74], 10);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        maxZoom: 19,
      }).addTo(map);

      const valid = points.filter((p) => p.lat && p.lng);
      for (const p of valid) {
        const color = COLORS[p.recommendation] || "#64748b";
        L.circleMarker([p.lat, p.lng], {
          radius: 8,
          color: "#ffffff",
          weight: 2,
          fillColor: color,
          fillOpacity: 1,
        })
          .addTo(map)
          .bindPopup(
            `<div style="font:13px/1.4 system-ui,sans-serif;min-width:180px">
               <strong>${p.address}</strong><br/>
               <span style="font-family:monospace">${usdCompact(p.price)}</span> ·
               <span style="color:${color};font-weight:700">${t(`verdict.${p.recommendation}`)}</span>
               <span style="color:#94a3b8">${p.overallScore}/100</span><br/>
               <button data-analyze="${p.id}" style="margin-top:7px;width:100%;padding:6px;background:#0f172a;color:#fff;border:0;border-radius:6px;font-weight:600;cursor:pointer">${t("card.analyze")} ↗</button>
             </div>`,
          );
      }
      if (valid.length) map.fitBounds(valid.map((p) => [p.lat, p.lng]), { padding: [40, 40] });
    });

    const handler = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement)?.closest?.("[data-analyze]");
      if (btn) onSelectRef.current(btn.getAttribute("data-analyze")!);
    };
    el.addEventListener("click", handler);

    return () => {
      cancelled = true;
      el.removeEventListener("click", handler);
      map?.remove();
    };
  }, [points, t, lang]);

  return (
    <div className="relative">
      <div ref={elRef} className="h-[62vh] w-full rounded-2xl border border-slate-200" />
      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-[400] flex flex-col gap-1 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-sm backdrop-blur">
        {(["Strong Buy", "Worth a Look", "Pass"] as const).map((v) => (
          <div key={v} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[v] }} />
            <span className="text-slate-600">{t(`verdict.${v}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
