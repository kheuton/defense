/**
 * Surrogate Loss Landscape Animation
 *
 * 6-phase click-through:
 *   Phase 1: Axes + Decision Regret (white, solid)
 *   Phase 2: DPO appears + equation + legend entry
 *   Phase 3: SPO+ appears, DPO dims + equation + legend entry
 *   Phase 4: PGB appears, SPO+ dims + equation + legend entry
 *   Phase 5: DBB appears, PGB dims + equation + legend entry
 *   Phase 6: LODL appears, DBB dims + equation + legend entry
 */

import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";

// ──────────────────────────────────────────────────────────────
// COORDINATE SYSTEM
//   theta ∈ [-1.2, 1.2]  →  world x ∈ [-5.5, 5.5]
//   loss  ∈ [0,   0.65]  →  world y ∈ [ 0,   6.0]
//   Camera symmetric at (0, 3, 20), F=4.0 → visible y ∈ [-1, 7]
// ──────────────────────────────────────────────────────────────

const THETA_MIN = -1.2, THETA_MAX = 1.2;
const LOSS_MAX  = 0.65;
const GX_MIN = -5.5, GX_MAX = 5.5, GY_MIN = 0, GY_MAX = 6;

function toX(theta) {
  return GX_MIN + (theta - THETA_MIN) / (THETA_MAX - THETA_MIN) * (GX_MAX - GX_MIN);
}
function toY(loss) {
  return GY_MIN + Math.min(Math.max(loss, 0), LOSS_MAX) / LOSS_MAX * (GY_MAX - GY_MIN);
}

// ──────────────────────────────────────────────────────────────
// METHOD DEFINITIONS
// ──────────────────────────────────────────────────────────────

const METHODS = [
  {
    dataKey:  "dpo",
    label:    "DPO",
    fullName: "Differentiable Perturbed Optimizers",
    color: 0xffd166, css: "#ffd166",
    katex: "\\mathcal{L}_\\text{DPO}(\\hat{c},c) = \\mathbb{E}_{\\varepsilon \\sim \\mathcal{N}(0,I)}\\!\\left[c^\\top \\hat{z}(\\hat{c} + \\sigma\\varepsilon)\\right] - V(c)",
  },
  {
    dataKey:  "spo_plus",
    label:    "SPO+",
    fullName: "Smart Predict-then-Optimize",
    color: 0xff7c57, css: "#ff7c57",
    katex: "\\mathcal{L}_\\text{SPO+}(\\hat{c},c) = {-}V(2\\hat{c} - c) + 2\\hat{c}^\\top z^* - V(c)",
  },
  {
    dataKey:  "pgb",
    label:    "PGB",
    fullName: "Perturbation Gradient Backward",
    color: 0x50c8a8, css: "#50c8a8",
    katex: "\\mathcal{L}_\\text{PGB}(\\hat{c},c) = \\dfrac{V(\\hat{c}) - V(\\hat{c} - hc)}{h} - V(c)",
  },
  {
    dataKey:  "dbb",
    label:    "DBB",
    fullName: "Decision-Focused Black-Box",
    color: 0x7c6af7, css: "#7c6af7",
    katex: "\\mathcal{L}_\\text{DBB}(\\hat{c},c) = \\dfrac{V(\\hat{c} + \\lambda c) - V(\\hat{c})}{\\lambda} - V(c)",
  },
  {
    dataKey:  "lodl",
    label:    "LODL",
    fullName: "Learning Oracle Loss via Differentiable Learning",
    color: 0xc77dff, css: "#c77dff",
    katex: "\\mathcal{L}_\\text{LODL}(\\hat{c},c) = f_\\phi(\\hat{c}, c),\\quad \\phi \\text{ trained to mimic regret}",
  },
];

// ──────────────────────────────────────────────────────────────
// RENDERER / SCENE / CAMERA
// ──────────────────────────────────────────────────────────────

const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x11111e);

const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, 1));

const F = 4.0;
let aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  -F * aspect, F * aspect, F, -F, 0.1, 500
);
camera.position.set(0, 3, 20);
camera.lookAt(0, 3, 0);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  aspect = window.innerWidth / window.innerHeight;
  camera.left   = -F * aspect;
  camera.right  =  F * aspect;
  camera.top    =  F;
  camera.bottom = -F;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────

function worldToScreen(wx, wy) {
  camera.updateMatrixWorld();
  const v = new THREE.Vector3(wx, wy, 0).project(camera);
  return {
    x: (v.x * 0.5 + 0.5) * canvas.clientWidth,
    y: (-v.y * 0.5 + 0.5) * canvas.clientHeight,
  };
}

function placeEl(id, wx, wy, dx = 0, dy = 0, anchor = "center") {
  const el = document.getElementById(id);
  if (!el) return;
  const s = worldToScreen(wx, wy);
  el.style.left = (s.x + dx) + "px";
  el.style.top  = (s.y + dy) + "px";
  el.style.transform = anchor === "right" ? "translateX(-100%)"
                      : anchor === "left"  ? "none"
                      : "translateX(-50%)";
}

function showEl(id) { document.getElementById(id)?.classList.add("visible"); }

function makeTube(pts3, radius, color, opacity = 1) {
  if (pts3.length < 2) return null;
  const curve = new THREE.CatmullRomCurve3(pts3, false, "catmullrom", 0.3);
  const geo   = new THREE.TubeGeometry(curve, pts3.length * 3, radius, 8, false);
  const mat   = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
  const mesh  = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  return { mesh, mat };
}

function tweenFade(mat, target, dur, done) {
  new TWEEN.Tween(mat).to({ opacity: target }, dur)
    .easing(target > 0 ? TWEEN.Easing.Quadratic.Out : TWEEN.Easing.Quadratic.In)
    .onComplete(done || (() => {}))
    .start();
}

function renderKatex(tex, displayMode = false) {
  if (typeof katex === "undefined") return tex;
  return katex.renderToString(tex, { throwOnError: false, displayMode });
}

// ──────────────────────────────────────────────────────────────
// AXIS BUILDER
// ──────────────────────────────────────────────────────────────

const AXIS_R = 0.008;

function makeAxisLine(p1, p2, color = 0x888899, opacity = 0) {
  const geo = new THREE.TubeGeometry(
    new THREE.LineCurve3(new THREE.Vector3(...p1), new THREE.Vector3(...p2)),
    2, AXIS_R, 8, false
  );
  const mat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);
  return { mesh, mat };
}

// ──────────────────────────────────────────────────────────────
// SCENE OBJECTS (pre-built, revealed in phases)
// ──────────────────────────────────────────────────────────────

// Axes
const xAxisObj = makeAxisLine([GX_MIN, GY_MIN, 0], [GX_MAX + 0.4, GY_MIN, 0]);
const yAxisObj = makeAxisLine([GX_MIN, GY_MIN, 0], [GX_MIN, GY_MAX + 0.4, 0]);

// X-axis ticks (at theta = -1, 0, +1)
const xTicks = [-1, 0, 1].map(t =>
  makeAxisLine([toX(t), GY_MIN, 0], [toX(t), GY_MIN - 0.22, 0])
);

// Y-axis ticks (at loss = 0, 0.2, 0.4, 0.6)
const yTickVals = [0, 0.2, 0.4, 0.6];
const yTicks = yTickVals.map(v =>
  makeAxisLine([GX_MIN, toY(v), 0], [GX_MIN - 0.22, toY(v), 0])
);

const axisObjects = [xAxisObj, yAxisObj, ...xTicks, ...yTicks];

// ──────────────────────────────────────────────────────────────
// DATA STATE
// ──────────────────────────────────────────────────────────────

let regretPieces = [];   // { mesh, mat }[]  — staircase segments
let methodCurves = {};   // dataKey → { mesh, mat }
let dataReady    = false;

// ──────────────────────────────────────────────────────────────
// CURVE BUILDERS
// ──────────────────────────────────────────────────────────────

const CURVE_STEP  = 4;    // subsample every 4th data point for smooth curves
const REGRET_R    = 0.016; // tube radius for regret staircase  (~3.6px)
const METHOD_R    = 0.012; // tube radius for method curves (dimmed)
const ACTIVE_R    = 0.036; // tube radius for active method curve (3× thicker)

// Regret: build as a true staircase (piecewise-constant step function).
// Separate horizontal tube per constant region + vertical connector at each jump.
// Avoids CatmullRom overshoot entirely.
function buildRegretStaircase(thetas, regrets) {
  const pieces = [];

  // Find indices where the regret level changes
  const bounds = [0];
  for (let i = 1; i < thetas.length; i++) {
    if (Math.abs(regrets[i] - regrets[i - 1]) > 1e-5) bounds.push(i);
  }
  bounds.push(thetas.length);   // sentinel

  for (let s = 0; s < bounds.length - 1; s++) {
    const i0 = bounds[s];
    const i1 = bounds[s + 1] - 1;
    const x0 = toX(thetas[i0]);
    const x1 = toX(thetas[i1]);
    const y  = toY(regrets[i0]);

    // Horizontal segment for this constant region
    const h = makeTube(
      [new THREE.Vector3(x0, y, 0.3), new THREE.Vector3(x1, y, 0.3)],
      REGRET_R, 0xffffff, 0
    );
    if (h) pieces.push(h);

    // Vertical connector to next level
    if (s < bounds.length - 2) {
      const nextY = toY(regrets[bounds[s + 1]]);
      const v = makeTube(
        [new THREE.Vector3(x1, y, 0.3), new THREE.Vector3(x1, nextY, 0.3)],
        REGRET_R * 0.75, 0xffffff, 0
      );
      if (v) pieces.push(v);
    }
  }

  return pieces;
}

// Method curves: build two meshes per method — thick (active) and thin (dimmed).
// Returns { thick: {mesh,mat}, thin: {mesh,mat} }, both starting at opacity 0.
function buildMethodCurves(thetas, vals, method) {
  const pts = [];
  for (let i = 0; i < thetas.length; i += CURVE_STEP) {
    pts.push(new THREE.Vector3(toX(thetas[i]), toY(vals[i]), 0.15));
  }
  const thick = makeTube(pts, ACTIVE_R, method.color, 0);
  const thin  = makeTube(pts, METHOD_R,  method.color, 0);
  return { thick, thin };
}

// ──────────────────────────────────────────────────────────────
// LABEL POSITIONING
// ──────────────────────────────────────────────────────────────

function positionStaticLabels() {
  placeEl("tick-neg1", toX(-1), GY_MIN, 0,  14, "center");
  placeEl("tick-0",    toX( 0), GY_MIN, 0,  14, "center");
  placeEl("tick-pos1", toX(+1), GY_MIN, 0,  14, "center");
  yTickVals.forEach((v, i) => {
    placeEl(`tick-y${i}`, GX_MIN, toY(v), -14, -10, "right");
  });
  placeEl("x-axis-label", GX_MAX + 0.5, GY_MIN,       0, -4, "left");
  placeEl("y-axis-label", GX_MIN,        GY_MAX + 0.5, 0, -16, "center");
}

// ──────────────────────────────────────────────────────────────
// EQUATION BOX
// ──────────────────────────────────────────────────────────────

function showEquation(method) {
  const nameEl = document.getElementById("eq-name");
  const mathEl = document.getElementById("eq-math");

  nameEl.innerHTML = method.label + " — " + method.fullName;
  nameEl.style.color = method.css;
  mathEl.innerHTML = renderKatex(method.katex, true);

  document.getElementById("eq-box").classList.add("visible");
}

function hideEquation() {
  document.getElementById("eq-box").classList.remove("visible");
}

// ──────────────────────────────────────────────────────────────
// LEGEND
// ──────────────────────────────────────────────────────────────

// Build legend DOM row and append to #legend. Returns the element.
function addLegendRow(color, label, id) {
  const row = document.createElement("div");
  row.className = "legend-row";
  row.id = id;
  row.style.opacity = "0";

  const swatch = document.createElement("span");
  swatch.className = "legend-swatch";
  swatch.style.background = color;

  const name = document.createElement("span");
  name.style.color = color;
  name.textContent = label;

  row.appendChild(swatch);
  row.appendChild(name);
  document.getElementById("legend").appendChild(row);
  return row;
}

// Animate a legend row to a given opacity
function setLegendOpacity(id, opacity) {
  const el = document.getElementById(id);
  if (el) el.style.opacity = String(opacity);
}

// Pre-build all legend rows (hidden) so they're ready immediately
const legendRegretRow = addLegendRow("#ffffff", "Decision Regret", "leg-regret");
const legendMethodRows = METHODS.map(m =>
  addLegendRow(m.css, m.label, "leg-" + m.dataKey)
);

// ──────────────────────────────────────────────────────────────
// PHASES
// ──────────────────────────────────────────────────────────────

let currentPhase = 0;
let transitioning = false;
let pendingAdvance = false;
const MAX_PHASE = 6;

const DIM_OPACITY  = 0.25;
const FULL_OPACITY = 0.92;

// Phase 1: axes + regret
function phase1() {
  transitioning = true;

  positionStaticLabels();

  // KaTeX-rendered θ for the x-axis label
  const xLabelEl = document.getElementById("x-axis-label");
  if (xLabelEl) xLabelEl.innerHTML = renderKatex("\\theta");

  document.getElementById("y-axis-label").textContent = "Loss";

  // Fade in axes
  axisObjects.forEach(o => tweenFade(o.mat, 1, 600));

  // Show tick labels
  setTimeout(() => {
    ["x-axis-label", "y-axis-label",
     "tick-neg1", "tick-0", "tick-pos1",
     "tick-y0", "tick-y1", "tick-y2", "tick-y3"].forEach(showEl);
  }, 350);

  // Fade in regret staircase
  setTimeout(() => {
    regretPieces.forEach(p => tweenFade(p.mat, 0.9, 800));
  }, 500);

  // Legend: show Decision Regret entry
  setTimeout(() => {
    setLegendOpacity("leg-regret", 0.7);
    transitioning = false;
  }, 900);
}

// Phases 2–6: each method appears
function phaseMethod(idx) {
  transitioning = true;

  const method = METHODS[idx];

  // Dim all previously shown method curves: hide thick, reveal thin at DIM_OPACITY
  for (let i = 0; i < idx; i++) {
    const pc = methodCurves[METHODS[i].dataKey];
    if (pc) {
      if (pc.thick) { tweenFade(pc.thick.mat, 0, 450); pc.thick.mesh.renderOrder = 0; }
      if (pc.thin)  { tweenFade(pc.thin.mat,  DIM_OPACITY, 450); pc.thin.mesh.renderOrder = 0; }
    }
    setLegendOpacity("leg-" + METHODS[i].dataKey, 0.35);
  }

  // Show new curve and equation after brief settling delay
  const delay = idx > 0 ? 280 : 0;

  setTimeout(() => {
    // Fade in thick (active) curve on top; thin stays hidden
    const cur = methodCurves[method.dataKey];
    if (cur) {
      if (cur.thick) { cur.thick.mesh.renderOrder = 1; tweenFade(cur.thick.mat, FULL_OPACITY, 550); }
      if (cur.thin)  { cur.thin.mesh.renderOrder  = 1; }
    }

    // Swap equation
    if (idx > 0) hideEquation();
    setTimeout(() => showEquation(method), idx > 0 ? 80 : 0);

    // Show legend entry for new method
    setLegendOpacity("leg-" + method.dataKey, 1.0);

    transitioning = false;
  }, delay);
}

// ──────────────────────────────────────────────────────────────
// PHASE CONTROLLER
// ──────────────────────────────────────────────────────────────

function advancePhase() {
  if (currentPhase >= MAX_PHASE) return;
  if (currentPhase === 0 && !dataReady) { pendingAdvance = true; return; }
  if (transitioning) {
    let guard = 20;
    while (TWEEN.getAll().length && guard-- > 0) {
      TWEEN.getAll().forEach(t => t.end());
    }
    if (transitioning) { pendingAdvance = true; return; }
  }
  pendingAdvance = false;
  currentPhase++;
  document.getElementById("hud").classList.add("hidden");

  if (currentPhase === 1) {
    phase1();
  } else {
    phaseMethod(currentPhase - 2);   // phase 2→idx 0, …, phase 6→idx 4
  }

  if (currentPhase >= MAX_PHASE) removeListeners();
}

function onClick()  { advancePhase(); }
function onKeyDown(e) {
  if (e.key === "ArrowRight" || e.key === " ") advancePhase();
}
function removeListeners() {
  canvas.removeEventListener("click", onClick);
  document.removeEventListener("keydown", onKeyDown);
}
canvas.addEventListener("click", onClick);
document.addEventListener("keydown", onKeyDown);

try {
  const Reveal = window.parent && window.parent.Reveal;
  if (Reveal) {
    const myFile = window.location.pathname.split('/').pop();
    const onThisSlide = () =>
      (Reveal.getCurrentSlide()?.dataset?.backgroundIframe ?? '').includes(myFile);

    Reveal.on("fragmentshown", () => {
      if (onThisSlide()) advancePhase();
    });

    function onFragmentHidden() {
      if (!onThisSlide()) return;
      Reveal.off('fragmenthidden', onFragmentHidden);
      Reveal.getCurrentSlide().querySelectorAll('.fragment').forEach(f => {
        f.classList.remove('visible', 'current-fragment');
      });
      Reveal.sync();
      window.location.reload();
    }
    Reveal.on('fragmenthidden', onFragmentHidden);

    Reveal.on('slidechanged', () => {
      if (onThisSlide() && currentPhase !== 0) window.location.reload();
    });
  }
} catch (_) {}

// ──────────────────────────────────────────────────────────────
// FETCH DATA AND BUILD SCENE
// ──────────────────────────────────────────────────────────────

async function init() {
  let data;
  try {
    const resp = await fetch("../../data/loss_landscape_data.json");
    data = await resp.json();
  } catch (err) {
    console.error("Could not load loss_landscape_data.json:", err);
    return;
  }

  const { theta, regret } = data;

  regretPieces = buildRegretStaircase(theta, regret);

  for (const m of METHODS) {
    methodCurves[m.dataKey] = buildMethodCurves(theta, data[m.dataKey], m);
  }

  dataReady = true;
}

init();

// ──────────────────────────────────────────────────────────────
// RENDER LOOP
// ──────────────────────────────────────────────────────────────

function animate(t) {
  requestAnimationFrame(animate);
  TWEEN.update(t);
  if (pendingAdvance && !transitioning && !(currentPhase === 0 && !dataReady)) {
    pendingAdvance = false;
    advancePhase();
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
