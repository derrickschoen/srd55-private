/**
 * Independently compressed, literal share-link captures. The constants are
 * bytes-on-the-wire encoded as base64url; production encoders never rebuild
 * these fixtures.
 */

export const IDENTITY_REFERENCE_KEYS = Object.freeze({
  stable: '2024:fireball',
  asserted: 'expanded:aether-lance',
  legacyAlias: 'expanded:legacy.fixture:aether-lance',
  fingerprintFallback:
    'expanded:content.v1:07ed8c09cafd5116ae6e594f9dfa289008a44d78799bcf8dec29fc45b2d72484',
});

export const FROZEN_V10_IDENTITY_REFERENCE_FRAGMENT =
  'H4sIAAAAAAACA5WPQWrDMBREr2K0toMs5FjyAXoJ08X3_6NaoCpBkkPS03fVUkq6KAyzGN5i3qoky_B-pBY5Ua1DvSKlOvBOhbihDHWnAtWPul_VS7l8IHe3UXdRkFtsj64goCAzqurzkdL_67Vfv6OMNnYJsWCjlFSvcL9SFshCaDvKkCgzfu4Jb8SPU4j3dhT8ifElN-R2uo2LniGOtWcKMo3jmXDG5G3wEsg4r7Uja2V2s_cbBydg4wPbaTMyG-us-nr7TGj97fZM-BMV9p7sdgEAAA';

export const FROZEN_V17_IDENTITY_REFERENCE_FRAGMENT =
  'H4sIAAAAAAACA6WQTWrDMBSEr2K0toMt5EjKAXIJ08Xze6PaoCpBkkPS03fTdFG8CC0Ms5of-CYlSbqPLdaVI5XSlStiLB0vlIkrclcWylDtYNtJnfPlE6m5DbZZBamu9dFkBGQkRlFt2mL8t72104-mvZDSvTansGbMFKN6lnajuF8pCeREqAtyFykxXqxEvBM_DmG91y3jLwt8SRWpHm7DqbcQx71nCjIOw5FwxOhN8BJIO9_3jowR66z3MwcnYO0Dm3HWYrVx5vvxSWbvd_rN8QXWX7N9Og0AAgAA';

export const FROZEN_V17_MATCHING_DIGEST_REFERENCE_FRAGMENT =
  'H4sIAAAAAAACA6WPQQrCMBREr1KybqUNqUm8gycIXXz__7GBGEuSit7ehehCXQjCMIth4M04QYm60xprwAildGXhGEuHM2TAyrkrM2QW7aBbJ_ZQcQ7p2FA4cqlNIE411FuT2XPmhCzatMb4t02te8l9Kwm-LpCIaYfnVDnVzWXY9ZrJYG8RPI3DsAXe8miVt-RBGtv3BpQibbS1B_SGGKX1qMaDJC2VUY_x05P8hnQfE9-DH37dAWXUAZxwAQAA';

export const FROZEN_IDENTITY_REFERENCE_DIGESTS = Object.freeze({
  v10: Object.freeze({
    compressed: '74aca6ee8e159374fdad2096ab039e8375a4d88a01e10028da61b8b38e479af5',
    original: '2e5a3cc656680d85e469c98e5a83923a5e632b5bd3ecb3481f05b809e4609e5d',
  }),
  v17: Object.freeze({
    compressed: '442d1c95079803f27b8f19d8055fb37a682dd93fab92f84e4b91a40953f1cca3',
    original: '2337fb7885414e9bd722fab02befd28cfe8efe74ed4ad4df20507f9a38de8fc2',
  }),
  matchingDigestV17: Object.freeze({
    compressed: '9fdbc5dbd57c8b268a2f110fa3e6fdd4d3c94e42850a76747db9181f399a5c16',
    original: 'c693e7730d776b82b41b48b97c7b5fd3809029a1e34457c9f429a6877468a50d',
  }),
});
