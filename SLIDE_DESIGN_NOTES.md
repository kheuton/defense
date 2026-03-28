# Slide Design Notes

Hard-won lessons from building complex Quarto/Reveal.js slides.

## Pandoc fenced div pitfalls

### Use increasing colon counts for nested divs
When nesting fenced divs, use more colons for outer levels so closers are unambiguous:
```markdown
::::: {.columns}        ← 5 colons
:::: {.column}          ← 4 colons
::: {.fragment}         ← 3 colons
content
:::                     ← closes fragment
::::                    ← closes column
:::::                   ← closes columns
```
Three consecutive `:::` in a row at the same level can confuse the parser.

### `<hr>` inside a fenced div swallows closing fences
`<hr>` (or any block-level HTML tag) at the start of a line starts a Pandoc HTML block.
Everything until the next **blank line** is treated as raw HTML — including `:::` closers.

**Fix:** always put a blank line *after* any `<hr>` inside a fenced div:
```markdown
::: {.fragment}
**Header**

<hr>

:::          ← blank line above ensures this is seen as Markdown again
```

### Never use `---` as a horizontal rule inside slide content
`---` inside a Quarto document body is misinterpreted as a YAML front-matter delimiter.
Colons in nearby text (e.g. venue names like `Physical Review: PER`) then trigger a YAML parse error.

**Fix:** use `<hr>` (with surrounding blank lines) inside nested divs, or `border-top` CSS on a container.

## Reveal.js slide separation

### `<hr>` at the top slide level creates a new slide
Reveal.js treats any `<hr>` element at the `<section>` level as a horizontal slide separator.
This means `* * *` or `---` at the top level of slide content silently starts a new slide.

**Fix:** never use bare horizontal rules between top-level blocks on a slide.
For a visual separator above a bottom-of-slide element (e.g. an author line), use
`border-top` on the container div instead:
```markdown
:::: {style="border-top: 1px solid var(--separator); padding-top: 0.3em;"}
content
::::
```

### `<hr>` inside a `<div>` is safe
Horizontal rules nested inside `<div>` containers (e.g. inside `.columns`) are **not**
hoisted to section level by Reveal.js and do not create new slides.

## Section slides

### `---` creates a title-less slide
Use `---` at the top level (between other slides, outside any div) to create a slide with
no heading. This is the correct Quarto Reveal.js slide separator — distinct from `---`
*inside* slide content (which causes YAML errors).

### Hide a section title card with `visibility="hidden"`
Adding `{visibility="hidden"}` to a `#` heading suppresses the section title slide while
keeping the section grouping intact for Reveal.js navigation:
```markdown
# Introduction {visibility="hidden" background-color="#1a0a3a"}
```
All `##` slides that follow are still grouped under this section.

### Add content to a section title slide
Any content placed between `# Section Title` and the first `##` slide renders directly
on the section title card — useful for publication info, section summaries, etc.:
```markdown
# Evaluation {background-color="#0a2a1a"}

Author list, journal citation, logo placeholder…

## First content slide
```

## Color palette discipline

Any color value used in inline styles should first be added to `:root` in `style/theme.scss`
as a CSS custom property, then referenced as `var(--name)` everywhere. This applies to
new values like `--separator` just as much as the named palette colors.

### Section-scoped color families
When a section needs multiple shades of its base color (e.g. for a set of cards),
add the full family together — base, light, dark — and pair each with an accent utility
class in `theme.scss`:
```scss
// In :root
--teal:       #50c8a8;
--teal-light: #7ddcc0;
--teal-dark:  #2ea882;

// Accent classes
.reveal .accent-teal        { color: var(--teal);        }
.reveal .accent-teal-light  { color: var(--teal-light);  }
.reveal .accent-teal-dark   { color: var(--teal-dark);   }
```
This keeps color families coherent and makes future restyling a one-line change.
