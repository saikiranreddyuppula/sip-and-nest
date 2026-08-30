# Sip & Nest

Specialty cafe site for Sai Reddy (Holly Springs, NC). Cloudflare Worker + D1 + Hono.

- Site: https://sipandnest.com
- Order ahead without payment; pay at pickup.

The whole front end is server-rendered from `src/html.ts`: template literals, one
inlined `<style>`, and two small inline scripts. There is no build step and no
external font, script or image host — the page is self-contained, which a test
enforces.

## Local development

```sh
npm install
npm run types                    # generates worker-configuration.d.ts
npm run db:migrate:local         # seeds the local D1 database
npm run dev                      # http://127.0.0.1:8787
```

```sh
npm test                         # vitest against the Worker + a local D1
npm run typecheck                # tsc --noEmit (run `npm run types` first)
```

## Layout

| Path | What lives there |
| --- | --- |
| `src/html.ts` | every page, the design tokens and CSS, the cart script |
| `src/index.ts` | routes |
| `src/db.ts` | queries and order validation |
| `src/config.ts` | address, hours, phone, pickup slots |
| `migrations/` | schema and the seeded menu |
| `public/` | photography, icons, and `_headers` |

`public/` is the deployed asset bundle, and Workers Assets answers those paths
*before* the Worker runs — so caching for `/img/*` is declared in
`public/_headers`, not in a route. Anything deleted from `public/` disappears
from the live site on the next deploy.

## Deploy

```sh
npm run deploy                   # applies remote migrations, then deploys
```
