import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from '../../helpers/test-filesystem';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));

function repositoryText(path: string): string {
  return readFileSync(join(repositoryRoot, path), 'utf8');
}

function jsonRecord(path: string): Record<string, unknown> {
  const value: unknown = JSON.parse(repositoryText(path));
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} must contain a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function recordField(
  record: Readonly<Record<string, unknown>>,
  field: string,
): Record<string, unknown> {
  const value = record[field];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function stringArrayField(
  record: Readonly<Record<string, unknown>>,
  field: string,
): readonly string[] {
  const value = record[field];
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) {
    throw new TypeError(`${field} must be an array of strings.`);
  }
  return value;
}

function verificationGuidance(source: string): string {
  const heading = '## Verification, non-delegable';
  const start = source.indexOf(heading);
  if (start < 0) throw new TypeError(`Missing ${heading} section.`);
  const afterHeading = start + heading.length;
  const nextHeading = source.slice(afterHeading).search(/^## /mu);
  return nextHeading < 0
    ? source.slice(start)
    : source.slice(start, afterHeading + nextHeading);
}

const evidenceByIncrement = [
  ['tests/unit/schema.test.ts', 'progress/B00.md'],
  ['tests/unit/db/query.test.ts', 'tests/unit/db/transaction.test.ts', 'progress/B00.md'],
  ['tests/unit/rules/value-objects.test.ts', 'tests/integration/rules/class-progression.test.ts', 'progress/R10.md'],
  ['tests/unit/grants/grant-rule.test.ts', 'progress/G10.md'],
  ['tests/integration/grants/slot-generator.test.ts', 'progress/G20.md'],
  ['tests/integration/eligibility/persistence.test.ts', 'progress/E10.md'],
  ['tests/integration/access/spell-access.test.ts', 'progress/A30.md'],
  ['tests/unit/duplicates/detector.test.ts', 'progress/D10.md'],
  ['tests/integration/reports/build-report.test.ts', 'progress/R40.md'],
  ['tests/browser/reports-and-print.spec.ts', 'progress/P50.md'],
  ['tests/unit/commands/payload-validator.test.ts', 'tests/unit/commands/integrity.test.ts', 'progress/V10.md'],
  ['tests/integration/commands/ability-and-slot.test.ts', 'progress/C41.md'],
  ['tests/integration/commands/rules-and-sources.test.ts', 'progress/C42.md'],
  ['tests/integration/commands/warnings-class-and-snapshot.test.ts', 'progress/C43.md'],
  ['tests/integration/commands/executor.test.ts', 'tests/integration/commands/idempotency.test.ts', 'progress/X50.md'],
  ['tests/browser/command-rpc.spec.ts', 'tests/unit/db/database-worker-boot.test.ts', 'progress/B00.md'],
  ['tests/integration/queries/rpc.test.ts', 'progress/Q60.md'],
  ['tests/integration/catalog/import.test.ts', 'tests/browser/catalog-import.spec.ts', 'progress/C20.md'],
  ['tests/integration/backup/round-trip.test.ts', 'tests/browser/backup.spec.ts', 'progress/B20.md'],
  ['tests/browser/character-list.spec.ts', 'progress/U70.md'],
  ['tests/browser/planner.spec.ts', 'progress/U71.md'],
  ['tests/browser/reports-and-print.spec.ts', 'progress/U72.md'],
  ['tests/parity/php-unit-parity.test.ts', 'progress/T80.md'],
  ['tests/browser/php-feature-parity-commands.spec.ts', 'progress/T81.md'],
  ['PARITY-AUDIT.md', 'progress/S90.md'],
] as const;

describe('operational guidance facts', () => {
  it('compile and concurrency guidance agrees with executable configuration', () => {
    const packageJson = jsonRecord('package.json');
    const scripts = recordField(packageJson, 'scripts');
    expect(scripts['build']).toEqual(expect.stringContaining('tsc -b'));
    expect(scripts['typecheck']).toEqual(expect.stringContaining('tsc -b'));

    const rootConfig = jsonRecord('tsconfig.json');
    expect(rootConfig['files']).toEqual([]);
    const references = rootConfig['references'];
    if (!Array.isArray(references)) throw new TypeError('references must be an array.');
    expect(references.map((reference) => recordField({ reference }, 'reference')['path']))
      .toEqual(['./tsconfig.app.json', './tsconfig.node.json']);
    expect(stringArrayField(jsonRecord('tsconfig.app.json'), 'include')).toEqual(['src']);
    expect(stringArrayField(jsonRecord('tsconfig.node.json'), 'include')).toEqual([
      'vite.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
      'src/vite-env.d.ts',
      'db',
      'scripts',
      'tests',
      'tools',
    ]);

    const supervision = repositoryText('.claude/supervision.md');
    const guidance = verificationGuidance(supervision);
    expect(guidance).toMatch(/^- Compile gate is `npx tsc -b --force`\./mu);
    expect(guidance).not.toMatch(
      /^- Compile gate is `npx tsc -p tsconfig\.app\.json --noEmit`/mu,
    );
    expect(guidance).toContain(
      'Ordinary project mode (`npx tsc -p tsconfig.json --noEmit`) checks no source',
    );
    expect(guidance).toContain('D263 requires build mode');
    expect(guidance).toMatch(
      /2026-09-03 14:30\s+supervisor finding requires `--force`/u,
    );
    expect(guidance).toMatch(
      /records the\s+forced compile command and supervisor finding/u,
    );
    expect(guidance).toContain('Run gates under load and let lanes keep flowing.');
    expect(guidance).toMatch(/one serial\s+rerun under the gate lock/u);
    expect(guidance).toMatch(
      /Full Vitest, Playwright, and production builds remain serialized through\s+`\/tmp\/dnd-gate\.lock`/u,
    );
    expect(guidance).toContain('/tmp/dnd-gate.lock');
    expect(guidance).toContain('run no Vitest while Playwright owns that lock');
    expect(guidance).toContain('D544/D606/D613');
    expect(guidance).toContain('unique port');
    expect(supervision).not.toContain('One suite-running lane at a time.');
    expect(guidance).toMatch(
      /serialization and the locked retry remain in\s+`\.claude\/RULES\.md:47-50`/u,
    );
    for (const authority of ['D263', 'D587.3', 'D544', 'D606', 'D613', 'M-3']) {
      expect(guidance).toContain(authority);
    }
  });

  it('the completed historical plan has evidence for every increment', () => {
    const plan = repositoryText('BUILD-PLAN.md');
    const rows = plan.split('\n').filter((line) => /^\|\s*\d+\s*\|/u.test(line));
    expect(rows).toHaveLength(25);
    expect(plan).toContain(
      '**Historical plan — completed 2026-07-23.** This file records the original',
    );
    expect(plan).toMatch(
      /Current operating rules are `\.claude\/RULES\.md` under the newest controlling\s+entries in `\.claude\/decisions\.md`/u,
    );
    expect(plan).toMatch(
      /executable compile configuration lives in\s+`package\.json` and `tsconfig\*\.json`/u,
    );
    expect(plan).toMatch(
      /implementation evidence lives in\s+`BUILD-PROGRESS\.md`, `progress\/`, `PARITY-AUDIT\.md`, and the retained tests/u,
    );
    expect(plan).toContain(
      '| # | Status | Increment | Independently verifiable exit criteria | Evidence |',
    );
    expect(plan).not.toContain('current Inertia/Vue screens are\nthe parity oracle');
    expect(plan).toContain('ancestor/regression evidence, not a binding oracle (D201)');

    rows.forEach((row, index) => {
      const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
      expect(cells).toHaveLength(5);
      expect(cells[0]).toBe(String(index + 1));
      expect(cells[1]).toBe('done');
      const evidence = cells[4]!;
      for (const path of evidenceByIncrement[index]!) {
        expect(evidence).toContain(`\`${path}\``);
        expect(existsSync(join(repositoryRoot, path)), path).toBe(true);
      }
    });
  });

  it('the SpellLevel comment and narrowing implementation agree', () => {
    const ids = repositoryText('src/domain/ids.ts');
    expect(ids).toContain(
      'The character spell-section read boundary in\n' +
      ' * `src/queries/character-spell-section-builder.ts` maps `-1` to the typed',
    );
    expect(ids).toContain('brands only validated integers in 0..9 as');
    expect(ids).toMatch(/`SheetSpellLevel`\s+unknown arm/u);
    expect(ids).toContain('and rejects every other stored value.');
    expect(ids).not.toContain('Nothing narrows `-1` away today');

    const builder = repositoryText('src/queries/character-spell-section-builder.ts');
    expect(builder).toContain("| { readonly status: 'known'; readonly value: SpellLevel }");
    expect(builder).toContain("readonly reason: 'placeholder_level';");
    expect(builder).toContain('if (value === -1)');
    expect(builder).toContain('Number.isInteger(value) && value >= 0 && value <= 9');
    expect(builder).toContain('return { status: \'known\', value: value as SpellLevel };');
    expect(builder).toContain('throw new CharacterSpellLevelError(value);');
    expect(builder).toContain("level: spellLevel(sqlInteger(row, 'level'))");
  });
});
