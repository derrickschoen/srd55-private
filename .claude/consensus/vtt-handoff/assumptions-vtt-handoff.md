# Assumption register — VTT-HANDOFF-01 (opened 2026-09-09 15:37 EDT)

Format: A<n> | claim | status proved/disproved/unproved | method + raw evidence | load-bearing for.

A1 | The distribution is Ubuntu and the repo path is the named one, not a lookalike | proved | /etc/os-release NAME="Ubuntu" 22.04.5; git rev-parse --show-toplevel = /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static; remote mirror srd55-private | everything
A2 | wslpath -w of .tmp/vtt-handoff equals the owner's Windows view path | proved | wslpath output byte-equal to the spec path | handoff root, Windows probe
A3 | The encounter app runs the engine on the main thread; no VTT Web Worker exists | proved (by grep: only db/worker.ts and browser-capability-worker.ts construct Workers) | missing-component record; Worker runtime is NEW work
A4 | No network engine listener exists in production (serve.mjs is static; MCP is stdio; ai-bridge is dev-only) | unproved (dm-bridge /dm/* server side not yet located) | Node adapter design
A5 | python3 -m venv fails without sudo; --without-pip + pip --python works user-locally | proved | venv exit 1 (ensurepip); without-pip + pip 26.2.1 installed into probe venv | bootstrap script
A6 | The existing art/requests uuidv7() is untested | proved | grep tests for uuidv7: none | art:request must add a tested implementation
A7 | Gate port 4410 is free and outside the Playwright default pool | proved | ss -ltn | lane Playwright runs
A8 | Baseline gate battery (npm run typecheck/test/build/test:browser) passes on main @ 0f84e09f | unproved (cannot run while the D569 arm occupies the box) | §8 baseline; must run before the first implementation step
