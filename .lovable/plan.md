

## Plan: Fix PWA Offline Capability

### Issues Found

1. **Conflicting service workers**: `public/sw.js` is a manual service worker that conflicts with VitePWA's auto-generated Workbox service worker. Both try to handle fetch events, cache management, and push notifications. The VitePWA-generated SW is the one actually registered by the app (via `virtual:pwa-register`), so `public/sw.js` is either dead code or, worse, gets served as a static asset and interferes.

2. **Background sync URL pattern is inverted**: The rule at line 58 matches storage paths that do NOT contain `line-media` — the exact opposite of the intent. It should match paths that DO contain `line-media`.

3. **Missing `/~oauth` in denylist**: Per platform requirements, `/~oauth` must never be cached by the service worker.

4. **No offline fallback for API failures**: When Supabase REST calls fail offline (beyond the 10-min cache), the app gets silent errors. The `LineMediaUploader` and other components don't handle offline gracefully.

### Changes

| File | Change |
|------|--------|
| `public/sw.js` | **Delete** — conflicts with VitePWA's Workbox SW |
| `vite.config.ts` | Fix background sync URL pattern; add `/~oauth` to denylist; add Supabase auth token endpoint to NetworkOnly |
| `src/components/line-builder/LineMediaUploader.tsx` | Add offline detection — queue uploads locally when offline, show pending indicator |
| `src/components/pwa/OfflineIndicator.tsx` | Improve to show sync status (pending uploads count) |

### Detail

**vite.config.ts** — three fixes:
- `navigateFallbackDenylist`: add `/^\/~oauth/`
- Background sync rule: change `!url.pathname.includes("line-media")` → `url.pathname.includes("line-media")` so it actually queues line-media uploads
- Add `NetworkOnly` for `/auth/v1/` paths (auth must never be cached)

**LineMediaUploader** — offline-aware uploads:
- Check `navigator.onLine` before upload
- If offline, save file to IndexedDB with metadata, show "Pending sync" badge
- When back online, replay queued uploads automatically
- Show count of pending items in the UI

**OfflineIndicator** — enhanced:
- Show pending upload count when offline items exist
- Animate sync icon when reconnecting and syncing

