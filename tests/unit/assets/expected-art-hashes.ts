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
 */
export const EXPECTED_STARTER_ART_SHA256: Readonly<Record<string, string>> = Object.freeze({
  'art.token.pc.fighter.v1': 'cc8f95a5f1f9cfe5449a36a8e639ebccd2556f2212cb52ffdd83d55f7626fc83',
  'art.token.pc.cleric.v1': '934bf0cdf4f155bf493bfb02f19587f770545ebc98bfda53c4d41a5f45790a14',
  'art.token.pc.wizard.v1': '13dcecf49a2d9be947430e05b20443df3fb8705c432eb4a12d0768fa22ae0d0e',
  'art.token.pc.rogue.v1': '9efa5a1b5111d32d84b98c6f168b93ebf0e03e2142004553d287c86313126b6c',
  'art.token.monster.goblin-warrior.v1': 'bfcd34de75d1a95f62224afad5d38afdf9c0b78013e85db50695d175c026a1f8',
  'art.token.monster.hobgoblin-warrior.v1': '11938498c3d8e99735285edf1f0f5a24b45e05e64c6beb0476265952e2bc14ed',
  'art.token.monster.bandit-captain.v1': '11938498c3d8e99735285edf1f0f5a24b45e05e64c6beb0476265952e2bc14ed',
  'art.token.monster.ogre.v1': 'bfcd34de75d1a95f62224afad5d38afdf9c0b78013e85db50695d175c026a1f8',
  'art.token.monster.priest-acolyte.v1': '1c700b95f668c5771b92bf8d5e89c73ad80f7d6e364222f4424153422f535e6e',
  'art.token.monster.priest.v1': '1c700b95f668c5771b92bf8d5e89c73ad80f7d6e364222f4424153422f535e6e',
  'art.token.monster.skeleton.v1': '82e558a4d12a9063334057633b553166fdcd6150394fd32324e5dc54735e7588',
  'art.token.monster.zombie.v1': '82e558a4d12a9063334057633b553166fdcd6150394fd32324e5dc54735e7588',
  'art.token.monster.wolf.v1': '1dde77c1ac11cb35fcc6425d0f0d12358ad4f8d4911193dd246b741941e3c6d8',
  'art.token.party.fighter.v1': 'cc8f95a5f1f9cfe5449a36a8e639ebccd2556f2212cb52ffdd83d55f7626fc83',
  'art.token.party.wizard.v1': '13dcecf49a2d9be947430e05b20443df3fb8705c432eb4a12d0768fa22ae0d0e',
  'art.token.party.cleric.v1': '934bf0cdf4f155bf493bfb02f19587f770545ebc98bfda53c4d41a5f45790a14',
  'art.token.party.rogue.v1': '9efa5a1b5111d32d84b98c6f168b93ebf0e03e2142004553d287c86313126b6c',
  'art.token.party.ranger.v1': '0e86f823c151a74874333d10a51b3f4f146db2ff5b9a12836a1f9a47fc2b8a88',
  'art.token.party.brute.v1': '89fb58b5c348376df6d5edac36b10cb1f5ad2f15c979d35c52ddf884157a4bfa',
  'art.token.party.beast.v1': 'eb905e55706335275108044eee31bf6bf5eda412da43fb8d124ee03f5fd2bdcf',
  'art.token.party.undead.v1': '4471b2d47b8ba948d6fae35e3577bd32f6e380ec4174fca8a02ccd4bbed5d7ce',
  'art.token.party.fiend.v1': 'a268b2e423a338cd8bb596ef1d474d6712fafa86c9e952cf271c5f99d58cbd4c',
  'art.token.party.ooze.v1': '573854b022d40261b3d2645c9121f36d5e905124b04ab34deff4b0c6fca00077',
  'art.token.party.construct.v1': '91821107b06daed79fe1830bf47cd4db9a4dc3a18153c1b361769c0771fffd4d',
  'art.token.foe.fighter.v1': '11938498c3d8e99735285edf1f0f5a24b45e05e64c6beb0476265952e2bc14ed',
  'art.token.foe.wizard.v1': '83d3cc8adbc204298eced55fb113fddbcb4948c150c01f09989281465ef4243d',
  'art.token.foe.cleric.v1': '1c700b95f668c5771b92bf8d5e89c73ad80f7d6e364222f4424153422f535e6e',
  'art.token.foe.rogue.v1': '1876be4ce909db6c8a1ba3c89bb25e5dc3726838fcfd8d3fc1074f08f20732a1',
  'art.token.foe.ranger.v1': '86dd7397bd6491b5497cad1d64bda361ae6f57a8f0e2dcf968bf61acecc9a2ac',
  'art.token.foe.brute.v1': 'bfcd34de75d1a95f62224afad5d38afdf9c0b78013e85db50695d175c026a1f8',
  'art.token.foe.beast.v1': '1dde77c1ac11cb35fcc6425d0f0d12358ad4f8d4911193dd246b741941e3c6d8',
  'art.token.foe.undead.v1': '82e558a4d12a9063334057633b553166fdcd6150394fd32324e5dc54735e7588',
  'art.token.foe.fiend.v1': '874a1c94f7440f70b3b0f945bc4920af116594a672aa4583b384fed9679e54a8',
  'art.token.foe.ooze.v1': 'd3ec7c12f0b07ca55929f2df6a336fb5a2a043bd62c9d1702598f311f718d007',
  'art.token.foe.construct.v1': '0698c88fb264c06bdc09c25ebdc45e9e9e73e5781f9ba2f0e6790cd601b45078',
  'art.token.dead.v1': '340d355d465d077f23a75776e86387b3d48ae7dbe6bd642b22b17044a9041a9a',
  'art.map.floor.stone.v1': 'd1f67d585e2cedd28958fa538db895499745d49eb954b87ea342aa8719543d1a',
  'art.map.floor.stone-1.v1': '0b888ca1658a160c2531a1befdd9898ab1b1b295038d83630b2760183b7b3e01',
  'art.map.floor.stone-2.v1': 'c1ecb3915a244374bc7249091852e81c6ef3e33a4970476a0f84ef399ab91ff6',
  'art.map.floor.stone-3.v1': '22f0579e2b39df502d0651072d27fe9007ee2cbfeeaabcdac55503e0176dcd6b',
  'art.map.wall.stone.v1': '91849e6b3dbfe4d680deb487d8a05b1c09e99ce20fca8eeebccb210353d42f92',
  'art.map.wall.stone-s.v1': 'dfde1ab2f65b0ec0071651ad743276291a05fee63b4d36f371c7b736d0e7911b',
  'art.map.wall.stone-w.v1': '79b16c5691b60756f9faac90404549c2c1922943529952c8e547c88c0d934f4a',
  'art.map.wall.stone-e.v1': '2015716cf7177edc67529d7c90d8141ac526ab34a76267354e64c85286280906',
  'art.map.wall.stone-nw.v1': '6ec4ff55f14185c91b49af4bc4ca17de0733604cd236d110d389fff876d24aaf',
  'art.map.wall.stone-ne.v1': '3c2736fb9c98290c4317f80435f98c5ca5ff251e59a820214fb8cb34b4c56b81',
  'art.map.wall.stone-sw.v1': 'e4122c76ec87b9080c46e5772a59f498acda241e5bc2125797d5da83c34a64fe',
  'art.map.wall.stone-se.v1': 'c4f663b1e52c40b13c9c19ec6ccec8e00052ac78b41e0e90e34f8af69d0876dc',
  'art.map.door.wood.v1': '92424dd6eb8d639e04a54891a85daa5c5afcc7dca1ec6d520216529e5b816feb',
  'art.map.door.wood-s.v1': 'ed7a0680cdb6b51c50ab2f97c6d31c02055c41f9de84c460a15f00125bc3d551',
  'art.map.door.wood-w.v1': 'fd5b15b880026caa029f29a07e3af88190609af606de6bc52e02786361a689cb',
  'art.map.door.wood-e.v1': '39b5964464527b4b5c09d9ed3e30a7b8f04efd0144b0289be247a9ef0a21f446',
  'art.map.door.wood-open-n.v1': 'ef0b89239846ee1ea12e2806326e91014e571166cceaa0d23fc761e59d93d435',
  'art.map.door.wood-open-s.v1': '5a5b8d604fea511d00e0870fe1ab93c43efbca5cd3c0762b6340ff33dd36e374',
  'art.map.door.wood-open-w.v1': 'a1bfd63be395f8f836d7aaebb39eee0b5d614afccd00c2177b51ad2d68b64647',
  'art.map.door.wood-open-e.v1': '80c7569dc44869ec202dda9ad7112cc7db2132fa02fd1f1481a1bd074f954046',
  'art.map.shade.n.v1': 'fea5425d227288897730c8e997d414d8d5883ded3381971c9f15ec6791217f73',
  'art.map.shade.s.v1': '6c148494d219dfa56426d5af44aed139e4a59dbf0b8a72b99ab18472f8710890',
  'art.map.shade.w.v1': '4dfd1464fe1cbc61e80837d4cebc3767920578006921c76cfd0b86c8179d3847',
  'art.map.shade.e.v1': '0ab459b317d6ec88640ed46fe736aeb07d72f7bd3607d67a92ed14eeadc429ab',
  'art.map.overlay.difficult.v1': '977b28b4a6304cc634439ceeb2747ff20616a1ce0fc83f98ea94aa8d30f80999',
  'art.map.overlay.obscurement-light.v1': 'eaadfa5906572f53882f53b5304c82dcd3d374c306d0bb03d8f79ba864133a5d',
  'art.map.overlay.obscurement-heavy.v1': 'a7fbacd3b746348844967984f10b72876fe6a97b0b92c498f54e381330892330',
  'art.map.overlay.magical-darkness.v1': '493d2bac46dfc8575ed291351b357597479f66e6d448a597bb300cbc95a3e521',
  'art.map.overlay.light-bright.v1': '14cb519554c199507891571ca36129c39a4f8aac613d234f8961c00aa67e09f6',
  'art.map.overlay.light-dim.v1': '70dfd5d1467bafef01317b5599892848905ba21d431fdf3b9240677a204ee837',
  'art.map.overlay.light-darkness.v1': 'c61c4396fde508408208e5d820aa64e73b71d3197920d0d40990cfc8f5821a2d',
  'art.map.overlay.blocked.v1': '1e398ee15ce0df264dae89849cce529c3145460043418dffe542ef19e904e0bb',
  'art.map.overlay.light-source.v1': '8fab2f5838bca5aac7aad4ff40e9943a4c903beff63da25c6a8762778dcea64a',
  'art.map.overlay.light-glyph-bright.v1': 'bcbbd23cc27b590269cfdac6e3ba9a0ebb536bbf8a8be4c5bf6f28d83a5cb091',
  'art.map.overlay.light-glyph-dim.v1': 'df369ebc51a87481854608a155d5e8cb88027fd0e1d08c831198e4c537ef71ca',
  'art.map.overlay.light-glyph-dark.v1': '8a71bcb78b4df85fc8aa8e01844f034d1037d812f9157b6fb222eab1fdaf9109',
  'art.map.overlay.glyph-door-closed.v1': '15d70aad69af2cfbb2ffb52211fd04d955ca9ad1441f5d0f9aa529bfc565e6fc',
  'art.map.overlay.glyph-door-open.v1': 'fb3775f23ac80d0195eb6ab1760a5b12b018460c659a9a917ebd2987b6e72a4a',
  'art.map.overlay.glyph-blocked.v1': 'f8113d2a146b03932a087600943d80c74d809956d3f074f2ca9440f887b62119',
  'art.map.overlay.glyph-fog.v1': '6f2b68b0a389bf125c162c7768b2d4816fc60f8cdbd2cc2c5ff1f8004449b99a',
  'art.map.overlay.glyph-obscured.v1': 'df8b5f982cd63c756694a569e18513b05d70b27bb5e28401b017233e65ec53a2',
  'art.terrain.rubble.v1': '737a9995c7863e841b8e6dcc65302485e40bd2c5ece7af52e54baecfa6bb324c',
  'art.terrain.crate.v1': '29513dc3cd0ca375802bb2289fcf00c666cda4d2fb87908e82390f189b13fc2d',
  'art.terrain.pillar.v1': 'c74849d3af6e020c3b14b8091a8b50126ccdea932538b32dd42615bbd94d7c7f',
  'art.terrain.hazard.v1': '7b976953d2c985fdc3dd200f433e934eab1e5c131ff0c3cd1c38afc9e807ffe4',
  'art.fog.hidden.v1': 'bd53a2256d2200414b2ed1dfa94279d121b9fca3d97cd2df8462ad1f80d67c87',
  'art.fog.unexplored.v1': '9845f99ce02ad6bd783a4faedaf04567c48d839bd84c4e6f797b9a12b8dfc52e',
  'art.fog.revealed.v1': '642a973632509563175deeb9f81c0d88169374c5083eae9615445fd7d732b205',
  'art.focus.active-pc.v1': 'c25a2e9f719621766c2def2cf77fc8c6e05179b4e45e2ba5bc545c8469744462',
  'art.focus.hidden.v1': '55eeb96c2e6ec68f08ef2de7e50fe49c82da0ebf22f27ffa29a4f1aee5f01cfd',
  'art.event.adjudicated.v1': 'aa4437d2360f8c63e79e9cb4b005e94a335ba5456e41c8af0fafdefa337f6cfc',
});

/** sha256 of src/assets/starter-art-inputs.ts (D516 regeneration, see above). */
export const EXPECTED_FIXED_INPUTS_SHA256 =
  'de92080a13ac71090f21d7d8ba905f5b14ecd95521df4db2b06de8db6f036e78';
/** sha256 of src/assets/preview/starter-art-board.svg (D525 glyph vocabulary: the preview now embeds 87 assets). */
export const EXPECTED_PREVIEW_SHA256 =
  '482f557175c982caedb893aaff1a8bab6eca9d8afaba93f3edc5c9738b891b7c';
