/**
 * config.js — All tunables for the opioid grid animation.
 * See TUNING.md for a guide to each section.
 */

import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";

// ── Colors ─────────────────────────────────────────────────────
export const COLORS = {
  bg:     0x11111e,
  teal:   new THREE.Color("#50c8a8"),
  purple: new THREE.Color("#7c6af7"),
  coral:  new THREE.Color("#ff7c57"),
  yellow: new THREE.Color("#ffd166"),
  grid:   new THREE.Color("#222233"),
  edge:   new THREE.Color("#444466"),
  muted:  new THREE.Color("#888899"),
};

/**
 * Map a normalized value t ∈ [0, 1] to a color.
 * t=0 uses COLORS.muted (theme-aware, visible on any background).
 * Returns a new THREE.Color each call (safe to mutate).
 */
export function valueColor(t) {
  if (t === 0) return COLORS.muted.clone();
  if (t < 0.15) return COLORS.teal.clone().lerp(COLORS.purple, t / 0.15);
  if (t < 0.5)  return COLORS.purple.clone().lerp(COLORS.coral, (t - 0.15) / 0.35);
  return COLORS.coral.clone().lerp(COLORS.yellow, (t - 0.5) / 0.5);
}

// ── Massachusetts outline ─────────────────────────────────────
// 67 points, centered at origin, ~10 units E-W
// Source: us-10m TopoJSON (vega-datasets), mainland polygon
// Coordinate mapping: lon → x, lat → -z (north = -z in Three.js)
export const MA_OUTLINE = [
  [  3.696,   2.122],
  [  3.465,   2.374],
  [  2.924,   2.476],
  [  3.064,   1.659],
  [  2.763,   1.690],
  [  2.803,   1.921],
  [  2.442,   2.102],
  [  2.202,   2.437],
  [  1.670,   2.600],
  [  1.640,   1.986],
  [  1.459,   1.927],
  [  1.369,   1.783],
  [  1.118,   1.545],
  [  0.938,   0.755],
  [  0.617,   0.633],
  [ -0.236,   0.667],
  [ -1.078,   0.588],
  [ -1.169,   0.584],
  [ -1.169,   0.582],
  [ -2.212,   0.570],
  [ -3.606,   0.552],
  [ -3.736,   0.548],
  [ -4.940,   0.509],
  [ -4.970,   0.509],
  [ -5.000,   0.391],
  [ -4.569,  -1.232],
  [ -4.318,  -2.122],
  [ -3.646,  -2.104],
  [ -3.385,  -2.098],
  [ -2.071,  -2.051],
  [ -1.580,  -2.031],
  [ -0.587,  -1.996],
  [ -0.507,  -1.994],
  [  1.189,  -1.939],
  [  1.289,  -2.080],
  [  1.289,  -2.086],
  [  1.319,  -2.110],
  [  1.820,  -2.352],
  [  1.911,  -2.547],
  [  2.513,  -2.600],
  [  2.673,  -1.742],
  [  3.044,  -1.923],
  [  3.134,  -1.698],
  [  2.854,  -1.488],
  [  2.342,  -1.342],
  [  2.452,  -1.226],
  [  2.051,  -0.936],
  [  1.871,  -0.789],
  [  1.800,  -0.779],
  [  1.830,  -0.700],
  [  1.820,  -0.698],
  [  1.891,  -0.371],
  [  2.202,  -0.239],
  [  2.492,  -0.302],
  [  2.613,  -0.210],
  [  3.014,   0.365],
  [  2.813,   0.670],
  [  3.295,   0.978],
  [  3.295,   1.417],
  [  3.616,   1.659],
  [  3.997,   1.732],
  [  4.739,   1.499],
  [  4.529,   0.564],
  [  4.850,   0.905],
  [  5.000,   1.643],
  [  4.769,   1.937],
  [  3.696,   2.122],
];

// ── Hex grid ──────────────────────────────────────────────────
export const HEX = {
  radius: 0.31,        // circumradius of each hexagon (world units)
  gap:    0.03,        // gap between adjacent hexes
  flat:   true,        // flat-top orientation
};

// ── Grid layout (shared tunables) ─────────────────────────────
export const GRID = {
  HEIGHT_SCALE: 8,     // tallest bar = this many world units
  GROUND_OPACITY: 0.25,
};

// ── Camera positions ──────────────────────────────────────────
// Spherical: r=distance, phi=elevation from vertical, theta=azimuth
// SSE camera: theta ≈ π/8 puts camera at south-south-east
export const CAMERA = {
  frustum: 7,
  topDown: { r: 80, phi: 0, theta: 0 },
  isometric: { r: 18, phi: Math.PI / 5, theta: Math.PI / 8 },
  barChart: { x: 0, y: 3, z: 16, lookAt: { x: 0, y: 3, z: 0 } },
};

// ── Bar chart layout ──────────────────────────────────────────
export const BAR_CHART = {
  barWidth: 0.40,      // width of each bar in the chart
  barGap:   0.06,      // gap between sorted bars
  arcHeight: 4,        // how high bars arc during fly transition
};

// ── Timing (ms) ───────────────────────────────────────────────
export const TIMING = {
  heatmap: {
    duration: 500,
    maxDelay: 400,
  },
  isometric: {
    cameraDuration: 1200,
    barDuration: 900,
    barMaxDelay: 300,
  },
  barChart: {
    arcDuration: 600,
    morphDuration: 350,      // pause at arc peak for morph
    morphFadeOut: 300,        // dying bars fade to invisible
    morphHeightAdjust: 300,   // surviving bars resize to new heights
    landDuration: 600,
    stagger: 15,
    cameraDuration: 1200,
    scaleDuration: 800,
    fadeGroundDuration: 500,
  },
};

// ── Easing ────────────────────────────────────────────────────
export const EASING = {
  heatmap:   TWEEN.Easing.Quadratic.Out,
  isometric: {
    camera: TWEEN.Easing.Quadratic.InOut,
    bar:    TWEEN.Easing.Back.Out,
  },
  barChart: {
    arcUp:       TWEEN.Easing.Quadratic.Out,
    arcDown:     TWEEN.Easing.Quadratic.In,
    camera:      TWEEN.Easing.Quadratic.InOut,
    scale:       TWEEN.Easing.Quadratic.InOut,
    morphFade:   TWEEN.Easing.Quadratic.In,
    morphHeight: TWEEN.Easing.Quadratic.InOut,
  },
};

// ── Lighting ──────────────────────────────────────────────────
export const LIGHTING = {
  ambient:   { color: 0xffffff, intensity: 0.7 },
  direction: { color: 0xffffff, intensity: 0.8, position: [-30, 50, -20] },
};

// ── Geographic data (procedural from hotspots) ────────────────
// Instead of a flat array, define hotspot centers with peak values.
// opioid-grid.js computes each hex cell's value as a sum of Gaussian
// contributions from nearby hotspots. This scales to any hex density.
//
// Coordinates are in the same world-unit system as MA_OUTLINE.
export const HOTSPOTS = [
  { x:  2.5,  z: -0.3, peak:  20, sigma: 0.55, label: "Boston" },
  { x:  0.0,  z:  0.0, peak:  16, sigma: 0.50, label: "Worcester" },
  { x: -1.8,  z:  0.3, peak:  13, sigma: 0.45, label: "Springfield" },
  { x:  1.8,  z: -1.1, peak:  18, sigma: 0.40, label: "Lowell" },
  { x:  1.5,  z:  2.0, peak:  14, sigma: 0.40, label: "New Bedford" },
  { x:  1.2,  z:  1.5, peak:   9, sigma: 0.35, label: "Fall River" },
  { x:  1.8,  z: -1.4, peak:   8, sigma: 0.30, label: "Lawrence" },
  { x:  1.8,  z:  0.6, peak:   7, sigma: 0.35, label: "Brockton" },
  { x:  2.3,  z: -0.7, peak:   5, sigma: 0.30, label: "Lynn" },
  { x: -1.5,  z:  0.1, peak:   4, sigma: 0.30, label: "Holyoke" },
  { x: -4.2,  z: -0.5, peak:   3, sigma: 0.35, label: "Pittsfield" },
  { x:  3.2,  z:  1.8, peak:   3, sigma: 0.30, label: "Barnstable" },
  // Second western MA hotspot — smaller, broader
  { x: -3.2,  z: -0.8, peak:   6, sigma: 0.50, label: "Greenfield/W. MA" },
];

// ── Bar chart data (independent dataset) ──────────────────────
// This is the dataset the bars morph INTO during the arc transition.
// Completely independent of the geographic hotspots.
//
// Shape: sigmoid (sorted descending). The flat top means a model
// that is slightly off on the highest-value locations makes large
// ranking errors in the top-K — exactly the decision-aware point.
//
//   Bars 1-8:   flat top (bunched, hard to rank correctly)
//   Bars 9-22:  linear ramp (clear separation)
//   Bars 23-30: exact zeros (no signal)
//
// To fall back to "same data, fewer bars": replace these entries with
// the top N geographic values (the morph logic is agnostic).
export const BAR_CHART_DATA = [
  // ── Flat top: values bunched together (hard to rank) ──
  { label: "Suffolk",      value: 20 },
  { label: "Essex",        value: 20 },
  { label: "Middlesex",    value: 19 },
  { label: "Worcester",    value: 19 },
  { label: "Bristol",      value: 19 },
  { label: "Hampden",      value: 18 },
  { label: "Plymouth",     value: 18 },
  { label: "Norfolk",      value: 18 },
  // ── Ramp: accelerating decrease ──
  { label: "Barnstable",   value: 16 },
  { label: "Berkshire",    value: 14 },
  { label: "Hampshire",    value: 12 },
  { label: "Franklin",     value: 10 },
  { label: "Dukes",        value: 8 },
  { label: "Nantucket",    value: 6 },
  { label: "Region A",     value: 5 },
  { label: "Region B",     value: 4 },
  { label: "Region C",     value: 3 },
  { label: "Region D",     value: 2 },
  { label: "Region E",     value: 2 },
  { label: "Region F",     value: 1 },
  { label: "Region G",     value: 1 },
  { label: "Region H",     value: 1 },
  // ── Zeros: no signal ──
  { label: "Region I",     value: 0 },
  { label: "Region J",     value: 0 },
  { label: "Region K",     value: 0 },
  { label: "Region L",     value: 0 },
  { label: "Region M",     value: 0 },
  { label: "Region N",     value: 0 },
  { label: "Region O",     value: 0 },
  { label: "Region P",     value: 0 },
];

// ── Comparison layout ─────────────────────────────────────────
export const COMPARISON = {
  gap: 2.5,            // horizontal gap between the two charts (world units)
  k: 5,               // top-K for ranking evaluation
  frustumScale: 1.6,  // frustum multiplier when showing side-by-side charts
};

// ── Prediction models ─────────────────────────────────────────
// Left model: "standard" — low MSE, poor top-K ranking.
// Predictions = actual + Gaussian noise. Top-K predictions are shuffled
// so the model's top-K picks differ from the true top-K.
export const PRED_LEFT = {
  label: "Standard Model (minimize MSE)",
  noiseSigma: 1.0,       // noise std for non-top bars
  topNoiseSigma: 2.5,    // noise std for top-K bars
  seed: 42,              // deterministic PRNG seed
};

// Right model: "decision-aware" — high MSE, perfect top-K ranking.
// Parabola: f(i) = a * (i - c)^2 + d, where i is bar index (ascending).
// Tuned so: positive at i=0 (zeros), dips near i≈9, rises above bars at right.
export const PRED_RIGHT = {
  label: "Decision-Aware Model",
  a: 0.032,    // curvature — controls how fast it rises
  c: 9,        // vertex x-position (bar index of minimum)
  d: -0.3,     // vertex y-offset (slightly below zero, clamped)
};

// ── Comparison timing (ms) ────────────────────────────────────
export const TIMING_COMPARISON = {
  splitDuration: 800,
  lineDrawDuration: 600,
  fillPerBar: 60,            // delay between successive bar fills
  fillFadeDuration: 200,
  blinkDuration: 200,
  blinkCount: 2,
  textFadeDuration: 400,
  errorFadeOut: 400,
  barFadeDuration: 500,
  evalLineDelay: 800,        // delay between numerator/denominator
  evalChartDelay: 1200,      // delay between left and right chart eval
};

// ── Comparison easing ─────────────────────────────────────────
export const EASING_COMPARISON = {
  split: TWEEN.Easing.Quadratic.InOut,
  lineDraw: TWEEN.Easing.Linear.None,
  fill: TWEEN.Easing.Quadratic.Out,
};
