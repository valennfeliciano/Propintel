# Monitoring and Observability

This guide covers what to watch in production and how to set it up.

---

## What to Monitor

| Signal | Why it matters | Where to check |
|---|---|---|
| Build success | A failed build means no update went live | Vercel dashboard |
| FRED API health | Mortgage rate drives all underwriting math | Runtime logs |
| Bundle size | >1 MB JS can hurt Time to Interactive | Vercel build output |
| Core Web Vitals | LCP, CLS, INP affect SEO and UX | Vercel Speed Insights |
| `/api/analyze-property` latency | >2s feels broken to users | Vercel Function logs |
| Error rate | Uncaught exceptions in the API route | Vercel logs |

---

## Vercel Analytics

Vercel Analytics tracks page views, unique visitors, and traffic sources with
no external service required.

### Enable

1. Go to your project in the [Vercel dashboard](https://vercel.com/dashboard).
2. Click **Analytics** in the left sidebar.
3. Click **Enable**.

No code changes are needed. Vercel injects the analytics snippet automatically.

### What you get

- Page views per route
- Unique visitors
- Top referrers
- Country breakdown

---

## Vercel Speed Insights (Core Web Vitals)

Speed Insights collects real-user Core Web Vitals from production traffic.

### Enable

1. Go to **Project → Speed Insights**.
2. Click **Enable**.

### Key metrics to watch

| Metric | Target | What it means |
|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5 s | How fast the main content loads |
| CLS (Cumulative Layout Shift) | < 0.1 | How much elements jump around |
| INP (Interaction to Next Paint) | < 200 ms | How responsive clicks/taps feel |

### Common causes of poor scores in this app

- **LCP**: The hero section and property card images. The primary photo
  (`property.imageUrl`) is a full Zillow URL. If Zillow throttles it, LCP
  degrades.
- **CLS**: The Saved button appearing after hydration (fixed in `FIXES.md`
  Fix 1). Without the `favReady` gate, the button popping in shifts layout.
- **INP**: Leaflet map initialization on the client. The map is only rendered
  when the user clicks "Map" view, so it does not affect initial INP.

---

## Viewing Logs

### Production function logs

```bash
# Stream live logs from all functions
vercel logs --follow

# Filter to the API route only
vercel logs --follow | grep "analyze-property"
```

Or go to **Vercel dashboard → Deployments → [latest] → Functions** and click
any invocation.

### What a healthy API log looks like

```
POST /api/analyze-property 200 in 12ms
```

### What a problem looks like

```
POST /api/analyze-property 500 in 8ms
Error: Property 'prop_999' not found.
```

---

## FRED API Monitoring

The live FRED fetch is the only external network call at runtime. It runs once
per 24 hours per edge region (ISR cache). To verify it is working:

### Check the `_live` field

The `getMarket()` function returns `{ _live: true }` when the live fetch
succeeded and `{ _live: false }` when it fell back to the committed snapshot.

The `MarketSection` component renders an "as of" date from the market data.
If that date is more than a week old, the live fetch is probably failing.

### Force a cache refresh

```bash
# Redeploy (clears ISR cache and triggers a fresh FRED fetch)
vercel --prod
```

### If FRED is down

The app falls back to `data/market.json` automatically. Users see the same
numbers as before — nothing breaks. The mortgage rate used in all calculations
stays at the last known value.

To update the committed snapshot manually:

```bash
node scripts/build-market.mjs
git add data/market.json
git commit -m "chore: refresh FRED market snapshot"
git push
```

---

## Alert Setup

Vercel does not have a built-in alerting system (as of mid-2026), but you can
set up alerts via these approaches:

### Build failure alerts

In **Project → Settings → Git → Deploy Hooks**, you can add a webhook URL that
fires on deployment events. Point it at a Slack webhook or a PagerDuty endpoint.

### Uptime monitoring (external)

Use a free tier of [UptimeRobot](https://uptimerobot.com) or
[Better Uptime](https://betteruptime.com):

- Monitor: `GET https://your-domain.vercel.app/`
- Expected status: 200
- Frequency: every 5 minutes
- Alert: email or Slack on first failure

### API health check

Add the API route as a separate monitor:

```
POST https://your-domain.vercel.app/api/analyze-property
Body: {"propertyId": "prop_001"}
Expected status: 200
```

---

## Response Playbook

### Site returns 500

1. Check Vercel logs (`vercel logs --follow`).
2. Look for the error message — it will name the file and line.
3. If it is in `lib/market.ts`, FRED may be returning unexpected data. Check
   `https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US` manually.
4. If it is in `lib/data.ts`, `data/properties.json` may be malformed. Run
   `node scripts/build-properties.mjs` and redeploy.

### FRED data is stale

1. Run `node scripts/build-market.mjs` to refresh the snapshot.
2. Commit and push — the next deployment will use fresh data.
3. The ISR cache clears on each deployment.

### Bundle size grew unexpectedly

1. Check the Vercel build output for the bundle report.
2. Look for newly imported packages — Leaflet (`~150 KB`) is the largest known
   dependency.
3. If a new import is large, check if it can be dynamically imported
   (`next/dynamic` with `ssr: false` for client-only packages).

---

## Debug Tricks

### Check which analysis engine ran

Every `AnalysisResult` has a `generatedBy` field. In the browser console:

```js
// After clicking a property and the panel opens, the analysis is in state.
// You can inspect network responses in DevTools → Network → analyze-property.
```

Or check the raw API response:

```bash
curl -s -X POST https://your-domain.vercel.app/api/analyze-property \
  -H "Content-Type: application/json" \
  -d '{"propertyId": "prop_001"}' | jq .generatedBy
```

`"rules-engine-v2"` means Claude is not configured. A model ID like
`"claude-opus-4-5"` means the AI engine ran.

### Verify environment variables are set

```bash
vercel env ls
```

Look for `ANTHROPIC_API_KEY` in the production environment if you are using
the AI engine.
