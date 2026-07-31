#!/usr/bin/env python3
"""LU-2 negative control: swallow planned-subchoice failures inside the
level-up transaction, so a late spell-locator refusal no longer aborts the
command. The named test 'rolls class level, feat, skill fills, and Expertise
back on a late spell-locator refusal' must fail (no refusal surfaces, level
commits). Saved-copy revert."""
import sys, shutil, os

PATH = '/home/vagrant/PhpstormProjects/dnd-wt-attunement/src/commands/level-up-class.ts'
SAVE = os.path.dirname(os.path.abspath(__file__)) + '/level-up-class.ts.pre-mutation'
ORIG = """      this.applyPlannedSubchoices(
        characterId,
        classId,
        subclassId,
        featSourceId,
      );"""
MUT = """      try {
        this.applyPlannedSubchoices(
          characterId,
          classId,
          subclassId,
          featSourceId,
        );
      } catch { /* MUTANT: swallowed subchoice failure */ }"""

mode = sys.argv[1]
src = open(PATH).read()
if mode == 'apply':
    assert src.count(ORIG) == 1, f'anchor count {src.count(ORIG)}'
    shutil.copyfile(PATH, SAVE)
    open(PATH, 'w').write(src.replace(ORIG, MUT))
    assert 'MUTANT: swallowed subchoice failure' in open(PATH).read()
    print('APPLIED')
elif mode == 'revert':
    assert os.path.exists(SAVE)
    shutil.copyfile(SAVE, PATH)
    after = open(PATH).read()
    assert ORIG in after and 'MUTANT' not in after
    print('REVERTED from saved copy')
