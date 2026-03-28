/**
 * Opioid Overdose Deaths — Massachusetts Hex Grid Animation
 *
 * Three phases (click / arrow / Reveal.js fragment to advance):
 *   0 → 1  Heatmap: flat colored hex slabs appear on MA outline
 *   1 → 2  Isometric: camera rotates to SSE, bars grow to height
 *   2 → 3  Bar chart: bars arc up, morph mid-air, land as sorted chart
 *
 * All tunables are in config.js — see TUNING.md for a guide.
 */

import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import {
  COLORS, valueColor, MA_OUTLINE, HEX, GRID, CAMERA, BAR_CHART,
  TIMING, EASING, LIGHTING, HOTSPOTS, BAR_CHART_DATA,
  COMPARISON, PRED_LEFT, PRED_RIGHT,
  TIMING_COMPARISON, EASING_COMPARISON,
} from "./config.js";

// ── Deduplicate near-coincident polygon vertices ─────────────
// MA_OUTLINE has near-duplicate points (e.g. [-1.169, 0.584] / [-1.169, 0.582])
// that create near-zero-length segments, confusing the ray-casting test.
function deduplicatePolygon(polygon, eps = 0.01) {
  const out = [polygon[0]];
  for (let i = 1; i < polygon.length; i++) {
    const prev = out[out.length - 1];
    const dx = polygon[i][0] - prev[0];
    const dz = polygon[i][1] - prev[1];
    if (dx * dx + dz * dz > eps * eps) out.push(polygon[i]);
  }
  return out;
}

const MA_OUTLINE_CLEAN = deduplicatePolygon(MA_OUTLINE);

// ── Point-in-polygon (ray casting) ────────────────────────────
function pointInPolygon(x, z, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], zi = polygon[i][1];
    const xj = polygon[j][0], zj = polygon[j][1];
    if ((zi > z) !== (zj > z) &&
        x < (xj - xi) * (z - zi) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ── Distance from point to line segment ──────────────────────
function distToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  if (len2 === 0) return Math.hypot(px - ax, pz - az);
  let t = ((px - ax) * dx + (pz - az) * dz) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), pz - (az + t * dz));
}

// ── Distance from point to nearest polygon edge ─────────────
function distToPolygon(px, pz, polygon) {
  let minD = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const d = distToSegment(px, pz, polygon[j][0], polygon[j][1],
                            polygon[i][0], polygon[i][1]);
    if (d < minD) minD = d;
  }
  return minD;
}

// ── Hex grid generation ───────────────────────────────────────
function generateHexCenters(polygon, radius, gap) {
  // Flat-top hexagon spacing
  const colStep = (radius * 1.5) + gap;
  const rowStep = (radius * Math.sqrt(3)) + gap;

  // Bounding box of polygon
  const xs = polygon.map(p => p[0]);
  const zs = polygon.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minZ = Math.min(...zs), maxZ = Math.max(...zs);

  // Hex vertex offsets (flat-top)
  const vertexOffsets = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    vertexOffsets.push([radius * Math.cos(angle), radius * Math.sin(angle)]);
  }

  // Include hex if: center inside, any vertex inside, OR center within
  // radius of a polygon edge (catches gaps along straight boundary segments)
  const pad = radius * 2;
  const centers = [];
  let col = 0;
  for (let x = minX - pad; x <= maxX + pad; x += colStep, col++) {
    const zOff = (col % 2) ? rowStep / 2 : 0;
    for (let z = minZ - pad; z <= maxZ + pad; z += rowStep) {
      const cz = z + zOff;
      if (pointInPolygon(x, cz, polygon)) {
        centers.push({ x, z: cz });
        continue;
      }
      // Check vertices — include if any vertex is inside
      let added = false;
      for (const [dx, dz] of vertexOffsets) {
        if (pointInPolygon(x + dx, cz + dz, polygon)) {
          centers.push({ x, z: cz });
          added = true;
          break;
        }
      }
      // Fallback: include if center is within radius of any polygon edge
      if (!added && distToPolygon(x, cz, polygon) < radius * 0.9) {
        centers.push({ x, z: cz });
      }
    }
  }
  return centers;
}

// ── Hex geometry (flat-top, bottom face at y=0) ───────────────
function createHexGeometry(radius) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;  // flat-top: starts at 0°
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    bevelEnabled: false,
  });
  // ExtrudeGeometry extrudes along +z in shape space.
  // We want bars growing in +y, so rotate: shape XY → world XZ, extrude → +Y
  geo.rotateX(-Math.PI / 2);
  // Now the hex footprint is in XZ, height along +Y, bottom at y=0
  return geo;
}

// ── Renderer ──────────────────────────────────────────────────
const canvas   = document.getElementById("c");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(COLORS.bg);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// ── Scene ─────────────────────────────────────────────────────
const scene = new THREE.Scene();

// ── Camera ────────────────────────────────────────────────────
let aspect = window.innerWidth / window.innerHeight;
const F = CAMERA.frustum;
let currentFrustum = F; // tracks animated frustum changes
const camera = new THREE.OrthographicCamera(
  -F * aspect, F * aspect, F, -F, 0.1, 500
);
camera.position.set(0, CAMERA.topDown.r, 0);
camera.up.set(0, 0, -1);
camera.lookAt(0, 0, 0);

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  aspect = window.innerWidth / window.innerHeight;
  camera.left   = -currentFrustum * aspect;
  camera.right  =  currentFrustum * aspect;
  camera.top    =  currentFrustum;
  camera.bottom = -currentFrustum;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

// ── Lights ────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(LIGHTING.ambient.color, LIGHTING.ambient.intensity));
const dirLight = new THREE.DirectionalLight(LIGHTING.direction.color, LIGHTING.direction.intensity);
dirLight.position.set(...LIGHTING.direction.position);
scene.add(dirLight);

// ── Massachusetts ground plane ────────────────────────────────
// Shape is 2D (x, y). After rotateX(-π/2), shape-y maps to world -z.
// Negate z when building the shape so it ends up correct in world space.
const maShape = new THREE.Shape();
maShape.moveTo(MA_OUTLINE[0][0], -MA_OUTLINE[0][1]);
for (let i = 1; i < MA_OUTLINE.length; i++) {
  maShape.lineTo(MA_OUTLINE[i][0], -MA_OUTLINE[i][1]);
}
maShape.closePath();

const groundGeo = new THREE.ShapeGeometry(maShape);
groundGeo.rotateX(-Math.PI / 2);
const groundMat = new THREE.MeshBasicMaterial({
  color: COLORS.grid,
  transparent: true,
  opacity: GRID.GROUND_OPACITY,
  side: THREE.DoubleSide,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.position.y = -0.01;
scene.add(ground);

// Visible border line
const edgePoints = MA_OUTLINE.map(([x, z]) => new THREE.Vector3(x, 0, z));
edgePoints.push(edgePoints[0].clone());
const edgeGeo = new THREE.BufferGeometry().setFromPoints(edgePoints);
const edgeMat = new THREE.LineBasicMaterial({
  color: COLORS.edge,
  transparent: true,
  opacity: 1,
});
const edgeLine = new THREE.Line(edgeGeo, edgeMat);
scene.add(edgeLine);

// ── Build hex grid of bars ────────────────────────────────────
const gridGroup = new THREE.Group();
scene.add(gridGroup);

const hexCenters = generateHexCenters(MA_OUTLINE_CLEAN, HEX.radius, HEX.gap);
const hexGeo = createHexGeometry(HEX.radius);

// Compute value for each hex from hotspot Gaussians
function hexValue(cx, cz) {
  let sum = 0;
  for (const h of HOTSPOTS) {
    const dx = cx - h.x, dz = cz - h.z;
    const dist2 = dx * dx + dz * dz;
    sum += h.peak * Math.exp(-dist2 / (2 * h.sigma * h.sigma));
  }
  return Math.round(sum);
}

const hexValues = hexCenters.map(c => hexValue(c.x, c.z));
const MAX_VAL = Math.max(...hexValues, 1);
const H_SCALE = GRID.HEIGHT_SCALE / MAX_VAL;

// DEBUG: log hex grid stats
console.log(`Hex grid: ${hexCenters.length} hexes, polygon has ${MA_OUTLINE_CLEAN.length} vertices (was ${MA_OUTLINE.length})`);
console.log(`Bounding box: x=[${Math.min(...hexCenters.map(c=>c.x)).toFixed(2)}, ${Math.max(...hexCenters.map(c=>c.x)).toFixed(2)}] z=[${Math.min(...hexCenters.map(c=>c.z)).toFixed(2)}, ${Math.max(...hexCenters.map(c=>c.z)).toFixed(2)}]`);

const bars = []; // { mesh, value, gridX, gridZ, targetHeight }

hexCenters.forEach((center, i) => {
  const v = hexValues[i];
  const t = v / MAX_VAL;
  const color = valueColor(t);
  const mat = new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    transparent: true,
    opacity: 1,
  });
  const mesh = new THREE.Mesh(hexGeo, mat);
  mesh.position.set(center.x, 0, center.z);
  mesh.scale.y = 0.001;
  gridGroup.add(mesh);
  bars.push({
    mesh,
    value: v,
    gridX: center.x,
    gridZ: center.z,
    targetHeight: Math.max(v * H_SCALE, 0.05),
  });
});

// ── Animation state ───────────────────────────────────────────
let currentPhase = 0;
let transitioning = false;

// ── Chart state (set during phase 3, used by phases 4+) ──────
let chartBars = [];       // survivor bar objects sorted ascending
let chartDataSorted = []; // sorted BAR_CHART_DATA values (ascending)
let chartHScaleVal = 1;   // height scale for chart values
let chartStartXVal = 0;   // leftmost bar x
let chartTotalW = 0;      // total chart width
let axisGroup = null;     // THREE.Group holding axis lines

// ── Comparison state (set during phases 4+) ──────────────────
let leftGroup, rightGroup;
let leftBars = [], rightBars = [];
let leftPredictions = [], rightPredictions = [];
let leftLine, rightLine;
let leftFills = [], rightFills = [];
let comparisonFrustum = 0; // expanded frustum for side-by-side

function onAllComplete(total, cb) {
  let n = 0;
  return () => { if (++n >= total) cb(); };
}

// ── Phase 1: Heatmap ─────────────────────────────────────────
function transitionToHeatmap() {
  transitioning = true;
  const SLAB_H = 0.12;
  const center = new THREE.Vector2(0, 0);
  let maxDist = 0;
  bars.forEach((b) => {
    const d = center.distanceTo(new THREE.Vector2(b.gridX, b.gridZ));
    if (d > maxDist) maxDist = d;
  });

  const done = onAllComplete(bars.length, () => { transitioning = false; });

  bars.forEach((b) => {
    if (b.value === 0) { done(); return; }
    const d = center.distanceTo(new THREE.Vector2(b.gridX, b.gridZ));
    const delay = (d / maxDist) * TIMING.heatmap.maxDelay;
    new TWEEN.Tween(b.mesh.scale)
      .to({ y: SLAB_H }, TIMING.heatmap.duration)
      .delay(delay)
      .easing(EASING.heatmap)
      .onComplete(done)
      .start();
  });
}

// ── Phase 2: Isometric + bar growth ──────────────────────────
function transitionToIsometric() {
  transitioning = true;

  const start = CAMERA.topDown;
  const end   = CAMERA.isometric;
  const cam = { r: start.r, phi: start.phi, theta: start.theta };

  new TWEEN.Tween(cam)
    .to({ r: end.r, phi: end.phi, theta: end.theta }, TIMING.isometric.cameraDuration)
    .easing(EASING.isometric.camera)
    .onUpdate(() => {
      camera.position.set(
        cam.r * Math.sin(cam.phi) * Math.sin(cam.theta),
        cam.r * Math.cos(cam.phi),
        cam.r * Math.sin(cam.phi) * Math.cos(cam.theta)
      );
      camera.lookAt(0, 0, 0);
    })
    .start();

  const sorted = [...bars].sort((a, b) => a.value - b.value);
  const done = onAllComplete(bars.length, () => { transitioning = false; });

  sorted.forEach((b, i) => {
    if (b.value === 0) { done(); return; }
    const delay = (i / sorted.length) * TIMING.isometric.barMaxDelay;
    new TWEEN.Tween(b.mesh.scale)
      .to({ y: b.targetHeight }, TIMING.isometric.barDuration)
      .delay(delay)
      .easing(EASING.isometric.bar)
      .onComplete(done)
      .start();
  });
}

// ── Phase 3: Bars fly to sorted bar chart with mid-arc morph ─
function transitionToBarChart() {
  transitioning = true;

  // Determine survivors: top N bars by value (N = BAR_CHART_DATA.length)
  const N = BAR_CHART_DATA.length;
  const sortedByValue = [...bars].filter(b => b.value > 0)
    .sort((a, b) => b.value - a.value);

  const survivors = sortedByValue.slice(0, N);
  const doomed    = sortedByValue.slice(N);
  const zeroBars  = bars.filter(b => b.value === 0);

  // Sort survivors by BAR_CHART_DATA value (ascending) — smallest left, largest right
  const chartSorted = [...BAR_CHART_DATA].sort((a, b) => a.value - b.value);
  const chartMaxVal = Math.max(...chartSorted.map(d => d.value));
  const chartHScale = GRID.HEIGHT_SCALE / chartMaxVal;

  // Bar chart target positions
  const bw     = BAR_CHART.barWidth;
  const totalW = chartSorted.length * (bw + BAR_CHART.barGap) - BAR_CHART.barGap;
  const startX = -totalW / 2;

  // Map each survivor to a chart position (by rank)
  // Sort survivors ascending to pair with chartSorted
  survivors.sort((a, b) => a.value - b.value);

  // Fade zero-value bars
  zeroBars.forEach((b) => {
    new TWEEN.Tween(b.mesh.material)
      .to({ opacity: 0 }, TIMING.barChart.fadeGroundDuration)
      .start();
  });

  // Fade ground plane and edge line
  new TWEEN.Tween(groundMat)
    .to({ opacity: 0 }, TIMING.barChart.fadeGroundDuration)
    .start();
  new TWEEN.Tween(edgeMat)
    .to({ opacity: 0 }, TIMING.barChart.fadeGroundDuration)
    .start();

  // Camera to front view — must also fix up vector from top-down (0,0,-1)
  // to front-facing (0,1,0), otherwise x-offsets appear vertical on screen.
  camera.up.set(0, 1, 0);
  const ct = CAMERA.barChart;
  new TWEEN.Tween(camera.position)
    .to({ x: ct.x, y: ct.y, z: ct.z }, TIMING.barChart.cameraDuration)
    .easing(EASING.barChart.camera)
    .onUpdate(() => camera.lookAt(ct.lookAt.x, ct.lookAt.y, ct.lookAt.z))
    .start();

  const done = onAllComplete(survivors.length, () => {
    // Store chart state for phases 4+
    chartBars = survivors.map((b, i) => ({
      mesh: b.mesh,
      value: chartSorted[i].value,
      label: chartSorted[i].label,
    }));
    chartDataSorted = chartSorted.map(d => d.value);
    chartHScaleVal = chartHScale;
    chartStartXVal = startX;
    chartTotalW = totalW;

    // Draw axes
    axisGroup = new THREE.Group();
    const axisMat = new THREE.LineBasicMaterial({ color: COLORS.muted });
    // X-axis: along bottom
    const xPts = [
      new THREE.Vector3(startX - 0.1, 0, 0),
      new THREE.Vector3(startX + totalW + 0.1, 0, 0),
    ];
    axisGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(xPts), axisMat
    ));
    // Y-axis: along left side
    const yPts = [
      new THREE.Vector3(startX - 0.1, 0, 0),
      new THREE.Vector3(startX - 0.1, GRID.HEIGHT_SCALE + 0.5, 0),
    ];
    axisGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(yPts), axisMat
    ));
    scene.add(axisGroup);

    transitioning = false;
  });
  const arcY = BAR_CHART.arcHeight;

  // ── Survivors: arc up → morph (resize) → arc down to chart position ──
  survivors.forEach((b, i) => {
    const tx = startX + i * (bw + BAR_CHART.barGap) + bw / 2;
    const delay = i * TIMING.barChart.stagger;

    // Midpoint: drift toward center
    const midX = b.mesh.position.x * 0.3;
    const midZ = b.mesh.position.z * 0.3;

    // New target height from chart data
    const chartVal  = chartSorted[i].value;
    const newHeight = Math.max(chartVal * chartHScale, 0.05);

    // Arc down tween (phase 3c)
    const arcDown = new TWEEN.Tween(b.mesh.position)
      .to({ x: tx, y: 0, z: 0 }, TIMING.barChart.landDuration)
      .easing(EASING.barChart.arcDown)
      .onComplete(done);

    // Morph tween: pause at peak + resize height (phase 3b)
    const morph = new TWEEN.Tween(b.mesh.scale)
      .to({ y: newHeight }, TIMING.barChart.morphHeightAdjust)
      .easing(EASING.barChart.morphHeight)
      .onComplete(() => arcDown.start());

    // Arc up tween (phase 3a)
    new TWEEN.Tween(b.mesh.position)
      .to({ x: midX, y: arcY, z: midZ }, TIMING.barChart.arcDuration)
      .delay(delay)
      .easing(EASING.barChart.arcUp)
      .onComplete(() => morph.start())
      .start();

    // Rescale width to uniform bar width
    new TWEEN.Tween(b.mesh.scale)
      .to({ x: bw / (HEX.radius * 2), z: bw / (HEX.radius * 2) }, TIMING.barChart.scaleDuration)
      .delay(delay)
      .easing(EASING.barChart.scale)
      .start();

    // Recolor to match chart data value
    const chartT = chartVal / chartMaxVal;
    const newColor = valueColor(chartT);
    new TWEEN.Tween(b.mesh.material.color)
      .to({ r: newColor.r, g: newColor.g, b: newColor.b }, TIMING.barChart.morphHeightAdjust)
      .delay(delay + TIMING.barChart.arcDuration)
      .start();
  });

  // ── Doomed bars: arc up → fade out ──
  doomed.forEach((b, i) => {
    const delay = (survivors.length + i) * TIMING.barChart.stagger;
    const midX = b.mesh.position.x * 0.2;
    const midZ = b.mesh.position.z * 0.2;

    const fade = new TWEEN.Tween(b.mesh.material)
      .to({ opacity: 0 }, TIMING.barChart.morphFadeOut)
      .easing(EASING.barChart.morphFade);

    new TWEEN.Tween(b.mesh.position)
      .to({ x: midX, y: arcY, z: midZ }, TIMING.barChart.arcDuration)
      .delay(delay)
      .easing(EASING.barChart.arcUp)
      .onComplete(() => fade.start())
      .start();

    // Also shrink doomed bars slightly during arc
    new TWEEN.Tween(b.mesh.scale)
      .to({ x: 0.5, z: 0.5 }, TIMING.barChart.arcDuration)
      .delay(delay)
      .easing(EASING.barChart.scale)
      .start();
  });
}

// ══════════════════════════════════════════════════════════════
// COMPARISON PHASES (4-9)
// ══════════════════════════════════════════════════════════════

// ── Helpers: seeded PRNG ─────────────────────────────────────
function makePRNG(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

function makeGaussRNG(seed) {
  const rand = makePRNG(seed);
  let spare = null;
  return () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u, v, s;
    do { u = rand() * 2 - 1; v = rand() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const mul = Math.sqrt(-2 * Math.log(s) / s);
    spare = v * mul;
    return u * mul;
  };
}

// ── Helpers: prediction computation ──────────────────────────
function computeLeftPredictions(data, k) {
  const gauss = makeGaussRNG(PRED_LEFT.seed);
  const n = data.length;
  const preds = data.map((v, i) => {
    const isTopK = i >= n - k;
    const sigma = isTopK ? PRED_LEFT.topNoiseSigma : PRED_LEFT.noiseSigma;
    return Math.max(0, v + gauss() * sigma);
  });

  // Deliberately shuffle some top-K predictions with values just below
  // to ensure the model's predicted top-K ≠ actual top-K
  // Swap the highest predicted value into a position just below top-K
  const topStart = n - k;
  // Find the bar with highest prediction in top-K
  let maxPredIdx = topStart;
  for (let i = topStart + 1; i < n; i++) {
    if (preds[i] > preds[maxPredIdx]) maxPredIdx = i;
  }
  // Swap it with a bar just below top-K (this guarantees at least 1 wrong pick)
  const swapIdx = topStart - 2; // two below the cutoff
  if (swapIdx >= 0) {
    const tmp = preds[maxPredIdx];
    preds[maxPredIdx] = preds[swapIdx];
    preds[swapIdx] = tmp;
  }
  return preds;
}

function computeRightPredictions(data) {
  return data.map((_, i) => {
    const val = PRED_RIGHT.a * (i - PRED_RIGHT.c) ** 2 + PRED_RIGHT.d;
    return Math.max(0, val);
  });
}

// ── Helpers: world-to-screen for HTML overlays ───────────────
function worldToScreen(worldPos) {
  // Ensure camera matrices are current (may be called from async callbacks
  // between render frames, where matrices haven't been updated yet)
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
  if (!el) { console.error(`showOverlay: element #${id} not found`); return; }
  el.innerHTML = html;
  positionOverlay(el, worldPos, offsetY);
  el.classList.add("visible");
  // DEBUG: log overlay positioning
  const screen = worldToScreen(worldPos);
  console.log(`showOverlay("${id}"): world=(${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)}, ${worldPos.z.toFixed(1)}) → screen=(${screen.x.toFixed(0)}, ${screen.y.toFixed(0)}) offsetY=${offsetY} classes="${el.className}" computed-opacity=${getComputedStyle(el).opacity}`);
}

function hideOverlay(id) {
  document.getElementById(id).classList.remove("visible");
}

// ── Helpers: blink effect ────────────────────────────────────
function blinkBars(barList, count, duration) {
  return new Promise((resolve) => {
    let i = 0;
    function doBlink() {
      if (i >= count) { resolve(); return; }
      // Flash on
      barList.forEach(b => {
        b.mesh.material.emissive = new THREE.Color(0x444466);
        b.mesh.material.emissiveIntensity = 0.5;
      });
      setTimeout(() => {
        // Flash off
        barList.forEach(b => {
          b.mesh.material.emissiveIntensity = 0;
        });
        i++;
        setTimeout(doBlink, duration / 2);
      }, duration);
    }
    doBlink();
  });
}

// ── Helpers: update frustum smoothly ─────────────────────────
function tweenFrustum(targetF, duration) {
  const state = { f: currentFrustum };
  return new TWEEN.Tween(state)
    .to({ f: targetF }, duration)
    .easing(TWEEN.Easing.Quadratic.InOut)
    .onUpdate(() => {
      currentFrustum = state.f;
      camera.left   = -state.f * aspect;
      camera.right  =  state.f * aspect;
      camera.top    =  state.f;
      camera.bottom = -state.f;
      camera.updateProjectionMatrix();
    });
}

// ── Helper: create a line from bar-position predictions ──────
function createPredictionLine(predictions, barPositions, hScale, group) {
  const points = predictions.map((p, i) => {
    return new THREE.Vector3(barPositions[i], p * hScale, 0.5);
  });
  // Add interpolated points between bars for smoother line
  const smoothPoints = [];
  for (let i = 0; i < points.length; i++) {
    smoothPoints.push(points[i]);
    if (i < points.length - 1) {
      const mid = points[i].clone().lerp(points[i + 1], 0.5);
      smoothPoints.push(mid);
    }
  }
  const geo = new THREE.BufferGeometry().setFromPoints(smoothPoints);
  const mat = new THREE.LineBasicMaterial({
    color: COLORS.purple,
    transparent: true,
    opacity: 0,
  });
  const line = new THREE.Line(geo, mat);
  group.add(line);
  return { line, mat };
}

// ── Helper: create error fill quads between bars and line ────
function createFillQuads(predictions, barValues, barPositions, hScale, bw, group) {
  const fills = [];
  const fillMat = new THREE.MeshBasicMaterial({
    color: COLORS.muted,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  predictions.forEach((pred, i) => {
    const actual = barValues[i];
    const predY = pred * hScale;
    const actualY = actual * hScale;
    const height = Math.abs(predY - actualY);
    if (height < 0.01) {
      fills.push(null);
      return;
    }
    const geo = new THREE.PlaneGeometry(bw * 0.9, height);
    const mat = fillMat.clone();
    const mesh = new THREE.Mesh(geo, mat);
    const midY = (predY + actualY) / 2;
    mesh.position.set(barPositions[i], midY, 0.5);
    group.add(mesh);
    fills.push({ mesh, mat });
  });
  return fills;
}

// ── Phase 4: Split bar chart into two copies ─────────────────
function transitionToSplit() {
  transitioning = true;

  // Create groups
  leftGroup = new THREE.Group();
  rightGroup = new THREE.Group();

  // Get bar x-positions (local to group, before reparenting)
  const barPositions = chartBars.map(b => b.mesh.position.x);

  // Move bars into left group
  chartBars.forEach(b => {
    b.mesh.parent.remove(b.mesh);
    leftGroup.add(b.mesh);
    // Adjust position to be local to group (bar positions stay the same,
    // group position controls offset)
  });

  // Clone bars for right group
  rightBars = chartBars.map(b => {
    const clone = b.mesh.clone();
    clone.material = b.mesh.material.clone();
    rightGroup.add(clone);
    return { mesh: clone, value: b.value, label: b.label };
  });
  leftBars = chartBars;

  // Move axes into left group, clone for right
  if (axisGroup) {
    scene.remove(axisGroup);
    leftGroup.add(axisGroup);
    const rightAxes = axisGroup.clone();
    rightGroup.add(rightAxes);
  }

  scene.add(leftGroup);
  scene.add(rightGroup);

  // Compute offset so charts are side-by-side with gap
  const halfGap = COMPARISON.gap / 2;
  const offset = chartTotalW / 2 + halfGap;

  // Expand frustum to fit both charts
  comparisonFrustum = F * COMPARISON.frustumScale;
  const frustumTween = tweenFrustum(comparisonFrustum, TIMING_COMPARISON.splitDuration);

  // Also shift camera lookAt to center
  const ct = CAMERA.barChart;
  new TWEEN.Tween(camera.position)
    .to({ x: 0, y: ct.y, z: ct.z }, TIMING_COMPARISON.splitDuration)
    .easing(EASING_COMPARISON.split)
    .onUpdate(() => camera.lookAt(0, ct.lookAt.y, 0))
    .start();

  // Slide groups apart
  new TWEEN.Tween(leftGroup.position)
    .to({ x: -offset }, TIMING_COMPARISON.splitDuration)
    .easing(EASING_COMPARISON.split)
    .start();

  new TWEEN.Tween(rightGroup.position)
    .to({ x: offset }, TIMING_COMPARISON.splitDuration)
    .easing(EASING_COMPARISON.split)
    .onComplete(() => {
      // Show labels above each chart
      const labelY = GRID.HEIGHT_SCALE + 1.5;
      showOverlay("left-label", PRED_LEFT.label,
        new THREE.Vector3(-offset, labelY, 0));
      showOverlay("right-label", PRED_RIGHT.label,
        new THREE.Vector3(offset, labelY, 0));
      transitioning = false;
    })
    .start();

  frustumTween.start();
}

// ── Phase 5: Prediction lines appear ─────────────────────────
function transitionToLines() {
  transitioning = true;

  const bw = BAR_CHART.barWidth;
  const barPositions = chartBars.map(b => b.mesh.position.x);

  // Compute predictions
  leftPredictions = computeLeftPredictions(chartDataSorted, COMPARISON.k);
  rightPredictions = computeRightPredictions(chartDataSorted);

  // Create lines
  const leftResult = createPredictionLine(
    leftPredictions, barPositions, chartHScaleVal, leftGroup
  );
  const rightResult = createPredictionLine(
    rightPredictions, barPositions, chartHScaleVal, rightGroup
  );
  leftLine = leftResult;
  rightLine = rightResult;

  // Fade lines in
  const done = onAllComplete(2, () => { transitioning = false; });
  new TWEEN.Tween(leftLine.mat)
    .to({ opacity: 1 }, TIMING_COMPARISON.lineDrawDuration)
    .easing(EASING_COMPARISON.lineDraw)
    .onComplete(done)
    .start();
  new TWEEN.Tween(rightLine.mat)
    .to({ opacity: 1 }, TIMING_COMPARISON.lineDrawDuration)
    .easing(EASING_COMPARISON.lineDraw)
    .onComplete(done)
    .start();
}

// ── Phase 6: Error fill (bar by bar, both charts) ────────────
function transitionToFill() {
  transitioning = true;

  const bw = BAR_CHART.barWidth;
  const barPositions = chartBars.map(b => b.mesh.position.x);

  leftFills = createFillQuads(
    leftPredictions, chartDataSorted, barPositions,
    chartHScaleVal, bw, leftGroup
  );
  rightFills = createFillQuads(
    rightPredictions, chartDataSorted, barPositions,
    chartHScaleVal, bw, rightGroup
  );

  const n = chartDataSorted.length;

  for (let i = 0; i < n; i++) {
    const delay = i * TIMING_COMPARISON.fillPerBar;

    // Left fill
    if (leftFills[i]) {
      new TWEEN.Tween(leftFills[i].mat)
        .to({ opacity: 0.3 }, TIMING_COMPARISON.fillFadeDuration)
        .delay(delay)
        .easing(EASING_COMPARISON.fill)
        .start();
    }
    // Right fill
    if (rightFills[i]) {
      new TWEEN.Tween(rightFills[i].mat)
        .to({ opacity: 0.3 }, TIMING_COMPARISON.fillFadeDuration)
        .delay(delay)
        .easing(EASING_COMPARISON.fill)
        .start();
    }
  }

  // Total duration: last bar's delay + its fade duration
  const totalDuration = (n - 1) * TIMING_COMPARISON.fillPerBar + TIMING_COMPARISON.fillFadeDuration;
  setTimeout(() => { transitioning = false; }, totalDuration);
}

// ── Phase 7: Blink + RMSE text ───────────────────────────────
function transitionToRMSE() {
  transitioning = true;

  // Compute RMSE for each model
  const n = chartDataSorted.length;
  const mseLeft = leftPredictions.reduce((sum, p, i) =>
    sum + (p - chartDataSorted[i]) ** 2, 0) / n;
  const mseRight = rightPredictions.reduce((sum, p, i) =>
    sum + (p - chartDataSorted[i]) ** 2, 0) / n;
  const rmseLeft = Math.sqrt(mseLeft);
  const rmseRight = Math.sqrt(mseRight);

  console.log(`phase 7: RMSE left=${rmseLeft.toFixed(2)}, right=${rmseRight.toFixed(2)}`);
  console.log(`phase 7: leftBars=${leftBars.length}, rightBars=${rightBars.length}`);

  // Blink both charts
  Promise.all([
    blinkBars(leftBars, TIMING_COMPARISON.blinkCount, TIMING_COMPARISON.blinkDuration),
    blinkBars(rightBars, TIMING_COMPARISON.blinkCount, TIMING_COMPARISON.blinkDuration),
  ]).then(() => {
    console.log("phase 7: blink done, showing RMSE text");
    // Show RMSE text below each chart
    const halfGap = COMPARISON.gap / 2;
    const offset = chartTotalW / 2 + halfGap;
    const textY = -1.5;

    showOverlay("left-rmse",
      `RMSE = <span class="value">${rmseLeft.toFixed(2)}</span>`,
      new THREE.Vector3(-offset, textY, 0), 0);
    showOverlay("right-rmse",
      `RMSE = <span class="value">${rmseRight.toFixed(2)}</span>`,
      new THREE.Vector3(offset, textY, 0), 0);

    transitioning = false;
  });
}

// ── Phase 8: Fade error fill, highlight top-K ────────────────
function transitionToTopK() {
  transitioning = true;

  const n = chartDataSorted.length;
  const k = COMPARISON.k;
  const topStart = n - k; // top-K are the last k bars (ascending order)

  // Fade out all fill quads
  [...leftFills, ...rightFills].forEach(f => {
    if (f) {
      new TWEEN.Tween(f.mat)
        .to({ opacity: 0 }, TIMING_COMPARISON.errorFadeOut)
        .start();
    }
  });

  // Fade non-top-K bars to heavy transparency
  const fadeNonTopK = (barList) => {
    barList.forEach((b, i) => {
      if (i < topStart) {
        new TWEEN.Tween(b.mesh.material)
          .to({ opacity: 0.12 }, TIMING_COMPARISON.barFadeDuration)
          .start();
      }
    });
  };
  fadeNonTopK(leftBars);
  fadeNonTopK(rightBars);

  // Also fade prediction lines to lower opacity
  if (leftLine) {
    new TWEEN.Tween(leftLine.mat)
      .to({ opacity: 0.3 }, TIMING_COMPARISON.barFadeDuration)
      .start();
  }
  if (rightLine) {
    new TWEEN.Tween(rightLine.mat)
      .to({ opacity: 0.3 }, TIMING_COMPARISON.barFadeDuration)
      .start();
  }

  setTimeout(() => { transitioning = false; },
    TIMING_COMPARISON.barFadeDuration + 100);
}

// ── Phase 9: Ranking evaluation ──────────────────────────────
function transitionToEval() {
  transitioning = true;

  const n = chartDataSorted.length;
  const k = COMPARISON.k;

  // True top-K: last k bars (ascending order), sum of their actual values
  const trueTopKIndices = [];
  for (let i = n - k; i < n; i++) trueTopKIndices.push(i);
  const trueTopKSum = trueTopKIndices.reduce((s, i) => s + chartDataSorted[i], 0);

  // Left model's top-K: indices of k highest LEFT predictions
  const leftRanked = leftPredictions
    .map((p, i) => ({ pred: p, idx: i }))
    .sort((a, b) => b.pred - a.pred)
    .slice(0, k)
    .map(d => d.idx);
  const leftSelectedSum = leftRanked.reduce((s, i) => s + chartDataSorted[i], 0);
  const leftPct = ((leftSelectedSum / trueTopKSum) * 100).toFixed(0);

  // Right model's top-K: indices of k highest RIGHT predictions
  const rightRanked = rightPredictions
    .map((p, i) => ({ pred: p, idx: i }))
    .sort((a, b) => b.pred - a.pred)
    .slice(0, k)
    .map(d => d.idx);
  const rightSelectedSum = rightRanked.reduce((s, i) => s + chartDataSorted[i], 0);
  const rightPct = ((rightSelectedSum / trueTopKSum) * 100).toFixed(0);

  const halfGap = COMPARISON.gap / 2;
  const offset = chartTotalW / 2 + halfGap;

  // ── Left chart evaluation (sequential) ──
  const evalTextY = -2.5;

  blinkBars(leftBars, TIMING_COMPARISON.blinkCount, TIMING_COMPARISON.blinkDuration)
    .then(() => {
      // Line 1: numerator
      showOverlay("left-eval",
        `Overdoses at model's top ${k} = <span class="value">${leftSelectedSum}</span>`,
        new THREE.Vector3(-offset, evalTextY, 0), 0);

      return new Promise(r => setTimeout(r, TIMING_COMPARISON.evalLineDelay));
    })
    .then(() => {
      // Line 2: denominator + result
      const pctClass = leftPct >= 90 ? "good" : "bad";
      showOverlay("left-eval",
        `Overdoses at model's top ${k} = <span class="value">${leftSelectedSum}</span>`
        + `<br>Overdoses at true top ${k} = <span class="value">${trueTopKSum}</span>`
        + `<br><span class="result ${pctClass}">= ${leftPct}%</span>`,
        new THREE.Vector3(-offset, evalTextY, 0), 0);

      return new Promise(r => setTimeout(r, TIMING_COMPARISON.evalChartDelay));
    })
    .then(() => {
      // ── Right chart evaluation ──
      return blinkBars(rightBars, TIMING_COMPARISON.blinkCount, TIMING_COMPARISON.blinkDuration);
    })
    .then(() => {
      showOverlay("right-eval",
        `Overdoses at model's top ${k} = <span class="value">${rightSelectedSum}</span>`,
        new THREE.Vector3(offset, evalTextY, 0), 0);

      return new Promise(r => setTimeout(r, TIMING_COMPARISON.evalLineDelay));
    })
    .then(() => {
      const pctClass = rightPct >= 90 ? "good" : "bad";
      showOverlay("right-eval",
        `Overdoses at model's top ${k} = <span class="value">${rightSelectedSum}</span>`
        + `<br>Overdoses at true top ${k} = <span class="value">${trueTopKSum}</span>`
        + `<br><span class="result ${pctClass}">= ${rightPct}%</span>`,
        new THREE.Vector3(offset, evalTextY, 0), 0);

      transitioning = false;
    });
}

// ── Phase controller ──────────────────────────────────────────
function advancePhase() {
  console.log(`advancePhase: current=${currentPhase}, transitioning=${transitioning}`);
  if (transitioning || currentPhase >= 9) return;
  currentPhase++;
  console.log(`→ entering phase ${currentPhase}`);
  document.getElementById("hud").classList.add("hidden");
  switch (currentPhase) {
    case 1: transitionToHeatmap(); break;
    case 2: transitionToIsometric(); break;
    case 3: transitionToBarChart(); break;
    case 4: transitionToSplit(); break;
    case 5: transitionToLines(); break;
    case 6: transitionToFill(); break;
    case 7: transitionToRMSE(); break;
    case 8: transitionToTopK(); break;
    case 9: transitionToEval(); break;
  }
}

// ── Event handling ────────────────────────────────────────────
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
} catch (_) {
  // Cross-origin or no Reveal — standalone mode
}

// ── Render loop ───────────────────────────────────────────────
function animate(time) {
  requestAnimationFrame(animate);
  TWEEN.update(time);
  renderer.render(scene, camera);
}
animate();
