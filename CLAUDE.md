# CLAUDE.md — Defense Slides

PhD thesis defense presentation: "Decision-Aware Machine Learning for Resource Allocation" by Kyle Heuton (Tufts, Hughes Lab).

## Quick start

```bash
conda activate defense

# Live preview (from another SSH session, tunnel -L 4848:localhost:4848)
quarto preview slides.qmd --port 4848 --no-browser

# One-shot render
quarto render slides.qmd
```

## Project structure

```
slides.qmd                  # All slide content (Quarto + Reveal.js)
_quarto.yml                 # Reveal.js config: 1600×900, dark theme, fade transitions
style/
  theme.scss                # SCSS variables, typography (Inter), color palette
  custom.css                # Component styles: pipeline cards, blockquotes, contribution items
animations/
  src/pipeline.py           # Manim scenes: PipelineIntro, DisconnectHighlight
  src/media/                # Manim build artifacts (gitignored)
  rendered/                 # Final .mp4 files embedded via {{< video >}} shortcode
  interactive/              # Browser-based Three.js animations (embedded via background-iframe)
    config.js               # All tunables: colors, timing, camera, layout, datasets, model params
    prediction-utils.js     # Shared: seeded PRNG, Gaussian RNG, prediction computation
    opioid-grid.{html,js}   # 9-phase: hex map → bar chart → model comparison → evaluation
    mse-gradient.{html,js}  # 10-phase: MSE has gradients, BPR does not
    perturbed-opt.{html,js} # 8-phase: perturbation smooths BPR into differentiable objective
    how-to-rank.{html,js}   # 2-phase: bar chart → Joy Division ridgeline of distributions
    gen_ma_outline.py       # One-shot script: GeoJSON → MA polygon coordinates for config.js
    NOTES.md                # Developer notes: what to read, restyling, dataset adjustment
    TUNING.md               # Section-by-section config.js reference
figures/                    # Static images
_output/                    # Quarto build output (gitignored)
```

## Color palette

Used consistently across SCSS, Manim, and Three.js:

| Name   | Hex       | Use                          |
|--------|-----------|------------------------------|
| Purple | `#7c6af7` | Headings, decision objective |
| Teal   | `#50c8a8` | Training objective, low vals |
| Coral  | `#ff7c57` | Warnings, high values        |
| Yellow | `#ffd166` | Highlights, max values       |
| BG     | `#11111e` | Slide/canvas background      |
| Muted  | `#888899` | Secondary text               |

## Animations

### Manim (video)

```bash
cd animations/src
manim -qh pipeline.py SceneName    # high quality
manim -qm pipeline.py SceneName    # medium quality
# Move output to animations/rendered/, embed with:
# {{< video animations/rendered/SceneName.mp4 width="100%" >}}
```

### Interactive (Three.js)

Files live in `animations/interactive/`. Embedded in slides via:
```markdown
## {background-iframe="animations/interactive/opioid-grid.html" background-interactive="true"}
```

Each animation is a standalone ES module (`.js`) loaded by an HTML shell (`.html`).
Shared data and prediction logic live in `config.js` and `prediction-utils.js`.

| Animation | File | Phases | What it shows |
|-----------|------|--------|---------------|
| Opioid grid | `opioid-grid.js` | 9 | Hex map → bar chart → model comparison → evaluation |
| MSE vs BPR gradient | `mse-gradient.js` | 10 | MSE has gradients, BPR does not |
| Perturbed optimizers | `perturbed-opt.js` | 8 | Perturbation smooths BPR into a differentiable objective |
| How to Rank | `how-to-rank.js` | 2 | Bar chart → Joy Division ridgeline of distributions |
| Training Results | `training-results.js` | 3 | Half-violin BPR distributions for Cook/MA/Cranes, NLL→BPR→DAML reveal |
| The Opportunity | `opportunity.js` | 4 | Cook→SPO+/PG reveal→gap arrow→3-panel zoom-out→motivating question |

Tunables are in `config.js` — see `animations/interactive/TUNING.md` for a section-by-section guide.

For a higher-level overview (what to read, how to restyle, how to adjust datasets and prediction models), see `animations/interactive/NOTES.md`. That file also contains a dedicated **Training Results** section covering the data source, KDE rendering approach, re-extraction script, and layout modes.

Test standalone by opening the `.html` file in a browser (click / arrow to advance).

#### Key patterns for new animations

- **Shared data**: Import `BAR_CHART_DATA`, `PRED_LEFT`, colors, etc. from `config.js`. Import `computeLeftPredictions`, `makeGaussRNG` from `prediction-utils.js`.
- **Thick lines**: Use `TubeGeometry` around a `CatmullRomCurve3` (not `Line2` addons — they break module loading). Circle markers via `SphereGeometry`.
- **Phase controller**: `advancePhase()` with `transitioning` gate. Click, ArrowRight/Space, and Reveal.js `fragmentshown` all call it.
- **Event propagation**: Animations MUST remove click/keydown listeners after the final phase so Reveal.js can advance to the next slide. Pattern:
  ```js
  function onClick() { advancePhase(); }
  function onKeyDown(e) { if (e.key === "ArrowRight" || e.key === " ") advancePhase(); }
  function removeListeners() {
    canvas.removeEventListener("click", onClick);
    document.removeEventListener("keydown", onKeyDown);
  }
  // In advancePhase(): if (currentPhase >= MAX_PHASE) removeListeners();
  ```
- **Slide embedding**: One `## Title {background-iframe="..." background-interactive="true"}` plus N empty `.fragment` divs (one per phase). The `_quarto.yml` glob `animations/interactive/**` auto-includes new files.

## Quarto / Reveal.js notes

See `SLIDE_DESIGN_NOTES.md` for hard-won lessons on fenced div syntax, `<hr>` pitfalls,
and Reveal.js slide separation. Read it before building complex slide layouts.

- Slide dimensions: 1600x900 (16:9). Design visuals for this aspect ratio.
- Transitions: fade. Speaker notes via `::: notes` blocks.
- Math: KaTeX (not MathJax).
- Interactive iframes need `background-interactive="true"` to receive click/key events.
- Custom assets for iframes must be listed under `resources:` in `_quarto.yml`.
- TeX Live: `/cluster/tufts/hugheslab/kheuto01/.texlive/bin/x86_64-linux` (in `.bashrc`).

## Working with worktrees

The repo uses git worktrees so multiple people can work on branches simultaneously:
```bash
git worktree add ../defense-<branch-name> <branch-name>
cd ../defense-<branch-name>
quarto preview slides.qmd --port <different-port> --no-browser
```
