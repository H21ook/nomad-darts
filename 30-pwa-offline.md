# PWA + Offline (Goal 1)

## Current Implementation

- next-pwa: @ducanh2912/next-pwa
- next.config: PWA enabled in production only (disabled in development)
- register: true
- dest: public

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
