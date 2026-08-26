import { describe, expect, it } from 'vitest';
import { AUTHORING_RPC } from '../../src/authoring/client';
import {
  CHARACTER_EFFECT_FORM,
  FEATURE_ONLY_EFFECT_FORM,
} from '../../src/authoring/effect-forms';
import {
  characterEffectKinds,
  featureTemplateEffectKinds,
} from '../../src/domain/enums';

describe('authoring contract seam', () => {
  it('pins the twenty-two catalog RPC names', () => {
    expect(AUTHORING_RPC).toEqual({
      list: 'authoring.list',
      backgroundReferences: 'authoring.backgroundReferences',
      spellGrantReferences: 'authoring.spellGrantReferences',
      createDraft: 'authoring.createDraft',
      readDraft: 'authoring.readDraft',
      saveDraft: 'authoring.saveDraft',
      discardDraft: 'authoring.discardDraft',
      previewPublish: 'authoring.previewPublish',
      commitPublish: 'authoring.commitPublish',
      usages: 'authoring.usages',
      previewReplacement: 'authoring.previewReplacement',
      commitReplacement: 'authoring.commitReplacement',
      previewReplacementSet: 'authoring.previewReplacementSet',
      commitReplacementSet: 'authoring.commitReplacementSet',
      previewArchiveSet: 'authoring.previewArchiveSet',
      commitArchiveSet: 'authoring.commitArchiveSet',
      listArchivedSets: 'authoring.listArchivedSets',
      previewRestoreSet: 'authoring.previewRestoreSet',
      commitRestoreSet: 'authoring.commitRestoreSet',
      purgeArchivedSet: 'authoring.purgeArchivedSet',
      previewBundledHomebrew: 'authoring.previewBundledHomebrew',
      installBundledHomebrew: 'authoring.installBundledHomebrew',
    });
  });

  it('maps every live effect kind and only those kinds', () => {
    expect(Object.keys(CHARACTER_EFFECT_FORM).sort()).toEqual(
      [...characterEffectKinds].sort(),
    );
    expect(Object.keys(FEATURE_ONLY_EFFECT_FORM).sort()).toEqual(
      featureTemplateEffectKinds
        .filter(
          (kind) =>
            !(characterEffectKinds as readonly string[]).includes(kind),
        )
        .sort(),
    );
  });
});
