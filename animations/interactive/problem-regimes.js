(function () {
  'use strict';

  const W = 1600, H = 900;
  const svg = d3.select('#main-svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');
  svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#11111e');

  const C = {
    teal:   '#50c8a8',
    purple: '#7c6af7',
    coral:  '#ff7c57',
    yellow: '#ffd166',
    muted:  '#888899',
    textLight: '#ddddee',
    textDim:   '#c8c8de',
    binBg:     '#1a1a2e',
  };

  // ── Title ─────────────────────────────────────────────────────────────────
  svg.append('text')
    .attr('x', W/2).attr('y', 66)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textLight).attr('font-size', 36).attr('font-weight', 700)
    .text('Four regimes of data × hypothesis class');

  // ── Axis labels (implicit 2×2) ────────────────────────────────────────────
  // Rows: synthetic (top) / real (bottom). Cols: well-spec (left) / mis-spec (right)
  // Actually: 4 independent quadrants, color-coded, not a traditional matrix.

  // ── Quadrant layout ───────────────────────────────────────────────────────
  const GRID_X = 340, GRID_Y = 120;
  const QW = 580, QH = 330, QGAP_X = 30, QGAP_Y = 30;

  const QUADS = {
    well:   { x: GRID_X,             y: GRID_Y,             color: C.teal,
              title: 'Well-specified',        sub: 'Hypothesis class contains DGP' },
    mis:    { x: GRID_X + QW + QGAP_X, y: GRID_Y,           color: C.coral,
              title: 'Mis-specified',         sub: 'Hypothesis class too simple' },
    small:  { x: GRID_X,             y: GRID_Y + QH + QGAP_Y, color: C.yellow,
              title: 'Small-data',            sub: 'Few instances for a rich mapping' },
    real:   { x: GRID_X + QW + QGAP_X, y: GRID_Y + QH + QGAP_Y, color: C.purple,
              title: 'Real / unknown DGP',    sub: 'No controlled data-generating process' },
  };

  // ── Problem chips ─────────────────────────────────────────────────────────
  const STACK_X = 60, STACK_Y0 = 150;
  const CHIP_W = 220, CHIP_H = 40, CHIP_GAP = 10;

  const PROBLEMS = [
    // well-specified
    { id: 'knapsack',    label: 'knapsack',         quad: 'well',  kind: 'synth' },
    { id: 'cubic',       label: 'cubic',            quad: 'well',  kind: 'synth' },
    { id: 'portfolio',   label: 'portfolio',        quad: 'well',  kind: 'synth' },
    { id: 'sp_planted',  label: 'sp_planted',       quad: 'well',  kind: 'synth' },
    // mis-specified
    { id: 'sp_synth',    label: 'sp_synth',         quad: 'mis',   kind: 'synth' },
    { id: 'budgetalloc', label: 'budgetalloc',      quad: 'mis',   kind: 'synth',
      note: 'objective mis-spec' },
    // small-data
    { id: 'bipmatch',    label: 'bipartitematching', quad: 'small', kind: 'synth',
      note: '16 train graphs' },
    // real / unknown
    { id: 'cook',        label: 'cook_county',      quad: 'real',  kind: 'real' },
    { id: 'speed',       label: 'speed_humps',      quad: 'real',  kind: 'real' },
    { id: 'asurv',       label: 'asurv',            quad: 'real',  kind: 'real' },
    { id: 'energy',      label: 'energy',           quad: 'real',  kind: 'real' },
    { id: 'knap_real',   label: 'knapsack-real',    quad: 'real',  kind: 'real' },
    { id: 'shortest',    label: 'shortestpath',     quad: 'real',  kind: 'real' },
  ];

  PROBLEMS.forEach((p, i) => {
    p.startX = STACK_X;
    p.startY = STACK_Y0 + i * (CHIP_H + CHIP_GAP);
  });

  // Compute target positions inside each quadrant: centered column(s)
  const QUAD_PADDING_X = 24, QUAD_PADDING_TOP = 92;
  const byQuad = {};
  PROBLEMS.forEach(p => {
    (byQuad[p.quad] = byQuad[p.quad] || []).push(p);
  });

  Object.keys(byQuad).forEach(qkey => {
    const list = byQuad[qkey];
    const q = QUADS[qkey];
    // Single-column centered if ≤ 4 items, otherwise 2 cols
    const cols = list.length <= 4 ? 1 : 2;
    const rows = Math.ceil(list.length / cols);
    const availH = QH - QUAD_PADDING_TOP - 24;
    const dy = rows > 1 ? Math.min(CHIP_H + 12, availH / rows) : 0;
    const dx = cols > 1 ? (CHIP_W + 16) : 0;
    const startY = q.y + QUAD_PADDING_TOP + (availH - (rows - 1) * dy) / 2;
    const startX = q.x + (QW - (cols - 1) * dx - CHIP_W) / 2;
    list.forEach((p, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      p.targetX = startX + col * dx;
      p.targetY = startY + row * dy;
    });
  });

  // ── Draw quadrants (initially hidden) ─────────────────────────────────────
  const quadGroups = {};
  Object.entries(QUADS).forEach(([k, q]) => {
    const g = svg.append('g').attr('opacity', 0);
    g.append('rect')
      .attr('x', q.x).attr('y', q.y)
      .attr('width', QW).attr('height', QH)
      .attr('rx', 14)
      .attr('fill', C.binBg).attr('stroke', q.color).attr('stroke-width', 2)
      .attr('stroke-dasharray', '8 6');
    g.append('text')
      .attr('x', q.x + QW/2).attr('y', q.y + 40)
      .attr('text-anchor', 'middle')
      .attr('fill', q.color).attr('font-size', 24).attr('font-weight', 700)
      .text(q.title);
    g.append('text')
      .attr('x', q.x + QW/2).attr('y', q.y + 66)
      .attr('text-anchor', 'middle')
      .attr('fill', C.muted).attr('font-size', 14)
      .text(q.sub);
    quadGroups[k] = g;
  });

  // ── Chips ─────────────────────────────────────────────────────────────────
  const chipsG = svg.append('g');
  const chips = {};
  PROBLEMS.forEach(p => {
    const g = chipsG.append('g')
      .attr('transform', `translate(${p.startX},${p.startY})`);
    const col = QUADS[p.quad].color;
    g.append('rect')
      .attr('width', CHIP_W).attr('height', CHIP_H).attr('rx', 8)
      .attr('fill', '#1a1a2e')
      .attr('stroke', col).attr('stroke-width', 1.5);
    g.append('text')
      .attr('x', CHIP_W/2).attr('y', CHIP_H/2 + 5)
      .attr('text-anchor', 'middle')
      .attr('fill', C.textDim).attr('font-size', 16).attr('font-weight', 500)
      .text(p.label);
    chips[p.id] = g;
  });

  // ── Callout ───────────────────────────────────────────────────────────────
  const callout = svg.append('g').attr('opacity', 0);
  callout.append('rect')
    .attr('x', 160).attr('y', H - 90)
    .attr('width', W - 320).attr('height', 56)
    .attr('rx', 10)
    .attr('fill', '#1a1a2e').attr('stroke', C.yellow).attr('stroke-width', 1.5);
  callout.append('text')
    .attr('x', W/2).attr('y', H - 55)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textLight).attr('font-size', 20)
    .text('Next three slides visit three of these regimes.');

  // ── Phase controller ──────────────────────────────────────────────────────
  const MAX_PHASE = 4;
  let currentPhase = 0;
  let transitioning = false;

  function moveChips(filter, stagger) {
    const list = PROBLEMS.filter(filter);
    list.forEach((p, i) => {
      chips[p.id].transition().delay(i * stagger).duration(650).ease(d3.easeCubicInOut)
        .attr('transform', `translate(${p.targetX},${p.targetY})`);
    });
  }

  function advancePhase() {
    if (transitioning || currentPhase >= MAX_PHASE) return;
    transitioning = true;
    currentPhase++;

    if (currentPhase === 1) {
      // Reveal quadrants
      Object.values(quadGroups).forEach(g =>
        g.transition().duration(500).attr('opacity', 1));
    } else if (currentPhase === 2) {
      // Synthetic problems (well + mis + small)
      moveChips(p => p.kind === 'synth', 80);
    } else if (currentPhase === 3) {
      // Real-data problems
      moveChips(p => p.kind === 'real', 80);
    } else if (currentPhase === 4) {
      callout.transition().duration(500).attr('opacity', 1);
    }

    if (currentPhase >= MAX_PHASE) {
      document.getElementById('hud').classList.add('hidden');
      removeListeners();
    }

    setTimeout(() => { transitioning = false; }, 900);
  }

  // ── Event listeners ───────────────────────────────────────────────────────
  function onClick() { advancePhase(); }
  function onKeyDown(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') advancePhase();
  }
  function removeListeners() {
    document.getElementById('main-svg').removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKeyDown);
  }
  document.getElementById('main-svg').addEventListener('click', onClick);
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

})();
