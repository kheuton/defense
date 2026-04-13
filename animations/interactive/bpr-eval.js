/**
 * bpr-eval.js — BPR Evaluation Animation
 *
 * Starts directly in the two-model comparison view (prediction lines,
 * error fills, and RMSE overlays already visible). No fast-forward
 * through earlier phases needed.
 *
 * Phase 1: Top-K bars highlighted, non-selected bars faded
 * Phase 2: BPR evaluation — reach percentages shown for each model
 */

import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import {
  COLORS, valueColor,
  BAR_CHART, BAR_CHART_DATA, GRID, CAMERA,
  COMPARISON, PRED_LEFT, PRED_RIGHT, PRED_LINE, ERROR_FILL, createIBar,
  TIMING_COMPARISON,
} from "./config.js";
import { computeLeftPredictions, computeRightPredictions } from "./prediction-utils.js";

// ── Renderer ──────────────────────────────────────────────────
const canvas = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(COLORS.bg);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// ── Scene ─────────────────────────────────────────────────────
const scene = new THREE.Scene();

// ── Camera — starts in the comparison (side-by-side) position ─
const frustum = CAMERA.frustum * COMPARISON.frustumScale;
let aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(
  -frustum * aspect, frustum * aspect, frustum, -frustum, 0.1, 500
);
const ct = CAMERA.barChart;
camera.position.set(ct.x, ct.y, ct.z);
camera.up.set(0, 1, 0);
camera.lookAt(ct.lookAt.x, ct.lookAt.y, ct.lookAt.z);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  aspect = window.innerWidth / window.innerHeight;
  camera.left   = -frustum * aspect;
  camera.right  =  frustum * aspect;
  camera.top    =  frustum;
  camera.bottom = -frustum;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// ── Lights ────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(-30, 50, -20);
scene.add(dirLight);

// ── Overlay helpers ───────────────────────────────────────────
function worldToScreen(worldPos) {
  camera.updateMatrixWorld();
  const v = worldPos.clone().project(camera);
  return {
    x: (v.x * 0.5 + 0.5) * canvas.clientWidth,
    y: (-v.y * 0.5 + 0.5) * canvas.clientHeight,
  };
}

function showOverlay(id, html, worldPos, offsetY = 0) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = html;
  const screen = worldToScreen(worldPos);
  el.style.left = screen.x + "px";
  el.style.top = (screen.y + offsetY) + "px";
  el.style.transform = "translateX(-50%)";
  el.classList.add("visible");
}

// ── Blink effect ──────────────────────────────────────────────
function blinkBars(barList, count, duration) {
  return new Promise(resolve => {
    let i = 0;
    function doBlink() {
      if (i >= count) { resolve(); return; }
      barList.forEach(b => {
        b.mesh.material.emissive = new THREE.Color(0x444466);
        b.mesh.material.emissiveIntensity = 0.5;
      });
      setTimeout(() => {
        barList.forEach(b => { b.mesh.material.emissiveIntensity = 0; });
        i++;
        setTimeout(doBlink, duration / 2);
      }, duration);
    }
    doBlink();
  });
}

// ── Chart data ────────────────────────────────────────────────
const chartDataSorted = [...BAR_CHART_DATA]
  .sort((a, b) => a.value - b.value)
  .map(d => d.value);
const chartMaxVal = Math.max(...chartDataSorted);
const chartHScale = GRID.HEIGHT_SCALE / chartMaxVal;
const bw = BAR_CHART.barWidth;
const n = chartDataSorted.length;
const totalW = n * (bw + BAR_CHART.barGap) - BAR_CHART.barGap;
const startX = -totalW / 2;
const barPositions = chartDataSorted.map((_, i) =>
  startX + i * (bw + BAR_CHART.barGap) + bw / 2
);

// Group offsets for side-by-side layout
const offset = totalW / 2 + COMPARISON.gap / 2;

// ── Bar chart builder ─────────────────────────────────────────
// BoxGeometry with bottom face at y=0 (geometry translated up by 0.5,
// then mesh.scale.y = actual height in world units).
const barGeo = new THREE.BoxGeometry(bw, 1, bw);
barGeo.translate(0, 0.5, 0);

function buildBarChart() {
  const group = new THREE.Group();
  const bars = chartDataSorted.map((v, i) => {
    const mat = new THREE.MeshStandardMaterial({
      color: valueColor(chartMaxVal > 0 ? v / chartMaxVal : 0),
      flatShading: true,
      transparent: true,
      opacity: 1,
    });
    const mesh = new THREE.Mesh(barGeo, mat);
    mesh.position.set(barPositions[i], 0, 0);
    mesh.scale.y = Math.max(v * chartHScale, 0.05);
    group.add(mesh);
    return { mesh, value: v };
  });

  // Axes
  const axisMat = new THREE.LineBasicMaterial({ color: COLORS.muted });
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(startX - 0.1, 0, 0),
      new THREE.Vector3(startX + totalW + 0.1, 0, 0),
    ]), axisMat
  ));
  group.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(startX - 0.1, 0, 0),
      new THREE.Vector3(startX - 0.1, GRID.HEIGHT_SCALE + 0.5, 0),
    ]), axisMat
  ));

  return { group, bars };
}

// ── Prediction line helper ────────────────────────────────────
function createPredictionLine(predictions, group) {
  const points = predictions.map((p, i) =>
    new THREE.Vector3(barPositions[i], p * chartHScale, 0.5)
  );
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
  const tubeGeo = new THREE.TubeGeometry(
    curve, points.length * 8, PRED_LINE.tubeRadius, 8, false
  );
  const mat = new THREE.MeshBasicMaterial({
    color: COLORS.purple, transparent: true, opacity: 1,
  });
  group.add(new THREE.Mesh(tubeGeo, mat));

  const markerGeo = new THREE.SphereGeometry(
    PRED_LINE.markerRadius, PRED_LINE.markerSegments, PRED_LINE.markerSegments
  );
  const markers = points.map(pt => {
    const markerMat = new THREE.MeshBasicMaterial({
      color: COLORS.purple, transparent: true, opacity: 1,
    });
    const mesh = new THREE.Mesh(markerGeo, markerMat);
    mesh.position.copy(pt);
    group.add(mesh);
    return { mesh, mat: markerMat };
  });

  return { mat, markers };
}

// ── Error bar helper ──────────────────────────────────────────
function createFillQuads(predictions, group) {
  return predictions.map((pred, i) => {
    const predY   = pred              * chartHScale;
    const actualY = chartDataSorted[i] * chartHScale;
    if (Math.abs(predY - actualY) < 0.01) return null;
    const mat = new THREE.MeshBasicMaterial({
      color: ERROR_FILL.color, transparent: true, opacity: ERROR_FILL.opacity,
    });
    const ibar = createIBar(predY, actualY, barPositions[i], bw, mat);
    group.add(ibar.group);
    return ibar;
  });
}

// ── Build scene ───────────────────────────────────────────────
const { group: leftGroup,  bars: leftBars  } = buildBarChart();
const { group: rightGroup, bars: rightBars } = buildBarChart();
leftGroup.position.x  = -offset;
rightGroup.position.x =  offset;
scene.add(leftGroup);
scene.add(rightGroup);

const leftPredictions  = computeLeftPredictions(chartDataSorted, COMPARISON.k, PRED_LEFT);
const rightPredictions = computeRightPredictions(chartDataSorted, PRED_RIGHT);

const leftLine  = createPredictionLine(leftPredictions,  leftGroup);
const rightLine = createPredictionLine(rightPredictions, rightGroup);

const leftFills  = createFillQuads(leftPredictions,  leftGroup);
const rightFills = createFillQuads(rightPredictions, rightGroup);

// ── RMSE ─────────────────────────────────────────────────────
const rmseLeft  = Math.sqrt(leftPredictions .reduce((s, p, i) => s + (p - chartDataSorted[i]) ** 2, 0) / n);
const rmseRight = Math.sqrt(rightPredictions.reduce((s, p, i) => s + (p - chartDataSorted[i]) ** 2, 0) / n);

// ── Show initial overlays after first render ──────────────────
requestAnimationFrame(() => {
  showOverlay("left-rmse",
    `RMSE = <span class="value">${rmseLeft.toFixed(2)}</span>`,
    new THREE.Vector3(-offset, -1.5, 0));
  showOverlay("right-rmse",
    `RMSE = <span class="value">${rmseRight.toFixed(2)}</span>`,
    new THREE.Vector3( offset, -1.5, 0));
});

// ── Animation state ───────────────────────────────────────────
let currentPhase = 0;
let transitioning = false;
let pendingAdvance = false;
const MAX_PHASE = 2;

// ── Phase 1: Highlight top-K, fade everything else ───────────
function transitionToTopK() {
  transitioning = true;
  const k = COMPARISON.k;

  const leftRanked = new Set(
    leftPredictions.map((p, i) => ({ pred: p, idx: i }))
      .sort((a, b) => b.pred - a.pred).slice(0, k).map(d => d.idx)
  );
  const rightRanked = new Set(
    rightPredictions.map((p, i) => ({ pred: p, idx: i }))
      .sort((a, b) => b.pred - a.pred).slice(0, k).map(d => d.idx)
  );

  [...leftFills, ...rightFills].forEach(f => {
    if (f) new TWEEN.Tween(f.mat)
      .to({ opacity: 0 }, TIMING_COMPARISON.errorFadeOut).start();
  });

  leftBars.forEach((b, i) => {
    if (!leftRanked.has(i))
      new TWEEN.Tween(b.mesh.material)
        .to({ opacity: 0.12 }, TIMING_COMPARISON.barFadeDuration).start();
  });
  rightBars.forEach((b, i) => {
    if (!rightRanked.has(i))
      new TWEEN.Tween(b.mesh.material)
        .to({ opacity: 0.12 }, TIMING_COMPARISON.barFadeDuration).start();
  });

  new TWEEN.Tween(leftLine.mat)
    .to({ opacity: 0.3 }, TIMING_COMPARISON.barFadeDuration).start();
  leftLine.markers.forEach(m =>
    new TWEEN.Tween(m.mat).to({ opacity: 0.3 }, TIMING_COMPARISON.barFadeDuration).start()
  );
  new TWEEN.Tween(rightLine.mat)
    .to({ opacity: 0.3 }, TIMING_COMPARISON.barFadeDuration).start();
  rightLine.markers.forEach(m =>
    new TWEEN.Tween(m.mat).to({ opacity: 0.3 }, TIMING_COMPARISON.barFadeDuration).start()
  );

  setTimeout(() => { transitioning = false; }, TIMING_COMPARISON.barFadeDuration + 100);
}

// ── Phase 2: BPR evaluation ───────────────────────────────────
function transitionToEval() {
  transitioning = true;
  const k = COMPARISON.k;

  const trueTopKSum = chartDataSorted.slice(n - k).reduce((s, v) => s + v, 0);

  const leftRanked = leftPredictions
    .map((p, i) => ({ pred: p, idx: i }))
    .sort((a, b) => b.pred - a.pred).slice(0, k).map(d => d.idx);
  const leftSelectedSum = leftRanked.reduce((s, i) => s + chartDataSorted[i], 0);
  const leftPct = ((leftSelectedSum / trueTopKSum) * 100).toFixed(0);

  const rightRanked = rightPredictions
    .map((p, i) => ({ pred: p, idx: i }))
    .sort((a, b) => b.pred - a.pred).slice(0, k).map(d => d.idx);
  const rightSelectedSum = rightRanked.reduce((s, i) => s + chartDataSorted[i], 0);
  const rightPct = ((rightSelectedSum / trueTopKSum) * 100).toFixed(0);

  const evalY = -2.5;

  blinkBars(leftBars, TIMING_COMPARISON.blinkCount, TIMING_COMPARISON.blinkDuration)
    .then(() => {
      showOverlay("left-eval",
        `Overdoses at model's top ${k} = <span class="value">${leftSelectedSum}</span>`,
        new THREE.Vector3(-offset, evalY, 0));
      return new Promise(r => setTimeout(r, TIMING_COMPARISON.evalLineDelay));
    })
    .then(() => {
      showOverlay("left-eval",
        `Overdoses at model's top ${k} = <span class="value">${leftSelectedSum}</span>`
        + `<br>Overdoses at true top ${k} = <span class="value">${trueTopKSum}</span>`
        + `<br><span class="result ${leftPct >= 90 ? "good" : "bad"}">= ${leftPct}%</span>`,
        new THREE.Vector3(-offset, evalY, 0));
      return new Promise(r => setTimeout(r, TIMING_COMPARISON.evalChartDelay));
    })
    .then(() => blinkBars(rightBars, TIMING_COMPARISON.blinkCount, TIMING_COMPARISON.blinkDuration))
    .then(() => {
      showOverlay("right-eval",
        `Overdoses at model's top ${k} = <span class="value">${rightSelectedSum}</span>`,
        new THREE.Vector3(offset, evalY, 0));
      return new Promise(r => setTimeout(r, TIMING_COMPARISON.evalLineDelay));
    })
    .then(() => {
      showOverlay("right-eval",
        `Overdoses at model's top ${k} = <span class="value">${rightSelectedSum}</span>`
        + `<br>Overdoses at true top ${k} = <span class="value">${trueTopKSum}</span>`
        + `<br><span class="result ${rightPct >= 90 ? "good" : "bad"}">= ${rightPct}%</span>`,
        new THREE.Vector3(offset, evalY, 0));
      transitioning = false;
    });
}

// ── Phase controller ──────────────────────────────────────────
function advancePhase() {
  if (currentPhase >= MAX_PHASE) return;
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
  if (currentPhase === 1) transitionToTopK();
  else if (currentPhase === 2) transitionToEval();
  if (currentPhase >= MAX_PHASE) removeListeners();
}

// ── Event handling ────────────────────────────────────────────
function onClick() { advancePhase(); }
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

// ── Render loop ───────────────────────────────────────────────
function animate(time) {
  requestAnimationFrame(animate);
  TWEEN.update(time);
  if (pendingAdvance && !transitioning) {
    pendingAdvance = false;
    advancePhase();
  }
  renderer.render(scene, camera);
}
animate();
