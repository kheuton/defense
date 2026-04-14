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
 *   3  "Local Minima" title appears; SPO+ deforms into a W-shape
 *   4  Title → "Larger Bias"; DPO & SPO+ shift sideways, SPO+ returns convex
 *      and moves higher (visibly larger loss at its minimum).
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

  methods.forEach(method => {
    const d = COOK_DATA[`cook_${method}`];
    if (!d) return;
    const color = COLORS[method];
    const rawYBase = ys(-d.nll);
    const isClamped = rawYBase > BOTTOM_CLAMP_PX;
    const yBase = isClamped ? BOTTOM_CLAMP_PX : rawYBase;

    if (!isClamped) {
      const bprMin = Math.min(...d.bprs) - 0.004;
      const bprMax = Math.max(...d.bprs) + 0.004;
      const evalPts = linspace(bprMin, bprMax, 150);
      const density = gaussianKDE(d.bprs, evalPts);
      const scale = maxViolinHalf / Math.max(...density);
      const topPts = evalPts.map((b, i) => `${xs(b).toFixed(2)},${(yBase - density[i] * scale).toFixed(2)}`);
      const botPts = evalPts.map((b, i) => `${xs(b).toFixed(2)},${(yBase + density[i] * scale).toFixed(2)}`).reverse();
      violinG.appendChild(el("polygon", {
        points: [...topPts, ...botPts].join(" "),
        fill: color, "fill-opacity": 0.65,
      }));
    }

    g.appendChild(el("circle", {
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
  });

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

// Current loss-fn state (for interpolation start-points)
let dpoCurrentFn = dpoConvex;
let spoCurrentFn = spoConvex;

function buildLandscape(svg) {
  landscapeGroup = el("g", { id: "landscapePanel" });

  // Plot area background / title band
  landscapeGroup.appendChild(el("rect", {
    x: LS_PANEL_X, y: 0, width: LS_PANEL_W, height: H, fill: COLORS.bg,
  }));

  // Panel title (static)
  landscapeGroup.appendChild(el("text", {
    x: LS_PANEL_X + LS_PANEL_W / 2, y: 58,
    "text-anchor": "middle", fill: COLORS.title,
    "font-size": 30, "font-weight": 600,
    "font-family": "Inter, system-ui, sans-serif",
  }, "Surrogate Loss Landscape"));

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

// ── Phase controller ──────────────────────────────────────────────────────────

const PHASES = 5;
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
