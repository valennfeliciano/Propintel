# Deployment Guide

Deploy PropIntel to Vercel in under five minutes. No paid API keys are required
for the demo — all data is cached in the repo.

---

## Prerequisites

| Requirement | Version | Check |
|---|---|---|
| Node.js | 18 or later | `node -v` |
| npm | 9 or later | `npm -v` |
| Vercel account | free tier works | vercel.com |
| Vercel CLI | latest | `npm i -g vercel` |

---

## Quick Start (under 5 minutes)

```bash
# 1. Clone and install
git clone <your-repo-url>
cd property-intelligence
npm install

# 2. Link to Vercel
vercel link

# 3. Deploy to preview
vercel deploy

# 4. Deploy to production
vercel --prod
```

---

## Environment Variables

The app runs without any environment variables for the demo dataset. If you add
the Claude AI integration (see `AI.md`), you need one key.

### `.env.local` template

```bash
# Required ONLY if you enable the Claude AI analysis engine.
# Leave blank to use the built-in rules engine.
ANTHROPIC_API_KEY=sk-ant-...

# Optional: override the production base URL for OG tags.
# Defaults to https://property-intelligence-nu.vercel.app
# NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

### Setting environment variables in Vercel

```bash
# Add via CLI
vercel env add ANTHROPIC_API_KEY production

# Or pull existing vars from Vercel into .env.local
vercel env pull
```

You can also add them in the Vercel dashboard under
**Project → Settings → Environment Variables**.

The app uses these environment targets:
- **Development** — `.env.local` on your machine
- **Preview** — set in Vercel dashboard for preview deployments
- **Production** — set in Vercel dashboard for production

---

## Step-by-Step Vercel Deployment

### 1. Import the project

Go to [vercel.com/new](https://vercel.com/new), select your Git provider, and
import the repository. Vercel will detect Next.js automatically.

### 2. Build settings (auto-detected, no changes needed)

| Setting | Value |
|---|---|
| Framework | Next.js |
| Build command | `next build` |
| Output directory | `.next` |
| Install command | `npm install` |

### 3. Add environment variables

Add any keys (see above) before clicking **Deploy**.

### 4. Deploy

Click **Deploy**. The first build takes about 60–90 seconds.

---

## What Gets Deployed

The `.vercelignore` file (already committed) excludes:

```
.env.local
.env.*.local
scripts/
```

Scripts are data-build utilities, not needed at runtime. Local env files are
never sent.

---

## Rollback Procedure

### Via Vercel dashboard

1. Go to **Project → Deployments**
2. Find the last good deployment
3. Click the three-dot menu → **Promote to Production**

### Via CLI

```bash
# List recent deployments
vercel ls

# Promote a specific deployment URL to production
vercel promote <deployment-url>
```

---

## Post-Deployment Verification Checklist

Run these checks immediately after deploying to production.

- [ ] Home page loads at your production URL
- [ ] Stats bar shows real numbers (50 listings, 17 neighborhoods)
- [ ] Click a property card — the full-page analysis panel opens
- [ ] Analysis panel shows score bars, metrics, and an action plan
- [ ] "Market" section loads with live FRED data (check the "as of" date)
- [ ] Language toggle switches to Spanish and back
- [ ] Heart a property — count appears in the Saved button
- [ ] Saved filter shows only your hearted listings
- [ ] Map view shows 50 color-coded pins
- [ ] Search "78701" returns results
- [ ] `/sitemap.xml` returns valid XML
- [ ] `/robots.txt` returns the correct file
- [ ] Open Graph: paste your URL into [opengraph.xyz](https://www.opengraph.xyz) and confirm the preview image appears

### Check the API route

```bash
curl -X POST https://your-domain.vercel.app/api/analyze-property \
  -H "Content-Type: application/json" \
  -d '{"propertyId": "prop_001"}' | jq .recommendation
```

Expected: `"Strong Buy"`, `"Worth a Look"`, or `"Pass"`.

---

## ISR and Caching

The live FRED data is fetched via Next.js ISR (Incremental Static Regeneration)
with a 24-hour revalidation window. This means:

- The first request after deployment fetches fresh FRED data.
- Subsequent requests are served from the Vercel edge cache.
- After 24 hours, the next request triggers a background re-fetch.
- If FRED is unreachable, `lib/market.ts` falls back to `data/market.json`
  automatically — the site never breaks.

You do not need to configure anything for this to work.

---

## Custom Domain

```bash
# Add a domain via CLI
vercel domains add yourdomain.com

# Or manage in dashboard: Project → Settings → Domains
```

After adding a domain, update `BASE_URL` in `app/layout.tsx` and
`app/sitemap.ts` to match, then redeploy.

---

## Monitoring Setup

See `MONITORING.md` for full instructions. Quick summary:

- **Vercel Analytics** — enable in **Project → Analytics** (free)
- **Vercel Speed Insights** — enable in **Project → Speed Insights** (free)
- **Logs** — `vercel logs --follow` or check the dashboard under **Deployments → Functions**

---

## Common Deployment Issues

### Build fails: `Cannot find module '@/lib/...'`

TypeScript path aliases require the `tsconfig.json` paths to match. Verify
`tsconfig.json` has `"@/*": ["./*"]` under `compilerOptions.paths`.

### FRED data shows stale values

The ISR cache on Vercel may be serving an old response. Force revalidation:

```bash
# Trigger a fresh deployment (also clears the ISR cache)
vercel --prod
```

Or call the revalidate endpoint if you add one later.

### `og-image.png` missing / social preview broken

The file must be at `public/og-image.png`. Verify it exists and was committed:

```bash
git ls-files public/og-image.png
```

If missing, see `FIXES.md` → Fix 3 (SEO infrastructure).

### Leaflet map shows broken tiles

Leaflet loads tile images from OpenStreetMap CDN at runtime. If tiles don't
appear, check browser console for CORS or mixed-content errors. This is a
network issue, not a build issue.
