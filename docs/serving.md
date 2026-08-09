# Serve SRD-55 locally and share it with ngrok

The supported v1 publication path serves a fresh production build on this
machine. From the repository root, run:

```sh
npm run serve
```

That command runs the complete production build first, including its existing
freshness and digest gates. It refuses to start the server if the build fails.
The default address is `http://127.0.0.1:4173`. To choose another port, use:

```sh
npm run serve -- --port 4200
```

`SERVE_PORT=4200 npm run serve` is equivalent. The server always binds to
`127.0.0.1`; it does not expose the repository or listen on the LAN.

Before sharing, check both of these in the command output:

- the build is fresh and completed successfully;
- the line beginning `bundled digest clean:` appears, with the aggregate count
  and SHA-256 digest, followed by the `dist clean:` line.

The server sends JavaScript modules as `text/javascript` because module loading
with `X-Content-Type-Options: nosniff` rejects a generic binary MIME type. It
sends the SQLite binary as `application/wasm` so the browser can use streaming
WebAssembly compilation. It deliberately does not send COOP or COEP headers:
SQLite uses the `opfs-sahpool` VFS, which works without cross-origin isolation.
The built-browser serving test proves readiness, reports
`crossOriginIsolated === false`, creates a character, activates the service
worker, and finds the same OPFS-backed character after a reload.

Run `npm run serve:check` before sharing.

## Open the tunnel

Starting the tunnel is the outward-facing action. In a second terminal, using
the same port passed to the server, run:

```sh
ngrok http 4173
```

For a private share, add HTTP basic authentication and replace the example
credentials before running it:

```sh
ngrok http 4173 --basic-auth='player:replace-this-password'
```

Only the owner starts this command (or explicitly asks for it to be started).
D228 rules: “The moment a real person creates a character through the tunnel,
D60's ‘data loss is not a stop condition’ FLIPS OFF.” Treat that first real
character as the boundary after which user data must be preserved.
