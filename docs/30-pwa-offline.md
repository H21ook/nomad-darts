# PWA + Offline (Goal 1)

## Current Implementation

- serwist: `@serwist/next` + `serwist` (migrated in commit e1d665b)
- next.config.ts: wrapped with `withSerwistInit`; PWA enabled in production only (disabled in development)
- swSrc: `src/sw.ts` → swDest: `public/sw.js`
- Service worker: precaches the build manifest, `skipWaiting` + `clientsClaim`, navigation preload, `defaultCache` runtime caching

## Manifest

- name: Darts Scoreboard
- standalone
- icons: 192/512

## What to Verify (Must)

- Production build дээр service worker бүртгэгдэж байна уу?
- Offline үед route navigation (/match/setup, /match) ажиллах уу?
- Offline үед mid-match score submit ажиллах уу?
- Refresh/close-open → redux-persist restore → Resume ажиллах уу?

## Config Risks

- runtime caching strategy тодорхойгүй (dynamic routes / fetch дээр offline асуудал гарч магад)
- SW update lifecycle (stale cache)

## DoD

- Installable (Chrome/Android)
- Offline smoke test pass
- Resume pass
