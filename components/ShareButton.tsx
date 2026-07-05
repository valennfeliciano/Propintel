"use client";

import { useState } from "react";

export default function ShareButton({
  url,
  address,
}: {
  url: string;
  address: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    // Prefer native share sheet (mobile); fall back to clipboard copy.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: address, url });
        return;
      } catch {
        // User cancelled or share unavailable — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail — clipboard blocked.
    }
  };

  return (
    <button
      onClick={handleShare}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
    >
      {copied ? (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          Link copied!
        </>
      ) : (
        <>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" />
          </svg>
          Share this property
        </>
      )}
    </button>
  );
}
