// bench-bump-rerun-main.js — animated benchmark chart for rerun dataset (5 main tasks + avg rank)
import { el, drawMarker, scaleLog, scaleLinear, jitter,
         buildAxis, buildLegend, RERUN_METHODS, RERUN_LEGEND_GROUPS } from './bench-bump-utils.js';

// ── Embedded data ─────────────────────────────────────────────────────────────
const DATA = {
  regret: {
    knapsack:          { MSE:5.4385,DFL:6.7052,'Identity':23.8469,'SPO+':6.2646,NCE:14.8286,Blackbox:24.315,'pt-LTR':5.7965,'pr-LTR':7.8893,'L-LTR':5.8516,LODL:24.0259,Perturb:12.13,QPTL:20.0743,cpLayer:24.315 },
    'knapsack-real':   { MSE:7.6315,DFL:7.1128,'Identity':35.136,'SPO+':7.0089,NCE:12.05,Blackbox:36.5685,'pt-LTR':8.4238,'pr-LTR':10.9848,'L-LTR':7.1757,LODL:9.9221,Perturb:9.1507,QPTL:null,cpLayer:null },
    energy:            { MSE:1.9954,DFL:13.9125,'Identity':13.9733,'SPO+':1.8092,NCE:1.8914,Blackbox:6.6189,'pt-LTR':1.9931,'pr-LTR':2.0371,'L-LTR':2.0052,LODL:2.4379,Perturb:1.9704,QPTL:null,cpLayer:null },
    cubic:             { MSE:0.0324,DFL:2.2022,'Identity':13.8937,'SPO+':160.4079,NCE:142.6018,Blackbox:13.8937,'pt-LTR':0.0532,'pr-LTR':0.4178,'L-LTR':0.00883,LODL:4.218,Perturb:13.544,QPTL:null,cpLayer:null },
    bipartitematching: { MSE:91.8526,DFL:93.6941,'Identity':92.2284,'SPO+':92.2017,NCE:89.9987,Blackbox:92.6355,'pt-LTR':92.1469,'pr-LTR':90.9364,'L-LTR':89.803,LODL:93.9183,Perturb:93.8542,QPTL:92.046,cpLayer:92.003 },
  },
  avg_rank: { mse:3.8571,dfl:7.1429,identity:9.4286,spo:4.2857,nce:7.1429,blackbox:9.2857,pointLTR:4.0,pairLTR:5.5714,listLTR:2.5714,lodl:8.5714,perturb:7.2857,qptl:8.6667,cpLayer:9.0 },
};

// Tasks shown on this slide (the "rest" group)
const REST_TASKS = ['knapsack', 'knapsack-real', 'energy', 'cubic', 'bipartitematching'];

// ── Layout ────────────────────────────────────────────────────────────────────
// 5 task cols (colW=185, colGap=20, colStep=205) + avg rank col (width=150) + legend (width=148)
// leftStart = (1600 - (5*205-20 + 20+150 + 12+148)) / 2 = (1600-1335)/2 = 132 (centered)
// col(i).left = 132 + i*205
// col(4).right = 132+4*205+185 = 132+820+185 = 1137
// avgLeft = 1137+20 = 1157, avgRight = 1157+150 = 1307
// legendX = 1307+14 = 1321, legendRight = 1321+148 = 1469

const G = {
  leftStart: 132, colW: 185, colStep: 205,
  ct: 112, cb: 778, H: 666,
  titleY1: 82, titleY2: 96,
  leftPad: 28, otherPad: 10, rightPad: 8,
  // avg rank column
  avgLeft: 1157, avgRight: 1307,
  // legend
  legendX: 1321, legendY: 112, legendW: 148,
};

const G_AVG_CL  = G.avgLeft + G.leftPad;   // 1185
const G_AVG_CR  = G.avgRight - G.rightPad;  // 1299
const G_AVG_CX  = (G_AVG_CL + G_AVG_CR) / 2; // 1242

const TASK_TITLES = {
  knapsack:          ['Knapsack', '(Gen)'],
  'knapsack-real':   ['Knapsack', '(Real)'],
  energy:            ['Scheduling', '(Energy)'],
  cubic:             ['TopK', '(Cubic)'],
  bipartitematching: ['Bipartite', 'Match.'],
};

const YAXIS = {
  knapsack:          { type: 'log', yMin: 1,    yMax: 200,  ticks: [1, 10, 100],         tickFmt: String },
  'knapsack-real':   { type: 'log', yMin: 1,    yMax: 200,  ticks: [1, 10, 100],         tickFmt: String },
  energy:            { type: 'log', yMin: 0.8,  yMax: 25,   ticks: [1, 5, 10],           tickFmt: String },
  cubic:             { type: 'log', yMin: 0.005,yMax: 1500, ticks: [0.01, 1, 100],       tickFmt: v => v < 1 ? v.toFixed(2) : String(v) },
  bipartitematching: { type: 'lin', yMin: 88,   yMax: 95,   ticks: [89, 91, 93],         tickFmt: String },
  _avgrank:          { type: 'lin', yMin: 1,    yMax: 11,   ticks: [1, 3, 5, 7, 9, 11], tickFmt: String },
};

function colLeft(i)   { return G.leftStart + i * G.colStep; }
function colChartL(i) { return colLeft(i) + (i === 0 ? G.leftPad : G.otherPad); }
function colChartR(i) { return colLeft(i) + G.colW - G.rightPad; }
function colCx(i)     { return (colChartL(i) + colChartR(i)) / 2; }
function colTitleX(i) { return colLeft(i) + G.colW / 2; }

// ── Phase group mapping ───────────────────────────────────────────────────────
function phaseGroup(m) {
  if (m.key === 'mse')     return 'ph-mse';
  if (m.key === 'listLTR') return 'ph-ltr';
  return 'ph-rest';
}

// ── Build visualization ───────────────────────────────────────────────────────
function build(svg) {
  const g = el('g');
  svg.appendChild(g);

  REST_TASKS.forEach((task, ci) => {
    const cl = colChartL(ci), cr = colChartR(ci), cx = colCx(ci);
    const ya = YAXIS[task];
    const tt = TASK_TITLES[task];

    // Label group: hidden until phase 1 (MSE appears on all axes simultaneously)
    const lg = el('g', { 'data-group': 'ph-mse' });
    lg.style.opacity = '0';
    lg.style.transition = 'opacity 0.4s';
    g.appendChild(lg);

    buildAxis(g, {
      cl, cr, ct: G.ct, cb: G.cb,
      yMin: ya.yMin, yMax: ya.yMax, type: ya.type,
      ticks: ya.ticks, tickFmt: ya.tickFmt, labels: true,
      title: tt[0], title2: tt[1], titleX: colTitleX(ci), titleY: G.titleY1,
    }, lg);

    const taskData = DATA.regret[task];
    RERUN_METHODS.forEach((m, mi) => {
      const val = taskData[m.display];
      if (val == null) return;
      const yp = ya.type === 'log'
        ? scaleLog(val, ya.yMin, ya.yMax, G.ct, G.H)
        : scaleLinear(val, ya.yMin, ya.yMax, G.ct, G.H);
      const xp = cx + jitter(ci, mi, 16);
      drawMarker(g, xp, yp, m.shape, m.color, 5, {
        'data-group': phaseGroup(m), opacity: 0, transition: 'opacity 0.4s',
      });
    });
  });

  // Y-axis label on leftmost
  g.appendChild(el('text', {
    transform: `translate(${G.leftStart - 4},${(G.ct + G.cb) / 2}) rotate(-90)`,
    'text-anchor': 'middle', fill: '#52526a', 'font-size': 10,
    'font-family': 'Inter, system-ui, sans-serif'
  }, 'Regret'));

  // Avg rank column — hidden until phase 4
  const ag = el('g', { 'data-group': 'ph-avgrank' });
  ag.style.opacity = '0';
  ag.style.transition = 'opacity 0.5s';
  g.appendChild(ag);

  const arYA = YAXIS['_avgrank'];
  buildAxis(ag, {
    cl: G_AVG_CL, cr: G_AVG_CR, ct: G.ct, cb: G.cb,
    yMin: arYA.yMin, yMax: arYA.yMax, type: 'lin',
    ticks: arYA.ticks, tickFmt: arYA.tickFmt, labels: true,
    title: 'Avg Rank', title2: null, titleX: G_AVG_CX, titleY: G.titleY1,
  });

  RERUN_METHODS.forEach((m, mi) => {
    const rank = DATA.avg_rank[m.key];
    if (rank == null) return;
    const yp = scaleLinear(rank, arYA.yMin, arYA.yMax, G.ct, G.H);
    const xp = G_AVG_CX + jitter(5, mi, 16);
    drawMarker(ag, xp, yp, m.shape, m.color, 5);
  });

  // Legend
  g.appendChild(buildLegend(RERUN_LEGEND_GROUPS, G.legendX, G.legendY, G.legendW));
}

// ── Phase controller ──────────────────────────────────────────────────────────
const MAX_PHASE = 4;
let currentPhase = 0;
let transitioning = false;

function reveal(group) {
  document.querySelectorAll(`[data-group="${group}"]`).forEach(n => {
    n.style.opacity = '1';
  });
}

const PHASE_ACTIONS = [
  null,
  () => reveal('ph-mse'),
  () => reveal('ph-ltr'),
  () => reveal('ph-rest'),
  () => reveal('ph-avgrank'),
];

function advancePhase() {
  if (transitioning || currentPhase >= MAX_PHASE) return;
  currentPhase++;
  transitioning = true;
  document.getElementById('hud').classList.add('hidden');
  PHASE_ACTIONS[currentPhase]();
  setTimeout(() => { transitioning = false; }, 500);
  if (currentPhase >= MAX_PHASE) removeListeners();
}

function onClick() { advancePhase(); }
function onKeyDown(e) { if (e.key === 'ArrowRight' || e.key === ' ') advancePhase(); }
function removeListeners() {
  document.getElementById('viz').removeEventListener('click', onClick);
  document.removeEventListener('keydown', onKeyDown);
}

function init() {
  build(document.getElementById('viz'));
  document.getElementById('viz').addEventListener('click', onClick);
  document.addEventListener('keydown', onKeyDown);
  try { window.parent.Reveal.on('fragmentshown', advancePhase); } catch (_) {}
}

document.addEventListener('DOMContentLoaded', init);
