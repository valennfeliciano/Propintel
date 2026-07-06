"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// Single-marker location map via Leaflet + free CARTO/OpenStreetMap tiles —
// same stack as ListingsMap. Replaced the old Google Maps keyless <iframe>
// embed, which Google now blocks from loading (net::ERR_ABORTED on every
// request, in dev and in production), leaving a blank box for every visitor.
export default function PropertyMap({
  lat,
  lng,
  title,
  className = "h-64",
}: {
  lat: number;
  lng: number;
  title: string;
  className?: string;
}) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el || !lat || !lng) return;
    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !el || (el as unknown as { _leaflet_id?: number })._leaflet_id) return;
      map = L.map(el, { scrollWheelZoom: false, attributionControl: false }).setView([lat, lng], 14);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        maxZoom: 19,
      }).addTo(map);
      L.circleMarker([lat, lng], {
        radius: 9,
        color: "#ffffff",
        weight: 3,
        fillColor: "#059669",
        fillOpacity: 1,
      }).addTo(map);
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [lat, lng]);

  if (!lat || !lng) return null;

  return (
    <div
      ref={elRef}
      role="img"
      aria-label={title}
      className={`w-full overflow-hidden rounded-xl border border-slate-200 ${className}`}
    />
  );
}
