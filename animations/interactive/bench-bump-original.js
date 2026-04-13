// bench-bump-original.js — animated benchmark chart for original dataset
import { el, drawMarker, scaleLog, scaleLinear, jitter,
         buildAxis, buildLegend, ORIG_METHODS, ORIG_LEGEND_GROUPS } from './bench-bump-utils.js';

// ── Embedded data ─────────────────────────────────────────────────────────────
const DATA = {
  tasks: ['Knapsack (Gen)','Knapsack (Energy)','Scheduling (Energy)','Budget Allocation','TopK (Cubic)','Bipartite Matching','Portfolio'],
  methods: ['Two-stage','DFL','Blackbox','Identity','CPLayer','SPO','NCE','point-LTR','pair-LTR','list-LTR','LODL'],
  absolute_tasks: ['Portfolio'],
  regret: {
    'Knapsack (Gen)':     { 'Two-stage':6.595,'DFL':11.744,'Blackbox':24.274,'Identity':31.874,'CPLayer':24.769,'SPO':6.223,'NCE':13.438,'point-LTR':6.402,'pair-LTR':7.82,'list-LTR':6.031,'LODL':6.044 },
    'Knapsack (Energy)':  { 'Two-stage':8.745,'DFL':8.353,'Blackbox':35.705,'Identity':17.156,'CPLayer':36.402,'SPO':8.407,'NCE':11.932,'point-LTR':8.236,'pair-LTR':9.022,'list-LTR':8.083,'LODL':9.567 },
    'Scheduling (Energy)':{ 'Two-stage':1.793,'DFL':6.272,'Blackbox':6.503,'Identity':5.69,'CPLayer':null,'SPO':1.505,'NCE':1.663,'point-LTR':4.548,'pair-LTR':1.54,'list-LTR':1.551,'LODL':1.786 },
    'Budget Allocation':  { 'Two-stage':20.332,'DFL':35.97,'Blackbox':26.905,'Identity':14.799,'CPLayer':null,'SPO':5.559,'NCE':9.979,'point-LTR':69.663,'pair-LTR':5.958,'list-LTR':5.742,'LODL':25.7 },
    'TopK (Cubic)':       { 'Two-stage':0.11,'DFL':1.974,'Blackbox':13.944,'Identity':13.944,'CPLayer':null,'SPO':160.408,'NCE':160.408,'point-LTR':1.149,'pair-LTR':5.072,'list-LTR':0.193,'LODL':0.172 },
    'Bipartite Matching': { 'Two-stage':92.963,'DFL':91.364,'Blackbox':91.988,'Identity':91.868,'CPLayer':92.007,'SPO':93.327,'NCE':92.622,'point-LTR':91.035,'pair-LTR':92.285,'list-LTR':91.831,'LODL':91.113 },
    'Portfolio':          { 'Two-stage':0.243,'DFL':0.38,'Blackbox':0.286,'Identity':0.28,'CPLayer':0.309,'SPO':0.245,'NCE':0.367,'point-LTR':0.214,'pair-LTR':0.255,'list-LTR':0.249,'LODL':0.16 },
  },
  avg_rank: { 'Two-stage':5.1429,'DFL':6.7143,'Blackbox':8.2857,'Identity':7.5714,'CPLayer':9.25,'SPO':4.7143,'NCE':7.5714,'point-LTR':4.2857,'pair-LTR':5.2857,'list-LTR':2.7143,'LODL':3.7143 },
};

// ── Layout constants ──────────────────────────────────────────────────────────

// Large panel (phases 1–6): Budget Allocation only, centered
const L = {
  cl: 210, cr: 940, ct: 112, cb: 778,
  cx: 575, H: 666, titleX: 575, titleY: 86,
};

// Grid (phases 7–14): 7 task columns + avg rank + legend
const G = {
  leftStart: 75,
  colW: 130, colStep: 140,   // colLeft(i) = leftStart + i*colStep
  ct: 112, cb: 778, H: 666,
  titleY1: 82, titleY2: 96,
  leftPad: 30, otherPad: 8, rightPad: 8,
  avgLeft: 1065, avgRight: 1205, avgCx: 1135,  // 75+7*140+20 gap
  legendX: 1218, legendY: 112, legendW: 240,
};

const TASK_ORDER = [
  'Budget Allocation', 'Knapsack (Gen)', 'Knapsack (Energy)',
  'Scheduling (Energy)', 'TopK (Cubic)', 'Bipartite Matching', 'Portfolio',
];

const TASK_TITLES = {
  'TopK (Cubic)':        ['TopK', '(Cubic)'],
  'Knapsack (Gen)':      ['Knapsack', '(Gen)'],
  'Knapsack (Energy)':   ['Knapsack', '(Energy)'],
  'Scheduling (Energy)': ['Scheduling', '(Energy)'],
  'Budget Allocation':   ['Budget', 'Allocation'],
  'Bipartite Matching':  ['Bipartite', 'Matching'],
  'Portfolio':           ['Portfolio', null],
};

const YAXIS = {
  'TopK (Cubic)':        { type: 'log', yMin: 0.08, yMax: 1200, ticks: [0.1, 1, 10, 100], tickFmt: v => v < 1 ? v.toFixed(1) : String(v) },
  'Knapsack (Gen)':      { type: 'log', yMin: 1, yMax: 200,    ticks: [1, 10, 100],        tickFmt: String },
  'Knapsack (Energy)':   { type: 'log', yMin: 1, yMax: 200,    ticks: [1, 10, 100],        tickFmt: String },
  'Scheduling (Energy)': { type: 'log', yMin: 0.8, yMax: 15,   ticks: [1, 5, 10],          tickFmt: String },
  'Budget Allocation':   { type: 'log', yMin: 1, yMax: 200,    ticks: [1, 10, 100],        tickFmt: String },
  'Bipartite Matching':  { type: 'lin', yMin: 90, yMax: 94,    ticks: [90, 91, 92, 93, 94], tickFmt: String },
  'Portfolio':           { type: 'lin', yMin: 0.10, yMax: 0.45, ticks: [0.1, 0.2, 0.3, 0.4], tickFmt: v => v.toFixed(1) },
  '_avgrank':            { type: 'lin', yMin: 1, yMax: 11,     ticks: [1, 3, 5, 7, 9, 11], tickFmt: String },
};

function colLeft(i)  { return G.leftStart + i * G.colStep; }
function colCx(i)    { return colLeft(i) + (i === 0 ? G.leftPad : G.otherPad) + (G.colW - (i === 0 ? G.leftPad : G.otherPad) - G.rightPad) / 2; }
function colChartL(i){ return colLeft(i) + (i === 0 ? G.leftPad : G.otherPad); }
function colChartR(i){ return colLeft(i) + G.colW - G.rightPad; }

// ── Phase group helpers ───────────────────────────────────────────────────────

function lgGroup(m) {
  if (m.key === 'CPLayer') return null;  // null for Budget Allocation — skip
  if (m.key === 'Two-stage') return 'lg-ts';
  if (m.key === 'SPO')       return 'lg-spo';
  if (['DFL','Blackbox','Identity'].includes(m.key)) return 'lg-sg';
  if (m.group === 'statistical')  return 'lg-stat';
  if (m.key === 'LODL')      return 'lg-lodl';
  return null;
}

function gridGroup(taskName, colIdx, m) {
  if (colIdx === 0) return 'grid-budget';  // Budget Allocation: pre-shown at crossfade
  if (colIdx === 1) return m.key === 'Two-stage' ? 'grid-kgen-ts' : 'grid-kgen-rest';
  const map = { 2:'grid-kenergy', 3:'grid-sched', 4:'grid-topk', 5:'grid-bipartite', 6:'grid-portfolio' };
  return map[colIdx] || null;
}

// ── SVG scale helpers ─────────────────────────────────────────────────────────

function ys(task, val, topY, H) {
  const ya = YAXIS[task];
  if (val == null) return null;
  return ya.type === 'log'
    ? scaleLog(val, ya.yMin, ya.yMax, topY, H)
    : scaleLinear(val, ya.yMin, ya.yMax, topY, H);
}

// ── Build large panel ─────────────────────────────────────────────────────────

function buildLargePanel(svg) {
  const g = el('g', { id: 'layer-large' });
  g.style.opacity = '0';
  g.style.transition = 'opacity 0.5s';
  svg.appendChild(g);

  const ya = YAXIS['Budget Allocation'];
  const tt = TASK_TITLES['Budget Allocation'];
  buildAxis(g, {
    cl: L.cl, cr: L.cr, ct: L.ct, cb: L.cb,
    yMin: ya.yMin, yMax: ya.yMax, type: ya.type,
    ticks: ya.ticks, tickFmt: ya.tickFmt, labels: true,
    title: tt[0], title2: tt[1], titleX: L.titleX, titleY: L.titleY,
  });

  // Y-axis label
  g.appendChild(el('text', {
    transform: `translate(${L.cl - 45},${(L.ct + L.cb) / 2}) rotate(-90)`,
    'text-anchor': 'middle', fill: '#606075', 'font-size': 11,
    'font-family': 'Inter, system-ui, sans-serif'
  }, 'Relative Regret'));

  // Markers
  const budgetData = DATA.regret['Budget Allocation'];
  ORIG_METHODS.forEach((m, mi) => {
    const group = lgGroup(m);
    if (!group) return;
    const val = budgetData[m.key];
    if (val == null) return;
    const yp = scaleLog(val, ya.yMin, ya.yMax, L.ct, L.H);
    const xp = L.cx + jitter(99, mi, 100);
    drawMarker(g, xp, yp, m.shape, m.color, 10, {
      'data-group': group, opacity: 0, transition: 'opacity 0.4s',
    });
  });

  return g;
}

// ── Build grid ────────────────────────────────────────────────────────────────

function buildGrid(svg) {
  const g = el('g', { id: 'layer-grid' });
  g.style.opacity = '0';
  g.style.transition = 'opacity 0.5s';
  svg.appendChild(g);

  // data-group used for each column's label reveal:
  // TopK (ci=0)      → 'grid-topk'   (pre-revealed at crossfade)
  // Knapsack Gen (1) → 'grid-kgen-ts' (pre-revealed at crossfade with MSE)
  // subsequent cols  → same group as the column's data markers
  const LABEL_GROUPS = ['grid-budget','grid-kgen-ts','grid-kenergy','grid-sched','grid-topk','grid-bipartite','grid-portfolio'];

  // Task columns
  TASK_ORDER.forEach((task, ci) => {
    const cl = colChartL(ci), cr = colChartR(ci), cx = colCx(ci);
    const ya = YAXIS[task];
    const tt = TASK_TITLES[task];
    const titleX = colLeft(ci) + G.colW / 2;

    // Label group: hidden initially, revealed alongside first data for this column
    const lg = el('g', { 'data-group': LABEL_GROUPS[ci] });
    lg.style.opacity = '0';
    lg.style.transition = 'opacity 0.4s';
    g.appendChild(lg);

    buildAxis(g, {
      cl, cr, ct: G.ct, cb: G.cb,
      yMin: ya.yMin, yMax: ya.yMax, type: ya.type,
      ticks: ya.ticks, tickFmt: ya.tickFmt, labels: true,
      title: tt[0], title2: tt[1], titleX, titleY: G.titleY1,
    }, lg);

    const taskData = DATA.regret[task];
    ORIG_METHODS.forEach((m, mi) => {
      const val = taskData[m.key];
      if (val == null) return;
      const yp = ys(task, val, G.ct, G.H);
      if (yp == null) return;
      const xp = cx + jitter(ci, mi, 17);
      const group = gridGroup(task, ci, m);
      if (!group) return;
      drawMarker(g, xp, yp, m.shape, m.color, 7, {
        'data-group': group, opacity: 0, transition: 'opacity 0.4s',
      });
    });
  });

  // Y-axis label on leftmost
  g.appendChild(el('text', {
    transform: `translate(${G.leftStart - 2},${(G.ct + G.cb) / 2}) rotate(-90)`,
    'text-anchor': 'middle', fill: '#52526a', 'font-size': 10,
    'font-family': 'Inter, system-ui, sans-serif'
  }, 'Regret'));

  // Avg rank column (whole group hidden, revealed at phase 14)
  const ag = el('g', { 'data-group': 'grid-avgrank' });
  ag.style.opacity = '0';
  ag.style.transition = 'opacity 0.5s';
  g.appendChild(ag);

  const arYA = YAXIS['_avgrank'];
  buildAxis(ag, {
    cl: G.avgLeft + 30, cr: G.avgRight - 8, ct: G.ct, cb: G.cb,
    yMin: arYA.yMin, yMax: arYA.yMax, type: 'lin',
    ticks: arYA.ticks, tickFmt: arYA.tickFmt, labels: true,
    title: 'Avg Rank', title2: null, titleX: G.avgCx, titleY: G.titleY1,
  });

  ORIG_METHODS.forEach((m, mi) => {
    const rank = DATA.avg_rank[m.key];
    if (rank == null) return;
    const yp = scaleLinear(rank, arYA.yMin, arYA.yMax, G.ct, G.H);
    const xp = G.avgCx + jitter(7, mi, 19);
    drawMarker(ag, xp, yp, m.shape, m.color, 7);
  });

  return g;
}

// ── Phase controller ──────────────────────────────────────────────────────────

const MAX_PHASE = 14;
let currentPhase = 0;
let largePanelG, gridG, legendG;

function reveal(group) {
  document.querySelectorAll(`[data-group="${group}"]`).forEach(n => {
    n.style.opacity = '1';
  });
}

function crossfade() {
  // Pre-reveal Budget Allocation grid markers and Knapsack Gen MSE without animation
  // (they're inside opacity=0 group so not visible yet)
  ['grid-budget', 'grid-kgen-ts'].forEach(grp => {
    document.querySelectorAll(`[data-group="${grp}"]`).forEach(n => {
      n.style.transition = 'none';
      n.style.opacity = '1';
    });
  });
  largePanelG.style.opacity = '0';
  gridG.style.opacity = '1';
  // Re-enable transitions after the group has faded in
  setTimeout(() => {
    ['grid-budget', 'grid-kgen-ts'].forEach(grp => {
      document.querySelectorAll(`[data-group="${grp}"]`).forEach(n => {
        n.style.transition = 'opacity 0.4s';
      });
    });
  }, 600);
}

const PHASE_ACTIONS = [
  null,                                 // 0: initial
  () => { largePanelG.style.opacity = '1'; legendG.style.opacity = '1'; },  // 1: large panel + legend
  () => reveal('lg-ts'),                // 2: Two-stage on TopK
  () => reveal('lg-spo'),               // 3: SPO on TopK
  () => reveal('lg-sg'),                // 4: DFL+Blackbox+Identity
  () => reveal('lg-stat'),              // 5: Statistical
  () => reveal('lg-lodl'),              // 6: LODL
  () => crossfade(),                    // 7: crossfade → grid
  () => reveal('grid-kgen-rest'),       // 8: rest on Knapsack Gen
  () => reveal('grid-kenergy'),         // 9: Knapsack Energy
  () => reveal('grid-sched'),           // 10: Scheduling Energy
  () => reveal('grid-topk'),            // 11: TopK (Cubic)
  () => reveal('grid-bipartite'),       // 12: Bipartite Matching
  () => reveal('grid-portfolio'),       // 13: Portfolio
  () => reveal('grid-avgrank'),         // 14: Avg Rank
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

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  const svg = document.getElementById('viz');
  largePanelG = buildLargePanel(svg);
  gridG = buildGrid(svg);

  // Legend is a top-level element, visible during both large-panel and grid phases
  legendG = buildLegend(ORIG_LEGEND_GROUPS, G.legendX, G.legendY, G.legendW);
  legendG.style.opacity = '0';
  legendG.style.transition = 'opacity 0.5s';
  svg.appendChild(legendG);

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
