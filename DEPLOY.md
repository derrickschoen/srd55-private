# Deployment — Cloudflare Pages

This is a static-only app (Vite build → `dist/`). No server, no Functions.

## What's configured

- **`wrangler.toml`** — declares the Pages project and `pages_build_output_dir = "dist"`.
- **`public/_headers`** — wasm/asset cache-control (immutable, 1-year) + `no-cache` on
  `index.html` + baseline security headers. Vite copies `public/*` to the `dist/` root.
- **`public/_redirects`** — SPA fallback (`/* /index.html 200`) so deep links to client
  routes resolve.

Cross-origin isolation (COOP/COEP) is deliberately **not** set — the `opfs-sahpool`
SQLite VFS needs no special headers, which is why it works on any host. The commented
lines in `_headers` show how to enable `SharedArrayBuffer` later if ever needed.

## Deploying

### Option A — Git integration (recommended once the repo is on GitHub/GitLab)
1. Push this repo to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Build command: `npm run build`  •  Build output directory: `dist`  •  Node: 20+.
4. Every push builds; each branch/PR gets a preview URL.

### Option B — Direct upload via Wrangler CLI (no GitHub needed)
```bash
npm run build
npx wrangler pages deploy dist --project-name srd-55
```
First run prompts a Cloudflare login and creates the project.

## Notes
- `_headers`/`_redirects` are Cloudflare-specific and ignored by other hosts, so keeping
  them costs nothing if you also test on GitHub Pages.
- OPFS persistence is browser-side and identical regardless of host; call
  `navigator.storage.persist()` and offer DB/character export as the real durability
  guarantee (OPFS can be evicted).
