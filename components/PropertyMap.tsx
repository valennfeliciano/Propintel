"use client";

// Embedded location map via Google Maps' keyless embed (output=embed) — no API
// key needed, nothing sent beyond the public address. The iframe is absolutely
// positioned inside a sized box so its width can't collapse (iframes are
// inline-replaced, so a bare `w-full` can render at ~0px in some flex contexts).
export default function PropertyMap({
  query,
  title,
  className = "h-64",
}: {
  query: string;
  title: string;
  className?: string;
}) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`;
  return (
    <div className={`relative w-full overflow-hidden rounded-xl border border-slate-200 ${className}`}>
      <iframe
        title={title}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0 h-full w-full"
        style={{ border: 0 }}
      />
    </div>
  );
}
