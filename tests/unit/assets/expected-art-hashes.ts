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
 * Native-density redraw (2026-09-05): all 87 output pins and the preview pin
 * changed with the 128-pixel redraw. The independent bitmap invariants in
 * classic-art-techniques.test.ts reject enlargement, contour shading, speckle,
 * palette growth, blended exterior edges, and collapsed silhouettes.
 */
export const EXPECTED_STARTER_ART_SHA256: Readonly<Record<string, string>> = Object.freeze({
  'art.token.pc.fighter.v1': 'bdd9b065448f13076cc0259874d07821054fe21fa1ff38ff1386cf553c84111b',
  'art.token.pc.cleric.v1': 'b0db2badb1867219c645b28240c7baae04f3537325eb9d90db49dfc3ab0fc38b',
  'art.token.pc.wizard.v1': 'f61fa9ef35e6a881e9fe6e59765bd26c88b94e99006017d1068a6ea2b3ab3ce0',
  'art.token.pc.rogue.v1': '5a12f03fd7977bee28c80fa809c484e649731eebd18e02dea70a138b99748247',
  'art.token.monster.goblin-warrior.v1': '51c87d3364654fc6498faeea5857b28dedd812db5e62875bfd8bce01ee928d81',
  'art.token.monster.hobgoblin-warrior.v1': '3ca2668826f0576812824189d2bc99f508bec2bbd7a7c526a58f5337a90b2a36',
  'art.token.monster.bandit-captain.v1': '3ca2668826f0576812824189d2bc99f508bec2bbd7a7c526a58f5337a90b2a36',
  'art.token.monster.ogre.v1': '51c87d3364654fc6498faeea5857b28dedd812db5e62875bfd8bce01ee928d81',
  'art.token.monster.priest-acolyte.v1': 'a76cdd587fba148cfa1d57f076eebef9d915453b4383402c04c6e9f8b5e175d0',
  'art.token.monster.priest.v1': 'a76cdd587fba148cfa1d57f076eebef9d915453b4383402c04c6e9f8b5e175d0',
  'art.token.monster.skeleton.v1': 'c6d850c0634fc564916c8f3429ccb1d48d48ca6f0ab2ad9f7ae6be51932d21ff',
  'art.token.monster.zombie.v1': 'c6d850c0634fc564916c8f3429ccb1d48d48ca6f0ab2ad9f7ae6be51932d21ff',
  'art.token.monster.wolf.v1': 'f466881796158c2cbaddf2f3568f6afa3db187c21667ae2a7d3e2c89e9241859',
  'art.token.party.fighter.v1': 'bdd9b065448f13076cc0259874d07821054fe21fa1ff38ff1386cf553c84111b',
  'art.token.party.wizard.v1': 'f61fa9ef35e6a881e9fe6e59765bd26c88b94e99006017d1068a6ea2b3ab3ce0',
  'art.token.party.cleric.v1': 'b0db2badb1867219c645b28240c7baae04f3537325eb9d90db49dfc3ab0fc38b',
  'art.token.party.rogue.v1': '5a12f03fd7977bee28c80fa809c484e649731eebd18e02dea70a138b99748247',
  'art.token.party.ranger.v1': '62011e9234aabce3e9e08b2c523f69b0ea27e40d7c11fd18521fb2f601df2471',
  'art.token.party.brute.v1': 'a76ef032ee99129bfdc8f7f174961f5b61ef5abe77c712cd14c42f8c0570a005',
  'art.token.party.beast.v1': '358fe40b23361c4e1a6f9992ad28ea1e3f84a024eb3405ad134c9e77d44df25d',
  'art.token.party.undead.v1': 'd649c4a3f42d70bbe749b1027a2e9082fe3cc805328074b3a7ce31c25cc6f9f7',
  'art.token.party.fiend.v1': 'c21a0894d8f771fb88968cd75e6478fafab1462919d4c4bf18555ad0316cdd26',
  'art.token.party.ooze.v1': 'dad94ef30eb55f18ae772178d6dabfe0763592e8192bfe38b53071b534b9697d',
  'art.token.party.construct.v1': 'ba17a5d785b06f2ff0a76c2131d00b73c9e3558a61e337da0f4b6eb8f50b792f',
  'art.token.foe.fighter.v1': '3ca2668826f0576812824189d2bc99f508bec2bbd7a7c526a58f5337a90b2a36',
  'art.token.foe.wizard.v1': 'b6aa2ec9b9d6b1f38778916c1d1d4c421f765cadbb2723930671f29f6e8bc07f',
  'art.token.foe.cleric.v1': 'a76cdd587fba148cfa1d57f076eebef9d915453b4383402c04c6e9f8b5e175d0',
  'art.token.foe.rogue.v1': '7dd3f380f86e7daf399bb59732d1244d5f297037513bb1cb15781163a29b1ced',
  'art.token.foe.ranger.v1': '6b1a3714be42c5b72d4ae6058499d78ad991db74eb51fdf110d97c6487c85bbb',
  'art.token.foe.brute.v1': '51c87d3364654fc6498faeea5857b28dedd812db5e62875bfd8bce01ee928d81',
  'art.token.foe.beast.v1': 'f466881796158c2cbaddf2f3568f6afa3db187c21667ae2a7d3e2c89e9241859',
  'art.token.foe.undead.v1': 'c6d850c0634fc564916c8f3429ccb1d48d48ca6f0ab2ad9f7ae6be51932d21ff',
  'art.token.foe.fiend.v1': 'c0e22c8ec8776dafdd2a28e9db31756ed11ad0de1bc2fb6e67680fe7e56c21c2',
  'art.token.foe.ooze.v1': 'bbf4d452d7e4373745ad51684820452d3096e89af3359ed8fad41a69e1a18919',
  'art.token.foe.construct.v1': '62e260324b2b9f057ee4131b53c285e2b95a40041b5287ebe4b40812996db3b5',
  'art.token.dead.v1': '9f986fbd40fb8e1ea6a0b746daf711e70d535468881183c52b1617abe4e0bb89',
  'art.map.floor.stone.v1': '71a2942d7bd504983e8be62186ad1737485af2045e23c71b43d7e1a36ac72329',
  'art.map.floor.stone-1.v1': '88868d6427d8c611b8ab86f2732ad83ffa5e3433ed6d4d120a58886abd4e571e',
  'art.map.floor.stone-2.v1': '60625d9334cc602ebc8c33cf1a35f05de76c6820a3c68692b4ccb6e4c3543ad7',
  'art.map.floor.stone-3.v1': 'bf559d7e1cad2164d339aaa79dd81652a76f975e1c9ee4e6d3751ce9d00f40af',
  'art.map.wall.stone.v1': '2920f5aca93ad1ea68b94af9813d263794fe4d7b004c595dbd625a82895fc888',
  'art.map.wall.stone-s.v1': 'ca24ff0aa786875ca6e3f5a43cfb9983ac23f0bc8b7e9dc5bd4912cd9f00c2e1',
  'art.map.wall.stone-w.v1': 'ea5c0a0746e2f95e39f2a2764d19430a14a74e542616523fe518f8698cfe007f',
  'art.map.wall.stone-e.v1': 'a02d9a3f2c9434860974efb9beb5804f1cca7333dbde2b8f88092bd54e33151e',
  'art.map.wall.stone-nw.v1': 'fa969c787bfeb6f65676659e38c041a3317ac1b4104009be4725e60ea015c47d',
  'art.map.wall.stone-ne.v1': '9d16970097c805ee832742df87f88533c9113149123898276e9faa0745159cc0',
  'art.map.wall.stone-sw.v1': '124d59501f41362adf37edd07e3abdf3ef15ebafd5b9db7fbac737061bade10d',
  'art.map.wall.stone-se.v1': '393f65df884bdbdc8a3dd3cdc3c082bb7caf89b981cfcb6a8c004ce0a94beb22',
  'art.map.door.wood.v1': 'e0e21b587770f6016c65450f2f2ae6da26744515372931f1af2d2dcc80342a6f',
  'art.map.door.wood-s.v1': '28efb1b665a1e41453fd7d3afd585029fcb9c80e928c9068b4fcdef7d0ad732c',
  'art.map.door.wood-w.v1': 'e41a30e0c3bf3fcf15ac59bf67bda37761b7f4c8234c9d274248cabac5b60325',
  'art.map.door.wood-e.v1': '4fa945596cbc05af775e5ba5ec65b8419596e45de27a2ef98588fa673886b389',
  'art.map.door.wood-open-n.v1': '46d69c43fe8def5dbb0cd50ad1cc171c7b295ef96e98e77a6ea4deba4079f810',
  'art.map.door.wood-open-s.v1': '29d828a25a0964c655c58ffa84b3f98b5f29eba6d5e18ad1efdb86ea7ce3ddb7',
  'art.map.door.wood-open-w.v1': 'd0213f80300d5103dc7946c41a8ec92438dc544707433fd0c9f43619ec576b29',
  'art.map.door.wood-open-e.v1': '4d018e3f6ff6eac8c514ca3d27b850cb0494ce7d531666ef3d7860ded650902b',
  'art.map.shade.n.v1': '09e8182832ec447ea30ece5111275ab37830fadb0999a5304c372a3c860ee38d',
  'art.map.shade.s.v1': 'ccaeb74cf005d950a60486363da7fa3f5678d640ea20b7f272ec4fc28929a1ed',
  'art.map.shade.w.v1': '10e8f27b751b6f7544c2e124055e75029e7315ca212f10d48a7533f111b91900',
  'art.map.shade.e.v1': 'c56da5e1f8084e00c8331efe56e56d5c29830dc2c08ed9f41630b8ded3814aaf',
  'art.map.overlay.difficult.v1': 'c359f9761d3c143a9ad59074659a37e1e23f18e153d7036b3b8471df768100dd',
  'art.map.overlay.obscurement-light.v1': '5094e490e219e12505fddd6a1fc70a47efed89de8eaea21e702b0b2239ae37ca',
  'art.map.overlay.obscurement-heavy.v1': 'b4add9ae905389b1dee98575b1670a43a85ff52fae45ca4f75077c312351d032',
  'art.map.overlay.magical-darkness.v1': '18826a590a87b7244b22ab9b67e725d4291caec9499dc7e17e1b4fe109af9af0',
  'art.map.overlay.light-bright.v1': 'c1b584656185cc78ce3e11398fb4be61ccd8e74c6480cf6108e23c3ec24f9948',
  'art.map.overlay.light-dim.v1': 'caa4a45296607dc8735d77d4eb0683ff5ea1cc13b2bd5a09892fb615e4571a57',
  'art.map.overlay.light-darkness.v1': 'd5bcc7c2f3489f6d5469cefb72cf776649595aa1626426ad5e56871d1668fd7c',
  'art.map.overlay.blocked.v1': '4d04478a77ae538b7059912975515c315125ecee69252645d635789b05eb2f54',
  'art.map.overlay.light-source.v1': 'c7d9abf3e1369eb509dcd29865e7413d487a1f645a106af61cc04ff915f97766',
  'art.map.overlay.light-glyph-bright.v1': '889a8e0db7b3e38cc2c3789b7cc0192a6c0ab025a6c32e23ba6b16ebf10e6264',
  'art.map.overlay.light-glyph-dim.v1': '98b627911ff53087ba2f485909fd2255721aa2dececeee23b3ea2b8d277659b6',
  'art.map.overlay.light-glyph-dark.v1': '88edf65ebf73d0c72182d38e675e696ab851b00db00bba319406d2b09da1f972',
  'art.map.overlay.glyph-door-closed.v1': '4ddb7ae4860e27239edfaec15f5e2bec3e202c7ec3e9530ec4359603169bc3ec',
  'art.map.overlay.glyph-door-open.v1': 'f9508e99ea9e0a21c2742ea5d5c3e6e9ed09f59e1f1f9aaadbce572df629194f',
  'art.map.overlay.glyph-blocked.v1': 'f0827d84d891463dc5253b496c06df09c15d5c180ce47fdfd9784c6f73502708',
  'art.map.overlay.glyph-fog.v1': 'a4c792f767775bfc472dfc0f527a306bec32d4be2c3338de239335e906628a59',
  'art.map.overlay.glyph-obscured.v1': '6917ec378bae8c1cb2e29d0a0d843b5fa80c1bbed6461ca8626f8df1190980c5',
  'art.terrain.rubble.v1': '6e37d742c752bc6d809ea100e9a5f1608c6c29c89d1ffa936d22333e4496ab42',
  'art.terrain.crate.v1': '133a91645bd06a3d53a996244da519715ebd846750a72ed5f9ee632ecd01974d',
  'art.terrain.pillar.v1': '662e31d41a7106bfae856426f5d2a0e71977a5add8639ff39d626c30fd351795',
  'art.terrain.hazard.v1': '70e197152c73631fe98d9f904d797def8e9d80f843c7a88b278afdfe47f3dcf2',
  'art.fog.hidden.v1': '6f4ad6577896274df2ef43bc6a2c24f364e41891e01fb1b8b24d0cda201ba6b0',
  'art.fog.unexplored.v1': 'e9ae1694c16574d95cd9ef6ad3e8fb472d589dabfadb6fc802959f9330d69236',
  'art.fog.revealed.v1': 'd6ddc84737bba1dd5b0e888fde7de939aa7c863a2de2c2345697e315c7fa6183',
  'art.focus.active-pc.v1': '629c92942a90ff66ef850e6d611c366f49d24cae6ec2984baa794059aaa05291',
  'art.focus.hidden.v1': 'dc7911da16f99abb80bda77c28d6c0c30b5412278965725a1b33a1982894a847',
  'art.event.adjudicated.v1': '9ab196fbb4fdaf18a9970a2e929928f58b1b43e0fcbbac8b98edabad83210acc',
});

/** sha256 of src/assets/starter-art-inputs.ts (native-density redraw, see above). */
export const EXPECTED_FIXED_INPUTS_SHA256 =
  '8649f9165fc76812a931af6e428bacb004caea4d8b70417ff86f3b7bcdc83a97';
/** sha256 of src/assets/preview/starter-art-board.svg; the preview embeds all 87 assets at integer scale. */
export const EXPECTED_PREVIEW_SHA256 =
  '9fd80f376e59f5123a8b4dde9147e3ec43aa18f23a31ef1e6e10c39566f95359';
