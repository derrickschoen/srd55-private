# QSFOG-01 Increment 1 lane report (sol)

Source: .tmp/runs/fanout/fog-inc1.log (session 01a09c8c-440a-7360-a73e-f42f6b73170d)

Increment 1 is complete. No Increment 2 work or shipping files were touched.

Key results:

- Primary match: 16 pairs; exposed coverage 0.4756%, unexposed coverage 0.8134%, both below 70%.
- Within-base RD changes: `0`, `NA`, `0`, `-0.1667`, `NA`; primary median and all leave-one-base-out medians are `NA`.
- Sensitivity match: 0 pairs and 0% coverage in both arms.
- Collision-rate changes: `+0.0211`, `−0.2816`, `+0.0857`, `+0.4667`, `+0.5818`; only two seeds met the +0.10 threshold.
- All 183 fired stop rules are explicitly listed.
- Recompositions: 24 images per direction; 5,331 eligible cells verified; 49,089,110 pixels changed per direction; zero changes outside the proven floor-only layer graph.
- Frozen contract SHA remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

Deliverables:

- [qsfog-diagnosis.md](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp/runs/quietstone/qsfog-diagnosis.md)
- [qsfog-diagnosis.json](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp/runs/quietstone/qsfog-diagnosis.json)
- [qsfog-diagnosis.csv](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp/runs/quietstone/qsfog-diagnosis.csv)
- [qsfog_diagnose.py](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp/runs/quietstone/qsfog-scripts/qsfog_diagnose.py)
- [candidate-with-baseline-floors manifest](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp/runs/quietstone/recomposed/candidate-with-baseline-floors/manifest.json)
- [baseline-with-candidate-floors manifest](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp/runs/quietstone/recomposed/baseline-with-candidate-floors/manifest.json)

Final verification command:

```bash
UV_CACHE_DIR=/tmp/qsfog-uv-cache uv run --offline --no-project --with numpy --with pillow python .tmp/runs/quietstone/qsfog-scripts/qsfog_diagnose.py --check
```

Exit 0; 6,988 cells, 4,040 windows, 28 components; wall time 152.49 seconds.

QSFOG-INC1 DONE
FLAT-FIELD: INCONCLUSIVE
COLLISION: INCONCLUSIVE
diff --git a/.tmp/runs/quietstone/qsfog-scripts/qsfog_diagnose.py b/.tmp/runs/quietstone/qsfog-scripts/qsfog_diagnose.py
new file mode 100644
index 0000000000000000000000000000000000000000..b43a6a44ade3a8fa7cf7b4af1d9c188ece7dc27a
--- /dev/null
+++ b/.tmp/runs/quietstone/qsfog-scripts/qsfog_diagnose.py
@@ -0,0 +1,1819 @@
+#!/usr/bin/env python3
+"""QSFOG-01 Increment 1 deterministic diagnosis and floor recomposition.
+
+This script consumes the already-captured paired board PNG/HTML/semantic artifacts.
+It never launches a browser or model and never renders a board.  Distances are
+Manhattan cell distances.  Matching is deterministic, one-to-one, and without
+replacement; exact-stratum rows are sorted by baseline luminance and coordinate.
+"""
+
+from __future__ import annotations
+
+import argparse
+import csv
+import hashlib
+import html as html_module
+import io
+import itertools
+import json
+import math
+import re
+import statistics
+import subprocess
+from collections import Counter, defaultdict, deque
+from functools import lru_cache
+from pathlib import Path
+from typing import Iterable, Iterator, Sequence
+
+import numpy as np
+from PIL import Image
+
+
+ROOT = Path(__file__).resolve().parents[4]
+RUN = ROOT / ".tmp/runs/quietstone"
+PLAN = ROOT / ".tmp-plans/2026-09-11-quietstone-fog-legibility-plan.md"
+CANDIDATE_ROOT = ROOT / "dnd-slim-runs/quietstone-probe-candidate-images"
+BASELINE_ROOT = Path("/home/vagrant/PhpstormProjects/dnd-wt-qs-baseline/dnd-slim-runs/quietstone-probe-baseline-images")
+BASELINE_JSONL = RUN / "probe-baseline.jsonl"
+CANDIDATE_JSONL = RUN / "probe-candidate.jsonl"
+OUTPUT_JSON = RUN / "qsfog-diagnosis.json"
+OUTPUT_CSV = RUN / "qsfog-diagnosis.csv"
+OUTPUT_MD = RUN / "qsfog-diagnosis.md"
+RECOMPOSED_CANDIDATE = RUN / "recomposed/candidate-with-baseline-floors"
+RECOMPOSED_BASELINE = RUN / "recomposed/baseline-with-candidate-floors"
+
+PLAN_SHA = "6b7deaf37902d5374b2a69ef19fbbba6a5c1ad9af56682481edf89e6f1cdd524"
+BASELINE_JSONL_SHA = "460e953726f4e6c64ed200a697d58ad1bef593ffc712e298635e65b96ebb8657"
+CANDIDATE_JSONL_SHA = "f614dd0298d3be2ba41440fdc18cde97ed5f1ffa8500725b820b47da6623adb9"
+BASE_REVISION = "85168bc591b5a52c7659aa86ae164eeb71681a76"
+EXPECTED_HEAD = "28f3bd1daa11f28c7a84f6431daaa51e25a2da47"
+SEEDS = ("5763006", "5763022", "5763027", "5763040", "5763047")
+NAMED_BOARDS = frozenset({
+    "generated-los-cover-v1-5763040-none-v4",
+    "generated-los-cover-v1-5763022-three_quarters-v2",
+    "generated-los-cover-v1-5763047-three_quarters-v5",
+    "generated-los-cover-v1-5763047-total-v5",
+    "generated-los-cover-v1-5763006-three_quarters-v1",
+})
+TRUTH_CLASSES = ("fog-only", "obscured-only", "fog+obscured", "neither")
+TRANSITIONS = ("retained", "new", "resolved", "never")
+TILE = 128
+INSET = 8
+BOARD_BORDER = 4
+COORDINATE_GUTTER = 48
+GRID_ORIGIN = BOARD_BORDER + COORDINATE_GUTTER
+LOW_STD = 0.025
+LOW_EDGE = 0.08
+SOBEL_THRESHOLD = 0.035
+NO_FEATURE_SENTINEL = -1
+FLOOR_FILES = (
+    "map-floor-stone-v1.png",
+    "map-floor-stone-1-v1.png",
+    "map-floor-stone-2-v1.png",
+    "map-floor-stone-3-v1.png",
+)
+FLOOR_IDS = (
+    "art.map.floor.stone.v1",
+    "art.map.floor.stone-1.v1",
+    "art.map.floor.stone-2.v1",
+    "art.map.floor.stone-3.v1",
+)
+
+
+def sha256_bytes(data: bytes) -> str:
+    return hashlib.sha256(data).hexdigest()
+
+
+def sha256_file(path: Path) -> str:
+    digest = hashlib.sha256()
+    with path.open("rb") as handle:
+        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
+            digest.update(chunk)
+    return digest.hexdigest()
+
+
+def require(condition: bool, message: str) -> None:
+    if not condition:
+        raise RuntimeError(message)
+
+
+def canonical(value: object) -> str:
+    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
+
+
+def load_jsonl(path: Path) -> list[dict[str, object]]:
+    rows: list[dict[str, object]] = []
+    with path.open(encoding="utf-8") as handle:
+        for line_number, line in enumerate(handle, 1):
+            try:
+                value = json.loads(line)
+            except json.JSONDecodeError as error:
+                raise RuntimeError(f"{path}:{line_number}: invalid JSON") from error
+            require(isinstance(value, dict), f"{path}:{line_number}: row is not an object")
+            rows.append(value)
+    return rows
+
+
+def git_text(*arguments: str) -> str:
+    completed = subprocess.run(
+        ["git", *arguments], cwd=ROOT, check=True, stdout=subprocess.PIPE,
+        stderr=subprocess.PIPE,
+    )
+    return completed.stdout.decode("utf-8")
+
+
+def git_bytes(*arguments: str) -> bytes:
+    completed = subprocess.run(
+        ["git", *arguments], cwd=ROOT, check=True, stdout=subprocess.PIPE,
+        stderr=subprocess.PIPE,
+    )
+    return completed.stdout
+
+
+def png_array(path: Path) -> np.ndarray:
+    with Image.open(path) as image:
+        return np.asarray(image.convert("RGBA"), dtype=np.uint8)
+
+
+def png_array_bytes(data: bytes) -> np.ndarray:
+    with Image.open(io.BytesIO(data)) as image:
+        return np.asarray(image.convert("RGBA"), dtype=np.uint8)
+
+
+def rel_luminance(rgba: np.ndarray) -> np.ndarray:
+    rgb = rgba[..., :3].astype(np.float64) / 255.0
+    linear = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
+    return linear[..., 0] * 0.2126 + linear[..., 1] * 0.7152 + linear[..., 2] * 0.0722
+
+
+def shift_difference_energy(values: np.ndarray, dy: int, dx: int) -> float:
+    height, width = values.shape
+    y0a, y1a = max(0, -dy), min(height, height - dy)
+    x0a, x1a = max(0, -dx), min(width, width - dx)
+    first = values[y0a:y1a, x0a:x1a]
+    second = values[y0a + dy:y1a + dy, x0a + dx:x1a + dx]
+    return float(np.mean(np.square(second - first)))
+
+
+def normalized_correlation(left: np.ndarray, right: np.ndarray) -> float | None:
+    a = left.astype(np.float64).ravel()
+    b = right.astype(np.float64).ravel()
+    a -= float(a.mean())
+    b -= float(b.mean())
+    denominator = float(np.sqrt(np.dot(a, a) * np.dot(b, b)))
+    if denominator == 0.0:
+        return None
+    return float(np.dot(a, b) / denominator)
+
+
+def sobel(values: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
+    padded = np.pad(values, 1, mode="edge")
+    gx = (
+        padded[:-2, 2:] + 2.0 * padded[1:-1, 2:] + padded[2:, 2:]
+        - padded[:-2, :-2] - 2.0 * padded[1:-1, :-2] - padded[2:, :-2]
+    ) / 8.0
+    gy = (
+        padded[2:, :-2] + 2.0 * padded[2:, 1:-1] + padded[2:, 2:]
+        - padded[:-2, :-2] - 2.0 * padded[:-2, 1:-1] - padded[:-2, 2:]
+    ) / 8.0
+    return gx, gy, np.hypot(gx, gy)
+
+
+def entropy32(values: np.ndarray) -> float:
+    counts, _ = np.histogram(values, bins=32, range=(0.0, 1.0))
+    probabilities = counts[counts > 0].astype(np.float64) / counts.sum()
+    return float(-np.sum(probabilities * np.log2(probabilities)))
+
+
+def boundary_metrics(full_luminance: np.ndarray, interior_gradient_mean: float) -> dict[str, float]:
+    _, _, magnitude = sobel(full_luminance)
+    top = magnitude[INSET, INSET:TILE - INSET]
+    right = magnitude[INSET:TILE - INSET, TILE - INSET - 1]
+    bottom = magnitude[TILE - INSET - 1, INSET:TILE - INSET][::-1]
+    left = magnitude[INSET:TILE - INSET, INSET][::-1]
+    perimeter = np.concatenate((top, right, bottom, left))
+    marked = perimeter >= SOBEL_THRESHOLD
+    coherent = np.zeros_like(marked)
+    doubled = np.concatenate((marked, marked))
+    start = 0
+    while start < doubled.size:
+        if not doubled[start]:
+            start += 1
+            continue
+        end = start + 1
+        while end < doubled.size and doubled[end]:
+            end += 1
+        if end - start >= 4:
+            for index in range(start, end):
+                coherent[index % marked.size] = True
+        start = end
+    mean_gradient = float(perimeter.mean())
+    return {
+        "boundary_perimeter_gradient_mean": mean_gradient,
+        "boundary_coherent_mark_fraction": float(coherent.mean()),
+        "boundary_minus_interior_gradient": mean_gradient - interior_gradient_mean,
+    }
+
+
+def image_metrics(
+    rgba: np.ndarray,
+    templates: dict[str, tuple[np.ndarray, np.ndarray]],
+) -> dict[str, float | None]:
+    require(rgba.shape == (TILE, TILE, 4), f"cell has unexpected shape {rgba.shape}")
+    interior_rgba = rgba[INSET:TILE - INSET, INSET:TILE - INSET]
+    full_lum = rel_luminance(rgba)
+    lum = full_lum[INSET:TILE - INSET, INSET:TILE - INSET]
+    gx, gy, magnitude = sobel(lum)
+    result: dict[str, float | None] = {
+        "luminance_mean": float(lum.mean()),
+        "luminance_std": float(lum.std(ddof=0)),
+        "luminance_p95_p05": float(np.percentile(lum, 95) - np.percentile(lum, 5)),
+        "luminance_entropy32": entropy32(lum),
+        "gradient_energy_horizontal": shift_difference_energy(lum, 0, 1),
+        "gradient_energy_vertical": shift_difference_energy(lum, 1, 0),
+        "gradient_energy_diag_plus45": shift_difference_energy(lum, 1, 1),
+        "gradient_energy_diag_minus45": shift_difference_energy(lum, 1, -1),
+        "sobel_edge_density": float(np.mean(magnitude >= SOBEL_THRESHOLD)),
+        "sobel_gradient_mean": float(magnitude.mean()),
+        "autocorrelation_diag_plus45_pitch6": normalized_correlation(lum[:-6, :-6], lum[6:, 6:]),
+        "autocorrelation_diag_minus45_pitch6": normalized_correlation(lum[:-6, 6:], lum[6:, :-6]),
+    }
+    result.update(boundary_metrics(full_lum, float(magnitude.mean())))
+    sample = interior_rgba.astype(np.float64) / 255.0
+    for name, (template_float, template_lum) in templates.items():
+        result[f"template_{name}_ncc"] = normalized_correlation(lum, template_lum)
+        result[f"template_{name}_rgba_mse"] = float(np.mean(np.square(sample - template_float)))
+        result[f"template_{name}_luminance_abs_error"] = float(np.mean(np.abs(lum - template_lum)))
+    return result
+
+
+def rgb_from_hsl(hue: float, saturation: float, lightness: float) -> tuple[int, int, int]:
+    h = (hue % 360.0) / 360.0
+    s = min(1.0, max(0.0, saturation / 100.0))
+    light = min(1.0, max(0.0, lightness / 100.0))
+    q = light * (1 + s) if light < 0.5 else light + s - light * s
+    p = 2 * light - q
+    def channel(offset: float) -> int:
+        wrapped = (h + offset) % 1.0
+        if wrapped < 1 / 6:
+            value = p + (q - p) * 6 * wrapped
+        elif wrapped < 1 / 2:
+            value = q
+        elif wrapped < 2 / 3:
+            value = p + (q - p) * (2 / 3 - wrapped) * 6
+        else:
+            value = p
+        return round(value * 255)
+    return channel(1 / 3), channel(0), channel(-1 / 3)
+
+
+def neutral_rgb(step: int) -> tuple[int, int, int]:
+    return rgb_from_hsl(225, 6, min(93, max(7, 7 + step * 10.625)))
+
+
+def hue_delta(source: float, target: float) -> float:
+    raw = (target - source) % 360
+    return raw - 360 if raw > 180 else raw
+
+
+def ramp_rgb(name: str, step: int) -> tuple[int, int, int]:
+    bases = {"cloth-cool": (222.0, 55.0, 48.0)}
+    hue, saturation, lightness = bases[name]
+    if step < 3:
+        for _ in range(3 - step):
+            delta = hue_delta(hue, 262)
+            hue = (hue + math.copysign(min(abs(delta), 15), delta)) % 360
+            saturation *= 0.9
+            lightness = min(93, max(7, lightness - 11))
+    elif step > 3:
+        for _ in range(step - 3):
+            delta = hue_delta(hue, 55)
+            hue = (hue + math.copysign(min(abs(delta), 8), delta)) % 360
+            saturation *= 0.92
+            lightness = min(93, max(7, lightness + 9))
+    return rgb_from_hsl(hue, saturation, lightness)
+
+
+def put(bitmap: np.ndarray, x: int, y: int, rgba: tuple[int, int, int, int]) -> None:
+    if 0 <= x < TILE and 0 <= y < TILE:
+        bitmap[y, x] = rgba
+
+
+def draw_line(bitmap: np.ndarray, x0: int, y0: int, x1: int, y1: int, rgba: tuple[int, int, int, int]) -> None:
+    x, y = x0, y0
+    dx = abs(x1 - x0)
+    dy = -abs(y1 - y0)
+    sx = 1 if x0 < x1 else -1
+    sy = 1 if y0 < y1 else -1
+    error = dx + dy
+    while True:
+        put(bitmap, x, y, rgba)
+        if x == x1 and y == y1:
+            break
+        doubled = 2 * error
+        if doubled >= dy:
+            error += dy
+            x += sx
+        if doubled <= dx:
+            error += dx
+            y += sy
+
+
+def independent_fog_template() -> np.ndarray:
+    bitmap = np.empty((TILE, TILE, 4), dtype=np.uint8)
+    bitmap[:, :] = (*neutral_rgb(0), 250)
+    for y in range(TILE):
+        for x in range(TILE):
+            if (x + y) % 6 == 0:
+                bitmap[y, x] = (*neutral_rgb(1), 150)
+    return bitmap
+
+
+def independent_obscurement_template(strength: str) -> np.ndarray:
+    bitmap = np.zeros((TILE, TILE, 4), dtype=np.uint8)
+    alpha = 120 if strength == "light" else 180
+    cool3 = (*ramp_rgb("cloth-cool", 3), alpha)
+    for y in range(4, TILE - 4):
+        for x in range(4, TILE - 4):
+            if ((0, 2), (3, 1))[y & 1][x & 1] < 1:
+                bitmap[y, x] = cool3
+    for radius_x, radius_y, color in (
+        (52, 56, (*ramp_rgb("cloth-cool", 6), 255)),
+        (32, 36, (*ramp_rgb("cloth-cool", 5), 255)),
+        (14, 16, (*ramp_rgb("cloth-cool", 6), 255)),
+    ):
+        points = ((64, 64 - radius_y), (64 + radius_x, 64), (64, 64 + radius_y), (64 - radius_x, 64), (64, 64 - radius_y))
+        for offset in (-1, 0, 1):
+            for start, end in zip(points, points[1:]):
+                draw_line(bitmap, start[0] + offset, start[1], end[0] + offset, end[1], color)
+    return bitmap
+
+
+def load_templates() -> tuple[dict[str, np.ndarray], dict[str, object]]:
+    templates: dict[str, np.ndarray] = {
+        "fog_hidden": independent_fog_template(),
+        "obscurement_light": independent_obscurement_template("light"),
+        "obscurement_heavy": independent_obscurement_template("heavy"),
+    }
+    validation: dict[str, object] = {}
+    procedural_files = {
+        "fog_hidden": "fog-hidden-v1.png",
+        "obscurement_light": "map-overlay-obscurement-light-v1.png",
+        "obscurement_heavy": "map-overlay-obscurement-heavy-v1.png",
+    }
+    for name, filename in procedural_files.items():
+        shipping = png_array(ROOT / "public/assets/art" / filename)
+        exact = bool(np.array_equal(shipping, templates[name]))
+        require(exact, f"independent {name} raster does not reproduce shipping RGBA")
+        validation[name] = {"rgbaSha256": sha256_bytes(templates[name].tobytes()), "shippingRgbaExact": exact}
+
+    oracle = json.loads((RUN / "candidate-rgba-oracle.json").read_text(encoding="utf-8"))
+    for index, filename in enumerate(FLOOR_FILES):
+        relative = f"public/assets/art/{filename}"
+        candidate = png_array(ROOT / relative)
+        oracle_row = oracle.get(relative)
+        require(isinstance(oracle_row, dict), f"candidate oracle missing {relative}")
+        require(sha256_bytes(candidate.tobytes()) == oracle_row.get("rgbaSha256"), f"candidate floor oracle mismatch {relative}")
+        baseline_bytes = git_bytes("show", f"{BASE_REVISION}:{relative}")
+        baseline = png_array_bytes(baseline_bytes)
+        require(candidate.shape == (TILE, TILE, 4), f"candidate floor {filename} is not 128x128 RGBA")
+        require(baseline.shape == (TILE, TILE, 4), f"baseline floor {filename} is not 128x128 RGBA")
+        templates[f"candidate_floor_{index}"] = candidate
+        templates[f"baseline_floor_{index}"] = baseline
+        validation[f"candidate_floor_{index}"] = {
+            "file": relative,
+            "pngSha256": sha256_file(ROOT / relative),
+            "rgbaSha256": sha256_bytes(candidate.tobytes()),
+            "oracleRgbaSha256": oracle_row.get("rgbaSha256"),
+        }
+        validation[f"baseline_floor_{index}"] = {
+            "revision": BASE_REVISION,
+            "file": relative,
+            "pngSha256": sha256_bytes(baseline_bytes),
+            "rgbaSha256": sha256_bytes(baseline.tobytes()),
+        }
+    return templates, validation
+
+
+def flatten_manifest_artifacts(root: Path) -> tuple[dict[str, dict[str, object]], dict[str, object]]:
+    manifests = sorted((root / "manifests").glob("*.json"))
+    require(len(manifests) == 24, f"{root}: expected 24 manifests, found {len(manifests)}")
+    by_png: dict[str, dict[str, object]] = {}
+    final_manifest: dict[str, object] | None = None
+    maximum = -1
+    for path in manifests:
+        raw = path.read_bytes()
+        require(sha256_bytes(raw) == path.stem, f"manifest digest/filename mismatch: {path}")
+        manifest = json.loads(raw)
+        require(manifest.get("tileSizeCssPx") == TILE, f"manifest tile size is not {TILE}: {path}")
+        artifacts = manifest.get("artifacts")
+        require(isinstance(artifacts, list), f"manifest artifacts missing: {path}")
+        if len(artifacts) > maximum:
+            maximum = len(artifacts)
+            final_manifest = manifest
+        for artifact in artifacts:
+            require(isinstance(artifact, dict), f"invalid artifact in {path}")
+            png_sha = artifact.get("sha256")
+            require(isinstance(png_sha, str), f"artifact PNG SHA missing in {path}")
+            existing = by_png.get(png_sha)
+            if existing is not None:
+                stable_keys = ("relativePath", "sha256", "bytes", "width", "height", "source", "html")
+                require(all(existing.get(key) == artifact.get(key) for key in stable_keys), f"conflicting artifact metadata for {png_sha}")
+            by_png[png_sha] = artifact
+    require(final_manifest is not None and maximum == 24, f"{root}: no 24-artifact final manifest")
+    return by_png, final_manifest
+
+
+def row_key(row: dict[str, object]) -> tuple[str, str, str, str]:
+    return (
+        str(row.get("stateId")), str(row.get("question")),
+        str(row.get("model")), str(row.get("effort")),
+    )
+
+
+def q9_sol_by_state(rows: Sequence[dict[str, object]]) -> dict[str, dict[str, object]]:
+    selected = [row for row in rows if row.get("question") == "Q9" and row.get("model") == "gpt-5.6-sol"]
+    require(len(selected) == 24, f"expected 24 Sol Q9 rows, found {len(selected)}")
+    result = {str(row["stateId"]): row for row in selected}
+    require(len(result) == 24, "Sol Q9 state IDs are not unique")
+    return result
+
+
+def parse_html_cells(text: str) -> tuple[tuple[int, int], dict[tuple[int, int], str]]:
+    dimension = re.search(r"Board dimensions: (\d+) columns by (\d+) rows", text)
+    require(dimension is not None, "captured HTML lacks board dimensions")
+    columns, rows = int(dimension.group(1)), int(dimension.group(2))
+    require("Coordinates are zero-based (column,row)" in html_module.unescape(text), "captured HTML lacks coordinate convention")
+    facts: dict[tuple[int, int], str] = {}
+    for match in re.finditer(r'<tr data-cell="(\d+),(\d+)">(.*?)</tr>', text):
+        column, row = int(match.group(1)), int(match.group(2))
+        plain = re.sub(r"<[^>]+>", " ", match.group(3))
+        facts[(column, row)] = " ".join(html_module.unescape(plain).split())
+    require(all(0 <= c < columns and 0 <= r < rows for c, r in facts), "captured HTML has an out-of-bounds data-cell")
+    return (columns, rows), facts
+
+
+def authenticate(
+    baseline_rows: list[dict[str, object]], candidate_rows: list[dict[str, object]],
+) -> tuple[dict[str, dict[str, object]], dict[str, dict[str, object]], dict[str, object]]:
+    require(sha256_file(PLAN) == PLAN_SHA, "binding plan digest changed")
+    require(sha256_file(BASELINE_JSONL) == BASELINE_JSONL_SHA, "baseline JSONL digest changed")
+    require(sha256_file(CANDIDATE_JSONL) == CANDIDATE_JSONL_SHA, "candidate JSONL digest changed")
+    require(len(baseline_rows) == 1008, f"baseline JSONL row count {len(baseline_rows)} != 1008")
+    require(len(candidate_rows) == 1008, f"candidate JSONL row count {len(candidate_rows)} != 1008")
+    require(git_text("rev-parse", "HEAD").strip() == EXPECTED_HEAD, "working HEAD differs from binding revision")
+
+    baseline_index = {row_key(row): row for row in baseline_rows}
+    candidate_index = {row_key(row): row for row in candidate_rows}
+    require(len(baseline_index) == 1008 and len(candidate_index) == 1008, "JSONL paired key is not unique")
+    require(set(baseline_index) == set(candidate_index), "baseline/candidate paired row keys differ")
+    agree_fields = (
+        "stateId", "truth", "primerVersion", "promptVersion", "boardGlyphs",
+        "captureTilePx", "boardInput", "generation", "normaliserVersion", "version",
+        "semanticPayloadSha256", "semanticPayloadBytes",
+    )
+    for key in sorted(baseline_index):
+        baseline = baseline_index[key]
+        candidate = candidate_index[key]
+        for field in agree_fields:
+            require(baseline.get(field) == candidate.get(field), f"paired row {key} differs in {field}")
+        for field in ("width", "height"):
+            require(
+                isinstance(baseline.get("png"), dict) and isinstance(candidate.get("png"), dict)
+                and baseline["png"].get(field) == candidate["png"].get(field),
+                f"paired row {key} differs in PNG {field}",
+            )
+
+    baseline_artifacts, baseline_manifest = flatten_manifest_artifacts(BASELINE_ROOT)
+    candidate_artifacts, candidate_manifest = flatten_manifest_artifacts(CANDIDATE_ROOT)
+    q9_baseline = q9_sol_by_state(baseline_rows)
+    q9_candidate = q9_sol_by_state(candidate_rows)
+    require(set(q9_baseline) == set(q9_candidate), "Q9 state sets differ")
+    require(len(q9_baseline) == 24, "paired Q9 state count is not 24")
+
+    state_auth: dict[str, object] = {}
+    for state_id in sorted(q9_baseline):
+        state_row: dict[str, object] = {}
+        dimensions: tuple[int, int] | None = None
+        semantic_digest: str | None = None
+        html_digest: str | None = None
+        for revision, row, root, artifacts in (
+            ("baseline", q9_baseline[state_id], BASELINE_ROOT, baseline_artifacts),
+            ("candidate", q9_candidate[state_id], CANDIDATE_ROOT, candidate_artifacts),
+        ):
+            png = row.get("png")
+            require(isinstance(png, dict), f"{revision} {state_id}: missing PNG record")
+            digest = png.get("sha256")
+            relative = png.get("relativePath")
+            require(isinstance(digest, str) and isinstance(relative, str), f"{revision} {state_id}: invalid PNG record")
+            path = root / relative
+            require(path.name == f"{digest}.png", f"{revision} {state_id}: PNG SHA is not filename")
+            require(sha256_file(path) == digest, f"{revision} {state_id}: actual PNG digest differs")
+            with Image.open(path) as image:
+                actual_dimensions = image.size
+            require(actual_dimensions == (png.get("width"), png.get("height")), f"{revision} {state_id}: PNG dimensions differ")
+            artifact = artifacts.get(digest)
+            require(artifact is not None, f"{revision} {state_id}: PNG absent from authenticated manifests")
+            require(artifact.get("relativePath") == relative, f"{revision} {state_id}: manifest PNG path differs")
+            html_record = artifact.get("html")
+            require(isinstance(html_record, dict), f"{revision} {state_id}: manifest HTML missing")
+            html_relative = html_record.get("relativePath")
+            require(isinstance(html_relative, str), f"{revision} {state_id}: manifest HTML path missing")
+            html_path = root / html_relative
+            actual_html_sha = sha256_file(html_path)
+            require(actual_html_sha == html_record.get("sha256") == html_path.parent.name, f"{revision} {state_id}: HTML digest mismatch")
+            html_dimensions, _ = parse_html_cells(html_path.read_text(encoding="utf-8"))
+            if dimensions is None:
+                dimensions = html_dimensions
+            else:
+                require(dimensions == html_dimensions, f"{state_id}: HTML bounds differ by revision")
+            if html_digest is None:
+                html_digest = actual_html_sha
+            else:
+                require(html_digest == actual_html_sha, f"{state_id}: accessible HTML bytes differ by revision")
+            semantic_relative = row.get("semanticPayloadRelativePath")
+            semantic_sha = row.get("semanticPayloadSha256")
+            require(isinstance(semantic_relative, str) and isinstance(semantic_sha, str), f"{revision} {state_id}: semantic record missing")
+            semantic_path = root / semantic_relative
+            require(semantic_path.name == f"{semantic_sha}.json", f"{revision} {state_id}: semantic SHA is not filename")
+            require(sha256_file(semantic_path) == semantic_sha, f"{revision} {state_id}: semantic digest mismatch")
+            if semantic_digest is None:
+                semantic_digest = semantic_sha
+            else:
+                require(semantic_digest == semantic_sha, f"{state_id}: semantic board differs by revision")
+            state_row[revision] = {
+                "pngSha256": digest, "pngFile": relative,
+                "htmlSha256": actual_html_sha, "htmlFile": html_relative,
+                "semanticSha256": semantic_sha, "semanticFile": semantic_relative,
+                "dimensions": list(actual_dimensions),
+            }
+        require(dimensions is not None, f"{state_id}: missing dimensions")
+        columns, rows = dimensions
+        candidate_png = q9_candidate[state_id]["png"]
+        require(isinstance(candidate_png, dict), "candidate PNG record invalid")
+        expected_width = 2 * BOARD_BORDER + 2 * COORDINATE_GUTTER + columns * TILE
+        require(candidate_png.get("width") == expected_width, f"{state_id}: board width does not prove DOM chrome geometry")
+        state_auth[state_id] = state_row
+
+    return q9_baseline, q9_candidate, {
+        "plan": {"path": str(PLAN), "sha256": PLAN_SHA},
+        "jsonl": {
+            "baseline": {"path": str(BASELINE_JSONL), "sha256": BASELINE_JSONL_SHA, "rows": len(baseline_rows)},
+            "candidate": {"path": str(CANDIDATE_JSONL), "sha256": CANDIDATE_JSONL_SHA, "rows": len(candidate_rows)},
+        },
+        "manifests": {
+            "baselineFinalArtifactCount": len(baseline_manifest["artifacts"]),
+            "candidateFinalArtifactCount": len(candidate_manifest["artifacts"]),
+            "baselineManifestCount": 24, "candidateManifestCount": 24,
+        },
+        "pairedRows": len(baseline_index), "pairedStates": len(q9_baseline),
+        "geometry": {
+            "tileCssPx": TILE, "boardBorderPx": BOARD_BORDER,
+            "coordinateGutterPx": COORDINATE_GUTTER, "gridOriginPx": GRID_ORIGIN,
+            "derivation": "captured manifest tile size plus captured DOM chrome metrics; cell rect [52+128c,52+128r,128,128]",
+        },
+        "states": state_auth,
+    }
+
+
+def expand_items(record: object) -> set[tuple[int, int]]:
+    require(isinstance(record, dict), "semantic cell record is not an object")
+    encoding = record.get("encoding")
+    items = record.get("items")
+    require(isinstance(encoding, str) and isinstance(items, list), "semantic cell record is malformed")
+    result: set[tuple[int, int]] = set()
+    if encoding == "[column,row]":
+        for item in items:
+            require(isinstance(item, list) and len(item) == 2, f"bad cell item {item}")
+            result.add((int(item[0]), int(item[1])))
+    elif encoding == "[start_column,row,end_column_inclusive]; endpoint is inclusive":
+        for item in items:
+            require(isinstance(item, list) and len(item) == 3, f"bad span item {item}")
+            for column in range(int(item[0]), int(item[2]) + 1):
+                result.add((column, int(item[1])))
+    else:
+        raise RuntimeError(f"unsupported semantic encoding {encoding}")
+    return result
+
+
+def cells_from_nested_items(record: object) -> set[tuple[int, int]]:
+    require(isinstance(record, dict) and isinstance(record.get("items"), list), "nested semantic record malformed")
+    result: set[tuple[int, int]] = set()
+    for item in record["items"]:
+        require(isinstance(item, dict) and isinstance(item.get("cells"), list), "nested semantic item malformed")
+        result.update((int(cell[0]), int(cell[1])) for cell in item["cells"])
+    return result
+
+
+def html_light_overlays(facts: dict[tuple[int, int], str]) -> dict[tuple[int, int], str]:
+    result: dict[tuple[int, int], str] = {}
+    for cell, text in facts.items():
+        match = re.search(r"Light level: (bright|dim|dark(?:ness)?)", text, re.IGNORECASE)
+        if match is not None:
+            level = match.group(1).lower()
+            result[cell] = "dark" if level.startswith("dark") else level
+    return result
+
+
+def floor_variant(column: int, row: int) -> int:
+    left = ((column + 1) * 73_856_093) & 0xFFFFFFFF
+    right = ((row + 1) * 19_349_663) & 0xFFFFFFFF
+    mixed = (left ^ right) & 0xFFFFFFFF
+    return (((mixed >> 8) ^ mixed) & 0xFFFFFFFF) % 4
+
+
+def shade_directions(column: int, row: int, columns: int, rows: int) -> tuple[str, ...]:
+    if row in (0, rows - 1) or column in (0, columns - 1):
+        return ()
+    result: list[str] = []
+    if row == 1:
+        result.append("n")
+    if row == rows - 2:
+        result.append("s")
+    if column == 1:
+        result.append("w")
+    if column == columns - 2:
+        result.append("e")
+    return tuple(result)
+
+
+def nearest_manhattan(cell: tuple[int, int], features: set[tuple[int, int]]) -> int:
+    if not features:
+        return NO_FEATURE_SENTINEL
+    return min(abs(cell[0] - other[0]) + abs(cell[1] - other[1]) for other in features)
+
+
+def distance_bin(distance: int) -> str:
+    if distance == NO_FEATURE_SENTINEL:
+        return "none"
+    if distance <= 1:
+        return "0-1"
+    if distance <= 3:
+        return "2-3"
+    return "4+"
+
+
+def feature_distance_bin(distance: int) -> str:
+    if distance == NO_FEATURE_SENTINEL:
+        return "none"
+    if distance == 1:
+        return "1"
+    if distance <= 3:
+        return "2-3"
+    return "4+"
+
+
+def floor_asset_path(asset_id: str) -> Path:
+    index = FLOOR_IDS.index(asset_id)
+    return ROOT / "public/assets/art" / FLOOR_FILES[index]
+
+
+@lru_cache(maxsize=None)
+def alpha_mask_for_asset(filename: str) -> np.ndarray:
+    return png_array(ROOT / "public/assets/art" / filename)[..., 3] > 0
+
+
+def foreground_fraction(shades: Sequence[str], light_overlay: str | None) -> float:
+    mask = np.zeros((TILE, TILE), dtype=bool)
+    for direction in shades:
+        mask |= alpha_mask_for_asset(f"map-shade-{direction}-v1.png")
+    if light_overlay is not None:
+        suffix = "darkness" if light_overlay == "dark" else light_overlay
+        mask |= alpha_mask_for_asset(f"map-overlay-light-{suffix}-v1.png")
+    interior = mask[INSET:TILE - INSET, INSET:TILE - INSET]
+    return float(interior.mean())
+
+
+def prediction_set(row: dict[str, object], label: str) -> set[tuple[int, int]]:
+    answer = row.get("normalizedAnswer")
+    if not isinstance(answer, dict):
+        return set()
+    values = answer.get(label)
+    if not isinstance(values, list):
+        return set()
+    return {(int(value["column"]), int(value["row"])) for value in values if isinstance(value, dict)}
+
+
+def transition(baseline: bool, candidate: bool) -> str:
+    if baseline and candidate:
+        return "retained"
+    if not baseline and candidate:
+        return "new"
+    if baseline and not candidate:
+        return "resolved"
+    return "never"
+
+
+def parse_state_id(state_id: str) -> tuple[str, str]:
+    match = re.fullmatch(r"generated-los-cover-v1-(\d+)-(none|half|three_quarters|total)-(v\d+)", state_id)
+    require(match is not None, f"unexpected state id {state_id}")
+    return match.group(1), f"{match.group(2)}-{match.group(3)}"
+
+
+def semantic_for(row: dict[str, object]) -> tuple[dict[str, object], str, dict[tuple[int, int], str]]:
+    relative = row.get("semanticPayloadRelativePath")
+    require(isinstance(relative, str), "semantic path absent")
+    semantic = json.loads((CANDIDATE_ROOT / relative).read_text(encoding="utf-8"))
+    digest = row.get("png")
+    require(isinstance(digest, dict), "PNG absent")
+    png_sha = digest.get("sha256")
+    require(isinstance(png_sha, str), "PNG SHA absent")
+    artifacts, _ = flatten_manifest_artifacts(CANDIDATE_ROOT)
+    artifact = artifacts[png_sha]
+    html_record = artifact["html"]
+    require(isinstance(html_record, dict) and isinstance(html_record.get("relativePath"), str), "HTML artifact absent")
+    html_path = CANDIDATE_ROOT / str(html_record["relativePath"])
+    _, facts = parse_html_cells(html_path.read_text(encoding="utf-8"))
+    return semantic, str(html_path), facts
+
+
+def semantic_sets(semantic: dict[str, object]) -> dict[str, set[tuple[int, int]]]:
+    cells = semantic.get("cells")
+    require(isinstance(cells, dict), "semantic cells absent")
+    terrain = cells.get("terrain")
+    obscuration = cells.get("obscurement")
+    require(isinstance(terrain, dict) and isinstance(obscuration, dict), "semantic terrain/obscurement absent")
+    result = {
+        "blocked": expand_items(cells["blocked"]),
+        "difficult": expand_items(cells["difficult_terrain"]),
+        "fog": expand_items(cells["fogged"]),
+        "obscured": expand_items(cells["obscured"]),
+        "obscured_light": expand_items(obscuration["light"]),
+        "obscured_heavy": expand_items(obscuration["heavy"]),
+        "wall": expand_items(terrain["wall"]),
+        "half_cover": expand_items(terrain["half_cover"]),
+        "three_quarters_cover": expand_items(terrain["three_quarters_cover"]),
+        "creature": set(), "object": set(), "door": set(),
+    }
+    creatures = semantic.get("creatures")
+    require(isinstance(creatures, dict) and isinstance(creatures.get("items"), list), "semantic creatures absent")
+    for creature in creatures["items"]:
+        require(isinstance(creature, dict) and isinstance(creature.get("footprint"), list), "creature footprint absent")
+        result["creature"].update((int(cell[0]), int(cell[1])) for cell in creature["footprint"])
+    result["object"] = cells_from_nested_items(semantic["objects"])
+    doors = semantic.get("doors")
+    require(isinstance(doors, dict), "semantic doors absent")
+    result["door"] = cells_from_nested_items(doors["open"]) | cells_from_nested_items(doors["closed"])
+    return result
+
+
+def truth_class(cell: tuple[int, int], fog: set[tuple[int, int]], obscured: set[tuple[int, int]]) -> str:
+    if cell in fog and cell in obscured:
+        return "fog+obscured"
+    if cell in fog:
+        return "fog-only"
+    if cell in obscured:
+        return "obscured-only"
+    return "neither"
+
+
+def metric_delta(candidate: float | None, baseline: float | None) -> float | None:
+    if candidate is None or baseline is None:
+        return None
+    return candidate - baseline
+
+
+def chrome_assertions(image: np.ndarray, columns: int, rows: int, state_id: str) -> dict[str, int]:
+    luminance = rel_luminance(image)
+    checks = 0
+    for column in range(columns):
+        center = GRID_ORIGIN + column * TILE + TILE // 2
+        for y0, y1 in ((5, COORDINATE_GUTTER - 3), (GRID_ORIGIN + rows * TILE + 4, GRID_ORIGIN + rows * TILE + COORDINATE_GUTTER - 4)):
+            patch = luminance[max(0, y0):min(image.shape[0], y1), max(0, center - 22):min(image.shape[1], center + 22)]
+            require(patch.size > 0 and float(patch.max()) >= 0.25, f"{state_id}: column coordinate chrome absent at {column}")
+            checks += 1
+    for row in range(rows):
+        center = GRID_ORIGIN + row * TILE + TILE // 2
+        for x0, x1 in ((5, COORDINATE_GUTTER - 3), (GRID_ORIGIN + columns * TILE + 4, GRID_ORIGIN + columns * TILE + COORDINATE_GUTTER - 4)):
+            patch = luminance[max(0, center - 22):min(image.shape[0], center + 22), max(0, x0):min(image.shape[1], x1)]
+            require(patch.size > 0 and float(patch.max()) >= 0.25, f"{state_id}: row coordinate chrome absent at {row}")
+            checks += 1
+    return {"labelsChecked": checks}
+
+
+def build_cells(
+    q9_baseline: dict[str, dict[str, object]], q9_candidate: dict[str, dict[str, object]],
+    templates: dict[str, tuple[np.ndarray, np.ndarray]], authentication: dict[str, object],
+) -> tuple[list[dict[str, object]], dict[str, dict[str, object]], dict[str, object]]:
+    rows: list[dict[str, object]] = []
+    board_context: dict[str, dict[str, object]] = {}
+    chrome_total = 0
+    for state_id in sorted(q9_baseline):
+        baseline_row, candidate_row = q9_baseline[state_id], q9_candidate[state_id]
+        semantic, html_path, facts = semantic_for(candidate_row)
+        bounds = semantic.get("bounds")
+        require(isinstance(bounds, dict), f"{state_id}: semantic bounds absent")
+        columns, board_rows = int(bounds["columns"]), int(bounds["rows"])
+        sets = semantic_sets(semantic)
+        truth = candidate_row.get("truth")
+        require(isinstance(truth, dict), f"{state_id}: Q9 truth absent")
+        truth_fog = {(int(item["column"]), int(item["row"])) for item in truth["foggedCells"]}
+        truth_obscured = {(int(item["column"]), int(item["row"])) for item in truth["obscuredCells"]}
+        require(truth_fog == sets["fog"] and truth_obscured == sets["obscured"], f"{state_id}: Q9 truth differs from semantic board")
+        baseline_fog = prediction_set(baseline_row, "foggedCells")
+        candidate_fog = prediction_set(candidate_row, "foggedCells")
+        baseline_obscured = prediction_set(baseline_row, "obscuredCells")
+        candidate_obscured = prediction_set(candidate_row, "obscuredCells")
+        baseline_png_record = baseline_row["png"]
+        candidate_png_record = candidate_row["png"]
+        require(isinstance(baseline_png_record, dict) and isinstance(candidate_png_record, dict), "PNG record malformed")
+        baseline_image = png_array(BASELINE_ROOT / str(baseline_png_record["relativePath"]))
+        candidate_image = png_array(CANDIDATE_ROOT / str(candidate_png_record["relativePath"]))
+        require(baseline_image.shape == candidate_image.shape, f"{state_id}: paired PNG shapes differ")
+        chrome_total += chrome_assertions(candidate_image, columns, board_rows, state_id)["labelsChecked"]
+        light_cells = semantic["cells"]
+        require(isinstance(light_cells, dict) and isinstance(light_cells.get("light"), dict), "semantic light absent")
+        light = light_cells["light"]
+        bright = expand_items(light["bright"])
+        dim = expand_items(light["dim"])
+        dark = expand_items(light["dark"])
+        all_cells = {(column, row) for row in range(board_rows) for column in range(columns)}
+        require(bright | dim | dark == all_cells and not (bright & dim or bright & dark or dim & dark), f"{state_id}: light partition invalid")
+        light_overlays = html_light_overlays(facts)
+        seed, tier = parse_state_id(state_id)
+        board_context[state_id] = {
+            "semantic": semantic, "sets": sets, "htmlPath": html_path,
+            "columns": columns, "rows": board_rows,
+            "baselineImage": baseline_image, "candidateImage": candidate_image,
+            "baselinePng": baseline_png_record, "candidatePng": candidate_png_record,
+        }
+        for row_index in range(board_rows):
+            for column in range(columns):
+                cell = (column, row_index)
+                classification = truth_class(cell, truth_fog, truth_obscured)
+                reasons: list[str] = []
+                if classification != "neither":
+                    reasons.append(f"truth:{classification}")
+                for name in ("wall", "door", "creature", "object", "blocked", "half_cover", "three_quarters_cover", "difficult", "fog", "obscured"):
+                    if cell in sets[name]:
+                        reasons.append(name)
+                eligible = not reasons
+                variant = floor_variant(column, row_index)
+                shades = shade_directions(column, row_index, columns, board_rows)
+                illumination = "bright" if cell in bright else "dim" if cell in dim else "dark"
+                overlay = light_overlays.get(cell)
+                obscurement_kind = (
+                    "light" if cell in sets["obscured_light"]
+                    else "heavy" if cell in sets["obscured_heavy"]
+                    else "none"
+                )
+                foreground = foreground_fraction(shades, overlay) if eligible else None
+                x0 = GRID_ORIGIN + column * TILE
+                y0 = GRID_ORIGIN + row_index * TILE
+                baseline_cell = baseline_image[y0:y0 + TILE, x0:x0 + TILE]
+                candidate_cell = candidate_image[y0:y0 + TILE, x0:x0 + TILE]
+                baseline_metrics = image_metrics(baseline_cell, templates)
+                candidate_metrics = image_metrics(candidate_cell, templates)
+                record: dict[str, object] = {
+                    "state_id": state_id, "base_seed": seed, "tier_marker_variant": tier,
+                    "outcome_selected_board": state_id in NAMED_BOARDS,
+                    "bounds_columns": columns, "bounds_rows": board_rows,
+                    "column": column, "row": row_index,
+                    "cell": f"{column},{row_index}", "truth_class": classification,
+                    "eligible": eligible, "eligibility_reasons": "|".join(reasons),
+                    "floor_asset_id": FLOOR_IDS[variant], "illumination": illumination,
+                    "illumination_overlay": overlay if overlay is not None else "none",
+                    "obscurement_kind": obscurement_kind,
+                    "shade_directions": "+".join(shades) if shades else "none",
+                    "foreground_covered_fraction": foreground,
+                    "distance_nearest_wall_door": nearest_manhattan(cell, sets["wall"] | sets["door"]),
+                    "distance_nearest_obscured": nearest_manhattan(cell, truth_obscured),
+                    "distance_nearest_fog": nearest_manhattan(cell, truth_fog),
+                    "row_edge_distance": min(row_index, board_rows - 1 - row_index),
+                    "column_edge_distance": min(column, columns - 1 - column),
+                    "baseline_sol_fog_prediction": cell in baseline_fog,
+                    "candidate_sol_fog_prediction": cell in candidate_fog,
+                    "sol_fog_transition": transition(cell in baseline_fog, cell in candidate_fog),
+                    "baseline_sol_obscured_prediction": cell in baseline_obscured,
+                    "candidate_sol_obscured_prediction": cell in candidate_obscured,
+                    "sol_obscured_transition": transition(cell in baseline_obscured, cell in candidate_obscured),
+                    "match_id_primary": None, "match_id_sensitivity": None,
+                    "candidate_low_variance_cell": bool(
+                        candidate_metrics["luminance_std"] <= LOW_STD
+                        and candidate_metrics["sobel_edge_density"] <= LOW_EDGE
+                    ),
+                    "baseline_low_variance_cell": bool(
+                        baseline_metrics["luminance_std"] <= LOW_STD
+                        and baseline_metrics["sobel_edge_density"] <= LOW_EDGE
+                    ),
+                    "candidate_low_variance_component_id": None,
+                    "baseline_low_variance_component_id": None,
+                    "flat_field_exposed": False,
+                }
+                for name, value in baseline_metrics.items():
+                    record[f"baseline_{name}"] = value
+                for name, value in candidate_metrics.items():
+                    record[f"candidate_{name}"] = value
+                    record[f"delta_{name}"] = metric_delta(value, baseline_metrics[name])
+                rows.append(record)
+    geometry = authentication.get("geometry")
+    require(isinstance(geometry, dict), "authentication geometry absent")
+    geometry["coordinateChromeLabelsChecked"] = chrome_total
+    return rows, board_context, authentication
+
+
+def connected_components(cells: set[tuple[int, int]]) -> list[set[tuple[int, int]]]:
+    remaining = set(cells)
+    components: list[set[tuple[int, int]]] = []
+    while remaining:
+        start = min(remaining, key=lambda cell: (cell[1], cell[0]))
+        component: set[tuple[int, int]] = set()
+        queue = deque([start])
+        remaining.remove(start)
+        while queue:
+            current = queue.popleft()
+            component.add(current)
+            for neighbour in ((current[0] - 1, current[1]), (current[0] + 1, current[1]), (current[0], current[1] - 1), (current[0], current[1] + 1)):
+                if neighbour in remaining:
+                    remaining.remove(neighbour)
+                    queue.append(neighbour)
+        components.append(component)
+    return components
+
+
+def assign_components(rows: list[dict[str, object]]) -> list[dict[str, object]]:
+    component_reports: list[dict[str, object]] = []
+    by_state: dict[str, list[dict[str, object]]] = defaultdict(list)
+    for row in rows:
+        by_state[str(row["state_id"])].append(row)
+    for state_id, board_rows in sorted(by_state.items()):
+        lookup = {(int(row["column"]), int(row["row"])): row for row in board_rows}
+        eligible = {cell for cell, row in lookup.items() if row["eligible"] is True}
+        for revision in ("baseline", "candidate"):
+            low = {cell for cell in eligible if lookup[cell][f"{revision}_low_variance_cell"] is True}
+            kept = [component for component in connected_components(low) if len(component) >= 9]
+            kept.sort(key=lambda value: (-len(value), min((cell[1], cell[0]) for cell in value)))
+            for index, component in enumerate(kept, 1):
+                component_id = f"{state_id}:{revision}:component-{index}"
+                for cell in component:
+                    lookup[cell][f"{revision}_low_variance_component_id"] = component_id
+                    if revision == "candidate":
+                        lookup[cell]["flat_field_exposed"] = True
+                inside_rows = [lookup[cell] for cell in component]
+                outside_rows = [lookup[cell] for cell in eligible - component]
+                component_reports.append({
+                    "stateId": state_id, "revision": revision, "componentId": component_id,
+                    "componentArea": len(component), "eligibleExposure": len(component) / len(eligible) if eligible else None,
+                    "insideFogFalsePositiveNumerator": sum(bool(row[f"{revision}_sol_fog_prediction"]) for row in inside_rows),
+                    "insideFogFalsePositiveDenominator": len(inside_rows),
+                    "insideNonFalsePositiveNumerator": sum(not bool(row[f"{revision}_sol_fog_prediction"]) for row in inside_rows),
+                    "insideNonFalsePositiveDenominator": len(inside_rows),
+                    "outsideFogFalsePositiveNumerator": sum(bool(row[f"{revision}_sol_fog_prediction"]) for row in outside_rows),
+                    "outsideFogFalsePositiveDenominator": len(outside_rows),
+                    "outsideNonFalsePositiveNumerator": sum(not bool(row[f"{revision}_sol_fog_prediction"]) for row in outside_rows),
+                    "outsideNonFalsePositiveDenominator": len(outside_rows),
+                })
+    return component_reports
+
+
+def safe_mean(values: Sequence[float]) -> float | None:
+    return float(statistics.fmean(values)) if values else None
+
+
+def safe_median(values: Sequence[float | None]) -> float | None:
+    present = [float(value) for value in values if value is not None]
+    return float(statistics.median(present)) if present else None
+
+
+def complete_median(values: Sequence[object], expected_count: int) -> float | None:
+    if len(values) != expected_count or any(value is None for value in values):
+        return None
+    return float(statistics.median(float(value) for value in values))
+
+
+def risk(numerator: int, denominator: int) -> float | None:
+    return numerator / denominator if denominator else None
+
+
+def risk_difference(exposed: Sequence[dict[str, object]], unexposed: Sequence[dict[str, object]], revision: str) -> float | None:
+    exposed_rate = risk(sum(bool(row[f"{revision}_sol_fog_prediction"]) for row in exposed), len(exposed))
+    unexposed_rate = risk(sum(bool(row[f"{revision}_sol_fog_prediction"]) for row in unexposed), len(unexposed))
+    return None if exposed_rate is None or unexposed_rate is None else exposed_rate - unexposed_rate
+
+
+def risk_ratio(exposed: Sequence[dict[str, object]], unexposed: Sequence[dict[str, object]], revision: str) -> float | None:
+    exposed_rate = risk(sum(bool(row[f"{revision}_sol_fog_prediction"]) for row in exposed), len(exposed))
+    unexposed_rate = risk(sum(bool(row[f"{revision}_sol_fog_prediction"]) for row in unexposed), len(unexposed))
+    if exposed_rate is None or unexposed_rate is None or unexposed_rate == 0:
+        return None
+    return exposed_rate / unexposed_rate
+
+
+def add_bins(row: dict[str, object]) -> dict[str, str]:
+    luminance = float(row["baseline_luminance_mean"])
+    lum_index = min(19, max(0, int(math.floor(luminance / 0.05))))
+    foreground = float(row["foreground_covered_fraction"])
+    foreground_decile = min(9, max(0, int(math.floor(foreground * 10))))
+    return {
+        "state": str(row["state_id"]),
+        "tier": str(row["tier_marker_variant"]),
+        "floor": str(row["floor_asset_id"]),
+        "illumination": str(row["illumination"]),
+        "shade": str(row["shade_directions"]),
+        "baseline_luminance_bin": f"{lum_index * 0.05:.2f}-{(lum_index + 1) * 0.05:.2f}",
+        "nearest_fog_bin": feature_distance_bin(int(row["distance_nearest_fog"])),
+        "nearest_obscured_bin": feature_distance_bin(int(row["distance_nearest_obscured"])),
+        "foreground_decile": str(foreground_decile),
+        "wall_door_bin": distance_bin(int(row["distance_nearest_wall_door"])),
+        "row_edge_bin": distance_bin(int(row["row_edge_distance"])),
+        "column_edge_bin": distance_bin(int(row["column_edge_distance"])),
+    }
+
+
+def match_rows(rows: list[dict[str, object]], sensitivity: bool) -> list[tuple[dict[str, object], dict[str, object]]]:
+    strata: dict[tuple[str, ...], dict[bool, list[dict[str, object]]]] = defaultdict(lambda: {True: [], False: []})
+    for row in rows:
+        if row["eligible"] is not True:
+            continue
+        bins = add_bins(row)
+        keys = (
+            "state", "tier", "floor", "illumination", "shade",
+            "baseline_luminance_bin", "nearest_fog_bin", "nearest_obscured_bin",
+            "foreground_decile", "wall_door_bin", "row_edge_bin", "column_edge_bin",
+        )
+        exact = tuple(bins[key] for key in keys)
+        if sensitivity:
+            exact += tuple(str(row[key]) for key in (
+                "distance_nearest_fog", "distance_nearest_obscured", "distance_nearest_wall_door",
+                "row_edge_distance", "column_edge_distance",
+            ))
+        strata[exact][bool(row["flat_field_exposed"])].append(row)
+
+    pairs: list[tuple[dict[str, object], dict[str, object]]] = []
+    for key in sorted(strata):
+        exposed = sorted(strata[key][True], key=lambda row: (float(row["baseline_luminance_mean"]), int(row["row"]), int(row["column"])))
+        unexposed = sorted(strata[key][False], key=lambda row: (float(row["baseline_luminance_mean"]), int(row["row"]), int(row["column"])))
+        if not sensitivity:
+            pairs.extend(zip(exposed, unexposed))
+            continue
+        exposed_queue = deque(exposed)
+        unexposed_queue = deque(unexposed)
+        while exposed_queue and unexposed_queue:
+            left, right = exposed_queue[0], unexposed_queue[0]
+            difference = float(left["baseline_luminance_mean"]) - float(right["baseline_luminance_mean"])
+            if abs(difference) <= 0.01 + 1e-12:
+                pairs.append((exposed_queue.popleft(), unexposed_queue.popleft()))
+            elif difference < -0.01:
+                exposed_queue.popleft()
+            else:
+                unexposed_queue.popleft()
+    return pairs
+
+
+CONTINUOUS_BALANCE = (
+    "baseline_luminance_mean", "foreground_covered_fraction", "distance_nearest_fog",
+    "distance_nearest_obscured", "distance_nearest_wall_door", "row_edge_distance",
+    "column_edge_distance",
+)
+CATEGORICAL_BALANCE = (
+    "tier", "floor", "illumination", "shade",
+    "baseline_luminance_bin", "nearest_fog_bin", "nearest_obscured_bin",
+    "foreground_decile", "wall_door_bin", "row_edge_bin", "column_edge_bin",
+)
+
+
+def standardized_mean_difference(exposed: Sequence[dict[str, object]], unexposed: Sequence[dict[str, object]], field: str) -> float | None:
+    if not exposed or not unexposed:
+        return None
+    left = np.asarray([float(row[field]) for row in exposed], dtype=np.float64)
+    right = np.asarray([float(row[field]) for row in unexposed], dtype=np.float64)
+    pooled = math.sqrt((float(left.var(ddof=0)) + float(right.var(ddof=0))) / 2)
+    difference = abs(float(left.mean() - right.mean()))
+    if pooled == 0:
+        return 0.0 if difference == 0 else math.inf
+    return difference / pooled
+
+
+def categorical_max_difference(exposed: Sequence[dict[str, object]], unexposed: Sequence[dict[str, object]], field: str) -> float | None:
+    if not exposed or not unexposed:
+        return None
+    left = Counter(add_bins(row)[field] for row in exposed)
+    right = Counter(add_bins(row)[field] for row in unexposed)
+    levels = set(left) | set(right)
+    return max(abs(left[level] / len(exposed) - right[level] / len(unexposed)) for level in levels)
+
+
+def match_report(rows: list[dict[str, object]], sensitivity: bool) -> dict[str, object]:
+    pairs = match_rows(rows, sensitivity)
+    label = "sensitivity" if sensitivity else "primary"
+    for index, (exposed, unexposed) in enumerate(pairs, 1):
+        match_id = f"{label}-{index:05d}"
+        exposed[f"match_id_{label}"] = match_id
+        unexposed[f"match_id_{label}"] = match_id
+    reports: dict[str, object] = {}
+    scopes = [(seed, [pair for pair in pairs if pair[0]["base_seed"] == seed]) for seed in SEEDS]
+    scopes.append(("pooled", pairs))
+    stops: list[str] = []
+    for scope, scoped_pairs in scopes:
+        eligible = [row for row in rows if row["eligible"] is True and (scope == "pooled" or row["base_seed"] == scope)]
+        full_exposed = [row for row in eligible if row["flat_field_exposed"] is True]
+        full_unexposed = [row for row in eligible if row["flat_field_exposed"] is False]
+        matched_exposed = [pair[0] for pair in scoped_pairs]
+        matched_unexposed = [pair[1] for pair in scoped_pairs]
+        exposed_coverage = len(matched_exposed) / len(full_exposed) if full_exposed else None
+        unexposed_coverage = len(matched_unexposed) / len(full_unexposed) if full_unexposed else None
+        continuous = {field: standardized_mean_difference(matched_exposed, matched_unexposed, field) for field in CONTINUOUS_BALANCE}
+        categorical = {field: categorical_max_difference(matched_exposed, matched_unexposed, field) for field in CATEGORICAL_BALANCE}
+        baseline_rd = risk_difference(matched_exposed, matched_unexposed, "baseline")
+        candidate_rd = risk_difference(matched_exposed, matched_unexposed, "candidate")
+        report = {
+            "fullExposed": len(full_exposed), "fullUnexposed": len(full_unexposed),
+            "matchedPairs": len(scoped_pairs), "exposedCoverage": exposed_coverage,
+            "unexposedCoverage": unexposed_coverage,
+            "continuousAbsoluteSmd": continuous,
+            "categoricalMaxAbsoluteProportionDifference": categorical,
+            "baselineExposedFogFpRate": risk(sum(bool(row["baseline_sol_fog_prediction"]) for row in matched_exposed), len(matched_exposed)),
+            "baselineUnexposedFogFpRate": risk(sum(bool(row["baseline_sol_fog_prediction"]) for row in matched_unexposed), len(matched_unexposed)),
+            "baselineRiskDifference": baseline_rd,
+            "candidateExposedFogFpRate": risk(sum(bool(row["candidate_sol_fog_prediction"]) for row in matched_exposed), len(matched_exposed)),
+            "candidateUnexposedFogFpRate": risk(sum(bool(row["candidate_sol_fog_prediction"]) for row in matched_unexposed), len(matched_unexposed)),
+            "candidateRiskDifference": candidate_rd,
+            "candidateRiskRatio": risk_ratio(matched_exposed, matched_unexposed, "candidate"),
+            "candidateMinusBaselineRiskDifference": None if baseline_rd is None or candidate_rd is None else candidate_rd - baseline_rd,
+        }
+        reports[scope] = report
+        if scope != "pooled":
+            if not full_exposed:
+                stops.append(f"{label}:{scope}:empty exposed arm")
+            if not full_unexposed:
+                stops.append(f"{label}:{scope}:empty unexposed arm")
+            if exposed_coverage is None or exposed_coverage < 0.70:
+                stops.append(f"{label}:{scope}:exposed coverage {format_value(exposed_coverage)} < 0.70")
+            if unexposed_coverage is None or unexposed_coverage < 0.70:
+                stops.append(f"{label}:{scope}:unexposed coverage {format_value(unexposed_coverage)} < 0.70")
+        for field, value in continuous.items():
+            if value is None or value > 0.10 + 1e-12:
+                stops.append(f"{label}:{scope}:absolute SMD {field}={format_value(value)} > 0.10")
+        for field, value in categorical.items():
+            if value is None or value > 0.10 + 1e-12:
+                stops.append(f"{label}:{scope}:categorical imbalance {field}={format_value(value)} > 0.10")
+    within = []
+    for seed in SEEDS:
+        seed_report = reports[seed]
+        require(isinstance(seed_report, dict), f"match report absent for {seed}")
+        within.append(seed_report["candidateMinusBaselineRiskDifference"])
+    lobo: dict[str, float | None] = {}
+    for omitted in SEEDS:
+        values = []
+        for seed in SEEDS:
+            if seed == omitted:
+                continue
+            seed_report = reports[seed]
+            require(isinstance(seed_report, dict), f"match report absent for {seed}")
+            values.append(seed_report["candidateMinusBaselineRiskDifference"])
+        lobo[omitted] = complete_median(values, 4)
+    return {
+        "kind": "within-bin raw-covariate sensitivity match" if sensitivity else "primary exact-coarsened match",
+        "scopes": reports, "withinBaseRiskDifferenceChanges": dict(zip(SEEDS, within)),
+        "medianWithinBaseRiskDifferenceChange": complete_median(within, 5),
+        "leaveOneBaseOutMedians": lobo,
+        "removed5763040Median": lobo["5763040"],
+        "insufficientOverlapStops": stops,
+    }
+
+
+def raw_scope_report(rows: list[dict[str, object]], field: str = "base_seed") -> dict[str, object]:
+    values = sorted({str(row[field]) for row in rows})
+    report: dict[str, object] = {}
+    for value in values:
+        selected = [row for row in rows if str(row[field]) == value and row["eligible"] is True]
+        exposed = [row for row in selected if row["flat_field_exposed"] is True]
+        unexposed = [row for row in selected if row["flat_field_exposed"] is False]
+        baseline_rd = risk_difference(exposed, unexposed, "baseline")
+        candidate_rd = risk_difference(exposed, unexposed, "candidate")
+        report[value] = {
+            "eligible": len(selected), "exposed": len(exposed), "unexposed": len(unexposed),
+            "baselineExposedFp": sum(bool(row["baseline_sol_fog_prediction"]) for row in exposed),
+            "baselineUnexposedFp": sum(bool(row["baseline_sol_fog_prediction"]) for row in unexposed),
+            "baselineRiskDifference": baseline_rd,
+            "candidateExposedFp": sum(bool(row["candidate_sol_fog_prediction"]) for row in exposed),
+            "candidateUnexposedFp": sum(bool(row["candidate_sol_fog_prediction"]) for row in unexposed),
+            "candidateRiskDifference": candidate_rd,
+            "candidateRiskRatio": risk_ratio(exposed, unexposed, "candidate"),
+            "candidateMinusBaselineRiskDifference": None if baseline_rd is None or candidate_rd is None else candidate_rd - baseline_rd,
+        }
+    return report
+
+
+def field_windows(rows: list[dict[str, object]]) -> list[dict[str, object]]:
+    reports: list[dict[str, object]] = []
+    by_state: dict[str, list[dict[str, object]]] = defaultdict(list)
+    for row in rows:
+        by_state[str(row["state_id"])].append(row)
+    for state_id, board_rows in sorted(by_state.items()):
+        lookup = {(int(row["column"]), int(row["row"])): row for row in board_rows}
+        columns = int(board_rows[0]["bounds_columns"])
+        height = int(board_rows[0]["bounds_rows"])
+        for size in (3, 5):
+            for top in range(height - size + 1):
+                for left in range(columns - size + 1):
+                    cells = [(column, row) for row in range(top, top + size) for column in range(left, left + size)]
+                    if not all(lookup[cell]["eligible"] is True for cell in cells):
+                        continue
+                    for revision in ("baseline", "candidate"):
+                        selected = [lookup[cell] for cell in cells]
+                        component_cells = {cell for cell in cells if lookup[cell][f"{revision}_low_variance_component_id"] is not None}
+                        local_components = connected_components(component_cells)
+                        reports.append({
+                            "stateId": state_id, "revision": revision, "windowSize": size,
+                            "left": left, "top": top,
+                            "withinCellVarianceMean": safe_mean([float(row[f"{revision}_luminance_std"]) ** 2 for row in selected]),
+                            "betweenCellMeanVariance": float(np.var([float(row[f"{revision}_luminance_mean"]) for row in selected], ddof=0)),
+                            "gradientDensityMean": safe_mean([float(row[f"{revision}_sobel_edge_density"]) for row in selected]),
+                            "largestConnectedLowVarianceComponent": max((len(component) for component in local_components), default=0),
+                            "componentArea": len(component_cells),
+                            "eligibleExposure": len(component_cells) / len(cells),
+                        })
+    return reports
+
+
+def prediction_components(rows: list[dict[str, object]]) -> list[dict[str, object]]:
+    reports: list[dict[str, object]] = []
+    by_state: dict[str, list[dict[str, object]]] = defaultdict(list)
+    for row in rows:
+        by_state[str(row["state_id"])].append(row)
+    for state_id, board_rows in sorted(by_state.items()):
+        lookup = {(int(row["column"]), int(row["row"])): row for row in board_rows}
+        for revision in ("baseline", "candidate"):
+            predicted = {cell for cell, row in lookup.items() if row[f"{revision}_sol_fog_prediction"] is True}
+            for index, component in enumerate(connected_components(predicted), 1):
+                counts = Counter()
+                floors = Counter()
+                lights = Counter()
+                for cell in component:
+                    row = lookup.get(cell)
+                    if row is None:
+                        counts["outside-board"] += 1
+                        continue
+                    truth = str(row["truth_class"])
+                    if truth in ("fog-only", "fog+obscured"):
+                        counts["true-fog"] += 1
+                    elif truth == "obscured-only":
+                        counts["obscured"] += 1
+                    elif "wall" in str(row["eligibility_reasons"]) or "door" in str(row["eligibility_reasons"]):
+                        counts["wall/door"] += 1
+                    else:
+                        counts["ordinary"] += 1
+                    floors[str(row["floor_asset_id"])] += 1
+                    lights[str(row["illumination"])] += 1
+                reports.append({
+                    "stateId": state_id, "revision": revision, "componentId": f"{state_id}:{revision}:fog-pred-{index}",
+                    "size": len(component), "ordinary": counts["ordinary"], "obscured": counts["obscured"],
+                    "wallDoor": counts["wall/door"], "trueFog": counts["true-fog"], "outsideBoard": counts["outside-board"],
+                    "floorComposition": dict(sorted(floors.items())), "illuminationComposition": dict(sorted(lights.items())),
+                })
+    return reports
+
+
+def transition_tables(rows: list[dict[str, object]]) -> dict[str, object]:
+    result: dict[str, object] = {}
+    for group, selected in (
+        ("outcomeSelectedFive", [row for row in rows if row["outcome_selected_board"] is True]),
+        ("otherNineteenObservations", [row for row in rows if row["outcome_selected_board"] is False]),
+        ("allBoards", rows),
+    ):
+        group_result: dict[str, object] = {}
+        for label in ("fog", "obscured"):
+            counts: dict[str, dict[str, int]] = {}
+            for truth in TRUTH_CLASSES:
+                counts[truth] = {}
+                for item in TRANSITIONS:
+                    counts[truth][item] = sum(
+                        1 for row in selected
+                        if row["truth_class"] == truth and row[f"sol_{label}_transition"] == item
+                    )
+            group_result[label] = counts
+        result[group] = group_result
+    return result
+
+
+def bootstrap_interval(values: Sequence[float | None], statistic: str = "median") -> list[float] | None:
+    present = [float(value) for value in values if value is not None]
+    if len(present) != 5:
+        return None
+    samples: list[float] = []
+    for indices in itertools.product(range(5), repeat=5):
+        sample = [present[index] for index in indices]
+        samples.append(float(statistics.median(sample) if statistic == "median" else statistics.fmean(sample)))
+    return [float(np.percentile(samples, 2.5)), float(np.percentile(samples, 97.5))]
+
+
+def collision_report(rows: list[dict[str, object]]) -> dict[str, object]:
+    per_seed: dict[str, object] = {}
+    rises: list[float | None] = []
+    for seed in SEEDS:
+        selected = [row for row in rows if row["base_seed"] == seed and row["truth_class"] == "obscured-only"]
+        baseline_fp = sum(bool(row["baseline_sol_fog_prediction"]) for row in selected)
+        candidate_fp = sum(bool(row["candidate_sol_fog_prediction"]) for row in selected)
+        baseline_rate = risk(baseline_fp, len(selected))
+        candidate_rate = risk(candidate_fp, len(selected))
+        rise = None if baseline_rate is None or candidate_rate is None else candidate_rate - baseline_rate
+        rises.append(rise)
+        per_seed[seed] = {
+            "obscuredOnlyN": len(selected), "baselineFogFp": baseline_fp, "candidateFogFp": candidate_fp,
+            "baselineFogFpRate": baseline_rate, "candidateFogFpRate": candidate_rate,
+            "candidateMinusBaselineCollisionRate": rise,
+        }
+    collision_cells = [row for row in rows if row["truth_class"] == "obscured-only" and row["candidate_sol_fog_prediction"] is True]
+    matched_ordinary = [row for row in rows if row["truth_class"] == "neither" and row["candidate_sol_fog_prediction"] is True and row["match_id_primary"] is not None]
+    collision_correlations: list[float | None] = []
+    for row in collision_cells:
+        kind = str(row["obscurement_kind"])
+        require(kind in ("light", "heavy"), "obscured-only cell lacks obscurement kind")
+        collision_correlations.append(row[f"candidate_template_obscurement_{kind}_ncc"])
+    ordinary_correlations: list[float | None] = []
+    for row in matched_ordinary:
+        variant = FLOOR_IDS.index(str(row["floor_asset_id"]))
+        ordinary_correlations.append(row[f"candidate_template_candidate_floor_{variant}_ncc"])
+    collision_median = safe_median(collision_correlations)
+    ordinary_median = safe_median(ordinary_correlations)
+    difference = None if collision_median is None or ordinary_median is None else collision_median - ordinary_median
+    rise_support_count = sum(value is not None and value >= 0.10 for value in rises)
+    rise_nonpositive_count = sum(value is not None and value <= 0 for value in rises)
+    if rise_support_count >= 4 and difference is not None and difference >= 0.15:
+        verdict = "SUPPORTED"
+    elif rise_nonpositive_count >= 4:
+        verdict = "CONTRADICTED"
+    else:
+        verdict = "INCONCLUSIVE"
+    transitions = Counter(str(row["sol_fog_transition"]) for row in rows if row["truth_class"] == "obscured-only")
+    return {
+        "perBaseSeed": per_seed,
+        "collisionRateRiseBootstrap95Exploratory": bootstrap_interval(rises, "mean"),
+        "obscuredOnlyFogTransitionCounts": {transition_name: transitions[transition_name] for transition_name in TRANSITIONS},
+        "candidateCollisionCellObscurementTemplateNccMedian": collision_median,
+        "matchedOrdinaryFogFpOwnFloorTemplateNccMedian": ordinary_median,
+        "correlationDifference": difference,
+        "riseAtLeastPoint10SeedCount": rise_support_count,
+        "nonpositiveRiseSeedCount": rise_nonpositive_count,
+        "verdict": verdict,
+    }
+
+
+def matched_reduction(rows: list[dict[str, object]]) -> tuple[float | None, float | None]:
+    selected = [
+        row for row in rows
+        if row["match_id_primary"] is not None and row["flat_field_exposed"] is True
+        and row["candidate_sol_fog_prediction"] is True
+    ]
+    std_reductions = []
+    edge_reductions = []
+    for row in selected:
+        baseline_std = float(row["baseline_luminance_std"])
+        baseline_edge = float(row["baseline_sobel_edge_density"])
+        if baseline_std > 0:
+            std_reductions.append((baseline_std - float(row["candidate_luminance_std"])) / baseline_std)
+        if baseline_edge > 0:
+            edge_reductions.append((baseline_edge - float(row["candidate_sobel_edge_density"])) / baseline_edge)
+    return safe_median(std_reductions), safe_median(edge_reductions)
+
+
+def subgroup_directions(rows: list[dict[str, object]]) -> dict[str, object]:
+    result: dict[str, object] = {}
+    for field in ("floor_asset_id", "illumination", "shade_directions"):
+        table: dict[str, object] = {}
+        for value in sorted({str(row[field]) for row in rows if row["eligible"] is True}):
+            selected = [row for row in rows if row["eligible"] is True and str(row[field]) == value and row["match_id_primary"] is not None]
+            exposed = [row for row in selected if row["flat_field_exposed"] is True]
+            unexposed = [row for row in selected if row["flat_field_exposed"] is False]
+            baseline_rd = risk_difference(exposed, unexposed, "baseline")
+            candidate_rd = risk_difference(exposed, unexposed, "candidate")
+            table[value] = {
+                "nPairs": min(len(exposed), len(unexposed)),
+                "baselineRiskDifference": baseline_rd, "candidateRiskDifference": candidate_rd,
+                "change": None if baseline_rd is None or candidate_rd is None else candidate_rd - baseline_rd,
+            }
+        result[field] = table
+    return result
+
+
+def flat_verdict(
+    rows: list[dict[str, object]], primary: dict[str, object], sensitivity: dict[str, object], raw_board: dict[str, object],
+) -> dict[str, object]:
+    stops = list(primary["insufficientOverlapStops"]) + list(sensitivity["insufficientOverlapStops"])
+    primary_scopes = primary["scopes"]
+    sensitivity_scopes = sensitivity["scopes"]
+    require(isinstance(primary_scopes, dict) and isinstance(sensitivity_scopes, dict), "match scopes absent")
+    pooled = primary_scopes["pooled"]
+    pooled_sensitivity = sensitivity_scopes["pooled"]
+    require(isinstance(pooled, dict) and isinstance(pooled_sensitivity, dict), "pooled match report absent")
+    primary_within = primary["withinBaseRiskDifferenceChanges"]
+    sensitivity_within = sensitivity["withinBaseRiskDifferenceChanges"]
+    require(isinstance(primary_within, dict) and isinstance(sensitivity_within, dict), "within-base match report absent")
+    named_direction_count = 0
+    for state_id in NAMED_BOARDS:
+        row = raw_board[state_id]
+        require(isinstance(row, dict), f"raw board report missing {state_id}")
+        change = row["candidateMinusBaselineRiskDifference"]
+        if change is not None and float(change) > 0:
+            named_direction_count += 1
+    std_reduction, edge_reduction = matched_reduction(rows)
+    primary_lobo = primary["leaveOneBaseOutMedians"]
+    sensitivity_lobo = sensitivity["leaveOneBaseOutMedians"]
+    require(isinstance(primary_lobo, dict) and isinstance(sensitivity_lobo, dict), "LOBO report absent")
+    subgroup = subgroup_directions(rows)
+    mixed: list[str] = []
+    for field, values in subgroup.items():
+        require(isinstance(values, dict), "subgroup table malformed")
+        directions = [math.copysign(1, float(row["change"])) for row in values.values() if isinstance(row, dict) and row["change"] not in (None, 0)]
+        if directions and min(directions) < 0 < max(directions):
+            mixed.append(str(field))
+    if mixed:
+        stops.append(f"mixed matched effect direction across {', '.join(mixed)}")
+    if primary_lobo.get("5763040") is None or float(primary_lobo["5763040"]) <= 0:
+        stops.append(f"primary effect depends on 5763040; removed median={format_value(primary_lobo.get('5763040'))}")
+    if sensitivity_lobo.get("5763040") is None or float(sensitivity_lobo["5763040"]) <= 0:
+        stops.append(f"sensitivity effect depends on 5763040; removed median={format_value(sensitivity_lobo.get('5763040'))}")
+
+    primary_support = (
+        pooled["candidateRiskDifference"] is not None and float(pooled["candidateRiskDifference"]) >= 0.10
+        and pooled["candidateRiskRatio"] is not None and float(pooled["candidateRiskRatio"]) >= 2.0
+        and sum(value is not None and float(value) >= 0.08 for value in primary_within.values()) >= 4
+        and named_direction_count >= 4
+        and std_reduction is not None and std_reduction >= 0.20
+        and edge_reduction is not None and edge_reduction >= 0.20
+        and all(value is not None and float(value) > 0 for value in primary_lobo.values())
+    )
+    sensitivity_support = (
+        pooled_sensitivity["candidateRiskDifference"] is not None and float(pooled_sensitivity["candidateRiskDifference"]) >= 0.10
+        and pooled_sensitivity["candidateRiskRatio"] is not None and float(pooled_sensitivity["candidateRiskRatio"]) >= 2.0
+        and sum(value is not None and float(value) >= 0.08 for value in sensitivity_within.values()) >= 4
+        and all(value is not None and float(value) > 0 for value in sensitivity_lobo.values())
+    )
+    primary_contradiction = (
+        pooled["candidateRiskDifference"] is not None and float(pooled["candidateRiskDifference"]) <= 0
+        and pooled["candidateRiskRatio"] is not None and float(pooled["candidateRiskRatio"]) <= 1.0
+        and sum(value is not None and float(value) <= 0 for value in primary_within.values()) >= 4
+        and std_reduction is not None and std_reduction <= 0
+        and edge_reduction is not None and edge_reduction <= 0
+    )
+    if stops:
+        verdict = "INCONCLUSIVE"
+    elif primary_support and sensitivity_support:
+        verdict = "SUPPORTED"
+    elif primary_contradiction:
+        verdict = "CONTRADICTED"
+    else:
+        verdict = "INCONCLUSIVE"
+    return {
+        "verdict": verdict, "stopRulesFired": stops,
+        "primarySupportThresholdsAllMet": primary_support,
+        "sensitivitySupportThresholdsAllMet": sensitivity_support,
+        "contradictionThresholdsAllMet": primary_contradiction,
+        "namedBoardsSameDirectionCount": named_direction_count,
+        "matchedExposedCandidateFpMedianLuminanceStdReduction": std_reduction,
+        "matchedExposedCandidateFpMedianSobelEdgeReduction": edge_reduction,
+        "subgroupDirections": subgroup,
+        "primaryMedianClusterBootstrap95Exploratory": bootstrap_interval(list(primary_within.values())),
+        "sensitivityMedianClusterBootstrap95Exploratory": bootstrap_interval(list(sensitivity_within.values())),
+    }
+
+
+def floor_only_cell_safe(row: dict[str, object]) -> bool:
+    reasons = set(str(row["eligibility_reasons"]).split("|")) if row["eligibility_reasons"] else set()
+    changed_foreground = {"wall", "door", "creature", "object"}
+    return not bool(reasons & changed_foreground)
+
+
+def write_recompositions(rows: list[dict[str, object]], context: dict[str, dict[str, object]]) -> dict[str, object]:
+    by_state: dict[str, list[dict[str, object]]] = defaultdict(list)
+    for row in rows:
+        by_state[str(row["state_id"])].append(row)
+    manifests = {
+        "candidate-with-baseline-floors": {},
+        "baseline-with-candidate-floors": {},
+    }
+    validations: dict[str, object] = {}
+    for state_id, board_rows in sorted(by_state.items()):
+        board = context[state_id]
+        candidate = np.asarray(board["candidateImage"], dtype=np.uint8)
+        baseline = np.asarray(board["baselineImage"], dtype=np.uint8)
+        candidate_recomposed = candidate.copy()
+        baseline_recomposed = baseline.copy()
+        safe_mask = np.zeros(candidate.shape[:2], dtype=bool)
+        eligible_cells = 0
+        safe_cells = 0
+        for row in board_rows:
+            column, row_index = int(row["column"]), int(row["row"])
+            if not floor_only_cell_safe(row):
+                continue
+            safe_cells += 1
+            if row["eligible"] is True:
+                eligible_cells += 1
+            x0 = GRID_ORIGIN + column * TILE
+            y0 = GRID_ORIGIN + row_index * TILE
+            safe_mask[y0:y0 + TILE, x0:x0 + TILE] = True
+            candidate_recomposed[y0:y0 + TILE, x0:x0 + TILE] = baseline[y0:y0 + TILE, x0:x0 + TILE]
+            baseline_recomposed[y0:y0 + TILE, x0:x0 + TILE] = candidate[y0:y0 + TILE, x0:x0 + TILE]
+        candidate_changed = np.any(candidate_recomposed != candidate, axis=2)
+        baseline_changed = np.any(baseline_recomposed != baseline, axis=2)
+        require(not np.any(candidate_changed & ~safe_mask), f"{state_id}: candidate recomposition changed non-floor-safe pixels")
+        require(not np.any(baseline_changed & ~safe_mask), f"{state_id}: baseline recomposition changed non-floor-safe pixels")
+        for row in board_rows:
+            if row["eligible"] is not True:
+                continue
+            x0 = GRID_ORIGIN + int(row["column"]) * TILE
+            y0 = GRID_ORIGIN + int(row["row"]) * TILE
+            require(np.array_equal(candidate_recomposed[y0:y0 + TILE, x0:x0 + TILE], baseline[y0:y0 + TILE, x0:x0 + TILE]), f"{state_id}:{row['cell']}: eligible candidate intervention mismatch")
+            require(np.array_equal(baseline_recomposed[y0:y0 + TILE, x0:x0 + TILE], candidate[y0:y0 + TILE, x0:x0 + TILE]), f"{state_id}:{row['cell']}: eligible baseline intervention mismatch")
+        outputs = (
+            ("candidate-with-baseline-floors", RECOMPOSED_CANDIDATE, candidate_recomposed),
+            ("baseline-with-candidate-floors", RECOMPOSED_BASELINE, baseline_recomposed),
+        )
+        for name, directory, image_array in outputs:
+            directory.mkdir(parents=True, exist_ok=True)
+            filename = f"{state_id}.png"
+            path = directory / filename
+            Image.fromarray(image_array, mode="RGBA").save(path, format="PNG", optimize=False, compress_level=9)
+            manifests[name][state_id] = {
+                "file": filename, "sha256": sha256_file(path),
+                "width": int(image_array.shape[1]), "height": int(image_array.shape[0]),
+            }
+        validations[state_id] = {
+            "totalCells": len(board_rows), "floorOnlyLayerGraphCells": safe_cells,
+            "eligibleCells": eligible_cells,
+            "candidateChangedPixels": int(candidate_changed.sum()),
+            "baselineChangedPixels": int(baseline_changed.sum()),
+            "candidateChangesOutsideFloorOnlyLayerGraph": int(np.sum(candidate_changed & ~safe_mask)),
+            "baselineChangesOutsideFloorOnlyLayerGraph": int(np.sum(baseline_changed & ~safe_mask)),
+            "allEligibleCellsExactlyEqualOppositeRevisionComposite": True,
+            "outsideGridByteIdenticalToSource": bool(
+                np.array_equal(candidate_recomposed[~safe_mask], candidate[~safe_mask])
+                and np.array_equal(baseline_recomposed[~safe_mask], baseline[~safe_mask])
+            ),
+        }
+    for name, directory in (
+        ("candidate-with-baseline-floors", RECOMPOSED_CANDIDATE),
+        ("baseline-with-candidate-floors", RECOMPOSED_BASELINE),
+    ):
+        payload = {
+            "version": "qsfog-floor-only-recomposition-v1",
+            "kind": name,
+            "states": manifests[name],
+            "manipulationValidation": {
+                "method": "paired authenticated capture cells are copied only when semantic/source layer inventory proves every non-floor layer unchanged between revisions; unsafe changed-foreground cells remain source-identical",
+                "stateMetrics": validations,
+                "stateCount": len(manifests[name]),
+            },
+        }
+        (directory / "manifest.json").write_text(json.dumps(payload, sort_keys=True, indent=2, allow_nan=False) + "\n", encoding="utf-8")
+    return validations
+
+
+def format_value(value: object, digits: int = 4) -> str:
+    if value is None:
+        return "NA"
+    if isinstance(value, bool):
+        return "true" if value else "false"
+    if isinstance(value, float):
+        if math.isinf(value):
+            return "Inf"
+        return f"{value:.{digits}f}"
+    return str(value)
+
+
+def json_safe(value: object) -> object:
+    if isinstance(value, float) and not math.isfinite(value):
+        return "Inf" if value > 0 else "-Inf"
+    if isinstance(value, dict):
+        return {str(key): json_safe(item) for key, item in value.items()}
+    if isinstance(value, list):
+        return [json_safe(item) for item in value]
+    if isinstance(value, tuple):
+        return [json_safe(item) for item in value]
+    return value
+
+
+def md_table(headers: Sequence[str], body: Sequence[Sequence[object]]) -> str:
+    lines = ["| " + " | ".join(headers) + " |", "|" + "|".join("---" for _ in headers) + "|"]
+    for row in body:
+        lines.append("| " + " | ".join(format_value(value) for value in row) + " |")
+    return "\n".join(lines)
+
+
+def metric_summary(rows: Sequence[dict[str, object]], group_name: str) -> dict[str, object]:
+    selected = [row for row in rows if (row["outcome_selected_board"] is True) == (group_name == "outcome-selected five")]
+    return {
+        "nCells": len(selected), "nEligible": sum(row["eligible"] is True for row in selected),
+        "baselineLuminanceStdMedian": safe_median([row["baseline_luminance_std"] for row in selected]),
+        "candidateLuminanceStdMedian": safe_median([row["candidate_luminance_std"] for row in selected]),
+        "baselineSobelEdgeDensityMedian": safe_median([row["baseline_sobel_edge_density"] for row in selected]),
+        "candidateSobelEdgeDensityMedian": safe_median([row["candidate_sobel_edge_density"] for row in selected]),
+    }
+
+
+def write_markdown(report: dict[str, object]) -> None:
+    auth = report["authentication"]
+    raw_board = report["rawPerBoard"]
+    raw_seed = report["rawPerBaseSeed"]
+    primary = report["matching"]["primary"]
+    sensitivity = report["matching"]["sensitivity"]
+    flat = report["flatField"]
+    collision = report["collision"]
+    transitions = report["transitions"]
+    require(all(isinstance(value, dict) for value in (auth, raw_board, raw_seed, primary, sensitivity, flat, collision, transitions)), "report sections malformed")
+    lines = [
+        "# QSFOG-01 Increment 1 diagnosis", "",
+        "All intervals below are five-base-seed cluster resamples and are exploratory; no cell-level or conventional significance claim is made. The five named regressions are outcome-selected and descriptive. Distances are Manhattan distances. `NA` is emitted for empty denominators and zero-variance mean-centred correlations.", "",
+        "## Authentication", "",
+        f"- Plan SHA-256: `{PLAN_SHA}` (matched).",
+        f"- Baseline JSONL: 1,008 rows, SHA-256 `{BASELINE_JSONL_SHA}` (matched).",
+        f"- Candidate JSONL: 1,008 rows, SHA-256 `{CANDIDATE_JSONL_SHA}` (matched).",
+        "- Paired keys: 1,008; paired states: 24; state/truth/dimensions/primer/prompt/glyph/tile/input/generation/normaliser/row-version and semantic payload fields all matched.",
+        "- Every PNG had `png.sha256 = filename = actual digest`; every referenced semantic JSON and captured HTML matched its content-addressed filename; both final manifests contained 24 artifacts.",
+        f"- Cell rectangles: `[52 + 128×column, 52 + 128×row, 128, 128]`, derived from the authenticated 128 CSS-px capture setting and captured DOM chrome's 4 px border + 48 px coordinate gutter. {format_value(auth['geometry']['coordinateChromeLabelsChecked'], 0)} top/bottom/left/right coordinate-label patches were asserted at those fixed positions; the origin was not estimated from board pixels.",
+        "- Independent fog/light-obscurement/heavy-obscurement rasters reproduced shipping RGBA exactly. Candidate floor pixels matched the pre-existing independent RGBA oracle; baseline floor PNGs were read at the frozen comparison revision.", "",
+        "Exact generation command: `UV_CACHE_DIR=/tmp/qsfog-uv-cache uv run --offline --no-project --with numpy --with pillow python .tmp/runs/quietstone/qsfog-scripts/qsfog_diagnose.py`.", "",
+        "## Measurement definitions", "",
+        "Interiors are the fixed 112×112 crop after an 8 px inset. Relative luminance uses linear sRGB. Directional energy is mean squared one-pixel finite difference. Sobel kernels are normalized by 8; the single edge threshold is 0.035. Entropy uses 32 fixed bins on [0,1]. Pitch-6 diagonal autocorrelations and every template NCC are mean-centred and become `NA` on zero variance. Boundary ownership samples the inset-8 perimeter; coherent occupancy counts circular runs of at least four Sobel-edge pixels. Low variance is exactly luminance SD <= 0.025 and Sobel density <= 0.08; components are four-neighbour and retained only at area >= 9.", "",
+        "Template records include NCC, normalized raw-RGBA MSE and absolute luminance error for independent fog/obscurement rasters and all four revision-bound plain floors. The complete paired measurements and deltas are in `qsfog-diagnosis.json` and `.csv`.", "",
+        "## Outcome-selected five versus other 19 observations", "",
+    ]
+    summaries = report["groupMetricSummary"]
+    require(isinstance(summaries, dict), "group summaries absent")
+    lines.append(md_table(
+        ("group", "cells", "eligible", "baseline median lum SD", "candidate median lum SD", "baseline median edge density", "candidate median edge density"),
+        [
+            (name, value["nCells"], value["nEligible"], value["baselineLuminanceStdMedian"], value["candidateLuminanceStdMedian"], value["baselineSobelEdgeDensityMedian"], value["candidateSobelEdgeDensityMedian"])
+            for name, value in summaries.items()
+        ],
+    ))
+    lines.extend(["", "## Per-board ordinary-floor exposure", ""])
+    board_body = []
+    for state_id, value in sorted(raw_board.items()):
+        board_body.append((state_id, "yes" if state_id in NAMED_BOARDS else "no", value["eligible"], value["exposed"], value["unexposed"], value["baselineRiskDifference"], value["candidateRiskDifference"], value["candidateMinusBaselineRiskDifference"], value["candidateRiskRatio"]))
+    lines.append(md_table(("state", "selected", "eligible", "exposed", "unexposed", "baseline RD", "candidate RD", "delta RD", "candidate RR"), board_body))
+    lines.extend(["", "## Per-base raw exposure and matching", ""])
+    seed_body = []
+    for seed in SEEDS:
+        raw = raw_seed[seed]
+        p = primary["scopes"][seed]
+        s = sensitivity["scopes"][seed]
+        seed_body.append((seed, raw["eligible"], raw["exposed"], raw["unexposed"], raw["candidateMinusBaselineRiskDifference"], p["matchedPairs"], p["exposedCoverage"], p["unexposedCoverage"], p["candidateRiskDifference"], p["candidateRiskRatio"], s["matchedPairs"], s["exposedCoverage"], s["unexposedCoverage"], s["candidateRiskDifference"], s["candidateRiskRatio"]))
+    lines.append(md_table(("base", "eligible", "exp", "unexp", "raw delta RD", "primary pairs", "P exp cov", "P unexp cov", "P cand RD", "P cand RR", "sens pairs", "S exp cov", "S unexp cov", "S cand RD", "S cand RR"), seed_body))
+    lines.extend(["", "## Primary matched statistic", ""])
+    within_primary = primary["withinBaseRiskDifferenceChanges"]
+    lobo_primary = primary["leaveOneBaseOutMedians"]
+    lines.append(md_table(("base seed", "within-base candidate-minus-baseline RD change", "median after omitting this base"), [(seed, within_primary[seed], lobo_primary[seed]) for seed in SEEDS]))
+    lines.extend([
+        "",
+        f"Primary median of the five within-base values: **{format_value(primary['medianWithinBaseRiskDifferenceChange'])}**; exploratory cluster-bootstrap 95% interval: **{format_value(flat['primaryMedianClusterBootstrap95Exploratory'][0]) if flat['primaryMedianClusterBootstrap95Exploratory'] else 'NA'} to {format_value(flat['primaryMedianClusterBootstrap95Exploratory'][1]) if flat['primaryMedianClusterBootstrap95Exploratory'] else 'NA'}**. The explicit 5763040-removed median is **{format_value(primary['removed5763040Median'])}**.", "",
+        "### Primary coverage and balance", "",
+    ])
+    balance_rows = []
+    for scope in (*SEEDS, "pooled"):
+        value = primary["scopes"][scope]
+        max_smd = max((metric for metric in value["continuousAbsoluteSmd"].values() if metric is not None), default=None)
+        max_cat = max((metric for metric in value["categoricalMaxAbsoluteProportionDifference"].values() if metric is not None), default=None)
+        balance_rows.append((scope, value["fullExposed"], value["fullUnexposed"], value["matchedPairs"], value["exposedCoverage"], value["unexposedCoverage"], max_smd, max_cat))
+    lines.append(md_table(("scope", "full exp", "full unexp", "pairs", "exp coverage", "unexp coverage", "max abs SMD", "max categorical diff"), balance_rows))
+    lines.extend(["", "## Within-bin raw-covariate sensitivity match", ""])
+    within_sensitivity = sensitivity["withinBaseRiskDifferenceChanges"]
+    lobo_sensitivity = sensitivity["leaveOneBaseOutMedians"]
+    lines.append(md_table(("base seed", "within-base candidate-minus-baseline RD change", "median after omitting this base"), [(seed, within_sensitivity[seed], lobo_sensitivity[seed]) for seed in SEEDS]))
+    lines.extend([
+        "",
+        f"Sensitivity median of the five within-base values: **{format_value(sensitivity['medianWithinBaseRiskDifferenceChange'])}**; exploratory cluster-bootstrap 95% interval: **{format_value(flat['sensitivityMedianClusterBootstrap95Exploratory'][0]) if flat['sensitivityMedianClusterBootstrap95Exploratory'] else 'NA'} to {format_value(flat['sensitivityMedianClusterBootstrap95Exploratory'][1]) if flat['sensitivityMedianClusterBootstrap95Exploratory'] else 'NA'}**. The explicit 5763040-removed sensitivity median is **{format_value(sensitivity['removed5763040Median'])}**.", "",
+        "### Sensitivity coverage and balance", "",
+    ])
+    sensitivity_balance_rows = []
+    for scope in (*SEEDS, "pooled"):
+        value = sensitivity["scopes"][scope]
+        max_smd = max((metric for metric in value["continuousAbsoluteSmd"].values() if metric is not None), default=None)
+        max_cat = max((metric for metric in value["categoricalMaxAbsoluteProportionDifference"].values() if metric is not None), default=None)
+        sensitivity_balance_rows.append((scope, value["fullExposed"], value["fullUnexposed"], value["matchedPairs"], value["exposedCoverage"], value["unexposedCoverage"], max_smd, max_cat))
+    lines.append(md_table(("scope", "full exp", "full unexp", "pairs", "exp coverage", "unexp coverage", "max abs SMD", "max categorical diff"), sensitivity_balance_rows))
+    lines.extend(["", "## Fixed truth strata × paired prediction transitions", ""])
+    for group in ("outcomeSelectedFive", "otherNineteenObservations"):
+        lines.extend([f"### {group}", ""])
+        body = []
+        for label in ("fog", "obscured"):
+            for truth in TRUTH_CLASSES:
+                for transition_name in TRANSITIONS:
+                    body.append((label, truth, transition_name, transitions[group][label][truth][transition_name]))
+        lines.append(md_table(("label", "truth class", "transition", "n"), body))
+        lines.append("")
+    lines.extend(["## Obscurement-collision mechanism", ""])
+    collision_rows = []
+    for seed in SEEDS:
+        value = collision["perBaseSeed"][seed]
+        collision_rows.append((seed, value["obscuredOnlyN"], value["baselineFogFp"], value["candidateFogFp"], value["baselineFogFpRate"], value["candidateFogFpRate"], value["candidateMinusBaselineCollisionRate"]))
+    lines.append(md_table(("base", "obscured-only n", "baseline fog FP", "candidate fog FP", "baseline rate", "candidate rate", "rise"), collision_rows))
+    lines.extend([
+        "",
+        f"Obscured-only fog transitions: retained {collision['obscuredOnlyFogTransitionCounts']['retained']}, new {collision['obscuredOnlyFogTransitionCounts']['new']}, resolved {collision['obscuredOnlyFogTransitionCounts']['resolved']}, never {collision['obscuredOnlyFogTransitionCounts']['never']}. Candidate collision-cell obscurement-template NCC median: {format_value(collision['candidateCollisionCellObscurementTemplateNccMedian'])}; matched ordinary fog-FP own-floor NCC median: {format_value(collision['matchedOrdinaryFogFpOwnFloorTemplateNccMedian'])}; difference: {format_value(collision['correlationDifference'])}.", "",
+        f"Collision verdict: **{collision['verdict']}**.", "",
+        "## Flat-field verdict and stop rules", "",
+        f"Matched exposed candidate false-positive median luminance-SD reduction from its own baseline: {format_value(flat['matchedExposedCandidateFpMedianLuminanceStdReduction'])}; Sobel-edge reduction: {format_value(flat['matchedExposedCandidateFpMedianSobelEdgeReduction'])}. Named boards with a positive raw RD change: {flat['namedBoardsSameDirectionCount']}/5.", "",
+        f"Flat-field verdict: **{flat['verdict']}**.", "",
+        "Every fired stop rule:", "",
+    ])
+    stops = flat["stopRulesFired"]
+    if stops:
+        lines.extend(f"- {stop}" for stop in stops)
+    else:
+        lines.append("- None.")
+    lines.extend([
+        "", "## Temporary recompositions", "",
+        "The two 24-image manifests are in `recomposed/candidate-with-baseline-floors/manifest.json` and `recomposed/baseline-with-candidate-floors/manifest.json`. Each output starts from its named source capture. Paired cell pixels are substituted only where the semantic layer graph and revision diff prove that the floor is the sole revision-varying art layer; cells carrying revision-varying walls, doors, tokens, or world-object art remain byte-identical to their source. Every eligible ordinary-floor cell exactly equals the opposite revision's authenticated composite. Each manifest reports changed-pixel counts, zero changes outside the floor-only graph, dimensions and output SHA-256.", "",
+        "These deterministic manipulations do not establish a classification cause and are not acceptance-probe inputs or pins.", "",
+        "## HAND-BACK REQUIRED FROM SUPERVISOR", "",
+        "Before Increment 2 can choose Option B, the supervisor must return the two-direction `gpt-5.6-sol:high` Q9 classification intervention over all 24 recomposed boards with:", "",
+        "- exact commands and frozen harness/prompt/model versions;",
+        "- both 24-image manifests;",
+        "- authenticated JSONL row counts and SHA-256 digests;",
+        "- transport status;",
+        "- per-base ordinary-floor fog false-positive rates for both directions;",
+        "- true-fog omission counts for both directions;",
+        "- the intervention verdict: supports, contradicts, or inconclusive.", "",
+        "Option B remains forbidden unless old floors reduce candidate ordinary-floor fog-FP rate by at least 50% and at least 0.08 absolute in four base seeds, new floors at least double baseline ordinary-floor fog-FP rate and raise it by at least 0.08 in four base seeds, and neither direction increases true-fog omissions. A one-sided, mixed, blocked, or transport-failed intervention is inconclusive.", "",
+        "If the supervisor's intervention licenses Option B, Increment 2 also needs the supervisor-owned provenance package/independent-art-oracle hand-back: stable read path, manifest/package ID, exact 58-row coverage, SVG/PNG/RGBA digests, and independent authorship/provenance evidence. Without it, Option B cannot begin.",
+    ])
+    OUTPUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")
+
+
+def write_csv(rows: list[dict[str, object]]) -> None:
+    fields = list(rows[0].keys())
+    require(all(list(row.keys()) == fields for row in rows), "per-cell rows have inconsistent columns")
+    with OUTPUT_CSV.open("w", newline="", encoding="utf-8") as handle:
+        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="raise")
+        writer.writeheader()
+        for row in rows:
+            writer.writerow({field: "NA" if value is None else value for field, value in row.items()})
+
+
+def main() -> None:
+    parser = argparse.ArgumentParser()
+    parser.add_argument("--check", action="store_true", help="recompute and require byte-identical JSON/CSV/Markdown/manifests")
+    options = parser.parse_args()
+    existing = {}
+    if options.check:
+        for path in (OUTPUT_JSON, OUTPUT_CSV, OUTPUT_MD, RECOMPOSED_CANDIDATE / "manifest.json", RECOMPOSED_BASELINE / "manifest.json"):
+            require(path.exists(), f"check target missing: {path}")
+            existing[str(path)] = sha256_file(path)
+
+    baseline_rows = load_jsonl(BASELINE_JSONL)
+    candidate_rows = load_jsonl(CANDIDATE_JSONL)
+    q9_baseline, q9_candidate, authentication = authenticate(baseline_rows, candidate_rows)
+    templates, template_validation = load_templates()
+    metric_templates = {
+        name: (
+            template[INSET:TILE - INSET, INSET:TILE - INSET].astype(np.float64) / 255.0,
+            rel_luminance(template[INSET:TILE - INSET, INSET:TILE - INSET]),
+        )
+        for name, template in templates.items()
+    }
+    authentication["templates"] = template_validation
+    cells, context, authentication = build_cells(q9_baseline, q9_candidate, metric_templates, authentication)
+    components = assign_components(cells)
+    windows = field_windows(cells)
+    primary = match_report(cells, sensitivity=False)
+    sensitivity = match_report(cells, sensitivity=True)
+    raw_board = raw_scope_report(cells, "state_id")
+    raw_seed = raw_scope_report(cells, "base_seed")
+    flat = flat_verdict(cells, primary, sensitivity, raw_board)
+    collision = collision_report(cells)
+    recomposition_validation = write_recompositions(cells, context)
+    report = {
+        "version": "qsfog-increment-1-diagnosis-v1",
+        "authentication": authentication,
+        "thresholds": {
+            "interiorInsetPx": INSET, "lowVarianceLuminanceStdMax": LOW_STD,
+            "lowVarianceSobelEdgeDensityMax": LOW_EDGE, "sobelEdgeThreshold": SOBEL_THRESHOLD,
+            "componentConnectivity": 4, "componentMinimumAreaCells": 9,
+            "commonSupportCoverageMinimum": 0.70, "balanceMaximum": 0.10,
+            "sensitivityRawLuminanceCaliper": 0.01, "distanceMetric": "Manhattan",
+            "noFeatureSentinel": NO_FEATURE_SENTINEL,
+        },
+        "cells": cells,
+        "fieldWindows": windows,
+        "lowVarianceComponents": components,
+        "fogPredictionComponents": prediction_components(cells),
+        "transitions": transition_tables(cells),
+        "rawPerBoard": raw_board, "rawPerBaseSeed": raw_seed,
+        "matching": {"primary": primary, "sensitivity": sensitivity},
+        "flatField": flat, "collision": collision,
+        "groupMetricSummary": {
+            "outcome-selected five": metric_summary(cells, "outcome-selected five"),
+            "other 19 observations": metric_summary(cells, "other 19 observations"),
+        },
+        "recompositionValidation": recomposition_validation,
+    }
+    OUTPUT_JSON.write_text(json.dumps(json_safe(report), sort_keys=True, indent=2, allow_nan=False) + "\n", encoding="utf-8")
+    write_csv(cells)
+    write_markdown(report)
+    if options.check:
+        for path_string, digest in existing.items():
+            path = Path(path_string)
+            require(sha256_file(path) == digest, f"non-deterministic output: {path}")
+    print(canonical({
+        "cells": len(cells), "fieldWindows": len(windows), "lowVarianceComponents": len(components),
+        "flatField": flat["verdict"], "collision": collision["verdict"],
+        "primaryPairs": primary["scopes"]["pooled"]["matchedPairs"],
+        "sensitivityPairs": sensitivity["scopes"]["pooled"]["matchedPairs"],
+        "stopRules": len(flat["stopRulesFired"]),
+    }))
+
+
+if __name__ == "__main__":
+    main()

