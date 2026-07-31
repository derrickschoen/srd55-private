#!/usr/bin/env python3
"""LU-1 negative control: migrateV15ToV16 INVENTS a feat-choice slot (empty
array instead of the absent null). The named test 'migrates a v15 document to
v16 with feat choices absent, not invented' must fail. Saved-copy revert."""
import sys, shutil, os

PATH = '/home/vagrant/PhpstormProjects/dnd-wt-attunement/src/sharing/wire-schemas/index.ts'
SAVE = os.path.dirname(os.path.abspath(__file__)) + '/wire-index-lu1.ts.pre-mutation'
ORIG = """  const migrated = [...document, null];
  const versionIndex = WIRE_SCHEMA_V15.tuples.root.fields.findIndex("""
MUT = """  const migrated = [...document, []]; // MUTANT: invented empty list
  const versionIndex = WIRE_SCHEMA_V15.tuples.root.fields.findIndex("""

mode = sys.argv[1]
src = open(PATH).read()
if mode == 'apply':
    assert src.count(ORIG) == 1, f'anchor count {src.count(ORIG)}'
    shutil.copyfile(PATH, SAVE)
    open(PATH, 'w').write(src.replace(ORIG, MUT))
    assert 'MUTANT: invented empty list' in open(PATH).read()
    print('APPLIED')
elif mode == 'revert':
    assert os.path.exists(SAVE)
    shutil.copyfile(SAVE, PATH)
    after = open(PATH).read()
    assert ORIG in after and 'MUTANT' not in after
    print('REVERTED from saved copy')
