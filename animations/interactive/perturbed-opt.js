/**
 * Differentiable Perturbed Optimizers — Animation
 *
 * 8-phase click-through showing:
 *   Phases 1-3: Perturbation smooths the hard top-K selection at θ₁
 *   Phase 4-5:  Plot smooth BPR, show θ₂
 *   Phases 6-7: Transition to θ₂, perturb again
 *   Phase 8:    Smooth BPR improves — gradient exists!
 */

import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import {
  COLORS, valueColor, BAR_CHART_DATA,
  PRED_LEFT, PRED_LINE, COMPARISON,
  LIGHTING, PERTURBED_OPT,
} from "./config.js";
import { computeLeftPredictions, makeGaussRNG } from "./prediction-utils.js";

const CFG = PERTURBED_OPT;
const G = CFG.graph;

// ══════════════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════════════

const sortedValues = [...BAR_CHART_DATA].sort((a, b) => a.value - b.value).map(d => d.value);
const n = sortedValues.length;
const k = COMPARISON.k;
const maxVal = Math.max(...sortedValues);

const predictions = computeLeftPredictions(sortedValues, k, PRED_LEFT);
const interpPreds = predictions.map((p, i) => p + (sortedValues[i] - p) * CFG.lerpT);

// Model's hard top-K
const modelTopK = new Set(
  predictions.map((p, i) => ({ pred: p, idx: i }))
    .sort((a, b) => b.pred - a.pred).slice(0, k).map(d => d.idx)
);
const trueTopKSum = sortedValues.slice(n - k).reduce((a, b) => a + b, 0);

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
camera.position.set(0, 3, 16);
camera.lookAt(0, 3, 0);

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

// ══════════════════════════════════════════════════════════════
// BAR CHART (top-left)
// ══════════════════════════════════════════════════════════════

const chartGroup = new THREE.Group();
chartGroup.position.x = CFG.chartOffsetX;
scene.add(chartGroup);

const bw = CFG.barWidth;
const bg = CFG.barGap;
const totalBarW = n * bw + (n - 1) * bg;
const barStartX = -totalBarW / 2 + bw / 2;
const hScale = CFG.heightScale / maxVal;

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

// ── Prediction line ──────────────────────────────────────────

let predLine = null;
let predMarkers = [];
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

function rebuildPredLine(preds) {
  if (!predLine) return;
  const { points, tubeGeo } = buildPredictionLine(preds);
  const oldGeo = predLine.mesh.geometry;
  predLine.mesh.geometry = tubeGeo;
  oldGeo.dispose();
  points.forEach((pt, i) => {
    if (predMarkers[i]) predMarkers[i].mesh.position.copy(pt);
  });
}

// ── Ghost lines ──────────────────────────────────────────────

let ghostLines = [];

function addGhostLine(preds) {
  const { points, tubeGeo } = buildPredictionLine(preds);
  const mat = new THREE.MeshBasicMaterial({
    color: COLORS.purple, transparent: true, opacity: CFG.ghostOpacity,
  });
  const mesh = new THREE.Mesh(tubeGeo, mat);
  chartGroup.add(mesh);

  const markerGeo = new THREE.SphereGeometry(PRED_LINE.markerRadius, PRED_LINE.markerSegments, PRED_LINE.markerSegments);
  const markers = points.map(pt => {
    const mMat = new THREE.MeshBasicMaterial({
      color: COLORS.purple, transparent: true, opacity: CFG.ghostOpacity,
    });
    const m = new THREE.Mesh(markerGeo, mMat);
    m.position.copy(pt);
    chartGroup.add(m);
    return { mesh: m, mat: mMat };
  });

  ghostLines.push({ lineMesh: mesh, lineMat: mat, markers });
}

function clearGhostLines(duration) {
  ghostLines.forEach(g => {
    new TWEEN.Tween(g.lineMat).to({ opacity: 0 }, duration).start();
    g.markers.forEach(m => {
      new TWEEN.Tween(m.mat).to({ opacity: 0 }, duration).start();
    });
  });
  setTimeout(() => {
    ghostLines.forEach(g => {
      chartGroup.remove(g.lineMesh);
      g.lineMesh.geometry.dispose();
      g.markers.forEach(m => chartGroup.remove(m.mesh));
    });
    ghostLines = [];
  }, duration + 50);
}

// ══════════════════════════════════════════════════════════════
// DISTRIBUTION PLOT (bottom-left)
// ══════════════════════════════════════════════════════════════

const distGroup = new THREE.Group();
distGroup.position.set(CFG.chartOffsetX, -(CFG.distGap + CFG.distHeight), 0);
scene.add(distGroup);

const distHScale = CFG.distHeight;

// Axes
const distAxisMat = new THREE.MeshBasicMaterial({ color: COLORS.muted, transparent: true, opacity: 0 });
const distYAxisGeo = new THREE.TubeGeometry(
  new THREE.LineCurve3(new THREE.Vector3(barStartX - bw, 0, 0), new THREE.Vector3(barStartX - bw, distHScale, 0)),
  2, G.axisRadius, 8, false
);
const distYAxis = new THREE.Mesh(distYAxisGeo, distAxisMat);
distGroup.add(distYAxis);

const distXAxisGeo = new THREE.TubeGeometry(
  new THREE.LineCurve3(new THREE.Vector3(barStartX - bw, 0, 0), new THREE.Vector3(barStartX + totalBarW, 0, 0)),
  2, G.axisRadius, 8, false
);
const distXAxis = new THREE.Mesh(distXAxisGeo, distAxisMat.clone());
distGroup.add(distXAxis);

// Distribution bars (unit-height, scale.y controls display)
const distBars = [];
for (let i = 0; i < n; i++) {
  const geo = new THREE.BoxGeometry(bw, 1, bw);
  const mat = new THREE.MeshStandardMaterial({ color: COLORS.teal, transparent: true, opacity: 0.8 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(barPositions[i], 0.005, 0);
  mesh.scale.y = 0.01;
  mesh.visible = false;
  distGroup.add(mesh);
  distBars.push({ mesh, mat, currentFreq: 0 });
}

function updateDistBar(idx, freq, duration) {
  const db = distBars[idx];
  db.mesh.visible = true;
  const targetScale = Math.max(freq * distHScale, 0.01);
  new TWEEN.Tween(db.mesh.scale)
    .to({ y: targetScale }, duration)
    .start();
  new TWEEN.Tween(db.mesh.position)
    .to({ y: targetScale / 2 }, duration)
    .start();
  db.currentFreq = freq;
}

function resetDistBars() {
  distBars.forEach(db => {
    db.mesh.scale.y = 0.01;
    db.mesh.position.y = 0.005;
    db.mesh.visible = false;
    db.currentFreq = 0;
  });
}

// ══════════════════════════════════════════════════════════════
// PERTURBATION ENGINE
// ══════════════════════════════════════════════════════════════

function computePerturbedTopK(basePreds, seed) {
  const gauss = makeGaussRNG(seed);
  const perturbed = basePreds.map(p => p + gauss() * CFG.noiseSigma);
  const ranked = perturbed.map((p, i) => ({ pred: p, idx: i }))
    .sort((a, b) => b.pred - a.pred);
  const topK = new Set(ranked.slice(0, k).map(d => d.idx));
  return { perturbed, topK };
}

function computeSmoothBPR(distribution) {
  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    weightedSum += sortedValues[i] * distribution[i];
  }
  return (weightedSum / trueTopKSum) * 100;
}

function runPerturbationSequence(basePreds, onComplete) {
  const counts = new Array(n).fill(0);
  const distribution = new Array(n).fill(0);
  let trial = 0;

  function runOneTrial() {
    const seed = CFG.seedBase + trial;
    const { perturbed, topK } = computePerturbedTopK(basePreds, seed);

    // Ghost the current line
    addGhostLine(animPreds);

    // Show perturbed line
    animPreds = [...perturbed];
    createPredictionLine(perturbed, 1.0);

    // Update running distribution
    for (const idx of topK) counts[idx]++;
    trial++;
    for (let i = 0; i < n; i++) distribution[i] = counts[i] / trial;

    // Animate distribution bars
    for (let i = 0; i < n; i++) {
      if (distribution[i] > 0) {
        updateDistBar(i, distribution[i], CFG.timing.distBarGrow);
      }
    }

    // Flash perturbed top-K in bar chart
    bars.forEach((b, i) => {
      const target = topK.has(i) ? 1.0 : 0.12;
      new TWEEN.Tween(b.mat).to({ opacity: target }, 200).start();
    });

    if (trial < CFG.numTrials) {
      setTimeout(runOneTrial, CFG.trialDelay);
    } else {
      setTimeout(() => onComplete(distribution), CFG.trialDelay);
    }
  }

  runOneTrial();
}

// ══════════════════════════════════════════════════════════════
// GRAPH (right side)
// ══════════════════════════════════════════════════════════════

const graphGroup = new THREE.Group();
graphGroup.position.set(CFG.graphOffsetX, 0, 0);
scene.add(graphGroup);

const graphAxisMat = new THREE.MeshBasicMaterial({ color: COLORS.muted, transparent: true, opacity: 0 });
const yAxisGeo = new THREE.TubeGeometry(
  new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, G.height, 0)),
  2, G.axisRadius, 8, false
);
const yAxis = new THREE.Mesh(yAxisGeo, graphAxisMat);
graphGroup.add(yAxis);

const xAxisGeo = new THREE.TubeGeometry(
  new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(G.width, 0, 0)),
  2, G.axisRadius, 8, false
);
const xAxis = new THREE.Mesh(xAxisGeo, graphAxisMat.clone());
graphGroup.add(xAxis);

let graphPoint1 = null;
let graphPoint2 = null;
let hollowMarker = null;
let dottedDots = [];
let connectLine = null;

function bprMapY(pct) {
  const lo = G.bprMin * 100, hi = G.bprMax * 100;
  return ((pct - lo) / (hi - lo)) * G.height;
}

function graphWorldPos(localX, localY) {
  return new THREE.Vector3(CFG.graphOffsetX + localX, localY, 0);
}

function clearGraphObjects() {
  [graphPoint1, graphPoint2, hollowMarker, connectLine].forEach(obj => {
    if (obj) graphGroup.remove(obj.mesh || obj);
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
    new THREE.Vector3(x1, y1, 0.5), new THREE.Vector3(x2, y2, 0.5)
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
let smoothBPR1 = 0;

// ══════════════════════════════════════════════════════════════
// PHASE 1: Bar chart + prediction line + dist axes + graph axes
// ══════════════════════════════════════════════════════════════

function phase1() {
  transitioning = true;

  bars.forEach((b, i) => {
    new TWEEN.Tween(b.mesh.scale)
      .to({ y: 1 }, CFG.timing.barAppear)
      .delay(i * CFG.timing.barStagger)
      .easing(TWEEN.Easing.Back.Out)
      .start();
  });

  const barsDone = n * CFG.timing.barStagger + CFG.timing.barAppear;

  setTimeout(() => {
    createPredictionLine(predictions, 0);
    new TWEEN.Tween(predLine.mat).to({ opacity: 1 }, CFG.timing.lineAppear).start();
    predMarkers.forEach(m => {
      new TWEEN.Tween(m.mat).to({ opacity: 1 }, CFG.timing.lineAppear).start();
    });
  }, barsDone);

  // Distribution axes
  setTimeout(() => {
    new TWEEN.Tween(distYAxis.material).to({ opacity: 1 }, CFG.timing.axesAppear).start();
    new TWEEN.Tween(distXAxis.material).to({ opacity: 1 }, CFG.timing.axesAppear).start();

    const distWorldY = -(CFG.distGap + CFG.distHeight);
    showOverlay("dist-y-label", "Selection<br>Freq",
      new THREE.Vector3(CFG.chartOffsetX + barStartX - bw - 0.5, distWorldY + distHScale + 0.3, 0));
  }, barsDone + CFG.timing.lineAppear);

  // Graph axes
  setTimeout(() => {
    new TWEEN.Tween(yAxis.material).to({ opacity: 1 }, CFG.timing.axesAppear).start();
    new TWEEN.Tween(xAxis.material).to({ opacity: 1 }, CFG.timing.axesAppear).start();

    showOverlay("y-axis-label", "% Best Possible Reach",
      graphWorldPos(0, G.height + 0.5));
    showOverlay("x-axis-label", "θ",
      graphWorldPos(G.width / 2, -0.6));
  }, barsDone + CFG.timing.lineAppear);

  const totalDuration = barsDone + CFG.timing.lineAppear + CFG.timing.axesAppear;
  setTimeout(() => { transitioning = false; }, totalDuration);
}

// ══════════════════════════════════════════════════════════════
// PHASE 2: Hard top-K in distribution
// ══════════════════════════════════════════════════════════════

function phase2() {
  transitioning = true;

  // Show hard top-K distribution bars
  for (const idx of modelTopK) {
    updateDistBar(idx, 1.0, CFG.timing.distBarGrow);
  }

  // Highlight top-K in bar chart, fade others
  bars.forEach((b, i) => {
    const target = modelTopK.has(i) ? 1.0 : 0.12;
    new TWEEN.Tween(b.mat)
      .to({ opacity: target }, CFG.timing.topKFade)
      .start();
  });

  setTimeout(() => { transitioning = false; },
    Math.max(CFG.timing.distBarGrow, CFG.timing.topKFade));
}

// ══════════════════════════════════════════════════════════════
// PHASE 3: 10 perturbations at θ₁
// ══════════════════════════════════════════════════════════════

function phase3() {
  transitioning = true;
  resetDistBars();

  runPerturbationSequence(predictions, (distribution) => {
    smoothBPR1 = computeSmoothBPR(distribution);
    transitioning = false;
  });
}

// ══════════════════════════════════════════════════════════════
// PHASE 4: Plot smooth BPR at θ₁
// ══════════════════════════════════════════════════════════════

function phase4() {
  transitioning = true;

  const y = bprMapY(smoothBPR1);
  graphPoint1 = createSolidPoint(G.theta1X, y, COLORS.coral, 0);

  new TWEEN.Tween(graphPoint1.mesh.scale)
    .to({ x: 1, y: 1, z: 1 }, CFG.timing.plotPoint)
    .easing(TWEEN.Easing.Back.Out)
    .start();

  setTimeout(() => {
    showOverlay("theta1-tick", "θ₁", graphWorldPos(G.theta1X, -0.4));
    showOverlay("point1-value", `${smoothBPR1.toFixed(1)}%`,
      graphWorldPos(G.theta1X, y + 0.5));
  }, CFG.timing.plotPoint * 0.5);

  setTimeout(() => { transitioning = false; }, CFG.timing.plotPoint);
}

// ══════════════════════════════════════════════════════════════
// PHASE 5: Hollow marker + dotted line to θ₂
// ══════════════════════════════════════════════════════════════

function phase5() {
  transitioning = true;

  const y = bprMapY(smoothBPR1);
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
// PHASE 6: Transition to θ₂
// ══════════════════════════════════════════════════════════════

function phase6() {
  transitioning = true;

  // Clear ghost lines
  clearGhostLines(CFG.timing.transition);

  // Tween predictions to interpolated
  const tweenObj = { t: 0 };
  new TWEEN.Tween(tweenObj)
    .to({ t: 1 }, CFG.timing.interpolate)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      for (let i = 0; i < n; i++) {
        animPreds[i] = predictions[i] + (interpPreds[i] - predictions[i]) * tweenObj.t;
      }
      rebuildPredLine(animPreds);
    })
    .start();

  // Reset distribution after interpolation completes
  setTimeout(() => {
    resetDistBars();
    // Show hard top-K of interpolated predictions (same set)
    const interpTopK = new Set(
      interpPreds.map((p, i) => ({ pred: p, idx: i }))
        .sort((a, b) => b.pred - a.pred).slice(0, k).map(d => d.idx)
    );
    for (const idx of interpTopK) {
      updateDistBar(idx, 1.0, CFG.timing.distBarGrow);
    }
    // Reset bar highlighting
    bars.forEach((b, i) => {
      const target = interpTopK.has(i) ? 1.0 : 0.12;
      new TWEEN.Tween(b.mat).to({ opacity: target }, CFG.timing.topKFade).start();
    });

    setTimeout(() => { transitioning = false; },
      Math.max(CFG.timing.distBarGrow, CFG.timing.topKFade));
  }, CFG.timing.interpolate);
}

// ══════════════════════════════════════════════════════════════
// PHASE 7: 10 perturbations at θ₂
// ══════════════════════════════════════════════════════════════

let smoothBPR2 = 0;

function phase7() {
  transitioning = true;
  resetDistBars();

  runPerturbationSequence(interpPreds, (distribution) => {
    smoothBPR2 = computeSmoothBPR(distribution);
    transitioning = false;
  });
}

// ══════════════════════════════════════════════════════════════
// PHASE 8: Plot smooth BPR at θ₂ — ascending line
// ══════════════════════════════════════════════════════════════

function phase8() {
  transitioning = true;

  const y1 = bprMapY(smoothBPR1);
  const y2 = bprMapY(smoothBPR2);

  // Drop/raise hollow marker to new y
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

    // Solid connecting line (ascending = improvement)
    connectLine = createConnectLine(G.theta1X, y1, G.theta2X, y2, COLORS.teal);
    new TWEEN.Tween(connectLine.mat)
      .to({ opacity: 1 }, CFG.timing.connectLine)
      .start();

    showOverlay("point2-value", `${smoothBPR2.toFixed(1)}%`,
      graphWorldPos(G.theta2X, y2 + 0.5));
    document.getElementById("point2-value").className = "value-label good visible";
  }, CFG.timing.plotNewPoint);

  setTimeout(() => { transitioning = false; },
    CFG.timing.plotNewPoint + CFG.timing.connectLine);
}

// ══════════════════════════════════════════════════════════════
// PHASE CONTROLLER
// ══════════════════════════════════════════════════════════════

function advancePhase() {
  if (transitioning || currentPhase >= 8) return;
  currentPhase++;
  document.getElementById("hud").classList.add("hidden");
  switch (currentPhase) {
    case 1: phase1(); break;
    case 2: phase2(); break;
    case 3: phase3(); break;
    case 4: phase4(); break;
    case 5: phase5(); break;
    case 6: phase6(); break;
    case 7: phase7(); break;
    case 8: phase8(); break;
  }
}

canvas.addEventListener("click", advancePhase);
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === " ") advancePhase();
});

try {
  const Reveal = window.parent && window.parent.Reveal;
  if (Reveal) Reveal.on("fragmentshown", () => advancePhase());
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
