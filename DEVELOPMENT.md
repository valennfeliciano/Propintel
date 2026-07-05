# Development Guide

Everything you need to run the project locally, understand the code structure,
and add new features safely.

---

## Quick Start

```bash
git clone <your-repo-url>
cd property-intelligence
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Prerequisites

- **Node.js 18+** (`node -v`)
- **npm 9+** (`npm -v`)

No other global installs are required. The Vercel CLI is optional (only needed
for deployment).

---

## Environment Variables

The app works without any environment variables for local development. All
demo data is committed to the repo.

Create `.env.local` in the project root for optional configuration:

```bash
# Only needed if you enable the Claude AI analysis engine.
# See AI.md for setup instructions.
ANTHROPIC_API_KEY=sk-ant-...
```

Do not commit `.env.local`. It is already in `.gitignore`.

---

## Development Server

```bash
npm run dev       # Turbopack (fast refresh, default)
npm run build     # Production build
npm start         # Serve the production build locally
```

The dev server uses Turbopack (configured in `next.config.ts`). Hot module
replacement is instant for React component changes.

### Turbopack note

`next.config.ts` sets `turbopack.root: __dirname` to prevent Next.js from
inferring the wrong workspace root when there are lockfiles in parent
directories. Do not remove this.

---

## Project Structure

```
app/
  layout.tsx              # Root layout: fonts, SEO metadata, JSON-LD
  page.tsx                # Server component: loads all data, renders Dashboard
  sitemap.ts              # Generates /sitemap.xml (revalidates daily)
  api/
    analyze-property/
      route.ts            # POST /api/analyze-property → AnalysisResult

components/
  Dashboard.tsx           # Main client component: grid/map, filters, panel state
  PropertyCard.tsx        # Individual listing card (thumbnail, price, scores)
  AnalysisPanel.tsx       # Full-screen property detail view
  PhotoCarousel.tsx       # Photo gallery with dot navigation
  PropertyMap.tsx         # Embedded location map (Leaflet iframe)
  ListingsMap.tsx         # All-listings map with 50 color-coded pins
  MarketSection.tsx       # Education section: live FRED data display
  RateExplorer.tsx        # Interactive amortization calculator
  MethodologySection.tsx  # "How scoring works" explainer
  LanguageProvider.tsx    # EN/ES context + localStorage persistence
  FavoritesProvider.tsx   # Saved listings context + localStorage persistence

lib/
  types.ts                # Property, AnalysisResult, AnalysisMetrics interfaces
  data.ts                 # Data accessors: getAllProperties, getPropertyById
  analysisService.ts      # Scoring engine (the AI swap point)
  market.ts               # Live FRED fetch with daily ISR + fallback
  format.ts               # Number formatting utilities (usd, usdCompact, etc.)
  i18n.ts                 # English/Spanish translation dictionaries

data/
  properties.json         # Final app dataset (50 listings, all fields merged)
  zillow-raw.json         # Raw scraped Zillow data
  photos.json             # 12 photos per listing
  descriptions.json       # Verbatim listing descriptions
  comps.json              # Median $/sqft per ZIP (41 ZIPs)
  market.json             # FRED macro snapshot (fallback)
  rents.json              # Zillow ZORI area rent by ZIP
  rentcast.json           # RentCast per-property rent estimates

scripts/
  build-market.mjs        # Refreshes data/market.json from FRED
  build-properties.mjs    # Merges all sources into data/properties.json
  build-rent.mjs          # Fetches/updates RentCast estimates

public/
  og-image.png            # 1200×630 social preview image
  og-image.svg            # Source SVG for the OG image
  robots.txt              # Crawling directives
```

---

## Data Flow

```
FRED API (live, daily ISR)
    ↓
lib/market.ts → getMarket()
    ↓
app/page.tsx (Server Component)
    ├─ getAllProperties() from lib/data.ts
    │   └─ data/properties.json (all 50 listings)
    ├─ analyzeProperty() from lib/analysisService.ts
    │   └─ runs once per listing at page render
    └─ renders Dashboard (client component)
           ↓
        user clicks a property card
           ↓
        Dashboard calls POST /api/analyze-property
           ↓
        route.ts calls analyzeProperty() again with live rate
           ↓
        AnalysisPanel renders the result
```

The analysis runs twice per property: once at page load (for map pin colors
and the opportunities count) and once when the user opens the detail panel
(for the full analysis with the current live rate). Both use the same function.

---

## Key Patterns

### Server vs. Client Components

- `app/page.tsx` is a Server Component (async, no `"use client"`). It does all
  data loading and passes props down to the Dashboard.
- `components/Dashboard.tsx` is a Client Component (`"use client"`). All
  interactive state lives here.
- `components/AnalysisPanel.tsx` is a Client Component. It receives data as
  props from Dashboard state.
- `components/LanguageProvider.tsx` and `components/FavoritesProvider.tsx` are
  Client Components that use React Context for localStorage-backed state.

### localStorage Safety Pattern

Any state that reads from `localStorage` must follow this pattern to avoid
hydration mismatches:

```tsx
const [value, setValue] = useState(SAFE_DEFAULT);
const [ready, setReady] = useState(false);

useEffect(() => {
  const saved = localStorage.getItem(KEY);
  if (saved) setValue(saved);
  setReady(true);
}, []);

// Gate UI on ready to prevent server/client mismatch
{ready && <Component value={value} />}
```

See `components/FavoritesProvider.tsx` and `components/LanguageProvider.tsx`
for working examples.

### The AI Swap Point

`lib/analysisService.ts` exports `analyzeProperty(property, mortgageRatePct)`.
This is the only entry point for analysis. Replace its body with a Claude call
that returns the same `AnalysisResult` shape and nothing else in the app
changes. See `AI.md` for the full implementation guide.

### ISR for FRED Data

`lib/market.ts` uses Next.js's `fetch` with `{ next: { revalidate: 86400 } }`
(24 hours). The committed `data/market.json` is the build-time snapshot and
runtime fallback. If FRED is unreachable, `getMarket()` catches the error and
returns the fallback — the site never breaks.

---

## Adding New Features

### Adding a new property field

1. Add the field to the `Property` interface in `lib/types.ts`.
2. Add the field (with a value) to every entry in `data/properties.json`, or
   make it optional (`newField?: string`).
3. If the field comes from a new data source, add it to `scripts/build-properties.mjs`
   and re-run the script.
4. Use the field in `lib/analysisService.ts` (scoring) or in a component.

### Adding a new analysis metric

1. Add the field to `AnalysisMetrics` in `lib/types.ts`.
2. Compute it in `computeMetrics()` in `lib/analysisService.ts`.
3. Use it in the scoring functions or render it in `components/AnalysisPanel.tsx`.

### Adding a new language

1. Add a new `Lang` type value in `lib/i18n.ts` (currently `"en" | "es"`).
2. Add translation entries for all keys.
3. Update `components/LanguageProvider.tsx` to accept the new value.
4. Add a toggle button in the UI.

### Adding a new filter to the dashboard

1. Add state to `Dashboard.tsx` (e.g. `const [minCapRate, setMinCapRate] = useState(0)`).
2. Filter the `filtered` array in the existing filter logic.
3. Add a control in the filter bar JSX.

---

## Code Style

- TypeScript strict mode. No `any` unless absolutely unavoidable.
- All components use named exports except page files (which use default exports
  per Next.js convention).
- No CSS modules — Tailwind CSS v4 utility classes only.
- `"use client"` at the top of any component that uses React hooks, browser
  APIs, or event handlers.
- Format with Prettier (no config file — use editor defaults or add one).

---

## Rebuilding the Dataset

The app uses pre-built data committed to the repo. If you need to refresh it:

```bash
# Refresh the FRED macro snapshot
node scripts/build-market.mjs

# Rebuild the merged properties dataset
node scripts/build-properties.mjs

# Update RentCast rent estimates
node scripts/build-rent.mjs
```

After running scripts, commit the updated JSON files in `data/`.

---

## Production Build

```bash
npm run build
```

Expected output:
- TypeScript: no errors
- Routes: `/`, `/sitemap.xml`, `/api/analyze-property`
- Bundle: ~850 KB JS (Leaflet accounts for ~150 KB)

If the build fails, check:
1. TypeScript errors: read the error message and fix the type issue.
2. Missing data files: verify `data/properties.json` exists and is valid JSON.
3. Import errors: check that all `@/` imports resolve to existing files.

---

## Manual Testing Checklist

Run this before every pull request or deployment.

- [ ] Home page loads and shows 50 listings
- [ ] Stats bar shows correct counts (50 listings, 17 neighborhoods)
- [ ] Search for "78701" — returns matching listings
- [ ] Filter by a neighborhood — only that neighborhood shows
- [ ] Sort by price ascending — cheapest listing first
- [ ] Click "Map" — all 50 pins appear, color-coded by verdict
- [ ] Click a property card — full-screen analysis panel opens
- [ ] Analysis panel: score bars animate, all metrics show, action plan has steps
- [ ] Heart a listing — heart turns red
- [ ] Reload — heart is still red (localStorage persisted)
- [ ] Click "Saved" filter — only hearted listings show
- [ ] Toggle to Spanish — all UI text switches to Spanish
- [ ] Reload — Spanish is remembered
- [ ] Market section — shows live FRED data with an "as of" date
- [ ] Rate Explorer — drag the rate slider, monthly payment updates
- [ ] `/sitemap.xml` — returns valid XML with one entry
- [ ] `/robots.txt` — returns correct content
- [ ] No console errors or React warnings
