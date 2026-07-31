#!/usr/bin/env python3
"""W-A2 negative control (D119): treat a missing-hit-die class as guideable —
the exact 'mark-missing-hit-die-guideable' mutation codex named. The disabled
discrimination collapses: no class is ever disabled, no_guideable_class becomes
unreachable, and the D119 integration assertions must fail. Saved-copy revert."""
import sys, shutil, os

PATH = '/home/vagrant/PhpstormProjects/dnd-wt-print/src/queries/level-up-state.ts'
SAVE = os.path.dirname(os.path.abspath(__file__)) + '/level-up-state-wa2.ts.pre-mutation'
ORIG = """    const disabledOptions = eligibleHeldClasses
      .filter(
        (entry): entry is HeldClassRow & { readonly hit_die: null } =>
          entry.hit_die === null,
      )
      .map((entry) => this.#disabledClassOption(entry));
    const guideableHeldClasses = eligibleHeldClasses.filter(
      (entry): entry is HeldClassRow & { readonly hit_die: HitDieSize } =>
        entry.hit_die !== null,
    );"""
MUT = """    const disabledOptions = eligibleHeldClasses
      .filter(
        (entry): entry is HeldClassRow & { readonly hit_die: null } => false,
      ) // MUTANT: missing hit die marked guideable
      .map((entry) => this.#disabledClassOption(entry));
    const guideableHeldClasses = eligibleHeldClasses.filter(
      (entry): entry is HeldClassRow & { readonly hit_die: HitDieSize } =>
        true,
    );"""

mode = sys.argv[1]
src = open(PATH).read()
if mode == 'apply':
    assert src.count(ORIG) == 1, f'anchor count {src.count(ORIG)}'
    shutil.copyfile(PATH, SAVE)
    open(PATH, 'w').write(src.replace(ORIG, MUT))
    assert 'MUTANT: missing hit die marked guideable' in open(PATH).read()
    print('APPLIED')
elif mode == 'revert':
    assert os.path.exists(SAVE)
    shutil.copyfile(SAVE, PATH)
    after = open(PATH).read()
    assert ORIG in after and 'MUTANT' not in after
    print('REVERTED from saved copy')
