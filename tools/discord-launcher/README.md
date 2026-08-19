# Discord Activity session launcher spike

This disposable B1/A1 platform spike turns local Activity hosting into one
command. It starts a static client stub, a server-side OAuth code exchange, a
versioned WebSocket echo relay, and either a Cloudflare or ngrok tunnel. It does
not implement the Discord Embedded App SDK client, authentication of relay
peers, encounter state, or the increment-7 relay protocol.

## Run it

Node 24 and either `~/.local/bin/cloudflared` or `/usr/local/bin/ngrok` are
expected.

```sh
cp tools/discord-launcher/.env.example tools/discord-launcher/.env
node tools/discord-launcher/launcher.mjs
```

Cloudflared is the default. Set `TUNNEL=ngrok` to use ngrok. The launcher uses
`PORT`, `PORT + 1`, and `PORT + 2` for the public gateway, private token service,
and private relay respectively. Ctrl-C terminates all four child processes and
exits 0.

The generated `*.trycloudflare.com` hostname changes each run. The launcher
therefore prints a portal block containing the exact current target. Never put
the client secret or bot token in client-side code. The ignored `.env` is read
only at runtime.

Focused verification commands:

```sh
node --test tools/discord-launcher/launcher.test.mjs
node tools/discord-launcher/verify-e2e.mjs
E2E_TUNNEL=ngrok node tools/discord-launcher/verify-e2e.mjs
```

## Exact owner setup

1. Open the [Discord Developer Portal](https://discord.com/developers/applications),
   click **New Application**, and create a throwaway development app.
2. On **Installation**, enable the **User Install** and **Guild Install**
   installation contexts.
3. On **OAuth2**, under **Redirects**, add exactly `https://127.0.0.1` and click
   **Save Changes**. This is Discord's documented placeholder for an Activity;
   the Embedded App SDK handles the return to the Activity.
4. Still on **OAuth2**, copy **Client ID** and **Client Secret** into
   `tools/discord-launcher/.env` as `DISCORD_CLIENT_ID` and
   `DISCORD_CLIENT_SECRET`. Do not share or commit the secret.
5. Run `node tools/discord-launcher/launcher.mjs` and leave it running.
6. On **Activities > URL Mappings**, create the exact mapping printed by the
   launcher: **PREFIX** `/`; **TARGET** the tunnel hostname without `https://`.
   Save it. Reset or remove this mapping when the quick tunnel stops because
   the hostname is not owned or stable.
7. On **Activities > Settings**, turn **Enable Activities** on. Under
   **Supported Platforms**, enable every platform you intend to test.
8. In Discord, open **User Settings > App Settings > Advanced** and turn
   **Developer Mode** on. Enter a voice channel, open the App Launcher/Activity
   shelf, and launch the development Activity.

The launcher works without credentials and reports
`BLOCKED_ON_CREDENTIALS`; completing steps 1–4 is the owner-controlled blocker.
The optional `DISCORD_BOT_TOKEN` is only for the documented no-op PATCH probe
described below and is not needed for the Activity OAuth exchange.

Discord documents the placeholder redirect, server-side code exchange, portal
mapping, Activity enablement, and launch flow in [Building Your First
Activity](https://docs.discord.com/developers/activities/building-an-activity).

## `PATCH /applications/@me`: hard findings

Discord's official [Edit Current Application](https://docs.discord.com/developers/resources/application#edit-current-application)
schema accepts only these JSON fields:

- `custom_install_url`
- `description`
- `role_connections_verification_url`
- `install_params`
- `integration_types_config`
- `flags`
- `icon`
- `cover_image`
- `interactions_endpoint_url`
- `tags`
- `event_webhooks_url`
- `event_webhooks_status`
- `event_webhooks_types`

`redirect_uris` exists on the returned Application object but is **not** an
accepted Edit Current Application parameter. Activity URL mappings are also
**not** accepted. Therefore neither required portal value can be configured by
this documented PATCH endpoint.

The endpoint is documented as editing the app associated with the requesting
bot user, and all request fields are optional. If `DISCORD_BOT_TOKEN` is set,
the launcher makes a documented, non-mutating `PATCH` with `{}` and reports
only its HTTP status. Discord documents client-credentials Bearer tokens for
limited OAuth scopes such as `applications.commands.update`, not as
authorization for Edit Current Application; the launcher consequently does not
send a client-credentials token to this endpoint. See Discord's [OAuth2 client
credentials documentation](https://docs.discord.com/developers/topics/oauth2#client-credentials-grant).

The Developer Portal necessarily has private control-plane operations behind
its UI for redirects and Activity configuration, but Discord publishes no
supported REST contract for URL mappings and does not list redirect mutation on
Edit Current Application. Copying a browser-observed internal endpoint would
couple this launcher to an undocumented contract, could violate Discord's
expectations, and could silently break or mutate unrelated app configuration.
No such endpoint is called here.

## Hosting findings

Discord recommends local development through its proxy using a tunnel such as
cloudflared: create a development app, enable Activities, map `/` to the tunnel
hostname, run the local HTTP server, and leave Application URL Override off.
For production, Discord again requires `/` to map to the deployed HTML host and
URL Override to remain off. See Discord's [Local Development and production
flow](https://docs.discord.com/developers/activities/development-guides/local-development).

Cloudflare says Quick Tunnels are testing/development only, have no SLA or
uptime guarantee, and production should use a remotely managed named tunnel.
See [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/).
This means the one-command launcher proves local feasibility; it is not a
production hosting design. Production still needs a stable public host for the
client, OAuth endpoint, and WebSocket relay, plus cache busting, rate limits,
monitoring, and secret management. Discord's additional checklist is in
[Production Readiness](https://docs.discord.com/developers/activities/development-guides/production-readiness).

Discord's [Activity networking guide](https://docs.discord.com/developers/activities/development-guides/networking)
confirms that WebSockets are supported and WebRTC is not. The relay here is
deliberately unauthenticated and merely validates/echoes JSON envelopes with
`v: 1` and a string `type`; it must not be used beyond this spike.

## ngrok findings

Current ngrok [Free Plan Limits](https://ngrok.com/docs/pricing-limits/free-plan-limits)
say a free account has one automatically assigned development domain, may point
up to three online endpoints at it, and cannot choose a custom name, generate
random URLs, bring a custom domain, or create wildcard domains. The same page
says ngrok places an interstitial in front of all free-tier HTML browser traffic;
the visitor can suppress it for seven days with a cookie, and a request can
bypass it with `ngrok-skip-browser-warning` or a non-standard User-Agent.

Observed locally on 2026-08-19:

- No `NGROK_AUTHTOKEN` was supplied and the default ngrok config contained no
  non-empty `authtoken`, yet ngrok 3.35.0 opened a transient anonymous
  `*.ngrok-free.dev` endpoint. This anonymous behavior is not the documented
  free-account static-domain promise and should not be relied on.
- The launcher carried HTTP, POST, and WebSocket traffic through that endpoint.
- A browser-like HTML request received the ngrok interstitial; a Node request
  reached the stub.
- Whether Discord's Activity proxy request headers bypass the interstitial, or
  instead deliver it into the Activity iframe, is **UNVERIFIED** without owner
  credentials and a portal URL mapping. The interstitial therefore makes ngrok
  free tier unsafe to select for this Activity until tested inside Discord.

## Unverified Activity member limit

As checked 2026-08-19, Discord says an unverified Activity is visible only to
the owner/development team/app testers and can launch only in servers with
**fewer than 25 members**. That is `< 25` (at most 24), not `<= 25`. The owner's
table should use the strict wording. See [What are Verified and Unverified
Activities?](https://support-dev.discord.com/hc/en-us/articles/26576097154199-What-are-Verified-and-Unverified-Activities).

## Verification evidence

Cloudflared, no credentials:

```text
tunnel URL parsed: https://boutique-winning-dis-jacksonville.trycloudflare.com
public stub reachable: HTTP 200, marker present
credential-free token response: HTTP 424 {"error":"missing_discord_credentials"}
relay echo round-trip: v=1 type=e2e.echo
launcher SIGINT exit: code=0 signal=none
orphan check token pid=20: not running
orphan check relay pid=21: not running
orphan check client pid=22: not running
orphan check tunnel pid=41: not running
local listener check: ports closed
```

Ngrok, no explicit auth token:

```text
tunnel URL parsed: https://subordinately-postcephalic-nan.ngrok-free.dev
public stub reachable: HTTP 200, marker present
ngrok browser interstitial observed: true
credential-free token response: HTTP 424 {"error":"missing_discord_credentials"}
relay echo round-trip: v=1 type=e2e.echo
launcher SIGINT exit: code=0 signal=none
orphan check token pid=20: not running
orphan check relay pid=21: not running
orphan check client pid=22: not running
orphan check tunnel pid=41: not running
local listener check: ports closed
```
