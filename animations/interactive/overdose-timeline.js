// ── Overdose Timeline Animation ──────────────────────────────────────────────
// Animated "worm" line chart of US drug overdose deaths (12-month rolling).
// Pauses at milestone crossings (gun deaths, HIV deaths, car crash deaths, peak).
//
// Phase 0:  Worm draws until it crosses gun deaths → pause + label
// Phase 1:  Resumes → crosses HIV deaths → pause + label
// Phase 2:  Resumes → crosses car crash deaths → pause + label
// Phase 3:  Resumes → reaches absolute peak → pause + label
// Phase 4:  Resumes → draws to end of data
// (After final phase, listeners removed so Reveal.js can advance)

// ── Data ─────────────────────────────────────────────────────────────────────
// [year, month, 12-month-ending deaths]  — NYT 2010-2014, CDC 2015-2025
const DATA = [
  [2010,1,37717],[2010,2,37897],[2010,3,38059],[2010,4,38231],[2010,5,38416],
  [2010,6,38515],[2010,7,38656],[2010,8,38747],[2010,9,38746],[2010,10,38773],
  [2010,11,38830],[2010,12,38954],[2011,1,39087],[2011,2,39301],[2011,3,39661],
  [2011,4,39851],[2011,5,40140],[2011,6,40390],[2011,7,40561],[2011,8,40945],
  [2011,9,41241],[2011,10,41507],[2011,11,41726],[2011,12,41994],[2012,1,42199],
  [2012,2,42283],[2012,3,42327],[2012,4,42303],[2012,5,42114],[2012,6,41996],
  [2012,7,42298],[2012,8,42265],[2012,9,42383],[2012,10,42455],[2012,11,42473],
  [2012,12,42341],[2013,1,42366],[2013,2,42621],[2013,3,42689],[2013,4,43030],
  [2013,5,43380],[2013,6,43622],[2013,7,43797],[2013,8,43951],[2013,9,44109],
  [2013,10,44230],[2013,11,44345],[2013,12,44648],[2014,1,44930],[2014,2,45157],
  [2014,3,45526],[2014,4,45741],[2014,5,45838],[2014,6,46101],[2014,7,46181],
  [2014,8,46411],[2014,9,46699],[2014,10,46945],[2014,11,47463],[2014,12,47837],
  [2015,1,47523],[2015,2,47725],[2015,3,48198],[2015,4,48748],[2015,5,49293],
  [2015,6,49691],[2015,7,50301],[2015,8,50834],[2015,9,51575],[2015,10,52114],
  [2015,11,52386],[2015,12,52623],[2016,1,52902],[2016,2,53834],[2016,3,54781],
  [2016,4,55763],[2016,5,56465],[2016,6,57428],[2016,7,58525],[2016,8,59417],
  [2016,9,60147],[2016,10,61062],[2016,11,62340],[2016,12,63938],[2017,1,65571],
  [2017,2,66189],[2017,3,66858],[2017,4,67493],[2017,5,68370],[2017,6,69153],
  [2017,7,69504],[2017,8,69988],[2017,9,70599],[2017,10,70690],[2017,11,70723],
  [2017,12,70699],[2018,1,70122],[2018,2,69745],[2018,3,69364],[2018,4,69042],
  [2018,5,68789],[2018,6,68714],[2018,7,68728],[2018,8,68714],[2018,9,68421],
  [2018,10,68404],[2018,11,68102],[2018,12,67850],[2019,1,67697],[2019,2,67631],
  [2019,3,67727],[2019,4,67736],[2019,5,67795],[2019,6,67787],[2019,7,68023],
  [2019,8,68371],[2019,9,68757],[2019,10,69371],[2019,11,70357],[2019,12,71130],
  [2020,1,72124],[2020,2,73343],[2020,3,74679],[2020,4,77017],[2020,5,80577],
  [2020,6,82916],[2020,7,85236],[2020,8,87293],[2020,9,88879],[2020,10,90093],
  [2020,11,91200],[2020,12,92478],[2021,1,94788],[2021,2,96118],[2021,3,98211],
  [2021,4,99772],[2021,5,99679],[2021,6,100569],[2021,7,101477],[2021,8,102612],
  [2021,9,104099],[2021,10,105528],[2021,11,106554],[2021,12,107573],
  [2022,1,107800],[2022,2,108636],[2022,3,108604],[2022,4,107785],[2022,5,107429],
  [2022,6,107370],[2022,7,107583],[2022,8,107474],[2022,9,107432],[2022,10,107819],
  [2022,11,108429],[2022,12,109413],[2023,1,109745],[2023,2,109714],[2023,3,110084],
  [2023,4,110774],[2023,5,111422],[2023,6,111466],[2023,7,111382],[2023,8,111451],
  [2023,9,110716],[2023,10,109703],[2023,11,108529],[2023,12,106881],
  [2024,1,105522],[2024,2,104361],[2024,3,102174],[2024,4,100052],[2024,5,97687],
  [2024,6,95741],[2024,7,93193],[2024,8,90202],[2024,9,87654],[2024,10,85178],
  [2024,11,82946],[2024,12,80860],[2025,1,79293],[2025,2,77741],[2025,3,76903],
  [2025,4,75708],[2025,5,74477],[2025,6,73333],[2025,7,72186],[2025,8,71249],
  [2025,9,70379],[2025,10,69368],[2025,11,68372],
];

// ── Milestones ───────────────────────────────────────────────────────────────
const MILESTONES = [
  { value: 39800,  label: 'Peak gun deaths', sublabel: '(39,800 in 2017)', color: '#ffd166' },
  { value: 46700,  label: 'Peak H.I.V. deaths', sublabel: '(46,700 in 1995)', color: '#ff7c57' },
  { value: 54200,  label: 'Peak car crash deaths', sublabel: '(54,200 in 1972)', color: '#ff7c57' },
];

// ── Constants ────────────────────────────────────────────────────────────────
const NS = 'http://www.w3.org/2000/svg';
const W = 1600, H = 900;
const MARGIN = { top: 100, right: 220, bottom: 80, left: 120 };
const CW = W - MARGIN.left - MARGIN.right;
const CH = H - MARGIN.top - MARGIN.bottom;

const COLORS = {
  bg:      '#11111e',
  line:    '#7c6af7',
  glow:    '#7c6af7',
  head:    '#ffd166',
  axis:    '#888899',
  grid:    '#22223a',
  tick:    '#c8c8de',
  title:   '#ddddee',
  muted:   '#888899',
  area:    '#7c6af7',
};

// ── Scales ───────────────────────────────────────────────────────────────────
const deaths = DATA.map(d => d[2]);
const yMin = 0;
const yMax = 120000;
const xMin = 0;
const xMax = DATA.length - 1;

function xs(i) { return MARGIN.left + (i / xMax) * CW; }
function ys(v) { return MARGIN.top + CH - ((v - yMin) / (yMax - yMin)) * CH; }

// ── SVG helpers ──────────────────────────────────────────────────────────────
const svg = document.getElementById('viz');
const hud = document.getElementById('hud');

function el(tag, attrs, text) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text !== undefined) e.textContent = text;
  return e;
}

function fadeIn(elem, dur = 600) {
  elem.style.opacity = '0';
  elem.style.transition = `opacity ${dur}ms ease`;
  requestAnimationFrame(() => requestAnimationFrame(() => { elem.style.opacity = '1'; }));
}

// ── Build static chart elements ──────────────────────────────────────────────
const chartG = el('g', { transform: `translate(0,0)` });
svg.appendChild(chartG);

// Title
const titleG = el('g');
chartG.appendChild(titleG);
const titleText = el('text', {
  x: MARGIN.left, y: 50,
  fill: COLORS.title, 'font-family': 'Inter, system-ui, sans-serif',
  'font-size': 32, 'font-weight': 700
}, 'Drug Overdose Deaths in the U.S.');
titleG.appendChild(titleText);
const subtitleText = el('text', {
  x: MARGIN.left, y: 78,
  fill: COLORS.muted, 'font-family': 'Inter, system-ui, sans-serif',
  'font-size': 16, 'font-weight': 400
}, '12-month rolling total  |  Source: CDC');
titleG.appendChild(subtitleText);

// Grid lines + Y-axis ticks
const yTicks = [0, 20000, 40000, 60000, 80000, 100000, 120000];
for (const v of yTicks) {
  const y = ys(v);
  chartG.appendChild(el('line', {
    x1: MARGIN.left, x2: W - MARGIN.right,
    y1: y, y2: y,
    stroke: COLORS.grid, 'stroke-width': 1
  }));
  chartG.appendChild(el('text', {
    x: MARGIN.left - 12, y: y + 4,
    fill: COLORS.axis, 'font-family': 'Inter, system-ui, sans-serif',
    'font-size': 14, 'text-anchor': 'end'
  }, v === 0 ? '0' : `${v / 1000}k`));
}

// X-axis ticks (every 2 years at January)
for (let i = 0; i < DATA.length; i++) {
  const [yr, mo] = DATA[i];
  if (mo === 1 && yr % 2 === 0) {
    const x = xs(i);
    chartG.appendChild(el('line', {
      x1: x, x2: x,
      y1: ys(0), y2: ys(0) + 8,
      stroke: COLORS.axis, 'stroke-width': 1
    }));
    chartG.appendChild(el('text', {
      x: x, y: ys(0) + 28,
      fill: COLORS.axis, 'font-family': 'Inter, system-ui, sans-serif',
      'font-size': 14, 'text-anchor': 'middle'
    }, String(yr)));
  }
}

// Axis lines
chartG.appendChild(el('line', {
  x1: MARGIN.left, x2: MARGIN.left,
  y1: MARGIN.top, y2: ys(0),
  stroke: COLORS.axis, 'stroke-width': 1.5
}));
chartG.appendChild(el('line', {
  x1: MARGIN.left, x2: W - MARGIN.right,
  y1: ys(0), y2: ys(0),
  stroke: COLORS.axis, 'stroke-width': 1.5
}));

// ── Milestone reference lines (hidden initially) ─────────────────────────────
// Spread label positions to avoid overlap at 28px font.
// Each label block is ~56px tall (28px main + 4px gap + 24px sub).
const LABEL_HEIGHT = 56;
const naturalLabelYs = MILESTONES.map(m => ys(m.value));
const spreadLabelYs = [...naturalLabelYs];
// Anchor the topmost label (smallest y, largest value) and push others downward.
// Build screen order: indices sorted by ascending y (top of screen first).
const screenOrder = naturalLabelYs.map((y, i) => i).sort((a, b) => naturalLabelYs[a] - naturalLabelYs[b]);
for (let k = 1; k < screenOrder.length; k++) {
  const above = screenOrder[k - 1];
  const curr  = screenOrder[k];
  if (spreadLabelYs[curr] - spreadLabelYs[above] < LABEL_HEIGHT) {
    spreadLabelYs[curr] = spreadLabelYs[above] + LABEL_HEIGHT;
  }
}

const milestoneEls = MILESTONES.map((m, idx) => {
  const g = el('g');
  g.style.opacity = '0';

  const lineY = ys(m.value);
  const labelY = spreadLabelYs[idx];

  // Dashed reference line (at true data position)
  g.appendChild(el('line', {
    x1: MARGIN.left, x2: W - MARGIN.right,
    y1: lineY, y2: lineY,
    stroke: m.color, 'stroke-width': 1.5,
    'stroke-dasharray': '8,6', opacity: 0.6
  }));

  // Connector line from dashed line to offset label
  if (Math.abs(labelY - lineY) > 4) {
    g.appendChild(el('line', {
      x1: W - MARGIN.right + 4, x2: W - MARGIN.right + 4,
      y1: lineY, y2: labelY,
      stroke: m.color, 'stroke-width': 1, opacity: 0.3
    }));
  }

  // Label on right side (at spread position)
  const labelG = el('g', { transform: `translate(${W - MARGIN.right + 10}, ${labelY})` });
  labelG.appendChild(el('text', {
    x: 0, y: -4,
    fill: m.color, 'font-family': 'Inter, system-ui, sans-serif',
    'font-size': 28, 'font-weight': 600, 'text-anchor': 'start'
  }, m.label));
  labelG.appendChild(el('text', {
    x: 0, y: 22,
    fill: COLORS.muted, 'font-family': 'Inter, system-ui, sans-serif',
    'font-size': 16, 'text-anchor': 'start'
  }, m.sublabel));
  g.appendChild(labelG);

  chartG.appendChild(g);
  return g;
});

// ── Peak label (hidden initially) ────────────────────────────────────────────
const peakIdx = deaths.indexOf(Math.max(...deaths));
const peakG = el('g');
peakG.style.opacity = '0';
chartG.appendChild(peakG);

const peakDot = el('circle', {
  cx: xs(peakIdx), cy: ys(deaths[peakIdx]),
  r: 6, fill: '#ff7c57', stroke: '#ffffff', 'stroke-width': 2
});
peakG.appendChild(peakDot);

const peakLabelG = el('g', { transform: `translate(${xs(peakIdx)}, ${ys(deaths[peakIdx]) - 20})` });
peakLabelG.appendChild(el('text', {
  x: 0, y: -20,
  fill: '#ff7c57', 'font-family': 'Inter, system-ui, sans-serif',
  'font-size': 22, 'font-weight': 700, 'text-anchor': 'middle'
}, `${Math.max(...deaths).toLocaleString()} deaths`));
peakLabelG.appendChild(el('text', {
  x: 0, y: 0,
  fill: COLORS.muted, 'font-family': 'Inter, system-ui, sans-serif',
  'font-size': 14, 'text-anchor': 'middle'
}, `${DATA[peakIdx][0]}`));
peakG.appendChild(peakLabelG);

// ── Area + Line + Head (the worm) ────────────────────────────────────────────
// Area fill (subtle gradient)
const defs = el('defs');
const grad = el('linearGradient', { id: 'areaGrad', x1: 0, y1: 0, x2: 0, y2: 1 });
grad.appendChild(el('stop', { offset: '0%', 'stop-color': COLORS.area, 'stop-opacity': 0.25 }));
grad.appendChild(el('stop', { offset: '100%', 'stop-color': COLORS.area, 'stop-opacity': 0.02 }));
defs.appendChild(grad);

// Glow filter
const filter = el('filter', { id: 'glow', x: '-50%', y: '-50%', width: '200%', height: '200%' });
const blur = el('feGaussianBlur', { stdDeviation: 4, result: 'blur' });
filter.appendChild(blur);
const merge = el('feMerge');
merge.appendChild(el('feMergeNode', { in: 'blur' }));
merge.appendChild(el('feMergeNode', { in: 'SourceGraphic' }));
filter.appendChild(merge);
defs.appendChild(filter);
svg.insertBefore(defs, svg.firstChild);

const areaPath = el('path', {
  fill: 'url(#areaGrad)', stroke: 'none'
});
chartG.appendChild(areaPath);

const linePath = el('path', {
  fill: 'none', stroke: COLORS.line, 'stroke-width': 3,
  'stroke-linecap': 'round', 'stroke-linejoin': 'round',
  filter: 'url(#glow)'
});
chartG.appendChild(linePath);

const headDot = el('circle', {
  cx: xs(0), cy: ys(deaths[0]),
  r: 7, fill: COLORS.head,
  filter: 'url(#glow)'
});
chartG.appendChild(headDot);

// Counter display
const counterG = el('g');
chartG.appendChild(counterG);
const counterBg = el('rect', {
  x: 0, y: 0, width: 200, height: 46, rx: 6,
  fill: COLORS.bg, 'fill-opacity': 0.85, stroke: COLORS.line, 'stroke-width': 1
});
counterG.appendChild(counterBg);
const counterText = el('text', {
  x: 100, y: 22,
  fill: COLORS.title, 'font-family': 'Inter, system-ui, sans-serif',
  'font-size': 20, 'font-weight': 700, 'text-anchor': 'middle',
  'dominant-baseline': 'central'
}, '');
counterG.appendChild(counterText);
const counterDate = el('text', {
  x: 100, y: 40,
  fill: COLORS.muted, 'font-family': 'Inter, system-ui, sans-serif',
  'font-size': 11, 'text-anchor': 'middle',
  'dominant-baseline': 'central'
}, '');
counterG.appendChild(counterDate);

function updateCounter(idx) {
  const d = DATA[idx];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  counterText.textContent = `${d[2].toLocaleString()} deaths`;
  counterDate.textContent = `${months[d[1]-1]} ${d[0]}`;

  // Position above the head dot, clamped to chart bounds
  let cx = xs(idx) - 100;
  let cy = ys(d[2]) - 60;
  cx = Math.max(MARGIN.left, Math.min(cx, W - MARGIN.right - 200));
  cy = Math.max(MARGIN.top - 10, cy);
  counterG.setAttribute('transform', `translate(${cx}, ${cy})`);
}

// ── Worm path builder ────────────────────────────────────────────────────────
function buildLinePath(endIdx) {
  let d = `M${xs(0)},${ys(deaths[0])}`;
  for (let i = 1; i <= endIdx; i++) {
    d += `L${xs(i)},${ys(deaths[i])}`;
  }
  return d;
}

function buildAreaPath(endIdx) {
  let d = `M${xs(0)},${ys(0)}`;
  d += `L${xs(0)},${ys(deaths[0])}`;
  for (let i = 1; i <= endIdx; i++) {
    d += `L${xs(i)},${ys(deaths[i])}`;
  }
  d += `L${xs(endIdx)},${ys(0)}Z`;
  return d;
}

// ── Worm tail: fade the area/line behind the head ────────────────────────────
// We show the full drawn path but keep a brighter "worm" segment near the head
// via a gradient mask on the line stroke.

// ── Animation state ──────────────────────────────────────────────────────────
let currentIdx = 0;
let currentPhase = -1;
let animating = false;
let paused = false;
const MAX_PHASE = 4; // 5 stops, indices 0-4

// Milestone crossing indices (first index where deaths >= milestone value)
const milestoneIndices = MILESTONES.map(m => {
  for (let i = 1; i < DATA.length; i++) {
    if (deaths[i - 1] < m.value && deaths[i] >= m.value) return i;
  }
  return DATA.length - 1;
});

// Stop points: milestone crossings + peak + end
const STOPS = [
  ...milestoneIndices.map((idx, i) => ({ idx, type: 'milestone', milestoneIdx: i })),
  { idx: peakIdx, type: 'peak' },
  { idx: DATA.length - 1, type: 'end' },
].sort((a, b) => a.idx - b.idx);

// ── Animation loop ───────────────────────────────────────────────────────────
const DRAW_SPEED = 12; // ms per data point (base speed)

function animateWorm(targetIdx) {
  return new Promise(resolve => {
    animating = true;
    function step() {
      if (paused) { requestAnimationFrame(step); return; }
      if (currentIdx >= targetIdx) {
        animating = false;
        resolve();
        return;
      }
      currentIdx++;
      linePath.setAttribute('d', buildLinePath(currentIdx));
      areaPath.setAttribute('d', buildAreaPath(currentIdx));
      headDot.setAttribute('cx', xs(currentIdx));
      headDot.setAttribute('cy', ys(deaths[currentIdx]));
      updateCounter(currentIdx);
      setTimeout(() => requestAnimationFrame(step), DRAW_SPEED);
    }
    requestAnimationFrame(step);
  });
}

// ── Phase controller ─────────────────────────────────────────────────────────
let transitioning = false;

async function advancePhase() {
  if (transitioning) return;
  if (currentPhase >= MAX_PHASE) return;
  transitioning = true;
  currentPhase++;

  const stop = STOPS[currentPhase];
  if (!stop) { transitioning = false; return; }

  // Animate worm to the stop point
  await animateWorm(stop.idx);

  // Show milestone / peak annotation
  if (stop.type === 'milestone') {
    fadeIn(milestoneEls[stop.milestoneIdx], 800);
  } else if (stop.type === 'peak') {
    fadeIn(peakG, 800);
  } else if (stop.type === 'end') {
    // Hide hud
    hud.classList.add('hidden');
  }

  transitioning = false;

  // If this is the final phase, remove listeners
  if (currentPhase >= MAX_PHASE) {
    removeListeners();
  }
}

// ── Event handling ───────────────────────────────────────────────────────────
function onClick() { advancePhase(); }
function onKeyDown(e) {
  if (e.key === 'ArrowRight' || e.key === ' ') {
    e.preventDefault();
    advancePhase();
  }
}

function removeListeners() {
  document.removeEventListener('click', onClick);
  document.removeEventListener('keydown', onKeyDown);
}

document.addEventListener('click', onClick);
document.addEventListener('keydown', onKeyDown);

// Reveal.js fragment integration (works both standalone and embedded)
const Reveal = window.Reveal || (window.parent && window.parent.Reveal);
if (Reveal) {
  Reveal.on('fragmentshown', () => advancePhase());
  Reveal.on('fragmenthidden', () => window.location.reload());
  Reveal.on('slidechanged', () => {
    if (currentPhase !== -1) window.location.reload();
  });
}

// ── Init: draw first point ───────────────────────────────────────────────────
linePath.setAttribute('d', buildLinePath(0));
areaPath.setAttribute('d', buildAreaPath(0));
updateCounter(0);
