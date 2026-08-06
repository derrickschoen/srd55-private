/**
 * Hand-authored identity reference captures. These are wire oracles, never
 * generated from the production encoder. The legacy-looking alias and
 * content.v1 key are inert strings in a frozen artifact; live key_kind values
 * remain bundled-stable | derived | asserted.
 */

const FORMAT = 'dnd-multiclass-spells-character-share';

export const IDENTITY_REFERENCE_KEYS = Object.freeze({
  stable: '2024:fireball',
  asserted: 'expanded:aether-lance',
  legacyAlias: 'expanded:legacy.fixture:aether-lance',
  fingerprintFallback:
    'expanded:content.v1:07ed8c09cafd5116ae6e594f9dfa289008a44d78799bcf8dec29fc45b2d72484',
});

export const FROZEN_V10_IDENTITY_REFERENCE_WIRE = Object.freeze([
  FORMAT,
  10,
  Object.freeze([
    'Frozen v10 identity references',
    null, null, null, null, null, null, null, null, null, null, null,
  ]),
  Object.freeze([]),
  Object.freeze([]),
  Object.freeze([]),
  Object.freeze([
    IDENTITY_REFERENCE_KEYS.stable,
    IDENTITY_REFERENCE_KEYS.asserted,
    'expanded:legacy.fixture:aether-lance',
    IDENTITY_REFERENCE_KEYS.fingerprintFallback,
  ]),
  Object.freeze([]),
  Object.freeze([]),
  null,
  null,
  null,
  null,
  Object.freeze([null, null, null]),
  null,
  null,
  null,
  null,
]);

export const FROZEN_V17_IDENTITY_REFERENCE_WIRE = Object.freeze([
  FORMAT,
  17,
  Object.freeze([
    'Frozen v17 identity references',
    null, null, null, null, null, null, null, null, null, null, null,
    null, null, null,
  ]),
  Object.freeze([]),
  Object.freeze([]),
  Object.freeze([]),
  Object.freeze([
    Object.freeze([null, null, null, null, '2024:fireball', null]),
    Object.freeze([null, null, null, null, 'expanded:aether-lance', null]),
    Object.freeze([
      null, null, null, null, 'expanded:legacy.fixture:aether-lance', null,
    ]),
    Object.freeze([
      null,
      null,
      null,
      null,
      'expanded:content.v1:07ed8c09cafd5116ae6e594f9dfa289008a44d78799bcf8dec29fc45b2d72484',
      null,
    ]),
  ]),
  Object.freeze([]),
  Object.freeze([]),
  null,
  null,
  null,
  null,
  Object.freeze([null, null, null]),
  null,
  null,
  null,
  null,
  null,
  null,
  null,
]);
