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
    opioid-grid.html        # HTML shell — canvas + CDN imports
    config.js               # All tunables: colors, timing, camera, layout, MA outline, datasets
    opioid-grid.js          # Three.js scene: hex grid on MA outline, morph transition
    gen_ma_outline.py       # One-shot script: GeoJSON → MA polygon coordinates for config.js
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

Tunables are in `config.js` — see `animations/interactive/TUNING.md` for details.

Test standalone by opening the `.html` file in a browser (click / arrow to advance).

## Quarto / Reveal.js notes

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
