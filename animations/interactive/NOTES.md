# Opioid Grid Animation — Developer Notes

9-phase click-through Three.js animation embedded in Reveal.js slides via `background-iframe`. Shows Massachusetts opioid overdose data on a hex grid, then demonstrates why decision-aware models beat standard models.

## Files to read

| File | Role |
|------|------|
| `config.js` | **Start here.** Every tunable constant: colors, datasets, camera angles, timing, easing. Nothing is hardcoded in the animation code. |
| `opioid-grid.js` | Animation logic. Phases 1-3 (map → isometric → bar chart), phases 4-9 (split → predictions → fill → RMSE → top-K → eval). |
| `opioid-grid.html` | HTML shell: canvas, HUD, overlay `<div>`s for text labels/RMSE/eval. CSS for `.chart-label`, `.chart-text`, `.visible`. |
| `gen_ma_outline.py` | One-shot script that downloads us-10m TopoJSON, extracts MA mainland, simplifies, and outputs `MA_OUTLINE` for `config.js`. |
| `TUNING.md` | Section-by-section guide to every `config.js` export. |

`opioid-grid.js` is the only file with runtime logic. It is structured as:
1. Imports + helpers (ray casting, hex generation, geometry)
2. Renderer / scene / camera / lights setup
3. MA ground plane + hex grid construction
4. Phase functions (`transitionToHeatmap`, `transitionToIsometric`, ..., `transitionToEval`)
5. Phase controller + event handling + render loop

## Matching the presentation theme

All visual constants live in `config.js`. Nothing needs to change in `opioid-grid.js`.

### Colors

`COLORS` object maps to the shared palette in `style/theme.scss`:

| config.js key | Hex | SCSS variable | Used for |
|---------------|-----|---------------|----------|
| `bg` | `#11111e` | `$bg-color` | Canvas clear color |
| `teal` | `#50c8a8` | `$teal` | Low-value bars |
| `purple` | `#7c6af7` | `$purple` | Mid-value bars, prediction lines |
| `coral` | `#ff7c57` | `$coral` | High-value bars |
| `yellow` | `#ffd166` | `$yellow` | Max-value bars |
| `muted` | `#888899` | `$muted` | Zero-value bars, axes, error fill |
| `grid` | `#222233` | — | Ground plane fill |
| `edge` | `#444466` | — | State outline stroke |

To switch to a light theme: change `bg`, `grid`, `edge`, and `muted`. The `valueColor(t)` gradient (teal→purple→coral→yellow) works on both dark and light backgrounds. Zero-value bars use `muted` (not the background color) so they stay visible regardless of theme.

### Text overlays

Overlay styling is in `opioid-grid.html` under `<style>`. The `.chart-label` and `.chart-text` classes control font, size, and color. These should match the presentation's body font and heading color.

### Lighting

`LIGHTING` in `config.js` controls ambient and directional light intensity/position. If the theme changes dramatically (dark ↔ light), adjust `LIGHTING.ambient.intensity` and `COLORS.bg`.

## Adjusting datasets

### Geographic data (hex map, phases 1-2)

The map values are **procedurally generated** from `HOTSPOTS` in `config.js`. Each hex cell's value = sum of Gaussian contributions from all hotspots. No raw data array to maintain.

```js
// Each hotspot: { x, z, peak, sigma, label }
// x, z — world-space coordinates (same system as MA_OUTLINE)
// peak — maximum value at the hotspot center
// sigma — falloff radius (smaller = tighter cluster)
```

To adjust:
- **Move a hotspot**: change `x`, `z` (use MA_OUTLINE coordinates for reference)
- **Change magnitude**: change `peak` (max deaths across all hotspots determines the color scale)
- **Sharper/broader clusters**: change `sigma` (try 0.3-0.6)
- **Add/remove hotspots**: just add/remove entries in the array

### Bar chart data (phases 3-9)

`BAR_CHART_DATA` is a completely independent dataset — the bars morph into it mid-flight during phase 3. It is an array of `{ label, value }` objects sorted descending.

The current shape is a **sigmoid**: flat top (values 18-20, hard to rank), linear ramp (16→1), and zeros (8 bars). This shape is narratively important — the bunched top makes small prediction errors cause large ranking mistakes.

To adjust:
- **Number of bars**: add/remove entries (the animation adapts automatically)
- **Bar values**: edit `value` fields. Keep the top cluster tight to preserve the ranking-difficulty narrative.
- **Use geographic data instead**: replace entries with top-N values from the hex grid. The morph logic is agnostic.

### Prediction models (phases 5-9)

Two prediction models are defined in `config.js`:

**Left model** (`PRED_LEFT`) — "Standard Model (minimize MSE)":
- Predictions = actual value + Gaussian noise
- `noiseSigma` — noise for non-top-K bars (lower = more accurate)
- `topNoiseSigma` — noise for top-K bars (higher = worse ranking)
- `seed` — PRNG seed for reproducibility
- The code also swaps one top-K prediction with a below-threshold bar to guarantee at least one ranking error

**Right model** (`PRED_RIGHT`) — "Decision-Aware Model":
- Parabola: `f(i) = a * (i - c)^2 + d` where `i` is bar index (ascending)
- `a` — curvature (controls how fast it rises past the bars)
- `c` — vertex x-position (bar index where the parabola bottoms out)
- `d` — vertex y-offset (slightly negative, clamped to 0)
- Designed to have high MSE but perfect top-K ranking (parabola rises above sigmoid at the right end)

**Comparison parameters** (`COMPARISON`):
- `k` — number of top locations to evaluate (default 5)
- `gap` — horizontal space between the two side-by-side charts
- `frustumScale` — how much to zoom out when showing both charts

### Regenerating the MA outline

```bash
cd animations/interactive
python gen_ma_outline.py
# Paste the output array into config.js MA_OUTLINE
```

Adjust `TARGET_POINTS` (simplification) and `WORLD_WIDTH` (scale) in the script.

## Phase summary

| Phase | Click | What happens |
|-------|-------|-------------|
| 1 | 1st | Hex slabs ripple outward on MA map |
| 2 | 2nd | Camera rotates to SSE isometric; bars grow to height |
| 3 | 3rd | Bars arc up, morph mid-air to bar chart dataset, land sorted (smallest left) |
| 4 | 4th | Bar chart splits into two identical copies side-by-side |
| 5 | 5th | Prediction lines appear over each chart |
| 6 | 6th | Error fill (bar-by-bar, transparent) between predictions and actual |
| 7 | 7th | Both charts blink; RMSE values appear below |
| 8 | 8th | Error fill fades; non-top-K bars fade to low opacity |
| 9 | 9th | Sequential evaluation: left chart blinks → reach fraction, then right |

## Debug logging

`opioid-grid.js` currently has `console.log` calls for phase transitions and overlay positioning. Remove these once the animation is finalized — search for `console.log` and `console.error`.

---

# Cross-Animation Patterns

These patterns are applied consistently across all animations in this directory. Any new animation should follow them.

## 1. Fragment isolation — `fragmentshown` filtering

**Problem:** `preload-iframes: true` in `_quarto.yml` loads background-iframe animations before you navigate to them. The global `Reveal.on("fragmentshown", ...)` listener then fires for fragments on *other* slides, causing the animation to advance spuriously before the user ever sees it.

**Fix:** Check that the current slide's `data-background-iframe` attribute matches this file before advancing:

```js
try {
  const Reveal = window.parent && window.parent.Reveal;
  if (Reveal) {
    const myFile = window.location.pathname.split('/').pop(); // e.g. 'opioid-grid.html'
    Reveal.on("fragmentshown", () => {
      const bgIframe = Reveal.getCurrentSlide()?.dataset?.backgroundIframe ?? '';
      if (bgIframe.includes(myFile)) advancePhase();
    });
  }
} catch (_) {}
```

`window.location.pathname.split('/').pop()` returns the iframe's own HTML filename. `dataset.backgroundIframe` is the value of the `data-background-iframe` attribute on the `<section>` element for the current slide, set by Quarto from the `background-iframe="..."` attribute in the markdown.

**Why `getCurrentSlide().contains(event.fragment)` does NOT work:** `fragmentshown` only fires for the current slide's fragments, so that check is always `true` and provides no filtering.

## 2. Pending advance — queued input during transitions

**Problem:** Pressing right/space while a transition is running is silently dropped (`if (transitioning) return`). If the user clicks during a long tween, nothing happens.

**Fix (TWEEN.js animations — render loop):** Queue one pending advance and flush it in the render loop as soon as `transitioning` clears:

```js
let pendingAdvance = false;

function advancePhase() {
  if (currentPhase >= MAX_PHASE) return;
  if (transitioning) { pendingAdvance = true; return; }
  pendingAdvance = false;
  currentPhase++;
  // ... start transitions ...
}

function animate(time) {
  requestAnimationFrame(animate);
  TWEEN.update(time);
  if (pendingAdvance && !transitioning) {
    pendingAdvance = false;
    advancePhase();
  }
  renderer.render(scene, camera);
}
```

**Fix (timeout-based animations — no render loop):** Fire the pending advance from inside the `setTimeout` completion callback:

```js
function advancePhase() {
  if (currentPhase >= MAX_PHASE) return;
  if (transitioning) { pendingAdvance = true; return; }
  pendingAdvance = false;
  currentPhase++;
  transitioning = true;
  // ... do work ...
  setTimeout(() => {
    transitioning = false;
    if (pendingAdvance) { pendingAdvance = false; advancePhase(); }
  }, DURATION_MS);
}
```

Applied to: opioid-grid, bpr-eval, mse-gradient, perturbed-opt, how-to-rank, loss-landscape (TWEEN.js); bench-bump-original, bench-bump-rerun-main, bench-bump-rerun-single (timeout).

Not applied to: data-model (D3 transitions with per-phase timeouts — too invasive), daly-anim (single-phase), frontier/surrogate-interp (KaTeX+CSS, no meaningful transitioning gate), training-results/opportunity (CSS opacity fades, no blocking transition).

## 3. Backward navigation — snap to start

**Problem:** Pressing left while on an animation slide either silently hides a Reveal.js fragment (leaving animation and fragment state out of sync) or does nothing.

**Fix (opioid-grid only, applied 2026-04):** Listen to `fragmenthidden` for this slide, reset all fragment visibility in the parent DOM, and reload the iframe. The listener unregisters itself before reloading to prevent handler accumulation across reloads:

```js
function onFragmentHidden() {
  const slide = Reveal.getCurrentSlide();
  const bgIframe = slide?.dataset?.backgroundIframe ?? '';
  if (!bgIframe.includes(myFile)) return;
  Reveal.off('fragmenthidden', onFragmentHidden);   // prevent stacking on reload
  slide.querySelectorAll('.fragment').forEach(f => {
    f.classList.remove('visible', 'current-fragment');
  });
  Reveal.sync();          // re-sync Reveal.js fragment state from DOM
  window.location.reload(); // reset animation to phase 0
}
Reveal.on('fragmenthidden', onFragmentHidden);
```

**Why `Reveal.sync()` is needed:** After removing `.visible` from all fragments, `Reveal.sync()` recalculates internal fragment indices so the next forward press advances fragment 1 (not fragment N+1). Without it, the next fragmentshown fires for the wrong index and the animation gets only one advance instead of 9.

**To apply to other animations:** Copy the `onFragmentHidden` block into the Reveal.js integration section of any animation. No other changes needed — the `window.location.reload()` resets all Three.js/TWEEN state automatically.

**Limitation:** The reload causes a brief visual flash (~1 frame). Acceptable in presentation context. A no-reload alternative would require a full `resetToPhase0()` function tracking all tween end states — significantly more complex.

---

# Training Results Animation — Developer Notes

3-phase half-violin plot rendered in vanilla SVG (no Three.js). Shows test BPR vs. test log-likelihood for three datasets across three methods (NLL Only → BPR Only → DAML), embedded as two separate slides.

## Files

| File | Role |
|------|------|
| `training-results.js` | All logic: embedded data, KDE, SVG rendering, phase controller |
| `training-results-cook.html` | HTML shell for Cook County slide (single centered panel) |
| `training-results-ma-cranes.html` | HTML shell for MA + Cranes slide (two side-by-side panels) |

The JS file is loaded by each HTML shell with a `?mode=` URL param (`cook` or `ma-cranes`), read at runtime via `new URL(import.meta.url).searchParams.get('mode')`.

## Data source

Raw data lives in `/cluster/tufts/hugheslab/kheuto01/code/prob_diff_topk/frozen_plot_data/`:

| Dataset | File | NLL row | BPR row | DAML row |
|---------|------|---------|---------|----------|
| Cook County IL (2021–2022) | `cook_2021_2022.json` | 8 | 0 | 7 |
| MA Fatal Overdoses (2020–2021) | `ma_2020_2021.json` | 8 | 0 | 7 |
| ANWR TX Cranes (2009–2010) | `asurv_2009_2010.json` | 6 | 0 | 5 |

Each row in `data["selected_rows"]` has `trial_test_bprs` (1000 values), `avg_test_bpr`, and `test_nll`.

The data is **embedded directly** at the top of `training-results.js` as a `const DATA = {...}` block — 200 BPR values per method (subsampled with `numpy.random.default_rng(42)`), plus the scalar `avgBpr` and `nll`.

### Re-extracting data

If the source JSON changes, run this script to regenerate the embedded block:

```python
import json, numpy as np

BASE = "/cluster/tufts/hugheslab/kheuto01/code/prob_diff_topk/frozen_plot_data/"
DATASETS = [
    ("cook",   "cook_2021_2022.json",  {"nll": 8, "bpr": 0, "daml": 7}),
    ("ma",     "ma_2020_2021.json",    {"nll": 8, "bpr": 0, "daml": 7}),
    ("cranes", "asurv_2009_2010.json", {"nll": 6, "bpr": 0, "daml": 5}),
]
rng = np.random.default_rng(42)

for name, fname, rows in DATASETS:
    with open(BASE + fname) as f:
        data = json.load(f)
    for method in ["nll", "bpr", "daml"]:
        row = data["selected_rows"][rows[method]]
        bprs = np.array(row["trial_test_bprs"])
        idx  = rng.choice(len(bprs), 200, replace=False)
        bprs_sub = bprs[idx].tolist()
        print(f"  {name}_{method}: {{ nll: {row['test_nll']:.6f}, avgBpr: {row['avg_test_bpr']:.6f}, bprs: {[round(v,6) for v in bprs_sub]} }},")
```

Paste the output into the `const DATA = { ... }` block at the top of `training-results.js`.

### Expected key values (for verification)

| Dataset | Method | avg BPR | test NLL |
|---------|--------|---------|----------|
| Cook County | NLL Only | 0.7756 | 2.0000 |
| Cook County | BPR Only | 0.8175 | 16.634 |
| Cook County | DAML | 0.7985 | 3.425 |
| MA | NLL Only | 0.5865 | 1.453 |
| MA | BPR Only | 0.5997 | 5.368 |
| MA | DAML | 0.6163 | 2.785 |
| Cranes | NLL Only | 0.3775 | 0.272 |
| Cranes | BPR Only | 0.3890 | 2.205 |
| Cranes | DAML | 0.4036 | 1.959 |

## Rendering approach

Each method's distribution is drawn as a **symmetric half-violin** (SVG `<polygon>`):

1. **KDE**: Scott's rule bandwidth (`h = 1.06 * σ * n^(-0.2)`), evaluated at 150 points spanning `[min(bprs) - 0.004, max(bprs) + 0.004]`
2. **Shape**: top edge follows the KDE density curve; bottom edge mirrors it. Peak half-height is capped at `MAX_VIOLIN_HALF_PX = 42`.
3. **Y position**: centered at `ys(-test_nll)` — Y axis is test log-likelihood, plotted as negative so higher likelihood = higher on screen.
4. **Dot**: filled circle at `(avgBpr, -test_nll)`, same color.

Elements get `data-method="nll|bpr|daml"` and start with `opacity: 0`. The phase controller queries `[data-method="..."]` to reveal each group.

## Phase controller

```
Phase -1 (load):  all violins/dots hidden (opacity 0)
Phase  0:         NLL Only revealed (opacity → 1, 400ms CSS transition)
Phase  1:         BPR Only revealed
Phase  2:         DAML revealed; listeners removed
```

Click, ArrowRight/Space, and `Reveal.fragmentshown` all call `advancePhase()`. After phase 2, `removeListeners()` unhooks click/keydown so Reveal.js can advance to the next slide. The HUD hint div also hides at that point.

## Layout modes

| Mode | Panels | Panel width | X offset |
|------|--------|-------------|----------|
| `cook` | `['cook']` | 1020px | `(1600 - 1020) / 2` (centered) |
| `ma-cranes` | `['ma', 'cranes']` | 800px | 0 (left-aligned pair) |

`bMargin: 130` keeps the X-axis label clear of the Reveal.js section-nav footer (which sits at the bottom of the viewport in `position: fixed`).

## Slides embedding

```markdown
## {background-iframe="animations/interactive/training-results-cook.html" background-interactive="true"}

::: {.fragment .results-step}
:::
::: {.fragment .results-step}
:::
::: {.fragment .results-step}
:::
```

Three fragment divs per slide — one per method reveal. The fragments are invisible; their only purpose is to let Reveal.js drive `advancePhase()` via `fragmentshown`.

---

# Opportunity Animation — Developer Notes

5-phase half-violin animation replacing `figures/ch5/slide01.png` ("The Opportunity") in the Benchmarking chapter. Shows how SPO+ and PG fall short of BPR-only across all three real datasets, building up from a Cook County-only view to a full 3-panel comparison with the motivating question.

## Files

| File | Role |
|------|------|
| `opportunity.js` | All logic: embedded data, KDE, SVG rendering, phase controller |
| `opportunity.html` | HTML shell (no URL params needed — single mode) |

## Phase summary

| Phase | Trigger | What happens |
|-------|---------|-------------|
| 0 (load) | — | Big Cook County chart, NLL/BPR/DAML visible, SPO+/PG hidden |
| 1 | 1st click | SPO+ and PG fade in on big Cook chart |
| 2 | 2nd click | Dotted coral vertical line at BPR-only + double-headed arrow from SPO+ to BPR-only |
| 3 | 3rd click | Big Cook fades out; small 3-panel left layout (Cook + MA + Cranes) fades in with all methods + arrows |
| 4 | 4th click | Right-half text fades in: "Why do these methods come to such different solutions?" |

## Data source

Same JSON files as training-results animation (`frozen_plot_data/`). Row indices:

| Dataset | NLL | BPR | DAML | SPO+ | PG |
|---------|-----|-----|------|------|-----|
| Cook `cook_2021_2022.json` | 8 | 0 | 7 | 10 | 9 |
| MA `ma_2020_2021.json` | 8 | 0 | 7 | 10 | 9 |
| Cranes `asurv_2009_2010.json` | 6 | 0 | 5 | 8 | 7 |

Method key: `(bw=0, nw=1)` = NLL Only; `(bw=30, nw=0)` = BPR Only; `(bw=30, nw=1)` = DAML; `(bw=10, nw=10)` = SPO+; `(bw=20, nw=20)` = PG.

## Special cases

**MA log-scale y-axis**: SPO+ test_nll=90.26, PG test_nll=163.09 are orders of magnitude larger than NLL/BPR/DAML (1–5). A linear y-axis either cuts them off or squashes everything else to the top. Solution: `logScaleY: true` in `buildPanel`, using `ys = v => tm + (log(-v) - log(-yMax)) / (log(-yMin) - log(-yMax)) * CH`. MA yRange is `[-300, -0.5]` with ticks at `[-1, -2, -5, -20, -100]`. All five methods spread nicely across the chart height.

**Cranes PG zero variance**: All 200 BPR samples are identical (0.345884). The violin is skipped; only a dot is shown.

**X-axis ranges differ from training-results**: Cook is `[0.720, 0.840]` (wider to fit SPO+ distribution min=0.736); Cranes is `[0.14, 0.42]` (much wider to fit SPO+ distribution min=0.147).

## Re-extracting data

If source JSON changes, run the same extraction script as in the Training Results section above, adding rows for SPO+ and PG:

```python
DATASETS = [
    ('cook',   'cook_2021_2022.json',   {'nll': 8, 'bpr': 0, 'daml': 7, 'spo': 10, 'pg': 9}),
    ('ma',     'ma_2020_2021.json',     {'nll': 8, 'bpr': 0, 'daml': 7, 'spo': 10, 'pg': 9}),
    ('cranes', 'asurv_2009_2010.json',  {'nll': 6, 'bpr': 0, 'daml': 5, 'spo': 8,  'pg': 7}),
]
```

Paste the output into the `const DATA = { ... }` block at the top of `opportunity.js`.

## Hard-won implementation lessons

**Arrow coordinate system**: The `xs()` function returns coordinates local to a panel's `<g>` (which has `transform="translate(panelX, 0)"`). Any arrow or overlay group appended *outside* that panel `<g>` must carry the same translate — otherwise x-positions look correct in isolation but are offset by `panelX` when rendered. Fix: `arrowGroup.setAttribute('transform', \`translate(${panelX}, 0)\`)` before appending to the parent.

**`hideMethods` parameter**: Don't hardcode `isHidden = method === 'spo' || method === 'pg'` inside `buildPanel`. The same function is reused for panels where those methods should be visible from load (phase-3 small layout). Pass `hideMethods: ['spo', 'pg']` for the big Cook phase-0 panel and `hideMethods: []` (default) for small panels. Same principle applies to the inline legend.

**Legend placement**: BPR-only dots (highest BPR = rightmost, lowest NLL = bottommost) tend to cluster in the lower-right of each chart. Place the legend lower-left (`x = lm + 8, y = tm + CH - boxH - 8`) to avoid overlap.

**Log-scale y for mixed-magnitude NLL**: When comparing optimization-based methods (SPO+, PG) against likelihood-based ones on the same chart, NLL values can differ by 1–2 orders of magnitude. A linear y-axis makes both views useless. Use a log scale; the formula above handles negative values cleanly as long as all NLL values are strictly positive (which they are for proper probability models).
