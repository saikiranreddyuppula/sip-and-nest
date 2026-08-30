# Browser checks

`test/site.spec.ts` runs inside the Workers runtime, which has no DOM — so the
two inline scripts in `src/html.ts` (the slip, the pickup-slot trimming, the
theme toggle, the open/closed chip) are invisible to it. These specs cover that
half, driving a real Chromium against a running dev server.

They are deliberately not part of `npm test`: they need a browser binary and a
server on port 8787, which not every checkout will have.

```sh
npm run dev                 # in one shell
npm run test:browser        # in another
```

`playwright-core` is a dev dependency; it expects a Chromium at
`$CHROMIUM_PATH`, or falls back to Playwright's own download location.
