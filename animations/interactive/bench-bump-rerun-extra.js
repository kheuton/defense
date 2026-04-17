// bench-bump-rerun-extra.js — animated benchmark chart for 6 extra tasks
// Spatial group: asurv, cook_county, speed_humps
// Shortest-path family: sp_synth, sp_planted, shortestpath
import { el, drawMarker, scaleLog, scaleLinear, jitter,
         buildAxis, buildLegend, RERUN_METHODS, RERUN_LEGEND_GROUPS } from './bench-bump-utils.js';

// ── Embedded data (from bench_bump_rerun_data.json) ──────────────────────────
const DATA = {
  regret: {
    asurv:        { MSE:69.68,DFL:72.96,'Identity':72.96,'SPO+':71.07,NCE:64.51,Blackbox:72.96,'pt-LTR':69.98,'pr-LTR':71.77,'L-LTR':70.38,LODL:72.27,Perturb:71.37,PG:68.49,QPTL:null,cpLayer:null },
    cook_county:  { MSE:19.53,DFL:20.12,'Identity':20.12,'SPO+':20.04,NCE:21.80,Blackbox:20.12,'pt-LTR':20.34,'pr-LTR':18.95,'L-LTR':19.53,LODL:17.34,Perturb:48.21,PG:19.90,QPTL:null,cpLayer:null },
    speed_humps:  { MSE:18.25,DFL:23.28,'Identity':23.22,'SPO+':17.30,NCE:27.20,Blackbox:23.22,'pt-LTR':23.22,'pr-LTR':21.58,'L-LTR':32.91,LODL:21.66,Perturb:20.66,PG:20.23,QPTL:null,cpLayer:null },
    sp_synth:     { MSE:9.81,DFL:48.75,'Identity':71.47,'SPO+':6.16,NCE:9.68,Blackbox:74.72,'pt-LTR':9.53,'pr-LTR':8.11,'L-LTR':6.21,LODL:60.55,Perturb:9.34,PG:10.29,QPTL:null,cpLayer:null },
    sp_planted:   { MSE:10.22,DFL:22.75,'Identity':42.65,'SPO+':5.37,NCE:15.66,Blackbox:43.20,'pt-LTR':10.06,'pr-LTR':8.26,'L-LTR':5.75,LODL:38.68,Perturb:14.27,PG:10.31,QPTL:null,cpLayer:null },
    shortestpath: { MSE:0.0197,DFL:74.80,'Identity':647.78,'SPO+':3.21,NCE:48.69,Blackbox:165.54,'pt-LTR':null,'pr-LTR':null,'L-LTR':null,LODL:null,Perturb:82.29,PG:null,QPTL:null,cpLayer:null },
  },
};

const TASKS = ['asurv', 'cook_county', 'speed_humps', 'sp_synth', 'sp_planted', 'shortestpath'];

// ── Layout ────────────────────────────────────────────────────────────────────
// 6 task cols (colStep=200, colW=180) + legend (width=240)
// leftStart=60 → col5 right = 60 + 5*200 + 180 = 1240
// legendX = 1260, legendRight = 1500 (100 right pad)
const G = {
  leftStart: 60, colW: 180, colStep: 200,
  ct: 140, cb: 778, H: 638,
  titleY1: 96, titleY2: 114,
  leftPad: 32, otherPad: 10, rightPad: 8,
  legendX: 1260, legendY: 140, legendW: 240,
};

const TASK_TITLES = {
  asurv:        ['ASurv', '(TopK)'],
  cook_county:  ['Cook Cty.', '(TopK)'],
  speed_humps:  ['Speed Humps', '(TopK)'],
  sp_synth:     ['SP Synth', '(5×5)'],
  sp_planted:   ['SP Planted', '(5×5)'],
  shortestpath: ['Warcraft', '(12×12)'],
};

const YAXIS = {
  asurv:        { type: 'lin', yMin: 60,    yMax: 80,   ticks: [65, 70, 75],         tickFmt: String },
  cook_county:  { type: 'log', yMin: 15,    yMax: 55,   ticks: [15, 25, 50],         tickFmt: String },
  speed_humps:  { type: 'lin', yMin: 15,    yMax: 35,   ticks: [20, 25, 30],         tickFmt: String },
  sp_synth:     { type: 'log', yMin: 4,     yMax: 100,  ticks: [5, 20, 80],          tickFmt: String },
  sp_planted:   { type: 'log', yMin: 4,     yMax: 50,   ticks: [5, 15, 45],          tickFmt: String },
  shortestpath: { type: 'log', yMin: 0.01,  yMax: 1000, ticks: [0.01, 1, 100],       tickFmt: v => v < 1 ? v.toFixed(2) : String(v) },
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

  // Group banner bar above the 6 panels
  const bannerY = 48;
  const spatialL  = colLeft(0);
  const spatialR  = colLeft(2) + G.colW;
  const sppathL   = colLeft(3);
  const sppathR   = colLeft(5) + G.colW;

  const font = 'Inter, system-ui, sans-serif';
  g.appendChild(el('line', {
    x1: spatialL + 10, y1: bannerY + 10, x2: spatialR - 10, y2: bannerY + 10,
    stroke: '#383858', 'stroke-width': 1,
  }));
  g.appendChild(el('text', {
    x: (spatialL + spatialR) / 2, y: bannerY + 4, 'text-anchor': 'middle',
    fill: '#7c6af7', 'font-size': 20, 'font-weight': 700, 'font-family': font,
  }, 'Spatial Top-K'));

  g.appendChild(el('line', {
    x1: sppathL + 10, y1: bannerY + 10, x2: sppathR - 10, y2: bannerY + 10,
    stroke: '#383858', 'stroke-width': 1,
  }));
  g.appendChild(el('text', {
    x: (sppathL + sppathR) / 2, y: bannerY + 4, 'text-anchor': 'middle',
    fill: '#7c6af7', 'font-size': 20, 'font-weight': 700, 'font-family': font,
  }, 'Shortest Path'));

  TASKS.forEach((task, ci) => {
    const cl = colChartL(ci), cr = colChartR(ci), cx = colCx(ci);
    const ya = YAXIS[task];
    const tt = TASK_TITLES[task];

    // Label group: hidden until phase 1
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
      const xp = cx + jitter(ci, mi, 18);
      drawMarker(g, xp, yp, m.shape, m.color, 7, {
        'data-group': phaseGroup(m), opacity: 0, transition: 'opacity 0.4s',
      });
    });
  });

  // Y-axis label on leftmost
  g.appendChild(el('text', {
    transform: `translate(${G.leftStart - 4},${(G.ct + G.cb) / 2}) rotate(-90)`,
    'text-anchor': 'middle', fill: '#52526a', 'font-size': 10,
    'font-family': font,
  }, 'Regret'));

  // Legend
  g.appendChild(buildLegend(RERUN_LEGEND_GROUPS, G.legendX, G.legendY, G.legendW));
}

// ── Phase controller ──────────────────────────────────────────────────────────
const MAX_PHASE = 3;
let currentPhase = 0;

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
];

function advancePhase() {
  if (currentPhase >= MAX_PHASE) return;
  currentPhase++;
  document.getElementById('hud').classList.add('hidden');
  PHASE_ACTIONS[currentPhase]();
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
  try {
    const _R = window.parent.Reveal;
    const myFile = window.location.pathname.split('/').pop();
    const onThisSlide = () =>
      (_R.getCurrentSlide()?.dataset?.backgroundIframe ?? '').includes(myFile);

    _R.on('fragmentshown', () => {
      if (onThisSlide()) advancePhase();
    });

    function onFragmentHidden() {
      if (!onThisSlide()) return;
      _R.off('fragmenthidden', onFragmentHidden);
      _R.getCurrentSlide().querySelectorAll('.fragment').forEach(f => {
        f.classList.remove('visible', 'current-fragment');
      });
      _R.sync();
      window.location.reload();
    }
    _R.on('fragmenthidden', onFragmentHidden);

    _R.on('slidechanged', () => {
      if (onThisSlide() && currentPhase !== 0) window.location.reload();
    });
  } catch (_) {}
}

document.addEventListener('DOMContentLoaded', init);
