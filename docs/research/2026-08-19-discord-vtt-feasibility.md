# Discord as a VTT surface — feasibility research (2026-08-19)

Researched by a web-research subagent at the owner's request; sources cited
inline. Summary of the full findings (verbatim report preserved below the
verdict) — see the session for provenance.

## Verdict — three realistic shapes

1. **Screen-share only (status quo).** Zero extra engineering; matches draft 1.
   No player-side interactivity.
2. **Bot-relay hybrid.** A bot posts rendered map snapshots + slash-command /
   button moves, attacks, dice (the Avrae model generalized with a map image).
   Moderate effort, no Activity constraints, but turn-based command-response —
   no live token dragging.
3. **Discord Activity hosting our client.** Highest fidelity — live shared map
   inside the voice call — but the Activity proxy **does not support WebRTC**
   (official networking docs), so Trystero/manual-SDP cannot run; Yjs sync
   must move to y-websocket against a thin always-on relay, and OAuth needs a
   server-side token exchange. That contradicts the project's no-server design
   goal — an owner scope decision, not a deployment tweak. Private use needs
   NO Discord review: unverified Activities run in servers under 25 members /
   test mode / up to 50 app testers.

## Key facts

- Activities = iframe apps in voice channels via @discord/embedded-app-sdk;
  all traffic proxied through https://{clientId}.discordsays.com (Cloudflare
  Workers); WebSockets only, WebRTC explicitly unsupported, WebTransport "under
  development". External assets must be URL-mapped or bundled same-origin.
- Multiplayer sync: no Discord primitive; reference apps (Colyseus, Robo.js)
  use their own WebSocket game server keyed by voice channelId. Pure P2P among
  participants with zero server is not achievable today.
- Monetization not required to publish; verification only needed for the
  public directory.
- Prior art, professional: Avrae (D&D Beyond) is a TEXT bot — sheet-linked
  /attack, /cast, initiative tracker, no map. No official D&D Beyond Activity.
  First-party Activities (Chess in the Park, Poker Night, Colonist) prove
  synchronous turn-based board multiplayer works at production quality.
- Prior art, amateur: NO grid/token/fog VTT Activity found anywhere (GitHub,
  itch.io) — a genuine gap; dice bots and standalone tools only.

Sources: docs.discord.com/developers/activities/development-guides/networking,
github.com/discord/embedded-app-sdk, support-dev.discord.com articles
21692628851351 & 26576097154199, docs.colyseus.io/getting-started/discord-activity,
avrae.io + github.com/avrae/avrae, discord.com/blog/server-activities-games-voice-watch-together,
blog.colonist.io/play-colonist-on-discord, dndbeyond.com/posts/2223.
