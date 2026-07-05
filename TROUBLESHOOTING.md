# Troubleshooting Guide

Common issues, root causes, and fixes. Each entry stands alone — jump to the
issue you are seeing.

---

## Build Failures

### `Cannot find module '@/lib/...'`

**Symptom**: TypeScript error during `npm run build` or in your editor.

**Root cause**: The `@/` path alias is configured in `tsconfig.json`. If the
file does not exist at the path or the tsconfig is malformed, imports fail.

**Fix**:
1. Verify the file exists at the expected path.
2. Check `tsconfig.json` has:
   ```json
   "compilerOptions": {
     "paths": {
       "@/*": ["./*"]
     }
   }
   ```
3. Restart the TypeScript server in your editor (VS Code: `Cmd+Shift+P` →
   "TypeScript: Restart TS Server").

---

### `Error: Cannot find module 'leaflet'`

**Symptom**: Build or runtime error about Leaflet.

**Root cause**: Leaflet uses `window` and `document` at import time, which
breaks in Node.js (server-side rendering). `ListingsMap.tsx` and
`PropertyMap.tsx` must only render on the client.

**Fix**: Both map components already use `"use client"`. If you see this error
after adding a new file, ensure any file that imports Leaflet has `"use client"`
at the top.

---

### Build succeeds but the site shows a blank page

**Symptom**: `vercel --prod` completes, but the deployed URL shows nothing.

**Root cause**: A runtime error in a Server Component (`app/page.tsx`) or a
missing required data file.

**Fix**:
1. Check `vercel logs --follow` for the error.
2. The most likely culprits:
   - `data/properties.json` is missing or malformed — run
     `node scripts/build-properties.mjs` and redeploy.
   - An import references a file that does not exist.

---

## Hydration Warnings

### "Hydration failed because the server rendered HTML didn't match the client"

**Symptom**: React warning in the browser console. The page still works but
may flash incorrect content.

**Root cause**: A component reads `localStorage` or `window` during render,
producing different output on the server vs. the client.

**Fix**: Any state that depends on `localStorage` must be deferred to after
mount. See `FIXES.md` Fix 1 for the exact pattern used in `FavoritesProvider`
and `LanguageProvider`.

The rule: never call `localStorage` at render time. Always do it in a
`useEffect`, then set a `ready` flag, then gate the dependent UI behind
`{ready && ...}`.

---

### "Text content did not match. Server: '0' Client: '3'"

**Symptom**: A count or number shows 0 on server then jumps to the real value.

**Root cause**: Same as above — the count comes from `localStorage`.

**Fix**: Gate the element behind the `ready` flag. See `components/Dashboard.tsx`
for the `{favReady && (...)}` pattern.

---

## FRED API Issues

### Market section shows stale data

**Symptom**: The "as of" date in the Market section is weeks or months old.

**Root cause**: The ISR cache may be serving the committed `data/market.json`
snapshot rather than live FRED data. This happens when:
- FRED returns an error (the code catches it and falls back silently).
- The ISR cache has not been invalidated since the last deployment.

**Fix**:
1. Test the FRED endpoint directly:
   ```bash
   curl "https://fred.stlouisfed.org/graph/fredgraph.csv?id=MORTGAGE30US" | tail -5
   ```
   If this fails, FRED is having an outage. Wait and retry.
2. If FRED is healthy but data is still stale, force a redeployment:
   ```bash
   vercel --prod
   ```
3. To manually refresh the committed snapshot:
   ```bash
   node scripts/build-market.mjs
   git add data/market.json && git commit -m "chore: refresh FRED snapshot"
   git push
   ```

---

### "TypeError: Cannot read properties of undefined (reading 'value')"

**Symptom**: Error mentioning `market.mortgage30.value`.

**Root cause**: `getMarket()` returned `undefined` or an unexpected shape —
this should not happen because the fallback catches all errors, but it would
occur if `data/market.json` itself is malformed.

**Fix**: Verify `data/market.json` has the expected shape:
```bash
node -e "const m = require('./data/market.json'); console.log(m.mortgage30.value)"
```
Should print a number like `6.7`. If it fails, re-run `scripts/build-market.mjs`.

---

## RentCast Data Issues

### Rent estimates show "estimated" label

**Symptom**: Properties show rent sourced as "estimated" instead of "rentcast".

**Root cause**: Not all 50 properties have a RentCast estimate in
`data/rentcast.json`. For properties without a RentCast match, the app falls
back to Zillow ZORI area rent or a modeled estimate. This is expected behavior
— the UI labels the source honestly.

**Fix**: There is no bug here. If you want real RentCast estimates for more
properties, add them to `data/rentcast.json` and re-run
`node scripts/build-properties.mjs`.

---

## Zillow Data Issues

### Property photos fail to load

**Symptom**: Broken image icons instead of property photos.

**Root cause**: Photos are stored as Zillow CDN URLs (e.g.
`https://photos.zillowstatic.com/...`). Zillow's CDN may block requests
without proper referer headers, or the URL may have expired.

**Fix**:
- There is no server-side fix without re-scraping.
- For production use, download the photos and serve them from your own CDN
  (Vercel Blob Storage or Cloudflare R2) so they do not depend on Zillow.

---

### "403 Forbidden" when re-scraping Zillow

**Symptom**: The browser scrape script fails with 403.

**Root cause**: Zillow blocks automated requests from datacenter IPs. The
original data was collected by driving a real logged-in browser session.

**Fix**: The dataset is committed to the repo and does not need to be
re-scraped for the demo. If you need fresh data, use a real browser session
and follow the same technique described in the README (parse `__NEXT_DATA__`
from listing pages).

---

## Map Issues

### Leaflet map shows grey tiles / no map tiles

**Symptom**: The map renders but shows an empty grey background.

**Root cause**: OpenStreetMap tiles are loaded at runtime from
`https://{s}.tile.openstreetmap.org/`. This requires internet access in the
browser and the CDN must be reachable.

**Fix**:
- Verify your internet connection.
- Check the browser console for CORS or mixed-content errors.
- If running in a restricted network, configure a self-hosted tile server
  and update the tile URL in `components/ListingsMap.tsx` and
  `components/PropertyMap.tsx`.

---

### Map pins cluster or overlap

**Symptom**: Many pins are stacked on top of each other.

**Root cause**: Multiple listings share the same or very close coordinates
(same building or address range).

**Fix**: This is cosmetic. If you want clustering, add the `leaflet.markercluster`
plugin. The current implementation renders all 50 pins without clustering.

---

## Analysis Panel Issues

### Panel opens but shows skeleton indefinitely

**Symptom**: Clicking a property shows the loading skeleton but it never
resolves to the actual analysis.

**Root cause**: The `POST /api/analyze-property` request is failing or hanging.

**Fix**:
1. Open DevTools → Network. Find the `analyze-property` request.
2. If status is 4xx: check the request body — `propertyId` may be missing.
3. If status is 5xx: check `vercel logs --follow` for the server error.
4. If the request hangs: check if the FRED fetch is hanging (FRED is slow or
   unreachable). The 24h ISR cache means FRED is rarely called, but on cold
   starts it runs inline.

---

### "Property '...' not found" error in the panel

**Symptom**: The panel shows an error message with this text.

**Root cause**: The `propertyId` passed to the API does not match any entry in
`data/properties.json`.

**Fix**: IDs are strings like `"prop_001"` through `"prop_050"`. Check that
the property card is passing the correct `p.id` value.

---

## Language Toggle Issues

### Language reverts to English on reload

**Symptom**: User sets Spanish, reloads, gets English.

**Root cause**: The language preference is stored in `localStorage` under the
key `"propintel.lang"`. If `localStorage` is unavailable (private browsing in
some browsers) or was cleared, the preference is lost.

**Fix**: This is expected behavior in private/incognito mode. There is no fix
without a server-side session (which would require auth). For a public demo,
this is acceptable.

---

## TypeScript Errors

### "Type 'null' is not assignable to type 'AnalysisResult'"

**Symptom**: TypeScript error when working with the analysis state.

**Root cause**: `analysis` state in `Dashboard.tsx` starts as `null` (no
analysis loaded yet). Components that receive it must handle `null`.

**Fix**: Check for null before rendering:
```tsx
{analysis && <AnalysisPanel property={panelProp} analysis={analysis} />}
```

---

### Adding a field to `Property` breaks the build

**Symptom**: TypeScript errors across multiple files after adding a field to
`lib/types.ts`.

**Root cause**: `data/properties.json` (the runtime data) does not have the
new field. TypeScript infers that the JSON matches the `Property` interface.

**Fix**: In `lib/data.ts`, the JSON is cast:
```ts
const properties = propertiesJson as Property[];
```
This cast trusts the JSON to match the interface. After adding a new field to
the interface, you must also add it to every entry in `data/properties.json`,
or make the field optional in the interface (`newField?: string`).
