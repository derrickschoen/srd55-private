/**
 * Independent oracle: never generated from the manifest or renderer under test.
 *
 * D516 REGENERATION (2026-09-04): every value below was re-pinned from the 2.0.0
 * generator because the previous pins described the 1.0.0 16×16 silhouettes
 * that D516 replaced. This is the one sanctioned regeneration of this file;
 * after it, a changed digest is a finding, not a pin to refresh.
 *
 * D525 ADDITION (2026-09-04): three NEW light-glyph overlay ids were pinned
 * with `sha256sum` over the generated PNGs. No existing digest changed;
 * tests/unit/assets/light-encoding.test.ts carries the pixel-level invariants
 * that license those pins.
 *
 * D525 GLYPH VOCABULARY (2026-09-05): the two 'inverse' veil ids were REMOVED
 * with their subject (the closed option is now boardGlyphs none/light/full)
 * and five NEW cell-glyph overlay ids were pinned with `sha256sum` over the
 * generated PNGs. No existing digest changed. The preview digest changed only
 * because the preview embeds every asset once;
 * tests/unit/assets/board-glyphs.test.ts carries the pixel-level invariants
 * that license these five pins.
 *
 * Native-density redraw (2026-09-05), extended by D576: all 92 output pins and the preview pin
 * changed with the 128-pixel redraw. The independent bitmap invariants in
 * classic-art-techniques.test.ts reject enlargement, contour shading, speckle,
 * palette growth, blended exterior edges, and collapsed silhouettes.
 *
 * Round 5b material response (2026-09-05): 60 physical or semantic outputs
 * changed only after the bitmap tests pinned per-bust light direction,
 * response-field pixel influence, and the cell-spanning terrain motifs.
 *
 * Round 5b.1 directional material response (2026-09-06): the same 60 outputs
 * changed after independent tests located the metal cluster and rim against
 * matte controls and measured the row count and span of each material grammar.
 */
export const EXPECTED_STARTER_ART_SHA256: Readonly<Record<string, string>> =
  Object.freeze({
    'art.token.pc.fighter.v1':
      '27c52840d5a02dc3b1f8bd4ea80835cbcc88c0eda79e3a2c337f0431bbfc0120',
    'art.token.pc.cleric.v1':
      'a7834461ae60fdb2565b525acbb6e5caf30b78c8d74391cf31cbf4ac60c9d6ce',
    'art.token.pc.wizard.v1':
      'c1dc2ea1b8f993b3e21ff05924e6a356fc67fdd0af36ace9e342193a1fef4e48',
    'art.token.pc.rogue.v1':
      'ba873b3bc6e30ffe707b193584cdf313195fa91af99fbd91d514cf4e7e88ad58',
    'art.token.monster.goblin-warrior.v1':
      '07c39246271e669bd472f033ac7c4ff24a5112cf97d5d2a9866bb6f6ee85ae97',
    'art.token.monster.hobgoblin-warrior.v1':
      '7c7118b2b0cae3f2301f74c1b0260b2304c5cc28d75e6ec262b862795663c0aa',
    'art.token.monster.bandit-captain.v1':
      '7c7118b2b0cae3f2301f74c1b0260b2304c5cc28d75e6ec262b862795663c0aa',
    'art.token.monster.ogre.v1':
      '07c39246271e669bd472f033ac7c4ff24a5112cf97d5d2a9866bb6f6ee85ae97',
    'art.token.monster.priest-acolyte.v1':
      'c4317dbc5b295840d5d72ba024de1bed1d5d8a4e4a8bb7069cca244ad66b026a',
    'art.token.monster.priest.v1':
      'c4317dbc5b295840d5d72ba024de1bed1d5d8a4e4a8bb7069cca244ad66b026a',
    'art.token.monster.skeleton.v1':
      '4c1c6b2e89b6570213a6bde39b6b4cdf3a22dd8d3d5baa090cc76d9bcbe5a58e',
    'art.token.monster.zombie.v1':
      '4c1c6b2e89b6570213a6bde39b6b4cdf3a22dd8d3d5baa090cc76d9bcbe5a58e',
    'art.token.monster.wolf.v1':
      'beb5a5d92bafe9cc2372ea52a43fcb4c00bf68a6a7b23e132c314e28c80174d9',
    'art.token.party.fighter.v1':
      '27c52840d5a02dc3b1f8bd4ea80835cbcc88c0eda79e3a2c337f0431bbfc0120',
    'art.token.party.wizard.v1':
      'c1dc2ea1b8f993b3e21ff05924e6a356fc67fdd0af36ace9e342193a1fef4e48',
    'art.token.party.cleric.v1':
      'a7834461ae60fdb2565b525acbb6e5caf30b78c8d74391cf31cbf4ac60c9d6ce',
    'art.token.party.rogue.v1':
      'ba873b3bc6e30ffe707b193584cdf313195fa91af99fbd91d514cf4e7e88ad58',
    'art.token.party.ranger.v1':
      '10ad5be3eac22d2f1f8fa78cedec7b9f59b2577b7c591cf7afcc2cbd14d191fc',
    'art.token.party.brute.v1':
      '3e01ef675b77ee1305447cab56f8d9f3d103c2f45e8a0a2b9bd76184c6707c57',
    'art.token.party.beast.v1':
      'f6bf0e99a92fad5f217f06b36603a293e028337b46dd5bfe02006e9e06b464d8',
    'art.token.party.undead.v1':
      '7fec8d98ae44d9ebf14bbf29156ee89036b591684fda51e0f8c6cbc3a8aa3cee',
    'art.token.party.fiend.v1':
      '1ef324700c77219db7f6f7ec25f8d429e4877cd28f2d9757e39d2403c2f405e6',
    'art.token.party.ooze.v1':
      '5cd76efe8e747d11e03ae8b0af2d92f85e943adc833b1ff7907cdc4cef5b8010',
    'art.token.party.construct.v1':
      '10a4a2cf1d9953cf160c0d6cb54f5db4af1a5214b6c75642e5fbb6782e768663',
    'art.token.foe.fighter.v1':
      '7c7118b2b0cae3f2301f74c1b0260b2304c5cc28d75e6ec262b862795663c0aa',
    'art.token.foe.wizard.v1':
      'ef027ff34bad4d5de7b2fb3c5191a7c47894b432c7d398f38c62b5d2d89c5c03',
    'art.token.foe.cleric.v1':
      'c4317dbc5b295840d5d72ba024de1bed1d5d8a4e4a8bb7069cca244ad66b026a',
    'art.token.foe.rogue.v1':
      '1fe730eee1d160504dec98044292ddcfc482420b68388c05243d6ccf7df1ee0a',
    'art.token.foe.ranger.v1':
      '248b879fe5500e1b6eff7d9bb4f7a44780774adfdffc04bbe60d5f4b48e84932',
    'art.token.foe.brute.v1':
      '07c39246271e669bd472f033ac7c4ff24a5112cf97d5d2a9866bb6f6ee85ae97',
    'art.token.foe.beast.v1':
      'beb5a5d92bafe9cc2372ea52a43fcb4c00bf68a6a7b23e132c314e28c80174d9',
    'art.token.foe.undead.v1':
      '4c1c6b2e89b6570213a6bde39b6b4cdf3a22dd8d3d5baa090cc76d9bcbe5a58e',
    'art.token.foe.fiend.v1':
      '7a742f6b9350c69a17cbbbf68d23a1c9b2c5e04611d7eabb28526c56fe4945a4',
    'art.token.foe.ooze.v1':
      '47a09c5093a373f00866486252786febf0b5dbe01bc68cd816a61d7861034872',
    'art.token.foe.construct.v1':
      'fa4b0abfc83931ab4c0b971066cda95db8264cb006cb92ae4fde7de96fd2a7a9',
    'art.token.dead.v1':
      '31913b2c3b0a8e8f1c33069b04647b61dee6c11f5fc5555bffe0833c7cf0be36',
    'art.map.floor.stone.v1':
      '3ef1b6469df8f9dc62a8c877dedc6a0d269c34559031078e8b2bfa5fba3ba822',
    'art.map.floor.stone-1.v1':
      'b24f951192465b428f274131ce1600a234484f23eedd092c3b47cc33a278ad5a',
    'art.map.floor.stone-2.v1':
      'd35ae009d9cbc8d61404801ab2e80e3a6c43d702d799429757120050dcdd4ff1',
    'art.map.floor.stone-3.v1':
      '336c91fc849cddfaa0a8c5462266561a33482ef682ea90f3f3bc4921b0f200cf',
    'art.map.wall.stone.v1':
      '0be40e2aaa52454cf9ece1906ee2b315f361006d44b9cc32ce53538fe3ed933c',
    'art.map.wall.stone-s.v1':
      '75252f82ed6b60acd9b4bd8ae0814bcfcb9d367d824b37bed2bf6dae78b787fe',
    'art.map.wall.stone-w.v1':
      'f6d897fd69949eb8c536cfd0ad9c99d1c7c90f20689547c008db5792fc5ff4fa',
    'art.map.wall.stone-e.v1':
      '2664c402b63f5128c29fdda669cdf3797d85b5784922e8947a8ede3eedb936ff',
    'art.map.wall.stone-nw.v1':
      '8e8a8cb8dc1b78adf9d42955a728f5971c81703ea385fb0961fd34032b62e3c8',
    'art.map.wall.stone-ne.v1':
      '8b9d74a6a9c63355cbeef928fdf9129e763ec0e57aad337d2a3e6d287a1f2787',
    'art.map.wall.stone-sw.v1':
      '1968e34a840536d39a44be6760cf47ab43cd1fe7a7ea07bfb44e0cc4c51a666c',
    'art.map.wall.stone-se.v1':
      '6d98a193e47ef19b6ef4ffed3117d4596be2d7b7582c80c7209892d6fd5f6514',
    'art.map.door.wood.v1':
      'b63cb5e778377a8e053f007f6654251ad9ecaef919d56e7984e5c108a1239ae6',
    'art.map.door.wood-s.v1':
      '4c9a0b84e5af31b762540b6cc968e9125f8b3ca622d5bd783ebdd9ce1cb5bac9',
    'art.map.door.wood-w.v1':
      '442055c0211b3ed547da7e9b05da7a0a8d91495f2a0545b1b2602b14059e854c',
    'art.map.door.wood-e.v1':
      'b273f404a39edff270f42b6f8fa4b64d5bfc284acbcda3632690a4b875a0d907',
    'art.map.door.wood-open-n.v1':
      '46d69c43fe8def5dbb0cd50ad1cc171c7b295ef96e98e77a6ea4deba4079f810',
    'art.map.door.wood-open-s.v1':
      '29d828a25a0964c655c58ffa84b3f98b5f29eba6d5e18ad1efdb86ea7ce3ddb7',
    'art.map.door.wood-open-w.v1':
      'f41dc7b91166455cc38f836f94aa71503a77e85cafacd200f407bf743d31f1d9',
    'art.map.door.wood-open-e.v1':
      'f199cf8bb6d75f18e5a34ebaa4ed3808c6328ef6c21d53d631b28f0726aa9d44',
    'art.map.shade.n.v1':
      '09e8182832ec447ea30ece5111275ab37830fadb0999a5304c372a3c860ee38d',
    'art.map.shade.s.v1':
      'ccaeb74cf005d950a60486363da7fa3f5678d640ea20b7f272ec4fc28929a1ed',
    'art.map.shade.w.v1':
      '10e8f27b751b6f7544c2e124055e75029e7315ca212f10d48a7533f111b91900',
    'art.map.shade.e.v1':
      'c56da5e1f8084e00c8331efe56e56d5c29830dc2c08ed9f41630b8ded3814aaf',
    'art.map.overlay.difficult.v1':
      '59be65303261b38de23d087083fba541d2379cbbc468ad953baa719a58dba39b',
    'art.map.overlay.obscurement-light.v1':
      'd9b836bd67132f23225da2636085af84b9f066414673bd2f329bb12a00273158',
    'art.map.overlay.obscurement-heavy.v1':
      '8d0839c5d6552742a193f81f7b0f71c8fbddcac1c6e7edd3c0ed9445e3d9ea11',
    'art.map.overlay.magical-darkness.v1':
      '18826a590a87b7244b22ab9b67e725d4291caec9499dc7e17e1b4fe109af9af0',
    'art.map.overlay.light-bright.v1':
      'c1b584656185cc78ce3e11398fb4be61ccd8e74c6480cf6108e23c3ec24f9948',
    'art.map.overlay.light-dim.v1':
      'caa4a45296607dc8735d77d4eb0683ff5ea1cc13b2bd5a09892fb615e4571a57',
    'art.map.overlay.light-darkness.v1':
      'd5bcc7c2f3489f6d5469cefb72cf776649595aa1626426ad5e56871d1668fd7c',
    'art.map.overlay.blocked.v1':
      '7c33b3fcf9324a818185c7bfe4464cc38af78f052c86770f6b6b75364da48956',
    'art.map.overlay.terrain-half-cover.v1':
      '3cdbc7fb157c3469179e528e8d2b8ed9c2dc14fe6819a6f0afba6bb4782d14d6',
    'art.map.overlay.terrain-three-quarters-cover.v1':
      'f9305fa80fd47001e15678ef467b3b8733dd62dffdbc7a8f60093daa7be7f83b',
    'art.map.overlay.light-source.v1':
      'c7d9abf3e1369eb509dcd29865e7413d487a1f645a106af61cc04ff915f97766',
    'art.map.overlay.light-glyph-bright.v1':
      '3f938dc9199c4d2dcbb8a4cdab68a6114a692f87dc7f9189bb4a7ecb1dab7e44',
    'art.map.overlay.light-glyph-dim.v1':
      'c9dc4ca4547c5b6d9455cf2dda9125bfab29a5ac7c41c57022ef9d0b4a26669d',
    'art.map.overlay.light-glyph-dark.v1':
      '8158fdfa90bb05914a308a12ea8b7380912c322326713666a00c3989667147d7',
    'art.map.overlay.glyph-door-closed.v1':
      '9d06a29037ed243e5763b21d95af4b24393ac1a0f6f5a61834706ff56fcbbf19',
    'art.map.overlay.glyph-door-open.v1':
      '67eab988aa7766b89190664db7b90a34b8c7563857d7bdc666e434b9b6706596',
    'art.map.overlay.glyph-blocked.v1':
      'ed4fd0107db1ec30aa7a610f520c90bb006d5e16dbbb22935ccdbdda3b174b9e',
    'art.map.overlay.glyph-terrain-half.v1':
      '6b19cdbf885b366e916dba0d0fd957fcf20568335cc07153a861bb4bcc8d1ba3',
    'art.map.overlay.glyph-terrain-three-quarters.v1':
      '34dee7be073df742fbf089fc7db7d6972adb403f765657ee8619446efc6343a0',
    'art.map.overlay.glyph-terrain-wall.v1':
      '0a78bfef67294b6fe83a8442f8cf691bd9a8186c8f090089ac24050640faa830',
    'art.map.overlay.glyph-fog.v1':
      '53aa42b20ed165438a0efcd22612a9d653640f70d56eff8c6cfe2772c1c15ee0',
    'art.map.overlay.glyph-obscured.v1':
      '8409b44e5e7b6bdf1e9e83c6d60c5bcf5120b13a6345dd231de7446056765664',
    'art.terrain.rubble.v1':
      '9200bcaff30d4f549f458e0741297507920645d4a3b2d72ccd9fd39161c00dd1',
    'art.terrain.crate.v1':
      '15e8a1992b01668b47e6b818f20c0ac3dcb8ae6d12f0214779e6762a2e22c60c',
    'art.terrain.pillar.v1':
      '3acb1d1d6f6535d878458d84d84d2a840b6190d8c977cd8998f0f8bea9e08d5d',
    'art.terrain.hazard.v1':
      '775230c2456aa899a6d8083a80c4d3ad9c5337eed93b011b5db333cd1fff783c',
    'art.fog.hidden.v1':
      '6f4ad6577896274df2ef43bc6a2c24f364e41891e01fb1b8b24d0cda201ba6b0',
    'art.fog.unexplored.v1':
      'e9ae1694c16574d95cd9ef6ad3e8fb472d589dabfadb6fc802959f9330d69236',
    'art.fog.revealed.v1':
      'd6ddc84737bba1dd5b0e888fde7de939aa7c863a2de2c2345697e315c7fa6183',
    'art.focus.active-pc.v1':
      '629c92942a90ff66ef850e6d611c366f49d24cae6ec2984baa794059aaa05291',
    'art.focus.hidden.v1':
      'dc7911da16f99abb80bda77c28d6c0c30b5412278965725a1b33a1982894a847',
    'art.event.adjudicated.v1':
      '9ab196fbb4fdaf18a9970a2e929928f58b1b43e0fcbbac8b98edabad83210acc',
  });

/** sha256 of src/assets/starter-art-inputs.ts (native-density redraw, see above). */
export const EXPECTED_FIXED_INPUTS_SHA256 =
  '9c5b298f22ed698dd0e46acc2829cbe4ac9429ab322175444710dea3428fb504';
/** sha256 of src/assets/preview/starter-art-board.svg; the preview embeds all 92 assets at integer scale. */
export const EXPECTED_PREVIEW_SHA256 =
  'dc820bcc67748b5cd4bbadcf8047960b8d3c7f86f65ad1a0058804f9a432ad6c';
