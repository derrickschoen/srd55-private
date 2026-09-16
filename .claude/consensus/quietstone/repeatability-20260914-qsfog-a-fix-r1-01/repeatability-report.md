# QSFOG repeatability report

- Block: 20260914-qsfog-a-fix-r1-01
- Freeze SHA-256: 401b7d9b280d154475c53b37fac117656a75e6e855fb522434ce7f642532be5e
- Whole interval: 2026-09-14T21:54:24-04:00 through 2026-09-14T22:42:51-04:00
- Authenticated arm/state rows: 48
- C1 mean: 3107043708791/16882628817600
- C2 mean: 122100079/679482180
- Reference mean: 116674835761349/641539895068800
- Score headroom: 524865059307451/641539895068800
- Conservative spread: 193213/427924
- Frozen threshold: 193213/213962
- Fog FN C1/C2: 16/13
- Obscurement FN C1/C2: 243/215
- Stable-positive facts: 5
- Control-disputed positive facts: 9

## Base repeatability and headroom

- 5763006: C1 2739/44200, C2 1031/29640, reference 121879/2519400, spread 97229/1259700, threshold 97229/629850, headroom 2397521/2519400.
- 5763022: C1 22553/122400, C2 3377/8398, reference 17727791/60465600, spread 11847709/30232800, threshold 11847709/15116400, headroom 42737809/60465600.
- 5763027: C1 11/240, C2 1/8, reference 41/480, spread 7/80, threshold 7/40, headroom 439/480.
- 5763040: C1 153951/905944, C2 697/1976, reference 2249159/8606468, spread 2714671/8606468, threshold 2714671/4303234, headroom 6357309/8606468.
- 5763047: C1 4005/6902, C2 463/3596, reference 303407/855848, spread 193213/427924, threshold 193213/213962, headroom 552441/855848.

## Leave-one-base-out controls

- Remove 5763006: C1 162253782031/662063875200, C2 15229559/60398416, reference 106329748191413/427693263379200, spread 193213/427924, threshold 193213/213962, headroom 321363515187787/427693263379200.
- Remove 5763022: C1 431431320809/2344809558000, C2 2251801/16653975, reference 14221032986491/89102763204000, spread 193213/427924, threshold 193213/213962, headroom 74881730217509/89102763204000.
- Remove 5763027: C1 2978079183101/14068857348000, C2 431776801/2264940600, reference 107541802532939/534616579224000, spread 193213/427924, threshold 193213/213962, headroom 427074776691061/534616579224000.
- Remove 5763040: C1 301789381/1615068000, C2 328616551/2264940600, reference 24290222833/146350008000, spread 193213/427924, threshold 193213/213962, headroom 122059785167/146350008000.
- Remove 5763047: C1 7262591797/69304716000, C2 239197/1259700, reference 388026652183/2633579208000, spread 11847709/30232800, threshold 11847709/15116400, headroom 2245552555817/2633579208000.

## Fixed-denominator error families

- ordinary: denominator 5331, counts C1/C2 265/88, rates C1/C2 265/5331/88/5331, reference 353/10662, pooled difference 59/1777, spread 177/1040, 2*spread<headroom false.
  - 5763006: denominator 1090, counts C1/C2 16/13, reference 29/2180, spread 3/1090, 2*spread<headroom true.
  - 5763022: denominator 1190, counts C1/C2 47/53, reference 5/119, spread 3/595, 2*spread<headroom true.
  - 5763027: denominator 689, counts C1/C2 0/0, reference 0/1, spread 0/1, 2*spread<headroom false.
  - 5763040: denominator 1040, counts C1/C2 199/22, reference 17/160, spread 177/1040, 2*spread<headroom false.
  - 5763047: denominator 1322, counts C1/C2 3/0, reference 3/2644, spread 3/1322, 2*spread<headroom false.
- collision: denominator 348, counts C1/C2 119/114, rates C1/C2 119/348/19/58, reference 233/696, pooled difference 5/348, spread 41/55, 2*spread<headroom false.
  - 5763006: denominator 95, counts C1/C2 4/8, reference 6/95, spread 4/95, 2*spread<headroom false.
  - 5763022: denominator 103, counts C1/C2 56/43, reference 99/206, spread 13/103, 2*spread<headroom true.
  - 5763027: denominator 35, counts C1/C2 9/8, reference 17/70, spread 1/35, 2*spread<headroom true.
  - 5763040: denominator 60, counts C1/C2 36/0, reference 3/10, spread 3/5, 2*spread<headroom false.
  - 5763047: denominator 55, counts C1/C2 14/55, reference 69/110, spread 41/55, 2*spread<headroom false.

## Verdict: REPEATABILITY_AUTHENTICATED
