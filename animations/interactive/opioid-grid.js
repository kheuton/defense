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
} from "./config.js";

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

  // Expand slightly to avoid edge clipping
  const pad = radius;
  const centers = [];
  let col = 0;
  for (let x = minX - pad; x <= maxX + pad; x += colStep, col++) {
    const zOff = (col % 2) ? rowStep / 2 : 0;
    for (let z = minZ - pad; z <= maxZ + pad; z += rowStep) {
      const cz = z + zOff;
      if (pointInPolygon(x, cz, polygon)) {
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
const camera = new THREE.OrthographicCamera(
  -F * aspect, F * aspect, F, -F, 0.1, 500
);
camera.position.set(0, CAMERA.topDown.r, 0);
camera.up.set(0, 0, -1);
camera.lookAt(0, 0, 0);

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

const hexCenters = generateHexCenters(MA_OUTLINE, HEX.radius, HEX.gap);
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

const bars = []; // { mesh, value, gridX, gridZ, targetHeight }

hexCenters.forEach((center, i) => {
  const v = hexValues[i];
  const t = v / MAX_VAL;
  const color = valueColor(t);
  const mat = new THREE.MeshStandardMaterial({
    color,
    flatShading: true,
    transparent: true,
    opacity: v === 0 ? 0 : 1,
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

  // Sort survivors by BAR_CHART_DATA value (descending) for final layout
  const chartSorted = [...BAR_CHART_DATA].sort((a, b) => b.value - a.value);
  const chartMaxVal = Math.max(...chartSorted.map(d => d.value));
  const chartHScale = GRID.HEIGHT_SCALE / chartMaxVal;

  // Bar chart target positions
  const bw     = BAR_CHART.barWidth;
  const totalW = chartSorted.length * (bw + BAR_CHART.barGap) - BAR_CHART.barGap;
  const startX = -totalW / 2;

  // Map each survivor to a chart position (by rank)
  // Sort survivors descending to pair with chartSorted
  survivors.sort((a, b) => b.value - a.value);

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

  // Camera to front view
  const ct = CAMERA.barChart;
  new TWEEN.Tween(camera.position)
    .to({ x: ct.x, y: ct.y, z: ct.z }, TIMING.barChart.cameraDuration)
    .easing(EASING.barChart.camera)
    .onUpdate(() => camera.lookAt(ct.lookAt.x, ct.lookAt.y, ct.lookAt.z))
    .start();

  const done = onAllComplete(survivors.length, () => { transitioning = false; });
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

// ── Phase controller ──────────────────────────────────────────
function advancePhase() {
  if (transitioning || currentPhase >= 3) return;
  currentPhase++;
  document.getElementById("hud").classList.add("hidden");
  switch (currentPhase) {
    case 1: transitionToHeatmap(); break;
    case 2: transitionToIsometric(); break;
    case 3: transitionToBarChart(); break;
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
