/**
 * MSE vs BPR Gradient Animation
 *
 * 10-phase click-through showing:
 *   Phases 1-5: MSE has informative gradients (line descends)
 *   Phases 6-10: BPR does NOT (line stays flat)
 *
 * All tunables in config.js MSE_GRADIENT section.
 */

import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import {
  COLORS, valueColor, BAR_CHART_DATA, BAR_CHART,
  PRED_LEFT, PRED_LINE, ERROR_FILL, COMPARISON,
  LIGHTING, MSE_GRADIENT,
} from "./config.js";
import { computeLeftPredictions } from "./prediction-utils.js";

const CFG = MSE_GRADIENT;
const G = CFG.graph;

// ══════════════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════════════

const sortedValues = [...BAR_CHART_DATA].sort((a, b) => a.value - b.value).map(d => d.value);
const n = sortedValues.length;
const k = COMPARISON.k;
const maxVal = Math.max(...sortedValues);

const predictions = computeLeftPredictions(sortedValues, k, PRED_LEFT);

// Interpolated predictions (NO monotonicity clamping — preserves top-K)
const interpPreds = predictions.map((p, i) => p + (sortedValues[i] - p) * CFG.lerpT);

// MSE values
const mse1 = sortedValues.reduce((s, v, i) => s + (v - predictions[i]) ** 2, 0) / n;
const mse2 = sortedValues.reduce((s, v, i) => s + (v - interpPreds[i]) ** 2, 0) / n;

// Model's top-K (by predictions)
const modelTopK = new Set(
  predictions.map((p, i) => ({ pred: p, idx: i }))
    .sort((a, b) => b.pred - a.pred).slice(0, k).map(d => d.idx)
);
const trueTopKSum = sortedValues.slice(n - k).reduce((a, b) => a + b, 0);
const modelTopKSum = [...modelTopK].reduce((s, i) => s + sortedValues[i], 0);
const bprPct = (modelTopKSum / trueTopKSum * 100);

// ══════════════════════════════════════════════════════════════
// RENDERER / SCENE / CAMERA
// ══════════════════════════════════════════════════════════════

const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(COLORS.bg);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();

let aspect = window.innerWidth / window.innerHeight;
const F = CFG.frustum;
const camera = new THREE.OrthographicCamera(-F * aspect, F * aspect, F, -F, 0.1, 500);
camera.position.set(0, 4, 16);
camera.lookAt(0, 4, 0);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  aspect = window.innerWidth / window.innerHeight;
  camera.left = -F * aspect;
  camera.right = F * aspect;
  camera.top = F;
  camera.bottom = -F;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// ── Lights
scene.add(new THREE.AmbientLight(LIGHTING.ambient.color, LIGHTING.ambient.intensity));
const dirLight = new THREE.DirectionalLight(LIGHTING.direction.color, LIGHTING.direction.intensity);
dirLight.position.set(...LIGHTING.direction.position);
scene.add(dirLight);

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════

function worldToScreen(worldPos) {
  camera.updateMatrixWorld();
  const v = worldPos.clone().project(camera);
  return {
    x: (v.x * 0.5 + 0.5) * canvas.clientWidth,
    y: (-v.y * 0.5 + 0.5) * canvas.clientHeight,
  };
}

function positionOverlay(el, worldPos, offsetY = 0) {
  const screen = worldToScreen(worldPos);
  el.style.left = screen.x + "px";
  el.style.top = (screen.y + offsetY) + "px";
  el.style.transform = "translateX(-50%)";
}

function showOverlay(id, html, worldPos, offsetY = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = html;
  positionOverlay(el, worldPos, offsetY);
  el.classList.add("visible");
}

function hideOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("visible");
}

function onAllComplete(total, cb) {
  let count = 0;
  return () => { if (++count >= total) cb(); };
}

// ══════════════════════════════════════════════════════════════
// BAR CHART (left side)
// ══════════════════════════════════════════════════════════════

const chartGroup = new THREE.Group();
chartGroup.position.x = CFG.chartOffsetX;
scene.add(chartGroup);

const bw = CFG.barWidth;
const bg = CFG.barGap;
const totalBarW = n * bw + (n - 1) * bg;
const barStartX = -totalBarW / 2 + bw / 2;
const hScale = CFG.heightScale / maxVal;

// Create bars (initially scale.y=0)
const bars = [];
const barPositions = [];
for (let i = 0; i < n; i++) {
  const v = sortedValues[i];
  const h = Math.max(v * hScale, 0.01);
  const geo = new THREE.BoxGeometry(bw, h, bw);
  const color = v === 0 ? COLORS.muted.clone() : valueColor(v / maxVal);
  const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 1 });
  const mesh = new THREE.Mesh(geo, mat);
  const x = barStartX + i * (bw + bg);
  mesh.position.set(x, h / 2, 0);
  mesh.scale.y = 0;
  chartGroup.add(mesh);
  bars.push({ mesh, mat, height: h, value: v });
  barPositions.push(x);
}

// ── Prediction line + markers + fill helpers ─────────────────

let predLine = null;     // { mesh, mat }
let predMarkers = [];    // [{ mesh, mat }]
let fillQuads = [];      // [{ mesh, mat } | null]

// Current animated prediction values (mutated during interpolation tweens)
let animPreds = [...predictions];

function buildPredictionLine(preds) {
  const points = preds.map((p, i) =>
    new THREE.Vector3(barPositions[i], p * hScale, 0.5)
  );
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
  const tubeGeo = new THREE.TubeGeometry(curve, points.length * 8, PRED_LINE.tubeRadius, 8, false);
  return { points, tubeGeo };
}

function createPredictionLine(preds, opacity) {
  // Remove old
  if (predLine) { chartGroup.remove(predLine.mesh); predLine.mesh.geometry.dispose(); }
  predMarkers.forEach(m => chartGroup.remove(m.mesh));

  const { points, tubeGeo } = buildPredictionLine(preds);
  const mat = new THREE.MeshBasicMaterial({ color: COLORS.purple, transparent: true, opacity });
  const mesh = new THREE.Mesh(tubeGeo, mat);
  chartGroup.add(mesh);
  predLine = { mesh, mat };

  const markerGeo = new THREE.SphereGeometry(PRED_LINE.markerRadius, PRED_LINE.markerSegments, PRED_LINE.markerSegments);
  predMarkers = points.map(pt => {
    const mMat = new THREE.MeshBasicMaterial({ color: COLORS.purple, transparent: true, opacity });
    const m = new THREE.Mesh(markerGeo, mMat);
    m.position.copy(pt);
    chartGroup.add(m);
    return { mesh: m, mat: mMat };
  });
}

function createFillQuads(preds, opacity) {
  // Remove old
  fillQuads.forEach(f => { if (f) { chartGroup.remove(f.mesh); f.mesh.geometry.dispose(); } });

  fillQuads = preds.map((pred, i) => {
    const actual = sortedValues[i];
    const predY = pred * hScale;
    const actualY = actual * hScale;
    const height = Math.abs(predY - actualY);
    if (height < 0.01) return null;
    const geo = new THREE.PlaneGeometry(bw * 0.9, height);
    const mat = new THREE.MeshBasicMaterial({
      color: ERROR_FILL.color, transparent: true, opacity,
      side: THREE.DoubleSide, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(barPositions[i], (predY + actualY) / 2, 0.5);
    chartGroup.add(mesh);
    return { mesh, mat };
  });
}

function rebuildVisuals(preds) {
  // Rebuild line
  if (predLine) {
    const { points, tubeGeo } = buildPredictionLine(preds);
    const oldGeo = predLine.mesh.geometry;
    predLine.mesh.geometry = tubeGeo;
    oldGeo.dispose();
    // Update markers
    points.forEach((pt, i) => {
      if (predMarkers[i]) predMarkers[i].mesh.position.copy(pt);
    });
  }
  // Rebuild fills
  preds.forEach((pred, i) => {
    if (!fillQuads[i]) return;
    const actual = sortedValues[i];
    const predY = pred * hScale;
    const actualY = actual * hScale;
    const height = Math.abs(predY - actualY);
    if (height < 0.01) {
      fillQuads[i].mesh.visible = false;
      return;
    }
    fillQuads[i].mesh.visible = true;
    const oldGeo = fillQuads[i].mesh.geometry;
    fillQuads[i].mesh.geometry = new THREE.PlaneGeometry(bw * 0.9, height);
    oldGeo.dispose();
    fillQuads[i].mesh.position.y = (predY + actualY) / 2;
  });
}

// ══════════════════════════════════════════════════════════════
// GRAPH (right side)
// ══════════════════════════════════════════════════════════════

const graphGroup = new THREE.Group();
graphGroup.position.set(CFG.graphOffsetX, 0, 0);
scene.add(graphGroup);

// Axis meshes (created once, reused for both MSE and BPR)
const axisMat = new THREE.MeshBasicMaterial({ color: COLORS.muted, transparent: true, opacity: 0 });

// Y-axis
const yAxisGeo = new THREE.TubeGeometry(
  new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, G.height, 0)),
  2, G.axisRadius, 8, false
);
const yAxis = new THREE.Mesh(yAxisGeo, axisMat);
graphGroup.add(yAxis);

// X-axis
const xAxisGeo = new THREE.TubeGeometry(
  new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(G.width, 0, 0)),
  2, G.axisRadius, 8, false
);
const xAxis = new THREE.Mesh(xAxisGeo, axisMat.clone());
graphGroup.add(xAxis);

// ── Graph points / lines (created on demand) ──

let graphPoint1 = null;   // solid sphere at theta1
let graphPoint2 = null;   // solid sphere at theta2 (after crossfade)
let hollowMarker = null;  // torus at theta2 (before crossfade)
let dottedDots = [];       // small spheres forming dotted line
let connectLine = null;    // solid line between points

// Coordinate mappers (set per section)
let mapY = null;   // value → world-y in graph group

function mseMapY(mse) {
  const mseMax = mse1 * G.mseHeadroom;
  return (mse / mseMax) * G.height;
}

function bprMapY(pct) {
  // pct is 0-100, map [bprMin*100, bprMax*100] → [0, G.height]
  const lo = G.bprMin * 100, hi = G.bprMax * 100;
  return ((pct - lo) / (hi - lo)) * G.height;
}

function graphWorldPos(localX, localY) {
  return new THREE.Vector3(CFG.graphOffsetX + localX, localY, 0);
}

function clearGraphObjects() {
  [graphPoint1, graphPoint2, hollowMarker, connectLine].forEach(obj => {
    if (obj) { graphGroup.remove(obj.mesh || obj); }
  });
  dottedDots.forEach(d => graphGroup.remove(d.mesh));
  graphPoint1 = graphPoint2 = hollowMarker = connectLine = null;
  dottedDots = [];
  hideOverlay("theta1-tick");
  hideOverlay("theta2-tick");
  hideOverlay("point1-value");
  hideOverlay("point2-value");
}

function createSolidPoint(x, y, color, scale0) {
  const geo = new THREE.SphereGeometry(G.pointRadius, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, 0.5);
  mesh.scale.setScalar(scale0);
  graphGroup.add(mesh);
  return { mesh, mat };
}

function createHollowMarker(x, y) {
  const geo = new THREE.TorusGeometry(G.hollowRadius, G.hollowTube, 16, 32);
  const mat = new THREE.MeshBasicMaterial({ color: COLORS.muted, transparent: true, opacity: 1 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, 0.5);
  mesh.scale.setScalar(0);
  graphGroup.add(mesh);
  return { mesh, mat };
}

function createDottedLine(x1, y1, x2, y2) {
  const dots = [];
  const segs = G.dottedSegments;
  const geo = new THREE.SphereGeometry(G.dotRadius, 8, 8);
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const mat = new THREE.MeshBasicMaterial({ color: COLORS.muted, transparent: true, opacity: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 0.5);
    graphGroup.add(mesh);
    dots.push({ mesh, mat });
  }
  return dots;
}

function createConnectLine(x1, y1, x2, y2, color) {
  const curve = new THREE.LineCurve3(
    new THREE.Vector3(x1, y1, 0.5),
    new THREE.Vector3(x2, y2, 0.5)
  );
  const geo = new THREE.TubeGeometry(curve, 2, G.axisRadius * 1.5, 8, false);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 });
  const mesh = new THREE.Mesh(geo, mat);
  graphGroup.add(mesh);
  return { mesh, mat };
}

// ══════════════════════════════════════════════════════════════
// PHASE STATE
// ══════════════════════════════════════════════════════════════

let currentPhase = 0;
let transitioning = false;

// ══════════════════════════════════════════════════════════════
// PHASE 1: Bar chart + prediction line + error fills + axes
// ══════════════════════════════════════════════════════════════

function phase1() {
  transitioning = true;

  // Bars appear (staggered)
  bars.forEach((b, i) => {
    new TWEEN.Tween(b.mesh.scale)
      .to({ y: 1 }, CFG.timing.barAppear)
      .delay(i * CFG.timing.barStagger)
      .easing(TWEEN.Easing.Back.Out)
      .start();
  });

  const barsDone = n * CFG.timing.barStagger + CFG.timing.barAppear;

  // Prediction line (after bars)
  setTimeout(() => {
    createPredictionLine(predictions, 0);
    createFillQuads(predictions, 0);

    // Fade line + markers in
    new TWEEN.Tween(predLine.mat).to({ opacity: 1 }, CFG.timing.lineAppear).start();
    predMarkers.forEach(m => {
      new TWEEN.Tween(m.mat).to({ opacity: 1 }, CFG.timing.lineAppear).start();
    });

    // Fade fills in (staggered)
    fillQuads.forEach((f, i) => {
      if (f) {
        new TWEEN.Tween(f.mat)
          .to({ opacity: ERROR_FILL.opacity }, CFG.timing.fillAppear)
          .delay(i * CFG.timing.fillStagger)
          .start();
      }
    });
  }, barsDone);

  // Fade in graph axes
  setTimeout(() => {
    new TWEEN.Tween(yAxis.material).to({ opacity: 1 }, CFG.timing.axesAppear).start();
    new TWEEN.Tween(xAxis.material).to({ opacity: 1 }, CFG.timing.axesAppear).start();

    showOverlay("y-axis-label", "MSE",
      graphWorldPos(0, G.height + 0.5));
    showOverlay("x-axis-label", "θ",
      graphWorldPos(G.width / 2, -0.6));
  }, barsDone + CFG.timing.lineAppear);

  const totalDuration = barsDone + CFG.timing.lineAppear + CFG.timing.axesAppear;
  setTimeout(() => { transitioning = false; }, totalDuration);
}

// ══════════════════════════════════════════════════════════════
// PHASE 2: Plot initial MSE point
// ══════════════════════════════════════════════════════════════

function phase2() {
  transitioning = true;
  mapY = mseMapY;

  const y = mapY(mse1);
  graphPoint1 = createSolidPoint(G.theta1X, y, COLORS.coral, 0);

  new TWEEN.Tween(graphPoint1.mesh.scale)
    .to({ x: 1, y: 1, z: 1 }, CFG.timing.plotPoint)
    .easing(TWEEN.Easing.Back.Out)
    .start();

  setTimeout(() => {
    showOverlay("theta1-tick", "θ₁", graphWorldPos(G.theta1X, -0.4));
    showOverlay("point1-value", `MSE = ${mse1.toFixed(1)}`,
      graphWorldPos(G.theta1X, y + 0.5));
  }, CFG.timing.plotPoint * 0.5);

  setTimeout(() => { transitioning = false; }, CFG.timing.plotPoint);
}

// ══════════════════════════════════════════════════════════════
// PHASE 3: Hollow marker + dotted line
// ══════════════════════════════════════════════════════════════

function phase3() {
  transitioning = true;

  const y1 = mapY(mse1);
  hollowMarker = createHollowMarker(G.theta2X, y1);

  new TWEEN.Tween(hollowMarker.mesh.scale)
    .to({ x: 1, y: 1, z: 1 }, CFG.timing.hollowAppear)
    .easing(TWEEN.Easing.Back.Out)
    .start();

  // Dotted line
  setTimeout(() => {
    dottedDots = createDottedLine(G.theta1X, y1, G.theta2X, y1);
    const perDot = CFG.timing.dottedDraw / dottedDots.length;
    dottedDots.forEach((d, i) => {
      new TWEEN.Tween(d.mat)
        .to({ opacity: 1 }, 100)
        .delay(i * perDot)
        .start();
    });
  }, CFG.timing.hollowAppear);

  setTimeout(() => {
    showOverlay("theta2-tick", "θ₂", graphWorldPos(G.theta2X, -0.4));
  }, CFG.timing.hollowAppear);

  setTimeout(() => { transitioning = false; },
    CFG.timing.hollowAppear + CFG.timing.dottedDraw);
}

// ══════════════════════════════════════════════════════════════
// PHASE 4: Interpolate predictions
// ══════════════════════════════════════════════════════════════

function phase4() {
  transitioning = true;

  // Tween animPreds from predictions → interpPreds
  const tweenObj = { t: 0 };
  new TWEEN.Tween(tweenObj)
    .to({ t: 1 }, CFG.timing.interpolate)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      for (let i = 0; i < n; i++) {
        animPreds[i] = predictions[i] + (interpPreds[i] - predictions[i]) * tweenObj.t;
      }
      rebuildVisuals(animPreds);
    })
    .onComplete(() => { transitioning = false; })
    .start();
}

// ══════════════════════════════════════════════════════════════
// PHASE 5: Plot new MSE + connecting line
// ══════════════════════════════════════════════════════════════

function phase5() {
  transitioning = true;

  const y1 = mapY(mse1);
  const y2 = mapY(mse2);

  // Drop hollow marker to new y
  new TWEEN.Tween(hollowMarker.mesh.position)
    .to({ y: y2 }, CFG.timing.plotNewPoint)
    .easing(TWEEN.Easing.Quadratic.Out)
    .start();

  // Fade dotted line out
  dottedDots.forEach(d => {
    new TWEEN.Tween(d.mat).to({ opacity: 0 }, CFG.timing.plotNewPoint * 0.5).start();
  });

  setTimeout(() => {
    // Crossfade: hollow → solid teal
    new TWEEN.Tween(hollowMarker.mat).to({ opacity: 0 }, 200).start();
    graphPoint2 = createSolidPoint(G.theta2X, y2, COLORS.teal, 0);
    new TWEEN.Tween(graphPoint2.mesh.scale)
      .to({ x: 1, y: 1, z: 1 }, 300)
      .easing(TWEEN.Easing.Back.Out)
      .start();

    // Solid connecting line
    connectLine = createConnectLine(G.theta1X, y1, G.theta2X, y2, COLORS.teal);
    new TWEEN.Tween(connectLine.mat)
      .to({ opacity: 1 }, CFG.timing.connectLine)
      .start();

    showOverlay("point2-value", `MSE = ${mse2.toFixed(1)}`,
      graphWorldPos(G.theta2X, y2 + 0.5));
    document.getElementById("point2-value").classList.add("good");
  }, CFG.timing.plotNewPoint);

  setTimeout(() => { transitioning = false; },
    CFG.timing.plotNewPoint + CFG.timing.connectLine);
}

// ══════════════════════════════════════════════════════════════
// PHASE 6: Transition to BPR — reset predictions, swap graph
// ══════════════════════════════════════════════════════════════

function phase6() {
  transitioning = true;

  // Fade out graph objects
  clearGraphObjects();
  if (connectLine) { graphGroup.remove(connectLine.mesh); connectLine = null; }

  // Hide MSE overlays
  hideOverlay("point1-value");
  hideOverlay("point2-value");
  hideOverlay("graph-title");

  // Reset predictions back to original
  const tweenObj = { t: 0 };
  new TWEEN.Tween(tweenObj)
    .to({ t: 1 }, CFG.timing.transition)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      for (let i = 0; i < n; i++) {
        animPreds[i] = interpPreds[i] + (predictions[i] - interpPreds[i]) * tweenObj.t;
      }
      rebuildVisuals(animPreds);
    })
    .start();

  // Switch y-axis label
  setTimeout(() => {
    showOverlay("y-axis-label", "% Best Possible Reach",
      graphWorldPos(0, G.height + 0.5));
  }, CFG.timing.transition * 0.5);

  // Highlight model's top-K, fade others
  setTimeout(() => {
    bars.forEach((b, i) => {
      if (!modelTopK.has(i)) {
        new TWEEN.Tween(b.mat)
          .to({ opacity: 0.12 }, CFG.timing.topKFade)
          .start();
      }
    });
  }, CFG.timing.transition);

  // Show BPR calculation
  setTimeout(() => {
    const calcPos = new THREE.Vector3(CFG.chartOffsetX, -1.5, 0);
    showOverlay("bpr-calc",
      `Model's top ${k} overdoses = <span class="value">${modelTopKSum}</span>`
      + `<br>True top ${k} overdoses = <span class="value">${trueTopKSum}</span>`
      + `<br><span class="result bad">= ${bprPct.toFixed(1)}%</span>`,
      calcPos);
  }, CFG.timing.transition + CFG.timing.topKFade);

  setTimeout(() => { transitioning = false; },
    CFG.timing.transition + CFG.timing.topKFade + CFG.timing.bprCalcDelay);
}

// ══════════════════════════════════════════════════════════════
// PHASE 7: Plot initial BPR point
// ══════════════════════════════════════════════════════════════

function phase7() {
  transitioning = true;
  mapY = bprMapY;

  const y = mapY(bprPct);
  graphPoint1 = createSolidPoint(G.theta1X, y, COLORS.coral, 0);

  new TWEEN.Tween(graphPoint1.mesh.scale)
    .to({ x: 1, y: 1, z: 1 }, CFG.timing.plotPoint)
    .easing(TWEEN.Easing.Back.Out)
    .start();

  setTimeout(() => {
    showOverlay("theta1-tick", "θ₁", graphWorldPos(G.theta1X, -0.4));
    showOverlay("point1-value", `${bprPct.toFixed(1)}%`,
      graphWorldPos(G.theta1X, y + 0.5));
  }, CFG.timing.plotPoint * 0.5);

  setTimeout(() => { transitioning = false; }, CFG.timing.plotPoint);
}

// ══════════════════════════════════════════════════════════════
// PHASE 8: Hollow marker + dotted line (BPR)
// ══════════════════════════════════════════════════════════════

function phase8() {
  transitioning = true;

  const y = mapY(bprPct);
  hollowMarker = createHollowMarker(G.theta2X, y);

  new TWEEN.Tween(hollowMarker.mesh.scale)
    .to({ x: 1, y: 1, z: 1 }, CFG.timing.hollowAppear)
    .easing(TWEEN.Easing.Back.Out)
    .start();

  setTimeout(() => {
    dottedDots = createDottedLine(G.theta1X, y, G.theta2X, y);
    const perDot = CFG.timing.dottedDraw / dottedDots.length;
    dottedDots.forEach((d, i) => {
      new TWEEN.Tween(d.mat).to({ opacity: 1 }, 100).delay(i * perDot).start();
    });
  }, CFG.timing.hollowAppear);

  setTimeout(() => {
    showOverlay("theta2-tick", "θ₂", graphWorldPos(G.theta2X, -0.4));
  }, CFG.timing.hollowAppear);

  setTimeout(() => { transitioning = false; },
    CFG.timing.hollowAppear + CFG.timing.dottedDraw);
}

// ══════════════════════════════════════════════════════════════
// PHASE 9: Interpolate predictions (BPR — top-K stays same)
// ══════════════════════════════════════════════════════════════

function phase9() {
  transitioning = true;

  const tweenObj = { t: 0 };
  new TWEEN.Tween(tweenObj)
    .to({ t: 1 }, CFG.timing.interpolate)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      for (let i = 0; i < n; i++) {
        animPreds[i] = predictions[i] + (interpPreds[i] - predictions[i]) * tweenObj.t;
      }
      rebuildVisuals(animPreds);
    })
    .onComplete(() => { transitioning = false; })
    .start();
}

// ══════════════════════════════════════════════════════════════
// PHASE 10: Plot BPR — flat line (no gradient)
// ══════════════════════════════════════════════════════════════

function phase10() {
  transitioning = true;

  const y = mapY(bprPct);

  // Hollow marker stays at same y — just crossfade to solid coral
  new TWEEN.Tween(hollowMarker.mat).to({ opacity: 0 }, 200).start();
  graphPoint2 = createSolidPoint(G.theta2X, y, COLORS.coral, 0);
  new TWEEN.Tween(graphPoint2.mesh.scale)
    .to({ x: 1, y: 1, z: 1 }, 300)
    .easing(TWEEN.Easing.Back.Out)
    .start();

  // Fade dotted line out, replace with solid horizontal line
  dottedDots.forEach(d => {
    new TWEEN.Tween(d.mat).to({ opacity: 0 }, 200).start();
  });

  setTimeout(() => {
    connectLine = createConnectLine(G.theta1X, y, G.theta2X, y, COLORS.coral);
    new TWEEN.Tween(connectLine.mat)
      .to({ opacity: 1 }, CFG.timing.connectLine)
      .start();

    showOverlay("point2-value", `${bprPct.toFixed(1)}%`,
      graphWorldPos(G.theta2X, y + 0.5));
    document.getElementById("point2-value").className = "value-label bad visible";
  }, 300);

  setTimeout(() => { transitioning = false; }, 300 + CFG.timing.connectLine);
}

// ══════════════════════════════════════════════════════════════
// PHASE CONTROLLER
// ══════════════════════════════════════════════════════════════

function advancePhase() {
  if (transitioning || currentPhase >= 10) return;
  currentPhase++;
  document.getElementById("hud").classList.add("hidden");
  switch (currentPhase) {
    case 1:  phase1();  break;
    case 2:  phase2();  break;
    case 3:  phase3();  break;
    case 4:  phase4();  break;
    case 5:  phase5();  break;
    case 6:  phase6();  break;
    case 7:  phase7();  break;
    case 8:  phase8();  break;
    case 9:  phase9();  break;
    case 10: phase10(); break;
  }
}

canvas.addEventListener("click", advancePhase);
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === " ") advancePhase();
});

// Reveal.js integration
try {
  const Reveal = window.parent && window.parent.Reveal;
  if (Reveal) {
    Reveal.on("fragmentshown", () => advancePhase());
  }
} catch (_) {}

// ══════════════════════════════════════════════════════════════
// RENDER LOOP
// ══════════════════════════════════════════════════════════════

function animate(time) {
  requestAnimationFrame(animate);
  TWEEN.update(time);
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
