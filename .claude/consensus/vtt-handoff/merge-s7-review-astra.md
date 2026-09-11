1. **F96 — Medium: reconciliation drops two S7 platform guards.** [engine-boundary.test.ts:194](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/engine-boundary.test.ts:194) omits `Document` and `HTMLElement`, both explicitly forbidden in `9a5767f9:tests/unit/vtt/engine-boundary.test.ts:195`. The merged analyzer therefore allows `void new Document()` or `void HTMLElement.prototype` through its platform gate; the S7 analyzer resolved and rejected those DOM declarations. Preserve S6’s symbol/provenance analyzer while restoring both names and corresponding controls. This is a merge-introduced loss, separate from the excluded F83 residual.

All **17 test declarations** survive. Names and lines below refer to [engine-boundary.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/engine-boundary.test.ts:706); the pinned-edge name intentionally appears twice, preserving both graphs.

| Assertion present | Line |
|---|---:|
| recognizes static, re-export, side-effect, import-equals, dynamic, and require value edges | 706 |
| resolves every value-import form and transitive platform dependency | 729 |
| keeps the browser WebSocket adapter platform-neutral | 735 |
| catches the direct platform control at its exact use site | 742 |
| catches the alias platform control at its exact resolved use site | 748 |
| catches the destructuring platform control at its exact resolved use site | 757 |
| catches the computed-property platform control at its exact use site | 766 |
| catches the bare-builtin platform control at its exact import site | 772 |
| all runtime entries converge on the pinned session reducer edges | 777, 822 |
| rejects bare Node builtins plus aliased, destructured, and computed browser globals | 788 |
| all renderer adapters converge on the session service | 826 |
| rejects source-mutated reducer and service bypasses | 840 |
| top-down UI mutations enter the rich session service | 871 |
| top-down UI constructs no reducer command literals | 908 |
| all runtime entries converge after top-down refactor | 918 |
| keeps the complete selector value graph projection-only and platform-neutral | 928 |

The replacement expectations at [line 788](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/engine-boundary.test.ts:788) preserve exact cardinality, filename and diagnostic suffix while allowing the randomized temporary-directory prefix. Alias and destructuring controls additionally require the resolved use sites; computed access remains exact, and shadowed-local remains `[]`. These replacements preserve or strengthen the relevant proof.

**F89’s graph-root omission is genuinely closed:** [line 735](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/engine-boundary.test.ts:735) traverses the WebSocket adapter’s value dependencies and invokes the symbol/provenance analyzer. Adding `const browser = globalThis; browser.document.createElement('div');` to `websocket-transport.ts` would produce violations and fail its empty-set assertion. This source-based assessment does not negate F96’s narrower constructor regression.

The [runtime roots](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/engine-boundary.test.ts:647) include Node and WebSocket, including their paired adapter graph. The [six permitted reducer edges](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/unit/vtt/engine-boundary.test.ts:16) match both parents’ expectations. S8’s combined graph now includes those runtime roots; S7’s adapter-only assertion still excludes `encounter-app.ts`.

[Package scripts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/package.json:44) preserve every parent script unchanged. [Filesystem exports](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tests/helpers/test-filesystem.ts:5) retain both parents’ operations, including `chmodSync`, `closeSync`, `openSync` and `truncateSync`.

All **18 automatically merged S7 files are byte-identical to the S7 parent**. Runtime/service spot-checks found no semantic conflict: [Node constructs the base service](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/node-runtime.ts:98), S8 adds a [separate rich subclass](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/src/vtt/encounter-session-service.ts:642), and the base methods consumed by `ProtocolRuntime` remain unchanged. The in-process buffering and protocol guard also survive intact.

No tests, builds, edits or agents were used. The sole merge blocker identified is F96’s lost guard coverage.

REJECT MERGE