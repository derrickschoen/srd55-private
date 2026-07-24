# Local development & browser testing (no Cloudflare required)

The app is a static Vite build. Everything below runs entirely on your machine with
no Cloudflare account, no deploy, and no special HTTP headers — the `opfs-sahpool`
SQLite VFS works without cross-origin isolation, so plain `http://localhost` is enough.

## Run it in a browser

```bash
npm run dev            # Vite dev server (HMR) → open the printed http://localhost:5173
npm run dev -- --host  # also bind 0.0.0.0, e.g. so a Windows browser can reach WSL2
npx vite preview       # serve the PRODUCTION build in dist/ locally (see note below)
```

WSL2: `http://localhost:<port>` from the Windows browser normally works via WSL2's
localhost forwarding; if not, use `--host` and browse to the WSL IP.

## Automated browser tests

```bash
npm run test           # Vitest unit tests (Node)
npm run test:browser   # Playwright: real Chromium against a local Vite server
npm run test:all       # unit + production build + browser
```

`playwright.config.ts` starts `npm run dev` on 127.0.0.1:4173 itself — the browser
tests are the standing proof that the app works in a real browser with no Cloudflare.

## dev vs. production build

Dev serves unbundled ESM with HMR; the production build bundles and hashes assets and
resolves the **Web Worker and SQLite wasm URLs differently**. Always sanity-check the
built output with `npx vite preview` (or `npm run test:all`) before deploying, since
some worker/wasm loading issues only appear in the bundled build.

## Checking the Cloudflare `_headers` / `_redirects` locally (optional)

Vite ignores `_headers`/`_redirects`. To exercise them offline without deploying:

```bash
npx wrangler pages dev dist   # Cloudflare Pages emulator, local only (no account/deploy)
```

This is optional — only needed to verify caching/redirect behavior, not app function.
