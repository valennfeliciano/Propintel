"use client";

import { useState } from "react";
import Image from "next/image";

export default function PhotoCarousel({ photos, alt }: { photos: string[]; alt: string }) {
  const [i, setI] = useState(0);
  if (!photos || photos.length === 0) return null;
  const n = photos.length;
  const go = (d: number) => setI((p) => (p + d + n) % n);

  const Arrow = ({ dir }: { dir: -1 | 1 }) => (
    <button
      onClick={() => go(dir)}
      aria-label={dir === -1 ? "Previous photo" : "Next photo"}
      className={`absolute top-1/2 -translate-y-1/2 ${dir === -1 ? "left-2" : "right-2"} flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/55 text-white opacity-0 backdrop-blur transition-opacity hover:bg-slate-900/80 group-hover:opacity-100`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d={dir === -1 ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
      </svg>
    </button>
  );

  return (
    <div className="group relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
      {/*
       * No `key` here — a stable single <Image> lets React update the `src`
       * prop in-place rather than unmounting and remounting the node on every
       * slide change. Using key={i} (the old approach) caused a full teardown
       * each time, producing layout flashes and redundant image re-requests.
       */}
      <Image
        src={photos[i]}
        alt={`${alt} — photo ${i + 1}`}
        fill
        sizes="(max-width: 768px) 100vw, 448px"
        className="object-cover"
        unoptimized
        priority={i === 0}
      />
      {n > 1 && (
        <>
          <Arrow dir={-1} />
          <Arrow dir={1} />
          <div className="absolute right-2 top-2 rounded-full bg-slate-900/65 px-2 py-0.5 font-mono text-[11px] font-medium text-white backdrop-blur">
            {i + 1}/{n}
          </div>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {/* Use the photo URL as key — stable across renders, unlike the index */}
            {photos.map((photo, k) => (
              <button
                key={photo}
                onClick={() => setI(k)}
                aria-label={`Go to photo ${k + 1}`}
                className={`h-1.5 rounded-full bg-white transition-all ${k === i ? "w-4" : "w-1.5 opacity-50 hover:opacity-80"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
