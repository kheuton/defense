/**
 * Surrogate Bias Landscape
 *
 * Left half : Cook County benchmark (violins + dots, all 5 methods).
 * Right half: Loss landscape built up in phases.
 *
 * Phases (advance on click / arrow / Reveal fragmentshown):
 *   0  Axes + staircase decision regret + legend entry
 *   1  Idealized DPO curve appears (smooth, convex, min at θ=0)
 *   2  Idealized SPO+ curve appears (upper bound, convex, min at θ=0)
 *   3  "Local Minima" title appears; SPO+ deforms into a UUU-shape
 *   4  Title → "Larger Bias"; DPO & SPO+ shift sideways, SPO+ returns convex
 *   5  Right half fades to interpolation axes (SPO+ left, BPR right).
 *   6  A retro hand cursor sweeps to the SPO+ result clump, grabs it, and drags
 *      it onto BPR while the regret interpolation curve reveals (hockeystick).
 *   7  The SPO+ clump slides back home while the SPO+ loss interpolation
 *      reveals in SPO+ gold.
 *   8  Refresh the interp axes (clear curves, relabel SPO+ → PG, reset y-label).
 *   9  Repeat the drag for PG: cursor grabs PG and drags onto BPR while the
 *      PG regret curve reveals.
 *  10  PG clump slides back while the PG loss interpolation reveals in PG yellow.
 */

import { COOK_DATA, METHOD_COLORS } from "./cook-data.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const NS = "http://www.w3.org/2000/svg";
const W  = 1600, H = 900;

const COLORS = {
  ...METHOD_COLORS,
  axis:      "#888899",
  tickLabel: "#c8c8de",
  grid:      "#22223a",
  bg:        "#11111e",
  title:     "#ddddee",
  regret:    "#ffffff",
  dpo:       "#7c6af7",   // match BPR (Best Possible Reach) from Cook panel
  spo_plus:  "#d4962a",   // match SPO+ from Cook panel
  bias:      "#ff7c57",
  localMin:  "#ffd166",
};

// ── SVG helpers ───────────────────────────────────────────────────────────────

function el(tag, attrs, text) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text !== undefined) e.textContent = text;
  return e;
}

function stdDev(arr) {
  const n = arr.length;
  const m = arr.reduce((a, b) => a + b, 0) / n;
  return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
}

function gaussianKDE(samples, evalPts) {
  const n = samples.length;
  const sigma = stdDev(samples);
  const bw = Math.max(1.06 * sigma * Math.pow(n, -0.2), 0.001);
  const norm = 1.0 / (bw * Math.sqrt(2 * Math.PI));
  return evalPts.map(x => {
    let s = 0;
    for (const xi of samples) { const z = (x - xi) / bw; s += Math.exp(-0.5 * z * z); }
    return norm * s / n;
  });
}

function linspace(lo, hi, n) {
  return Array.from({ length: n }, (_, i) => lo + i * (hi - lo) / (n - 1));
}

// ── Cook panel (left half) ────────────────────────────────────────────────────

function buildCookPanel(svg) {
  const g = el("g", { id: "cookPanel" });

  const panelX = 0, panelY = 0, panelW = 800, panelH = H;
  const lm = 92, rm = 30, tm = 120, bm = 170;
  const xRange = [0.720, 0.840];
  const yRange = [-18.5, -0.5];
  const CW = panelW - lm - rm;
  const CH = panelH - tm - bm;
  const xs = v => lm + (v - xRange[0]) / (xRange[1] - xRange[0]) * CW;
  const ys = v => tm + (yRange[1] - v) / (yRange[1] - yRange[0]) * CH;
  const xTicks = [0.73, 0.75, 0.77, 0.79, 0.81];
  const yTicks = [-2, -4, -6, -8, -10, -12, -14, -16];
  const maxViolinHalf = 32;

  g.appendChild(el("rect", { x: panelX, y: panelY, width: panelW, height: panelH, fill: COLORS.bg }));

  const defs = el("defs");
  const clipId = "cookBiasClip";
  const cp = el("clipPath", { id: clipId });
  cp.appendChild(el("rect", { x: lm, y: tm, width: CW, height: CH }));
  defs.appendChild(cp);
  g.appendChild(defs);

  // Title
  g.appendChild(el("text", {
    x: panelW / 2, y: 58,
    "text-anchor": "middle", fill: COLORS.title,
    "font-size": 30, "font-weight": 600,
    "font-family": "Inter, system-ui, sans-serif",
  }, "Cook County IL (2021–2022)"));

  // Grid
  xTicks.forEach(t => g.appendChild(el("line", {
    x1: xs(t), y1: tm, x2: xs(t), y2: tm + CH,
    stroke: COLORS.grid, "stroke-width": 1,
  })));
  yTicks.forEach(t => g.appendChild(el("line", {
    x1: lm, y1: ys(t), x2: lm + CW, y2: ys(t),
    stroke: COLORS.grid, "stroke-width": 1,
  })));

  // Axes
  g.appendChild(el("line", { x1: lm, y1: tm + CH, x2: lm + CW, y2: tm + CH, stroke: COLORS.axis, "stroke-width": 1.5 }));
  g.appendChild(el("line", { x1: lm, y1: tm, x2: lm, y2: tm + CH, stroke: COLORS.axis, "stroke-width": 1.5 }));

  // Ticks + labels
  xTicks.forEach(t => {
    g.appendChild(el("line", { x1: xs(t), y1: tm + CH, x2: xs(t), y2: tm + CH + 5, stroke: COLORS.axis, "stroke-width": 1 }));
    g.appendChild(el("text", {
      x: xs(t), y: tm + CH + 24,
      "text-anchor": "middle", fill: COLORS.tickLabel,
      "font-size": 20, "font-family": "Inter, system-ui, sans-serif",
    }, t.toFixed(2)));
  });
  yTicks.forEach(t => {
    g.appendChild(el("line", { x1: lm - 5, y1: ys(t), x2: lm, y2: ys(t), stroke: COLORS.axis, "stroke-width": 1 }));
    g.appendChild(el("text", {
      x: lm - 10, y: ys(t) + 6,
      "text-anchor": "end", fill: COLORS.tickLabel,
      "font-size": 20, "font-family": "Inter, system-ui, sans-serif",
    }, String(t)));
  });

  // Axis labels
  const yl = el("text", {
    transform: `translate(22, ${tm + CH / 2}) rotate(-90)`,
    "text-anchor": "middle", fill: COLORS.tickLabel,
    "font-size": 22, "font-family": "Inter, system-ui, sans-serif",
  });
  yl.textContent = "Test Log Likelihood";
  g.appendChild(yl);
  g.appendChild(el("text", {
    x: lm + CW / 2, y: tm + CH + 62,
    "text-anchor": "middle", fill: COLORS.tickLabel,
    "font-size": 22, "font-family": "Inter, system-ui, sans-serif",
  }, "Test BPR"));

  // Violins + dots
  const violinG = el("g", { "clip-path": `url(#${clipId})` });
  g.appendChild(violinG);
  const methods = ["nll", "bpr", "daml", "spo", "pg"];
  const BOTTOM_CLAMP_PX = tm + CH - maxViolinHalf;

  // SPO+ / PG clusters live in their own groups so phases 5–10 can translate them.
  spoDragG = el("g", { id: "spoDragG" });
  pgDragG  = el("g", { id: "pgDragG" });

  methods.forEach(method => {
    const d = COOK_DATA[`cook_${method}`];
    if (!d) return;
    const color = COLORS[method];
    const rawYBase = ys(-d.nll);
    const isClamped = rawYBase > BOTTOM_CLAMP_PX;
    const yBase = isClamped ? BOTTOM_CLAMP_PX : rawYBase;

    const isSpo = method === "spo";
    const isPg  = method === "pg";
    const host = isSpo ? spoDragG : (isPg ? pgDragG : null);
    const violinHost = host || violinG;
    const dotHost    = host || g;

    if (!isClamped) {
      const bprMin = Math.min(...d.bprs) - 0.004;
      const bprMax = Math.max(...d.bprs) + 0.004;
      const evalPts = linspace(bprMin, bprMax, 150);
      const density = gaussianKDE(d.bprs, evalPts);
      const scale = maxViolinHalf / Math.max(...density);
      const topPts = evalPts.map((b, i) => `${xs(b).toFixed(2)},${(yBase - density[i] * scale).toFixed(2)}`);
      const botPts = evalPts.map((b, i) => `${xs(b).toFixed(2)},${(yBase + density[i] * scale).toFixed(2)}`).reverse();
      violinHost.appendChild(el("polygon", {
        points: [...topPts, ...botPts].join(" "),
        fill: color, "fill-opacity": 0.65,
      }));
    }

    dotHost.appendChild(el("circle", {
      cx: xs(d.avgBpr).toFixed(2), cy: yBase.toFixed(2),
      r: 5, fill: color,
    }));

    if (isClamped) {
      const tx = xs(d.avgBpr);
      const ty = tm + CH + 8;
      g.appendChild(el("polygon", {
        points: `${tx.toFixed(2)},${(ty + 10).toFixed(2)} ${(tx - 7).toFixed(2)},${ty.toFixed(2)} ${(tx + 7).toFixed(2)},${ty.toFixed(2)}`,
        fill: color,
      }));
    }

    if (isSpo) spoHome = { x: xs(d.avgBpr), y: yBase };
    if (isPg)  pgHome  = { x: xs(d.avgBpr), y: yBase };
  });

  // Append drag groups AFTER the methods loop so they render on top of every
  // other violin.  spoDragG last = on top initially; phases 6/9 re-append the
  // active drag group so it stays on top during that drag.
  violinG.appendChild(pgDragG);
  violinG.appendChild(spoDragG);

  // Stash BPR target position for phase 5.
  {
    const d = COOK_DATA.cook_bpr;
    const rawYBase = ys(-d.nll);
    const isClamped = rawYBase > BOTTOM_CLAMP_PX;
    const yBase = isClamped ? BOTTOM_CLAMP_PX : rawYBase;
    bprHome = { x: xs(d.avgBpr), y: yBase };
  }

  // Legend (inline box, upper-left of plot area)
  const legendItems = [
    { label: "NLL Only", color: COLORS.nll  },
    { label: "BPR Only", color: COLORS.bpr  },
    { label: "DAML",     color: COLORS.daml },
    { label: "SPO+",     color: COLORS.spo  },
    { label: "PG",       color: COLORS.pg   },
  ];
  const boxW = 168, rowH = 30, boxPad = 10;
  const boxH = legendItems.length * rowH + boxPad;
  // Lower-left of plot area (upper-left overlapped the SPO cluster).
  const lx = lm + 14, ly = tm + CH - boxH - 14;
  const lg = el("g", { transform: `translate(${lx}, ${ly})` });
  lg.appendChild(el("rect", { x: 0, y: 0, width: boxW, height: boxH, rx: 5, ry: 5, fill: "#1c1c2e", stroke: "#333348", "stroke-width": 1 }));
  legendItems.forEach(({ label, color }, i) => {
    const cy = boxPad / 2 + (i + 0.5) * rowH;
    lg.appendChild(el("circle", { cx: 18, cy, r: 7, fill: color }));
    lg.appendChild(el("text", {
      x: 32, y: cy + 6, fill: COLORS.title,
      "font-size": 19, "font-family": "Inter, system-ui, sans-serif",
    }, label));
  });
  g.appendChild(lg);

  svg.appendChild(g);
}

// ── Right-half: loss-landscape coordinate system ──────────────────────────────

const LS_PANEL_X = 820;
const LS_PANEL_W = 760;
const LS_LM = 92, LS_RM = 36, LS_TM = 200, LS_BM = 140;
const LS_CW = LS_PANEL_W - LS_LM - LS_RM;
const LS_CH = H - LS_TM - LS_BM;

const THETA_MIN = -1.0, THETA_MAX = 1.0;
const LOSS_MAX  = 0.70;

function toX(theta) {
  return LS_PANEL_X + LS_LM + (theta - THETA_MIN) / (THETA_MAX - THETA_MIN) * LS_CW;
}
function toY(loss) {
  const clamped = Math.max(0, Math.min(LOSS_MAX, loss));
  return LS_TM + (LOSS_MAX - clamped) / LOSS_MAX * LS_CH;
}

// ── Regret staircase (symmetric, minimum near θ=0) ────────────────────────────

const REGRET_STEPS = [
  { t0: -1.00, t1: -0.80, r: 0.42 },
  { t0: -0.80, t1: -0.60, r: 0.30 },
  { t0: -0.60, t1: -0.40, r: 0.20 },
  { t0: -0.40, t1: -0.20, r: 0.12 },
  { t0: -0.20, t1: -0.05, r: 0.06 },
  { t0: -0.05, t1:  0.05, r: 0.02 },
  { t0:  0.05, t1:  0.20, r: 0.06 },
  { t0:  0.20, t1:  0.40, r: 0.12 },
  { t0:  0.40, t1:  0.60, r: 0.20 },
  { t0:  0.60, t1:  0.80, r: 0.30 },
  { t0:  0.80, t1:  1.00, r: 0.42 },
];

function regretPathD() {
  let d = "";
  for (let i = 0; i < REGRET_STEPS.length; i++) {
    const s = REGRET_STEPS[i];
    const x0 = toX(s.t0), x1 = toX(s.t1), y = toY(s.r);
    if (i === 0) d += `M ${x0.toFixed(2)},${y.toFixed(2)} `;
    else {
      const prev = REGRET_STEPS[i - 1];
      d += `L ${toX(prev.t1).toFixed(2)},${y.toFixed(2)} `;
    }
    d += `L ${x1.toFixed(2)},${y.toFixed(2)} `;
  }
  return d.trim();
}

// ── Loss function builders ────────────────────────────────────────────────────

// DPO convex, min at 0
const dpoConvex = theta => 0.05 + 0.28 * theta * theta;
// SPO+ convex upper bound, min at 0 — lifted so it clears every staircase corner
const spoConvex = theta => 0.14 + 0.45 * theta * theta;
// SPO+ UUU-shape: convex envelope minus three Gaussian wells at θ = 0 and θ = ±0.35.
// Global minimum stays at θ = 0; two shallower local minima sit at ±0.35.
const spoUUU = theta => {
  const g = (t, mu) => Math.exp(-50 * (t - mu) * (t - mu));
  return 0.36 + 0.25 * theta * theta
       - 0.22 * (g(theta, 0) + g(theta, 0.35) + g(theta, -0.35));
};
// DPO shifted (small bias, min at θ = 0.25)
const dpoShifted = theta => 0.05 + 0.28 * (theta - 0.25) * (theta - 0.25);
// SPO+ shifted and higher (large bias, convex, min at θ = 0.50, value ≈ 0.26)
const spoShifted = theta => 0.26 + 0.45 * (theta - 0.50) * (theta - 0.50);

// ── Curve path from loss function ─────────────────────────────────────────────

function curveD(fn, n = 160) {
  let d = "";
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const theta = THETA_MIN + t * (THETA_MAX - THETA_MIN);
    const x = toX(theta), y = toY(fn(theta));
    d += (i === 0 ? "M " : "L ") + x.toFixed(2) + "," + y.toFixed(2) + " ";
  }
  return d.trim();
}

// Interpolate between two functions by mixing their output values.
function animateCurve(pathEl, fromFn, toFn, duration = 800, onDone) {
  const t0 = performance.now();
  function step(now) {
    const t = Math.min(1, (now - t0) / duration);
    const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
    const mixed = theta => fromFn(theta) * (1 - eased) + toFn(theta) * eased;
    pathEl.setAttribute("d", curveD(mixed));
    if (t < 1) requestAnimationFrame(step);
    else if (onDone) onDone();
  }
  requestAnimationFrame(step);
}

// ── Right-half: axes, regret, curves, labels, title ───────────────────────────

let landscapeGroup;
let regretPath;
let dpoPath, spoPath;
let titleTextA, titleTextB;   // cross-faded titles ("Local Minima" / "Larger Bias")
let dpoLegendRow, spoLegendRow;
let regretLegendRow;
let landscapeTitle;           // "Surrogate Loss Landscape" (fades out in phase 5)

// Phase 5+ elements
let spoDragG, pgDragG;        // Cook panel drag groups (SPO+ cluster / PG cluster)
let spoHome, bprHome, pgHome; // Home positions in Cook-panel pixel coords
let interpG;                  // Interpolation-axes overlay on right half
let interpTitle;
let interpYLabel;             // swaps between "Normalized Regret" / "Normalized Loss"
let interpLeftLabel;          // swaps between "SPO+" / "PG" (gold / yellow)
let interpRegretPath;         // revealed progressively during forward drag
let interpLossPath;           // revealed progressively during slide-back
let cursorG;                  // Retro hand cursor
let cursorOpen, cursorClosed; // Two children of cursorG (toggle visibility)

// Current loss-fn state (for interpolation start-points)
let dpoCurrentFn = dpoConvex;
let spoCurrentFn = spoConvex;

function buildLandscape(svg) {
  landscapeGroup = el("g", { id: "landscapePanel" });

  // Plot area background / title band
  landscapeGroup.appendChild(el("rect", {
    x: LS_PANEL_X, y: 0, width: LS_PANEL_W, height: H, fill: COLORS.bg,
  }));

  // Panel title (fades out in phase 5)
  landscapeTitle = el("text", {
    x: LS_PANEL_X + LS_PANEL_W / 2, y: 58,
    "text-anchor": "middle", fill: COLORS.title,
    "font-size": 30, "font-weight": 600,
    "font-family": "Inter, system-ui, sans-serif",
  }, "Surrogate Loss Landscape");
  landscapeTitle.style.transition = "opacity 0.5s ease";
  landscapeGroup.appendChild(landscapeTitle);

  // Axes group (opacity 0 until phase 0)
  const axesG = el("g", { id: "axesG" });
  axesG.style.opacity = "0";
  axesG.style.transition = "opacity 0.5s ease";

  // Grid + axes
  const xTicks = [-1.0, -0.5, 0.0, 0.5, 1.0];
  const yTicks = [0.0, 0.2, 0.4, 0.6];
  xTicks.forEach(t => axesG.appendChild(el("line", {
    x1: toX(t), y1: LS_TM, x2: toX(t), y2: LS_TM + LS_CH,
    stroke: COLORS.grid, "stroke-width": 1,
  })));
  yTicks.forEach(v => axesG.appendChild(el("line", {
    x1: LS_PANEL_X + LS_LM, y1: toY(v),
    x2: LS_PANEL_X + LS_LM + LS_CW, y2: toY(v),
    stroke: COLORS.grid, "stroke-width": 1,
  })));
  axesG.appendChild(el("line", {
    x1: LS_PANEL_X + LS_LM, y1: LS_TM + LS_CH,
    x2: LS_PANEL_X + LS_LM + LS_CW, y2: LS_TM + LS_CH,
    stroke: COLORS.axis, "stroke-width": 1.5,
  }));
  axesG.appendChild(el("line", {
    x1: LS_PANEL_X + LS_LM, y1: LS_TM,
    x2: LS_PANEL_X + LS_LM, y2: LS_TM + LS_CH,
    stroke: COLORS.axis, "stroke-width": 1.5,
  }));

  xTicks.forEach(t => {
    axesG.appendChild(el("line", {
      x1: toX(t), y1: LS_TM + LS_CH,
      x2: toX(t), y2: LS_TM + LS_CH + 6,
      stroke: COLORS.axis, "stroke-width": 1,
    }));
    axesG.appendChild(el("text", {
      x: toX(t), y: LS_TM + LS_CH + 28,
      "text-anchor": "middle", fill: COLORS.tickLabel,
      "font-size": 20, "font-family": "Inter, system-ui, sans-serif",
    }, t === 0 ? "0" : (t > 0 ? "+" + t.toFixed(1) : t.toFixed(1))));
  });
  yTicks.forEach(v => {
    axesG.appendChild(el("line", {
      x1: LS_PANEL_X + LS_LM - 6, y1: toY(v),
      x2: LS_PANEL_X + LS_LM, y2: toY(v),
      stroke: COLORS.axis, "stroke-width": 1,
    }));
    axesG.appendChild(el("text", {
      x: LS_PANEL_X + LS_LM - 12, y: toY(v) + 6,
      "text-anchor": "end", fill: COLORS.tickLabel,
      "font-size": 20, "font-family": "Inter, system-ui, sans-serif",
    }, v.toFixed(1)));
  });

  // Axis labels
  axesG.appendChild(el("text", {
    x: LS_PANEL_X + LS_LM + LS_CW / 2, y: LS_TM + LS_CH + 66,
    "text-anchor": "middle", fill: COLORS.tickLabel,
    "font-size": 26, "font-style": "italic",
    "font-family": "Inter, system-ui, sans-serif",
  }, "θ"));
  const ylab = el("text", {
    transform: `translate(${LS_PANEL_X + 28}, ${LS_TM + LS_CH / 2}) rotate(-90)`,
    "text-anchor": "middle", fill: COLORS.tickLabel,
    "font-size": 22, "font-family": "Inter, system-ui, sans-serif",
  });
  ylab.textContent = "Loss";
  axesG.appendChild(ylab);

  // Regret staircase path (drawn with uniform stroke-width; opacity 0 until phase 0)
  regretPath = el("path", {
    d: regretPathD(),
    fill: "none",
    stroke: COLORS.regret,
    "stroke-width": 4,
    "stroke-linejoin": "miter",
    "stroke-linecap": "butt",
  });
  regretPath.style.opacity = "0";
  regretPath.style.transition = "opacity 0.6s ease";

  // DPO curve (hidden initially)
  dpoPath = el("path", {
    d: curveD(dpoConvex),
    fill: "none",
    stroke: COLORS.dpo,
    "stroke-width": 5,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  });
  dpoPath.style.opacity = "0";
  dpoPath.style.transition = "opacity 0.5s ease";

  // SPO+ curve (hidden initially)
  spoPath = el("path", {
    d: curveD(spoConvex),
    fill: "none",
    stroke: COLORS.spo_plus,
    "stroke-width": 5,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  });
  spoPath.style.opacity = "0";
  spoPath.style.transition = "opacity 0.5s ease";

  axesG.appendChild(regretPath);
  axesG.appendChild(dpoPath);
  axesG.appendChild(spoPath);

  // Titles overlaying the plot (cross-faded)
  titleTextA = el("text", {
    x: LS_PANEL_X + LS_LM + LS_CW / 2, y: LS_TM - 38,
    "text-anchor": "middle",
    fill: COLORS.localMin,
    "font-size": 40, "font-weight": 700, "letter-spacing": "0.02em",
    "font-family": "Inter, system-ui, sans-serif",
  }, "Local Minima");
  titleTextA.style.opacity = "0";
  titleTextA.style.transition = "opacity 0.45s ease";

  titleTextB = el("text", {
    x: LS_PANEL_X + LS_LM + LS_CW / 2, y: LS_TM - 38,
    "text-anchor": "middle",
    fill: COLORS.bias,
    "font-size": 40, "font-weight": 700, "letter-spacing": "0.02em",
    "font-family": "Inter, system-ui, sans-serif",
  }, "Larger Bias");
  titleTextB.style.opacity = "0";
  titleTextB.style.transition = "opacity 0.45s ease";

  axesG.appendChild(titleTextA);
  axesG.appendChild(titleTextB);

  // Inline legend for right half (stacked under the plot area)
  const legG = el("g");
  const legX = LS_PANEL_X + LS_LM + 14;
  const legY = LS_TM + 18;
  const rowH = 32;

  function legendRow(y, color, label, swatchStyle = "line") {
    const row = el("g", { transform: `translate(${legX}, ${y})` });
    row.style.opacity = "0";
    row.style.transition = "opacity 0.5s ease";
    if (swatchStyle === "line") {
      row.appendChild(el("line", {
        x1: 0, y1: 0, x2: 34, y2: 0,
        stroke: color, "stroke-width": 4, "stroke-linecap": "round",
      }));
    } else {
      row.appendChild(el("rect", { x: 0, y: -4, width: 34, height: 8, fill: color, rx: 2, ry: 2 }));
    }
    row.appendChild(el("text", {
      x: 44, y: 6, fill: COLORS.title,
      "font-size": 19, "font-weight": 600,
      "font-family": "Inter, system-ui, sans-serif",
    }, label));
    legG.appendChild(row);
    return row;
  }

  regretLegendRow = legendRow(legY,              COLORS.regret,   "Decision Regret");
  dpoLegendRow    = legendRow(legY + rowH,       COLORS.dpo,      "DPO");
  spoLegendRow    = legendRow(legY + 2 * rowH,   COLORS.spo_plus, "SPO+ (upper bound)");

  axesG.appendChild(legG);

  landscapeGroup.appendChild(axesG);
  svg.appendChild(landscapeGroup);
}

function showAxes()          { document.getElementById("axesG").style.opacity = "1"; }
function showRegret()        { regretPath.style.opacity = "0.95"; }
function showLegendRow(row)  { row.style.opacity = "1"; }

// ── Phase-5 data: real Cook SPO+ interpolation (flipped so SPO+ is on left) ───

// Original (from surrogate-interp.js): α=0 is BPR, α=1 is SPO+.
// Flipped here: α=0 is SPO+, α=1 is BPR.
const COOK_SPO_REGRET_RAW = [
  [0.00, 0.0971], [0.02, 0.0451], [0.04, 0.0000], [0.06, 0.0175], [0.08, 0.0520],
  [0.10, 0.0520], [0.12, 0.1150], [0.14, 0.0611], [0.16, 0.0349], [0.18, 0.0789],
  [0.20, 0.1070], [0.22, 0.0698], [0.24, 0.0516], [0.26, 0.1316], [0.28, 0.1074],
  [0.30, 0.0800], [0.32, 0.0804], [0.34, 0.1415], [0.36, 0.0349], [0.38, 0.0539],
  [0.40, 0.1241], [0.42, 0.1244], [0.44, 0.1248], [0.46, 0.1863], [0.48, 0.1426],
  [0.50, 0.0706], [0.52, 0.0618], [0.54, 0.1066], [0.56, 0.1161], [0.58, 0.0713],
  [0.60, 0.0892], [0.62, 0.0812], [0.64, 0.0542], [0.66, 0.0622], [0.68, 0.0998],
  [0.70, 0.0645], [0.72, 0.0459], [0.74, 0.0736], [0.76, 0.0725], [0.78, 0.0736],
  [0.80, 0.1096], [0.82, 0.1085], [0.84, 0.1700], [0.86, 0.1703], [0.88, 0.2511],
  [0.90, 0.3403], [0.92, 0.3562], [0.94, 0.6430], [0.96, 0.6620], [0.98, 0.7242],
  [1.00, 1.0000],
];
const COOK_SPO_LOSS_RAW = [
  [0.00, 1.0000], [0.02, 0.9879], [0.04, 0.9766], [0.06, 0.9625], [0.08, 0.9506],
  [0.10, 0.9366], [0.12, 0.9259], [0.14, 0.9086], [0.16, 0.9000], [0.18, 0.8781],
  [0.20, 0.8630], [0.22, 0.8489], [0.24, 0.8345], [0.26, 0.8165], [0.28, 0.7989],
  [0.30, 0.7805], [0.32, 0.7626], [0.34, 0.7386], [0.36, 0.7243], [0.38, 0.6971],
  [0.40, 0.6749], [0.42, 0.6530], [0.44, 0.6311], [0.46, 0.6061], [0.48, 0.5842],
  [0.50, 0.5592], [0.52, 0.5305], [0.54, 0.5024], [0.56, 0.4804], [0.58, 0.4511],
  [0.60, 0.4230], [0.62, 0.3959], [0.64, 0.3613], [0.66, 0.3341], [0.68, 0.3045],
  [0.70, 0.2764], [0.72, 0.2436], [0.74, 0.2233], [0.76, 0.1956], [0.78, 0.1689],
  [0.80, 0.1522], [0.82, 0.1192], [0.84, 0.1061], [0.86, 0.0810], [0.88, 0.0581],
  [0.90, 0.0377], [0.92, 0.0214], [0.94, 0.0101], [0.96, 0.0121], [0.98, 0.0000],
  [1.00, 0.0194],
];
const COOK_PG_REGRET_RAW = [
  [0.00, 0.3593], [0.02, 0.2443], [0.04, 0.4408], [0.06, 0.4144], [0.08, 0.2192],
  [0.10, 0.3306], [0.12, 0.2515], [0.14, 0.4216], [0.16, 0.3641], [0.18, 0.2767],
  [0.20, 0.1389], [0.22, 0.2503], [0.24, 0.1677], [0.26, 0.1066], [0.28, 0.1916],
  [0.30, 0.1365], [0.32, 0.1928], [0.34, 0.2228], [0.36, 0.0491], [0.38, 0.1365],
  [0.40, 0.1928], [0.42, 0.1928], [0.44, 0.1916], [0.46, 0.1354], [0.48, 0.1916],
  [0.50, 0.2767], [0.52, 0.1354], [0.54, 0.0000], [0.56, 0.1940], [0.58, 0.3629],
  [0.60, 0.2204], [0.62, 0.1641], [0.64, 0.2503], [0.66, 0.4455], [0.68, 0.3354],
  [0.70, 0.2767], [0.72, 0.5593], [0.74, 0.3940], [0.76, 0.7365], [0.78, 0.5030],
  [0.80, 0.6192], [0.82, 0.6515], [0.84, 0.9365], [0.86, 0.8539], [0.88, 0.7928],
  [0.90, 0.8862], [0.92, 0.9389], [0.94, 0.8826], [0.96, 0.9976], [0.98, 1.0000],
  [1.00, 0.9952],
];
const COOK_PG_LOSS_RAW = [
  [0.00, 0.9935], [0.02, 0.9702], [0.04, 0.9778], [0.06, 1.0000], [0.08, 0.9572],
  [0.10, 0.8850], [0.12, 0.8755], [0.14, 0.9408], [0.16, 0.8087], [0.18, 0.8827],
  [0.20, 0.7976], [0.22, 0.8085], [0.24, 0.7880], [0.26, 0.7504], [0.28, 0.7026],
  [0.30, 0.7795], [0.32, 0.7160], [0.34, 0.6933], [0.36, 0.7082], [0.38, 0.6308],
  [0.40, 0.5977], [0.42, 0.5930], [0.44, 0.5600], [0.46, 0.5238], [0.48, 0.5372],
  [0.50, 0.5345], [0.52, 0.4913], [0.54, 0.4670], [0.56, 0.4322], [0.58, 0.4556],
  [0.60, 0.4100], [0.62, 0.3425], [0.64, 0.3540], [0.66, 0.3707], [0.68, 0.3152],
  [0.70, 0.2557], [0.72, 0.2586], [0.74, 0.2683], [0.76, 0.2598], [0.78, 0.2097],
  [0.80, 0.2477], [0.82, 0.1738], [0.84, 0.1854], [0.86, 0.1349], [0.88, 0.0760],
  [0.90, 0.1262], [0.92, 0.0145], [0.94, 0.0680], [0.96, 0.0275], [0.98, 0.0000],
  [1.00, 0.0528],
];
// Flip (α → 1−α) so the source method sits on the LEFT (α=0) and BPR on the right.
const COOK_SPO_REGRET_FLIPPED = COOK_SPO_REGRET_RAW.map(([a, v]) => [1 - a, v]).sort((a, b) => a[0] - b[0]);
const COOK_SPO_LOSS_FLIPPED   = COOK_SPO_LOSS_RAW  .map(([a, v]) => [1 - a, v]).sort((a, b) => a[0] - b[0]);
const COOK_PG_REGRET_FLIPPED  = COOK_PG_REGRET_RAW .map(([a, v]) => [1 - a, v]).sort((a, b) => a[0] - b[0]);
const COOK_PG_LOSS_FLIPPED    = COOK_PG_LOSS_RAW   .map(([a, v]) => [1 - a, v]).sort((a, b) => a[0] - b[0]);

// Interp plot coordinate system: reuses the right-half panel box exactly.
const INTERP_YMIN = -0.02, INTERP_YMAX = 1.05;
function interpX(a)     { return LS_PANEL_X + LS_LM + a * LS_CW; }
function interpY(v)     {
  return LS_TM + (INTERP_YMAX - v) / (INTERP_YMAX - INTERP_YMIN) * LS_CH;
}

// Build a partial SVG path containing samples with α ∈ [aLo, aHi] inclusive.
function interpPartialD(data, aLo, aHi) {
  let d = "";
  let started = false;
  for (const [a, v] of data) {
    if (a < aLo - 1e-9 || a > aHi + 1e-9) continue;
    const x = interpX(a), y = interpY(v);
    d += (started ? "L " : "M ") + x.toFixed(2) + "," + y.toFixed(2) + " ";
    started = true;
  }
  return d.trim();
}

function buildInterp(svg) {
  interpG = el("g", { id: "interpG" });
  interpG.style.opacity = "0";
  interpG.style.transition = "opacity 0.5s ease";

  // Grid + axes
  const yTicks = [0.0, 0.25, 0.5, 0.75, 1.0];
  const xTicks = [0.0, 0.25, 0.5, 0.75, 1.0];

  xTicks.forEach(t => interpG.appendChild(el("line", {
    x1: interpX(t), y1: LS_TM, x2: interpX(t), y2: LS_TM + LS_CH,
    stroke: COLORS.grid, "stroke-width": 1,
  })));
  yTicks.forEach(v => interpG.appendChild(el("line", {
    x1: LS_PANEL_X + LS_LM, y1: interpY(v),
    x2: LS_PANEL_X + LS_LM + LS_CW, y2: interpY(v),
    stroke: COLORS.grid, "stroke-width": 1,
  })));

  interpG.appendChild(el("line", {
    x1: LS_PANEL_X + LS_LM, y1: LS_TM + LS_CH,
    x2: LS_PANEL_X + LS_LM + LS_CW, y2: LS_TM + LS_CH,
    stroke: COLORS.axis, "stroke-width": 1.5,
  }));
  interpG.appendChild(el("line", {
    x1: LS_PANEL_X + LS_LM, y1: LS_TM,
    x2: LS_PANEL_X + LS_LM, y2: LS_TM + LS_CH,
    stroke: COLORS.axis, "stroke-width": 1.5,
  }));

  // X-axis endpoint labels.  Left endpoint is mutable (SPO+ then PG); BPR on right.
  interpLeftLabel = el("text", {
    x: interpX(0), y: LS_TM + LS_CH + 34,
    "text-anchor": "middle", fill: COLORS.spo_plus,
    "font-size": 22, "font-weight": 700,
    "font-family": "Inter, system-ui, sans-serif",
  }, "SPO+");
  interpG.appendChild(interpLeftLabel);
  interpG.appendChild(el("text", {
    x: interpX(1), y: LS_TM + LS_CH + 34,
    "text-anchor": "middle", fill: COLORS.dpo,
    "font-size": 22, "font-weight": 700,
    "font-family": "Inter, system-ui, sans-serif",
  }, "BPR"));

  // X-axis ticks as α values
  xTicks.forEach(t => {
    interpG.appendChild(el("line", {
      x1: interpX(t), y1: LS_TM + LS_CH,
      x2: interpX(t), y2: LS_TM + LS_CH + 6,
      stroke: COLORS.axis, "stroke-width": 1,
    }));
  });

  yTicks.forEach(v => {
    interpG.appendChild(el("line", {
      x1: LS_PANEL_X + LS_LM - 6, y1: interpY(v),
      x2: LS_PANEL_X + LS_LM, y2: interpY(v),
      stroke: COLORS.axis, "stroke-width": 1,
    }));
    interpG.appendChild(el("text", {
      x: LS_PANEL_X + LS_LM - 12, y: interpY(v) + 6,
      "text-anchor": "end", fill: COLORS.tickLabel,
      "font-size": 20, "font-family": "Inter, system-ui, sans-serif",
    }, v.toFixed(2)));
  });

  // X-axis label: θ(α) = (1−α)·θ_SPO+ + α·θ_BPR
  interpG.appendChild(el("text", {
    x: LS_PANEL_X + LS_LM + LS_CW / 2, y: LS_TM + LS_CH + 78,
    "text-anchor": "middle", fill: COLORS.tickLabel,
    "font-size": 20, "font-family": "Inter, system-ui, sans-serif",
  }, "Interpolation coefficient α"));

  // Y label (swaps between Regret and Loss)
  interpYLabel = el("text", {
    transform: `translate(${LS_PANEL_X + 28}, ${LS_TM + LS_CH / 2}) rotate(-90)`,
    "text-anchor": "middle", fill: COLORS.tickLabel,
    "font-size": 22, "font-family": "Inter, system-ui, sans-serif",
  });
  interpYLabel.textContent = "Normalized Regret";
  interpG.appendChild(interpYLabel);

  // Panel title
  interpTitle = el("text", {
    x: LS_PANEL_X + LS_PANEL_W / 2, y: 58,
    "text-anchor": "middle", fill: COLORS.title,
    "font-size": 30, "font-weight": 600,
    "font-family": "Inter, system-ui, sans-serif",
  }, "SPO+ ↔ BPR Interpolation");
  interpTitle.style.opacity = "0";
  interpTitle.style.transition = "opacity 0.5s ease";
  interpG.appendChild(interpTitle);

  // Regret path — revealed progressively during the forward drag
  interpRegretPath = el("path", {
    d: "",
    fill: "none",
    stroke: COLORS.regret,
    "stroke-width": 3.5,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  });
  interpG.appendChild(interpRegretPath);

  // Loss path — revealed progressively during the slide-back (in SPO+ gold)
  interpLossPath = el("path", {
    d: "",
    fill: "none",
    stroke: COLORS.spo_plus,
    "stroke-width": 3.5,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  });
  interpG.appendChild(interpLossPath);

  landscapeGroup.appendChild(interpG);
}

// ── Retro classic-Mac hand cursor (open + closed states) ──────────────────────

function buildCursor(svg) {
  cursorG = el("g", { id: "cursorG" });
  cursorG.style.opacity = "0";
  cursorG.style.transition = "opacity 0.3s ease";

  // Pixel-art style: white fill, black outline. Built as two shape groups and
  // we toggle which is visible.  Hotspot is roughly at the top-center of the
  // index finger (x=24, y=4) so we translate so that corner lies on the target.
  cursorOpen = el("g", { id: "cursorOpen" });
  const openStyle  = { fill: "#ffffff", stroke: "#11111e", "stroke-width": 2.5, "stroke-linejoin": "miter" };
  // Thumb
  cursorOpen.appendChild(el("rect", { x: 2,  y: 22, width: 10, height: 10, rx: 2, ry: 2, ...openStyle }));
  // Pinky + ring + middle + index
  cursorOpen.appendChild(el("rect", { x: 10, y: 10, width: 6,  height: 22, rx: 2, ry: 2, ...openStyle }));
  cursorOpen.appendChild(el("rect", { x: 16, y: 4,  width: 6,  height: 28, rx: 2, ry: 2, ...openStyle }));
  cursorOpen.appendChild(el("rect", { x: 22, y: 8,  width: 6,  height: 24, rx: 2, ry: 2, ...openStyle }));
  cursorOpen.appendChild(el("rect", { x: 28, y: 14, width: 6,  height: 18, rx: 2, ry: 2, ...openStyle }));
  // Palm
  cursorOpen.appendChild(el("rect", { x: 4,  y: 30, width: 32, height: 18, rx: 5, ry: 5, ...openStyle }));

  cursorClosed = el("g", { id: "cursorClosed" });
  cursorClosed.style.display = "none";
  // Curled fingers (shorter stubs) + palm
  cursorClosed.appendChild(el("rect", { x: 2,  y: 24, width: 10, height: 10, rx: 2, ry: 2, ...openStyle }));
  cursorClosed.appendChild(el("rect", { x: 10, y: 20, width: 6,  height: 12, rx: 2, ry: 2, ...openStyle }));
  cursorClosed.appendChild(el("rect", { x: 16, y: 18, width: 6,  height: 14, rx: 2, ry: 2, ...openStyle }));
  cursorClosed.appendChild(el("rect", { x: 22, y: 20, width: 6,  height: 12, rx: 2, ry: 2, ...openStyle }));
  cursorClosed.appendChild(el("rect", { x: 28, y: 22, width: 6,  height: 10, rx: 2, ry: 2, ...openStyle }));
  cursorClosed.appendChild(el("rect", { x: 4,  y: 30, width: 32, height: 18, rx: 5, ry: 5, ...openStyle }));

  cursorG.appendChild(cursorOpen);
  cursorG.appendChild(cursorClosed);

  // Start off-screen.  Hotspot is set to (x=18, y=30) — center of palm top edge.
  cursorG.setAttribute("transform", "translate(-200, -200) scale(1.1)");
  svg.appendChild(cursorG);
}

const CURSOR_HOT_X = 18;
const CURSOR_HOT_Y = 30;
const CURSOR_SCALE = 1.1;
function setCursorPos(x, y) {
  cursorG.setAttribute(
    "transform",
    `translate(${(x - CURSOR_HOT_X * CURSOR_SCALE).toFixed(2)}, ${(y - CURSOR_HOT_Y * CURSOR_SCALE).toFixed(2)}) scale(${CURSOR_SCALE})`,
  );
}
function setCursorGrab(closed) {
  cursorOpen.style.display   = closed ? "none" : "";
  cursorClosed.style.display = closed ? ""     : "none";
}

// ── Phase-5 orchestration ─────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function easeInOut(t) { return 0.5 - 0.5 * Math.cos(Math.PI * t); }

// Animate a numeric scalar with a per-frame callback.
function animateValue(duration, onStep, ease = easeInOut) {
  return new Promise(resolve => {
    const t0 = performance.now();
    function step(now) {
      const raw = Math.min(1, (now - t0) / duration);
      const eased = ease(raw);
      onStep(eased, raw);
      if (raw < 1) requestAnimationFrame(step);
      else resolve();
    }
    requestAnimationFrame(step);
  });
}

// Piecewise-linear interp helper over [a, v] pairs sorted by a.
function lerpTable(data, a) {
  if (a <= data[0][0]) return data[0][1];
  if (a >= data[data.length - 1][0]) return data[data.length - 1][1];
  for (let i = 1; i < data.length; i++) {
    if (a <= data[i][0]) {
      const [a0, v0] = data[i - 1];
      const [a1, v1] = data[i];
      const f = (a - a0) / (a1 - a0);
      return v0 + (v1 - v0) * f;
    }
  }
  return data[data.length - 1][1];
}

// Phase 5a: fade out landscape, fade in interp axes.
async function runPhase5a() {
  const axesG = document.getElementById("axesG");
  axesG.style.opacity = "0";
  landscapeTitle.style.opacity = "0";
  await sleep(520);

  interpG.style.opacity = "1";
  interpTitle.style.opacity = "1";
  await sleep(520);
}

// Generic "cursor sweep → grab → drag home→target with regret reveal" runner.
async function runForwardDrag(dragG, home, regretData, lossColor) {
  // Raise this drag group to the top of its parent.
  dragG.parentNode.appendChild(dragG);
  // Set the loss curve color now so the later slide-back reveals in the right color.
  interpLossPath.setAttribute("stroke", lossColor);

  const startX = 560, startY = 320;
  setCursorPos(startX, startY);
  setCursorGrab(false);
  cursorG.style.opacity = "1";
  await sleep(300);

  await animateValue(900, t => {
    const x = startX + (home.x - startX) * t;
    const y = startY + (home.y - startY) * t;
    setCursorPos(x, y);
  });

  await sleep(140);
  setCursorGrab(true);
  await sleep(240);

  const rStart = regretData[0][1];
  const rEnd   = regretData[regretData.length - 1][1];
  const rSpan  = rStart - rEnd || 1;

  await animateValue(2600, (_eased, rawT) => {
    const a = rawT;
    const r = lerpTable(regretData, a);
    // The interp plot's x-axis is progress ∝ (1 − regret), so the drag's x
    // tracks that (racing across as regret drops), while y advances linearly.
    const xFrac = 1 - (r - rEnd) / rSpan;
    const dragX = home.x + (bprHome.x - home.x) * xFrac;
    const dragY = home.y + (bprHome.y - home.y) * a;
    dragG.setAttribute("transform", `translate(${(dragX - home.x).toFixed(2)}, ${(dragY - home.y).toFixed(2)})`);
    setCursorPos(dragX, dragY);
    interpRegretPath.setAttribute("d", interpPartialD(regretData, 0, a));
  }, t => t);
}

// Generic "slide back home with loss curve reveal" runner.
async function runSlideBack(dragG, home, lossData) {
  interpYLabel.textContent = "Normalized Loss";

  await animateValue(2600, (_eased, rawT) => {
    const a = 1 - rawT;
    const dragX = bprHome.x + (home.x - bprHome.x) * rawT;
    const dragY = bprHome.y + (home.y - bprHome.y) * rawT;
    dragG.setAttribute("transform", `translate(${(dragX - home.x).toFixed(2)}, ${(dragY - home.y).toFixed(2)})`);
    setCursorPos(dragX, dragY);
    interpLossPath.setAttribute("d", interpPartialD(lossData, a, 1));
  }, t => t);

  await sleep(260);
  setCursorGrab(false);
  await sleep(420);
  cursorG.style.opacity = "0";
}

// Phase 5b: SPO+ forward drag.
function runPhase5b() {
  return runForwardDrag(spoDragG, spoHome, COOK_SPO_REGRET_FLIPPED, COLORS.spo_plus);
}
// Phase 5c: SPO+ slide back with SPO+-gold loss curve.
function runPhase5c() {
  return runSlideBack(spoDragG, spoHome, COOK_SPO_LOSS_FLIPPED);
}

// Phase 8: refresh interp axes (clear curves, relabel SPO+ → PG, reset y-label).
async function runPhase8() {
  // Fade both curves + the left label out, swap their identity, fade back in.
  const fadeTargets = [interpRegretPath, interpLossPath, interpLeftLabel];
  fadeTargets.forEach(el => { el.style.transition = "opacity 0.35s ease"; el.style.opacity = "0"; });
  await sleep(380);

  interpRegretPath.setAttribute("d", "");
  interpLossPath.setAttribute("d", "");
  interpYLabel.textContent = "Normalized Regret";
  interpLeftLabel.textContent = "PG";
  interpLeftLabel.setAttribute("fill", COLORS.pg);
  interpTitle.textContent = "PG ↔ BPR Interpolation";

  fadeTargets.forEach(el => { el.style.opacity = "1"; });
  await sleep(380);
}

// Phase 9: PG forward drag.
function runPhase9() {
  return runForwardDrag(pgDragG, pgHome, COOK_PG_REGRET_FLIPPED, COLORS.pg);
}
// Phase 10: PG slide back with PG-yellow loss curve.
function runPhase10() {
  return runSlideBack(pgDragG, pgHome, COOK_PG_LOSS_FLIPPED);
}

// ── Phase controller ──────────────────────────────────────────────────────────

const PHASES = 11;
let currentPhase = -1;
let busy = false;

function applyPhase(n) {
  switch (n) {
    case 0:
      showAxes();
      setTimeout(() => {
        showRegret();
        showLegendRow(regretLegendRow);
      }, 350);
      setTimeout(() => { busy = false; }, 1000);
      break;

    case 1:
      dpoPath.style.opacity = "0.95";
      showLegendRow(dpoLegendRow);
      setTimeout(() => { busy = false; }, 600);
      break;

    case 2:
      spoPath.style.opacity = "0.95";
      showLegendRow(spoLegendRow);
      setTimeout(() => { busy = false; }, 600);
      break;

    case 3:
      // "Local Minima" title + SPO+ deforms to UUU (global min stays at θ = 0)
      titleTextA.style.opacity = "1";
      animateCurve(spoPath, spoCurrentFn, spoUUU, 1100, () => {
        spoCurrentFn = spoUUU;
        busy = false;
      });
      break;

    case 4:
      // Swap title: fade A out, B in
      titleTextA.style.opacity = "0";
      titleTextB.style.opacity = "1";
      // DPO shifts right
      animateCurve(dpoPath, dpoCurrentFn, dpoShifted, 1100, () => {
        dpoCurrentFn = dpoShifted;
      });
      // SPO+ simultaneously un-Ws and shifts farther + higher
      animateCurve(spoPath, spoCurrentFn, spoShifted, 1100, () => {
        spoCurrentFn = spoShifted;
        busy = false;
      });
      break;

    case 5:
      // Fade landscape → fade in interp axes; then wait for a click.
      runPhase5a().then(() => { busy = false; });
      break;

    case 6:
      // Cursor sweep + grab + drag to BPR with hockeystick reveal; then wait for a click.
      runPhase5b().then(() => { busy = false; });
      break;

    case 7:
      // Slide back with loss curve reveal in SPO+ gold.
      runPhase5c().then(() => { busy = false; });
      break;

    case 8:
      // Refresh axes: clear curves, relabel SPO+ → PG, reset y-label.
      runPhase8().then(() => { busy = false; });
      break;

    case 9:
      // PG forward drag + regret curve reveal.
      runPhase9().then(() => { busy = false; });
      break;

    case 10:
      // PG slide back + loss curve reveal in PG yellow.
      runPhase10().then(() => { busy = false; });
      break;
  }
}

function advancePhase() {
  if (busy) return;
  if (currentPhase >= PHASES - 1) return;
  busy = true;
  currentPhase++;
  applyPhase(currentPhase);
  if (currentPhase >= PHASES - 1) removeListeners();
}

// ── Input ─────────────────────────────────────────────────────────────────────

function onClick() { advancePhase(); }
function onKeyDown(e) { if (e.key === "ArrowRight" || e.key === " ") advancePhase(); }
function removeListeners() {
  const svg = document.getElementById("viz");
  svg.removeEventListener("click", onClick);
  document.removeEventListener("keydown", onKeyDown);
  const hud = document.getElementById("hud");
  if (hud) hud.classList.add("hidden");
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  const svg = document.getElementById("viz");
  buildCookPanel(svg);
  buildLandscape(svg);
  buildInterp(svg);
  buildCursor(svg);

  svg.addEventListener("click", onClick);
  document.addEventListener("keydown", onKeyDown);

  try {
    const _R = window.parent.Reveal;
    const myFile = window.location.pathname.split("/").pop();
    const onThisSlide = () =>
      (_R.getCurrentSlide()?.dataset?.backgroundIframe ?? "").includes(myFile);

    _R.on("fragmentshown", () => { if (onThisSlide()) advancePhase(); });

    function onFragmentHidden() {
      if (!onThisSlide()) return;
      _R.off("fragmenthidden", onFragmentHidden);
      _R.getCurrentSlide().querySelectorAll(".fragment").forEach(f => {
        f.classList.remove("visible", "current-fragment");
      });
      _R.sync();
      window.location.reload();
    }
    _R.on("fragmenthidden", onFragmentHidden);

    _R.on("slidechanged", () => {
      if (onThisSlide() && currentPhase > -1) window.location.reload();
    });
  } catch (_) {}
}

init();
