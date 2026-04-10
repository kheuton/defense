// bench-bump-rerun-single.js — single-task view for budget allocation or portfolio
// Usage: ?task=budgetalloc  or  ?task=portfolio
import { el, drawMarker, scaleLog, scaleLinear, jitter,
         buildAxis, buildLegend, RERUN_METHODS, RERUN_LEGEND_GROUPS } from './bench-bump-utils.js';

const TASK = new URL(import.meta.url).searchParams.get('task') || 'budgetalloc';

// ── Embedded data ─────────────────────────────────────────────────────────────
const REGRET = {
  budgetalloc: { MSE:36.572,DFL:33.217,'Identity':14.6521,'SPO+':5.0964,NCE:8.6314,Blackbox:10.6251,'pt-LTR':4.1618,'pr-LTR':7.8608,'L-LTR':3.6267,LODL:56.1076,Perturb:7.7772,PG:null,QPTL:null,cpLayer:null },
  portfolio:   { MSE:0.2206,DFL:0.2761,'Identity':0.2804,'SPO+':0.2298,NCE:0.3099,Blackbox:0.2682,'pt-LTR':0.2518,'pr-LTR':0.2554,'L-LTR':0.2384,LODL:0.2421,Perturb:0.3037,PG:0.3563,QPTL:0.2861,cpLayer:0.2791 },
};

const TASK_CFG = {
  budgetalloc: {
    title: 'Budget Allocation', title2: null,
    type: 'log', yMin: 1, yMax: 200, ticks: [1, 10, 100], tickFmt: String,
    yLabel: 'Relative Regret',
  },
  portfolio: {
    title: 'Portfolio', title2: null,
    type: 'lin', yMin: 0.10, yMax: 0.40, ticks: [0.1, 0.2, 0.3, 0.4], tickFmt: v => v.toFixed(2),
    yLabel: 'Regret',
  },
};

// ── Layout: single large centered panel ───────────────────────────────────────
const P = {
  cl: 580, cr: 900, ct: 112, cb: 778, H: 666,
  cx: 740,
  titleX: 740, titleY: 86,
  legendX: 930, legendY: 112, legendW: 200,
};

// ── Phase group mapping ───────────────────────────────────────────────────────
function phaseGroup(m) {
  if (m.key === 'mse') return 'ph-mse';
  return 'ph-rest';
}

// ── Build ─────────────────────────────────────────────────────────────────────
function build(svg) {
  const cfg = TASK_CFG[TASK];
  const data = REGRET[TASK];
  const g = el('g');
  svg.appendChild(g);

  buildAxis(g, {
    cl: P.cl, cr: P.cr, ct: P.ct, cb: P.cb,
    yMin: cfg.yMin, yMax: cfg.yMax, type: cfg.type,
    ticks: cfg.ticks, tickFmt: cfg.tickFmt, labels: true,
    title: cfg.title, title2: cfg.title2, titleX: P.titleX, titleY: P.titleY,
  });

  // Y-axis label
  g.appendChild(el('text', {
    transform: `translate(${P.cl - 42},${(P.ct + P.cb) / 2}) rotate(-90)`,
    'text-anchor': 'middle', fill: '#606075', 'font-size': 11,
    'font-family': 'Inter, system-ui, sans-serif'
  }, cfg.yLabel));

  RERUN_METHODS.forEach((m, mi) => {
    const val = data[m.display];
    if (val == null) return;
    const yp = cfg.type === 'log'
      ? scaleLog(val, cfg.yMin, cfg.yMax, P.ct, P.H)
      : scaleLinear(val, cfg.yMin, cfg.yMax, P.ct, P.H);
    const xp = P.cx + jitter(0, mi, 70);
    const pg = phaseGroup(m);
    drawMarker(g, xp, yp, m.shape, m.color, 9, {
      'data-group': pg, opacity: 0, transition: 'opacity 0.4s',
    });
  });

  // Legend
  const leg = buildLegend(RERUN_LEGEND_GROUPS, P.legendX, P.legendY, P.legendW);
  g.appendChild(leg);
}

// ── Phase controller ──────────────────────────────────────────────────────────
const MAX_PHASE = 2;
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
  () => reveal('ph-rest'),
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
