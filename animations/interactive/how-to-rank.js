/**
 * How to Rank — Animation
 *
 * 2-phase click-through:
 *   Phase 1: Bar chart appears on the right, ridgeline axes on the left
 *   Phase 2: Bars morph into Gaussian distributions (Joy Division ridgeline)
 */

import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import {
  COLORS, valueColor, BAR_CHART_DATA, LIGHTING, HOW_TO_RANK,
} from "./config.js";

const CFG = HOW_TO_RANK;
const R = CFG.ridge;

// ══════════════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════════════

const sortedData = [...BAR_CHART_DATA].sort((a, b) => a.value - b.value);
const sortedValues = sortedData.map(d => d.value);
const n = sortedValues.length;
const maxVal = Math.max(...sortedValues);

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

function showOverlay(id, html, worldPos) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = html;
  const screen = worldToScreen(worldPos);
  el.style.left = screen.x + "px";
  el.style.top = screen.y + "px";
  el.style.transform = "translateX(-50%)";
  el.classList.add("visible");
}

// ══════════════════════════════════════════════════════════════
// BAR CHART (right side)
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
  bars.push({ mesh, mat, height: h, value: v, color: color.clone() });
  barPositions.push(x);
}

// ══════════════════════════════════════════════════════════════
// RIDGELINE PLOT (left side)
// ══════════════════════════════════════════════════════════════

const ridgeGroup = new THREE.Group();
ridgeGroup.position.x = CFG.ridgeOffsetX;
scene.add(ridgeGroup);

// Map data value to x position on ridgeline
const dataXMax = maxVal * 1.1; // slight headroom beyond max value
function dataToX(dataVal) {
  return (dataVal / dataXMax) * R.xRange;
}

// Axes
const ridgeAxisMat = new THREE.MeshBasicMaterial({ color: COLORS.muted, transparent: true, opacity: 0 });

// X-axis at bottom
const ridgeXAxisGeo = new THREE.TubeGeometry(
  new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(R.xRange, 0, 0)),
  2, R.axisRadius, 8, false
);
const ridgeXAxis = new THREE.Mesh(ridgeXAxisGeo, ridgeAxisMat);
ridgeGroup.add(ridgeXAxis);

// Y-axis on left
const ridgeTotalH = (n - 1) * R.ySpacing + R.curveHeight;
const ridgeYAxisGeo = new THREE.TubeGeometry(
  new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, ridgeTotalH, 0)),
  2, R.axisRadius, 8, false
);
const ridgeYAxis = new THREE.Mesh(ridgeYAxisGeo, ridgeAxisMat.clone());
ridgeGroup.add(ridgeYAxis);

// ── Build distribution curves ────────────────────────────────

const ridgeCurves = []; // { fillMesh, fillMat, outlineObj, outlineMat, rowY, barIndex }

function buildCurveShape(value) {
  const sigma = value === 0 ? R.zeroSigma : R.sigma;
  const shape = new THREE.Shape();
  const pts = R.curvePoints;
  const dx = R.xRange / pts;

  // Sample Gaussian, clip at 0
  const samples = [];
  for (let i = 0; i <= pts; i++) {
    const x = i * dx;
    const dataX = (x / R.xRange) * dataXMax;
    let y = Math.exp(-((dataX - value) ** 2) / (2 * sigma ** 2));
    samples.push({ x, y });
  }

  // Normalize to curveHeight
  const peak = Math.max(...samples.map(s => s.y));
  if (peak > 0) samples.forEach(s => s.y = (s.y / peak) * R.curveHeight);

  // Shape: baseline → curve → baseline
  shape.moveTo(0, 0);
  samples.forEach(s => shape.lineTo(s.x, s.y));
  shape.lineTo(R.xRange, 0);
  shape.closePath();

  return { shape, samples };
}

// Create curves for each bar. Bars are sorted ascending (index 0 = lowest value).
// Ridgeline: highest value (index n-1) at bottom (y=0), lowest (index 0) at top.
for (let i = 0; i < n; i++) {
  const v = sortedValues[i];
  const color = v === 0 ? COLORS.muted.clone() : valueColor(v / maxVal);
  const rowY = (n - 1 - i) * R.ySpacing; // index 0 (lowest) → top, index n-1 (highest) → bottom

  const { shape, samples } = buildCurveShape(v);

  // Filled area — use background color so it occludes curves behind it
  const bgColor = new THREE.Color(COLORS.bg);
  const fillGeo = new THREE.ShapeGeometry(shape);
  const fillMat = new THREE.MeshBasicMaterial({
    color: bgColor,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const fillMesh = new THREE.Mesh(fillGeo, fillMat);
  fillMesh.position.set(0, rowY, 0.01 * i); // z-order: top curves in front
  fillMesh.renderOrder = i;
  ridgeGroup.add(fillMesh);

  // Outline — the colored curve on top
  const outlinePoints = samples
    .filter(s => s.y > 0.001)
    .map(s => new THREE.Vector3(s.x, rowY + s.y, 0.01 * i + 0.005));

  // Add baseline endpoints for a clean look
  if (outlinePoints.length > 0) {
    outlinePoints.unshift(new THREE.Vector3(outlinePoints[0].x, rowY, outlinePoints[0].z));
    outlinePoints.push(new THREE.Vector3(
      outlinePoints[outlinePoints.length - 1].x, rowY, outlinePoints[outlinePoints.length - 1].z
    ));
  }

  let outlineObj = null;
  let outlineMat = null;

  if (outlinePoints.length >= 2) {
    const curve = new THREE.CatmullRomCurve3(outlinePoints, false, "catmullrom", 0.5);
    const tubeGeo = new THREE.TubeGeometry(curve, outlinePoints.length * 4, R.axisRadius * 0.8, 6, false);
    outlineMat = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0,
    });
    outlineObj = new THREE.Mesh(tubeGeo, outlineMat);
    ridgeGroup.add(outlineObj);
  }

  ridgeCurves.push({ fillMesh, fillMat, outlineObj, outlineMat, rowY, barIndex: i, color });
}

// ══════════════════════════════════════════════════════════════
// PHASE STATE
// ══════════════════════════════════════════════════════════════

let currentPhase = 0;
let transitioning = false;
let pendingAdvance = false;

// ══════════════════════════════════════════════════════════════
// PHASE 1: Show bar chart + ridgeline axes
// ══════════════════════════════════════════════════════════════

function phase1() {
  transitioning = true;

  // Bars grow staggered
  bars.forEach((b, i) => {
    new TWEEN.Tween(b.mesh.scale)
      .to({ y: 1 }, CFG.timing.barAppear)
      .delay(i * CFG.timing.barStagger)
      .easing(TWEEN.Easing.Back.Out)
      .start();
  });

  const barsDone = n * CFG.timing.barStagger + CFG.timing.barAppear;

  // Ridgeline axes
  setTimeout(() => {
    new TWEEN.Tween(ridgeXAxis.material).to({ opacity: 1 }, CFG.timing.axesAppear).start();
    new TWEEN.Tween(ridgeYAxis.material).to({ opacity: 1 }, CFG.timing.axesAppear).start();

    showOverlay("ridge-x-label", "Deaths",
      new THREE.Vector3(CFG.ridgeOffsetX + R.xRange / 2, -0.6, 0));
    showOverlay("ridge-y-label", "Location",
      new THREE.Vector3(CFG.ridgeOffsetX, ridgeTotalH + 0.5, 0));
  }, barsDone);

  setTimeout(() => { transitioning = false; }, barsDone + CFG.timing.axesAppear);
}

// ══════════════════════════════════════════════════════════════
// PHASE 2: Bars morph to distributions
// ══════════════════════════════════════════════════════════════

function phase2() {
  transitioning = true;

  // Animate from highest value (bottom of ridgeline) to lowest (top)
  // ridgeCurves are indexed by bar ascending sort index, so curve for highest value = index n-1
  // We want to animate highest first → iterate from n-1 down to 0
  const order = [];
  for (let i = n - 1; i >= 0; i--) order.push(i);

  order.forEach((barIdx, step) => {
    const delay = step * CFG.timing.morphDelay;
    const curve = ridgeCurves.find(c => c.barIndex === barIdx);
    const bar = bars[barIdx];

    // Fade bar out
    new TWEEN.Tween(bar.mat)
      .to({ opacity: 0.10 }, CFG.timing.morphDuration)
      .delay(delay)
      .start();

    // Fade curve fill in (background-colored fill for occlusion)
    if (curve) {
      new TWEEN.Tween(curve.fillMat)
        .to({ opacity: R.fillOpacity }, CFG.timing.morphDuration)
        .delay(delay)
        .start();

      // Fade outline in
      if (curve.outlineMat) {
        new TWEEN.Tween(curve.outlineMat)
          .to({ opacity: R.lineOpacity }, CFG.timing.morphDuration)
          .delay(delay)
          .start();
      }
    }
  });

  const totalDuration = n * CFG.timing.morphDelay + CFG.timing.morphDuration;
  setTimeout(() => { transitioning = false; removeListeners(); }, totalDuration);
}

// ══════════════════════════════════════════════════════════════
// PHASE CONTROLLER
// ══════════════════════════════════════════════════════════════

function advancePhase() {
  if (currentPhase >= 2) return;
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
  switch (currentPhase) {
    case 1: phase1(); break;
    case 2: phase2(); break;
  }
}

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

// ══════════════════════════════════════════════════════════════
// RENDER LOOP
// ══════════════════════════════════════════════════════════════

function animate(time) {
  requestAnimationFrame(animate);
  TWEEN.update(time);
  if (pendingAdvance && !transitioning) {
    pendingAdvance = false;
    advancePhase();
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
