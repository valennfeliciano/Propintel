# Production Hardening Fixes

All three fixes were applied in a single commit (`75c48ed`) on 2026-07-05.
The build remained TypeScript-clean with zero new errors.

---

## Fix 1 — Hydration Mismatch: Favorites Count

### What was the problem?

React's server-side render and the first client paint both produced a
`<button>Saved (0)</button>`, because `localStorage` is not available on the
server. After the `useEffect` in `FavoritesProvider` ran on the client,
`favCount` jumped from 0 to the real count (e.g. 3), causing:

1. A visible flicker: the button text changed from "Saved (0)" to "Saved (3)"
   on every page load.
2. A React hydration warning in the console, because the server and client
   HTML no longer matched.

### How was it identified?

An audit of all client components that read from `localStorage` found that
`FavoritesProvider` already tracked a `ready` flag — set to `true` only after
the `useEffect` fired — but `Dashboard.tsx` was not using it.

### What is the solution?

Defer rendering the Saved button until `localStorage` has been read.

`FavoritesProvider` already exposes a `ready` boolean. `Dashboard.tsx` was
updated to destructure it and gate the button behind `{favReady && (...)}`.
The server renders nothing; the client renders the correct count after
`useEffect`.

```tsx
// Before (components/Dashboard.tsx)
const { count: favCount, isFavorite } = useFavorites();
// ...
<button onClick={() => setSavedOnly(true)}>
  {t("controls.saved")} ({favCount})
</button>

// After
const { count: favCount, isFavorite, ready: favReady } = useFavorites();
// ...
{favReady && (
  <button onClick={() => setSavedOnly(true)}>
    {t("controls.saved")} ({favCount})
  </button>
)}
```

The `LanguageProvider` uses the same pattern (`ready` flag + deferred render)
and was already correct.

### Files changed

- `components/Dashboard.tsx`

### How to test it

1. Heart two or three listings. Reload the page.
2. The Saved button should not show "Saved (0)" at any point. It should appear
   directly with the correct count.
3. Open DevTools → Console. There should be no React hydration warnings.

### Performance impact

None. The button is invisible for one frame at most (the duration of a single
`useEffect` call), which is imperceptible to users.

---

## Fix 2 — Language Toggle Hydration (Existing, Correct)

### What was the state?

An audit checked whether `LanguageProvider` had the same problem as
`FavoritesProvider`. It did not. `LanguageProvider` already implemented the
correct pattern:

- The server renders in the default language (`en`).
- After mount, `useEffect` reads `localStorage` for the saved preference.
- `ready` is set to `true`, signaling that the true language is now applied.

No code change was required. This is documented here so future developers
understand the intent of the `ready` flag in both providers.

### Pattern to follow for new localStorage-backed state

```tsx
// Correct pattern — used by both providers
const [value, setValue] = useState(DEFAULT);  // safe server default
const [ready, setReady] = useState(false);

useEffect(() => {
  const saved = localStorage.getItem(KEY);
  if (saved) setValue(saved);
  setReady(true);  // now safe to render client-specific UI
}, []);

// In the render, gate any UI that shows the localStorage value:
{ready && <DisplayComponent value={value} />}
```

Never read `localStorage` during render or in server components.

---

## Fix 3 — SEO Infrastructure

### What was the problem?

Three SEO issues were identified:

**3a. Sitemap had invalid entries**

The sitemap (`app/sitemap.ts`) included two entries that should not have been
there:
- `/#methodology` — URL fragments are not crawlable. Search engines strip the
  fragment and treat this as a duplicate of `/`.
- `/analyze-property` — there is no page route at this path. It is an API
  route (`/api/analyze-property`), which is correctly excluded by `robots.txt`.

**3b. No `robots.txt`**

Without a `robots.txt`, search engines crawl everything by default, including
the `/api/` routes. The API endpoint should not be indexed.

**3c. No Open Graph image**

`app/layout.tsx` referenced `/og-image.png` in its OG and Twitter card
metadata, but the file did not exist in `public/`. Social previews on Twitter,
Slack, iMessage, etc. showed a blank card.

### How was it identified?

- Sitemap: code review of `app/sitemap.ts`.
- `robots.txt`: `ls public/` showed it was missing.
- OG image: `ls public/` showed `og-image.png` was absent despite the
  `layout.tsx` metadata referencing it.

### What is the solution?

**3a. Sitemap** — removed the two invalid entries. The sitemap now contains
only the home route:

```ts
// app/sitemap.ts — final state
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
```

The sitemap revalidates every 24 hours (`export const revalidate = 86400`),
keeping `lastModified` in sync with the daily FRED data refresh.

**3b. `robots.txt`** — added `public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://property-intelligence-nu.vercel.app/sitemap.xml
```

This tells crawlers to index all pages but not the API routes, and points them
to the sitemap.

**3c. OG image** — added `public/og-image.png` (1200×630 px) and its SVG
source (`public/og-image.svg`). The image shows the PropIntel brand and tagline
in the standard social-preview aspect ratio.

The OG metadata was already correct in `app/layout.tsx`:

```tsx
openGraph: {
  images: [{
    url: "/og-image.png",  // resolves via metadataBase
    width: 1200,
    height: 630,
  }],
},
twitter: {
  card: "summary_large_image",
  images: ["/og-image.png"],
},
```

### Files changed

- `app/sitemap.ts` (updated)
- `public/robots.txt` (new)
- `public/og-image.png` (new)
- `public/og-image.svg` (new, source file)
- `app/layout.tsx` (OG/Twitter metadata was already present; verified correct)

### How to test it

```bash
# Sitemap
curl https://your-domain.vercel.app/sitemap.xml
# Should return one <url> entry for the home page. No /#methodology or /analyze-property.

# robots.txt
curl https://your-domain.vercel.app/robots.txt
# Should show Disallow: /api/ and the Sitemap line.

# OG image
curl -I https://your-domain.vercel.app/og-image.png
# Should return HTTP 200.

# Social preview
# Paste your URL into https://www.opengraph.xyz or https://cards-dev.twitter.com/validator
```

### Performance impact

None. These are static files served from the CDN edge. The sitemap revalidates
in the background via ISR, not on the critical render path.
