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

## Local AI helper (dev server only, never deployed)

`npm run dev` also serves a small panel, bottom-right, that sends a question plus
the planner's existing build-reference JSON to the local `claude` CLI and streams
the reply back as text. It needs the CLI on `PATH` and an authenticated login;
with neither, the panel does not appear, no request is made, and the page behaves
exactly as it does today.

What it is not:

- **Not a way to run anything.** The argv is a frozen constant naming exactly one
  program, and nothing derived from a request reaches it — the prompt travels on
  stdin. The CLI is invoked with `--tools ""`, `--setting-sources ""` and
  `--strict-mcp-config`, and every run additionally *asserts*, from the CLI's own
  init event, that it started with zero tools and zero MCP servers. If that ever
  stops being true the run is aborted instead of streamed.
- **Not authenticated by being local.** Assume any page in your browser can reach
  the port. Admission requires POST, a per-run secret injected only into the
  dev-served HTML, and a matching `Origin`; `server.cors: false` is what stops a
  hostile page from completing the preflight that the custom header forces.
- **Not a source of truth.** The reply is text and can never change a character.
  This CLI will describe running commands it did not run.

```bash
npm run test:live      # OPT-IN: re-checks the claims above against the real CLI.
                       # Costs money, needs the network and a login.
```

It must never ship, which `npm run build` enforces by scanning `dist/` for its
literals (`tools/assert-dist-clean.mjs`) after every build.

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
