# Opioid Grid Animation — Tuning Guide

All tunables live in `config.js`. The animation code (`opioid-grid.js`) imports from it.

## config.js sections

### `COLORS`
Color palette and the `valueColor(t)` function that maps a normalized value (0-1) to a THREE.Color. The default gradient is: teal (low) → purple (mid) → coral (high) → yellow (max). Adjust the breakpoints or swap colors here.

### `MA_OUTLINE`
Simplified polygon of Massachusetts mainland, ~67 points centered at origin. Coordinate system: x = east/west (east +), z = north/south (south +, matching Three.js convention). Spans ~10 world units E-W.

**To regenerate:** Run `python gen_ma_outline.py` — it downloads the us-10m TopoJSON, extracts MA, simplifies, and outputs a JS array to paste in. Adjust `TARGET_POINTS` and `WORLD_WIDTH` in the script.

### `HEX`
Hex grid parameters for the geographic view:
- `radius` — circumradius of each hexagon (world units). Smaller = more hexes, denser grid
- `gap` — spacing between adjacent hexes
- `flat` — flat-top orientation (true) vs pointy-top (false). Currently only flat-top is implemented.

### `GRID`
- `HEIGHT_SCALE` — multiplier: tallest bar = this many world units (auto-scaled so max value maps here)
- `GROUND_OPACITY` — opacity of the MA fill shape

### `CAMERA`
Camera positions for each phase, stored as `{ r, phi, theta }` spherical coordinates:
- `topDown` — phase 0-1: straight above, looking down
- `isometric` — phase 2: SSE angle (south-south-east). `phi` = elevation from vertical, `theta` = azimuth. Current theta ≈ π/8 puts camera at SSE so Cape Cod / SE coast is closest to viewer.
- `barChart` — phase 3: front-on view of sorted bars (Cartesian position + lookAt target)
- `frustum` — orthographic frustum half-height (world units)

To adjust the viewing angle, change `phi` (more tilt) and `theta` (rotate around). Smaller `r` = more zoomed in.

### `BAR_CHART`
- `barWidth` — width of each bar in the sorted chart
- `barGap` — spacing between bars
- `arcHeight` — how high bars arc during the fly-to-chart transition

### `TIMING`
Duration and delay values for each transition (in ms):
- `heatmap.duration`, `heatmap.maxDelay` — slab appearance ripple
- `isometric.cameraDuration`, `isometric.barDuration`, `isometric.barMaxDelay` — camera arc + bar growth
- `barChart.arcDuration` — bars fly up from map
- `barChart.morphDuration` — pause at arc peak (not currently used as separate tween, but reserved)
- `barChart.morphFadeOut` — doomed bars fade to invisible at peak
- `barChart.morphHeightAdjust` — surviving bars resize to new dataset heights at peak
- `barChart.landDuration` — survivors descend to chart positions
- `barChart.stagger` — delay between successive bars starting their arc
- `barChart.cameraDuration` — camera transition to front view
- `barChart.scaleDuration` — bars rescale to uniform width
- `barChart.fadeGroundDuration` — MA outline and ground fade out

### `EASING`
Easing functions for each transition, referencing `TWEEN.Easing.*`. Change these to adjust the feel of motion. Notable additions:
- `barChart.morphFade` — how doomed bars disappear (default: Quadratic.In for accelerating fade)
- `barChart.morphHeight` — how surviving bars resize (default: Quadratic.InOut for smooth)

### `PRED_LINE`
Prediction line styling:
- `tubeRadius` — thickness of the prediction line in world units (uses `TubeGeometry` for cross-platform support)
- `markerRadius` — radius of the circle markers placed at each predicted data point
- `markerSegments` — geometry resolution for marker spheres

### `ERROR_FILL`
Error fill region styling (the vertical quads between prediction line and actual bars):
- `color` — fill color (default: `COLORS.coral`, red)
- `opacity` — target opacity when fully visible (default: 0.8)

### `MAP_DATA`
Values for the hex grid geographic view. Flat array, one value per hex cell inside MA (row-major order, bottom-left to top-right). If the array is shorter than the number of hex cells, extra cells get value 0.

### `BAR_CHART_DATA`
Independent dataset for the final bar chart. Array of `{ label, value }` objects. The morph transition transforms the geographic hex bars into this dataset mid-flight.

**To use "same data, fewer bars" instead:** Replace entries with the top N values from `MAP_DATA` — the morph logic is agnostic to where the values come from.

## Common tweaks

| Goal | What to change |
|------|----------------|
| Faster/slower animations | `TIMING.*` durations |
| More dramatic bar heights | Increase `GRID.HEIGHT_SCALE` |
| Different viewing angle | `CAMERA.isometric.phi` / `.theta` |
| Change color gradient | `COLORS` and `valueColor()` breakpoints |
| Denser/sparser hex grid | `HEX.radius` (smaller = more hexes) |
| Hex spacing | `HEX.gap` |
| Bar chart spacing | `BAR_CHART.barWidth`, `BAR_CHART.barGap` |
| Bouncier bar growth | `EASING.isometric.bar` (try `Elastic.Out`) |
| Smoother morph | Increase `TIMING.barChart.morphHeightAdjust` |
| More/fewer chart bars | Add/remove entries in `BAR_CHART_DATA` |
| Different chart dataset | Edit `BAR_CHART_DATA` values/labels |
| Thicker/thinner prediction lines | `PRED_LINE.tubeRadius` |
| Larger/smaller prediction markers | `PRED_LINE.markerRadius` |
| Error fill color | `ERROR_FILL.color` |
| Error fill visibility | `ERROR_FILL.opacity` |
| Bigger MSE ranking mistake | Increase `PRED_LEFT.swapOffset` |
| Regenerate MA outline | `python gen_ma_outline.py`, paste output into config |
