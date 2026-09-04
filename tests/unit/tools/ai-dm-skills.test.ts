import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { sha256 } from '../../../src/crypto/sha256';
import { buildIsolatedCodexHome } from '../../../tools/ai-dm-conversation';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from '../../helpers/test-filesystem';
import { declareTestInputs } from '../../helpers/test-inputs';

const inputs = declareTestInputs({
  fixtures: [
    'tests/fixtures/ai-dm-skills/engine-submission/SKILL.md',
    'tests/fixtures/ai-dm-skills/dm-round/SKILL.md',
  ],
});

function temporaryOperatorHome(root: string): string {
  const operatorHome = join(root, 'operator-home');
  mkdirSync(operatorHome, { recursive: true });
  writeFileSync(join(operatorHome, 'auth.json'), '{"SIMULATED":true}\n', 'utf8');
  writeFileSync(join(operatorHome, 'config.toml'), 'model = "SIMULATED"\n', 'utf8');
  return operatorHome;
}

describe('AI-DM arena skill fixtures', () => {
  it.each([
    ['engine-submission', 'tests/fixtures/ai-dm-skills/engine-submission/SKILL.md'],
    ['dm-round', 'tests/fixtures/ai-dm-skills/dm-round/SKILL.md'],
  ] as const)('keeps %s canonical, scoped, and under 4096 bytes', (name, path) => {
    const text = inputs.fixtures.readText(path);
    expect(new TextEncoder().encode(text).byteLength).toBeLessThanOrEqual(4096);
    expect(text.startsWith(`---\nname: ${name}\ndescription:`)).toBe(true);
    expect(text).not.toMatch(/\b(?:BG3|Nimble)\b/iu);
    expect(text).toContain('root knowledge base');
  });

  it.each(['engine-submission', 'dm-round'] as const)(
    'builds a %s CODEX_HOME with one byte-identical selected skill',
    async (skill) => {
      const artifacts = mkdtempSync(join(tmpdir(), 'dnd-skill-home-SIMULATED-'));
      const operatorHome = temporaryOperatorHome(artifacts);
      const fixturePath = join(process.cwd(), 'tests/fixtures/ai-dm-skills', skill, 'SKILL.md');
      const fixture = readFileSync(fixturePath, 'utf8');
      const result = await buildIsolatedCodexHome(artifacts, {
        cwd: process.cwd(), instructionSource: 'skill', skill, kbPath: null,
      }, operatorHome);

      expect(readdirSync(result.codexHome).sort()).toEqual(['auth.json', 'config.toml', 'skills']);
      expect(readdirSync(join(result.codexHome, 'skills'))).toEqual([skill]);
      expect(readdirSync(join(result.codexHome, 'skills', skill))).toEqual(['SKILL.md']);
      expect(readFileSync(join(result.codexHome, 'skills', skill, 'SKILL.md'), 'utf8')).toBe(fixture);
      expect(result.skillHash).toBe(sha256(fixture));
    },
  );

  it.each(['none', 'kb'] as const)('builds a %s CODEX_HOME with no skills', async (source) => {
    const artifacts = mkdtempSync(join(tmpdir(), 'dnd-control-home-SIMULATED-'));
    const operatorHome = temporaryOperatorHome(artifacts);
    const result = await buildIsolatedCodexHome(
      artifacts,
      source === 'none'
        ? { cwd: process.cwd(), instructionSource: 'none', skill: null }
        : {
            cwd: process.cwd(), instructionSource: 'kb', skill: null,
            kbPath: join(process.cwd(), 'tests/fixtures/ai-dm-kb/ai-dm-core.md'),
          },
      operatorHome,
    );

    expect(readdirSync(join(result.codexHome, 'skills'))).toEqual([]);
    expect(result.skillHash).toBeNull();
  });
});
