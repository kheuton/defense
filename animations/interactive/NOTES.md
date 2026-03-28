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
