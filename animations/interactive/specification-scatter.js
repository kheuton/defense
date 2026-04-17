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
    gridCol:   '#22223a',
    axisCol:   '#555566',
  };

  // ── Title ─────────────────────────────────────────────────────────────────
  svg.append('text')
    .attr('x', W/2).attr('y', 64)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textLight).attr('font-size', 34).attr('font-weight', 700)
    .text('Well-specified vs mis-specified: sp_synth vs sp_planted');

  svg.append('text')
    .attr('x', W/2).attr('y', 96)
    .attr('text-anchor', 'middle')
    .attr('fill', C.muted).attr('font-size', 18)
    .text('Same 5×5 shortest-path DAG, same 1-layer linear head; only the DGP flips.');

  // ── Data ──────────────────────────────────────────────────────────────────
  // Points: relative test decision regret. Source: docs/tables/specification_contrast.md
  // LODL excluded — missing sp_planted value.
  const POINTS = [
    { id: 'spo',      label: 'SPO+',     x: 0.0560, y: 0.0520, group: 'near' },
    { id: 'listLTR',  label: 'listLTR',  x: 0.0620, y: 0.0575, group: 'near' },
    { id: 'perturb',  label: 'Perturb',  x: 0.0719, y: 0.1063, group: 'near' },
    { id: 'mse',      label: 'MSE',      x: 0.0959, y: 0.1022, group: 'near' },
    { id: 'pg',       label: 'PG',       x: 0.0987, y: 0.1031, group: 'near' },
    { id: 'dfl',      label: 'DFL',      x: 0.4875, y: 0.2275, group: 'far' },
    { id: 'identity', label: 'Identity', x: 0.7147, y: 0.4021, group: 'far' },
    { id: 'blackbox', label: 'Blackbox', x: 0.7472, y: 0.4307, group: 'far' },
  ];

  const GROUP_COLOR = { near: C.teal, far: C.coral };

  // ── Plot region ───────────────────────────────────────────────────────────
  const ML = 140, MR = 420, MT = 140, MB = 170;
  const PW = W - ML - MR, PH = H - MT - MB;
  const g = svg.append('g').attr('transform', `translate(${ML},${MT})`);

  const xSc = d3.scaleLinear().domain([0, 0.8]).range([0, PW]);
  const ySc = d3.scaleLinear().domain([0, 0.8]).range([PH, 0]);

  // ── Grid + ticks ──────────────────────────────────────────────────────────
  const ticks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8];
  g.append('g').selectAll('line').data(ticks).join('line')
    .attr('x1', d => xSc(d)).attr('x2', d => xSc(d))
    .attr('y1', 0).attr('y2', PH)
    .attr('stroke', C.gridCol).attr('stroke-width', 1);
  g.append('g').selectAll('line').data(ticks).join('line')
    .attr('x1', 0).attr('x2', PW)
    .attr('y1', d => ySc(d)).attr('y2', d => ySc(d))
    .attr('stroke', C.gridCol).attr('stroke-width', 1);

  // Axes
  g.append('line').attr('x1', 0).attr('y1', PH).attr('x2', PW).attr('y2', PH)
    .attr('stroke', C.axisCol).attr('stroke-width', 1.5);
  g.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', PH)
    .attr('stroke', C.axisCol).attr('stroke-width', 1.5);

  // Tick labels
  g.append('g').selectAll('text').data(ticks).join('text')
    .attr('x', d => xSc(d)).attr('y', PH + 28)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textDim).attr('font-size', 18)
    .text(d => d.toFixed(1));
  g.append('g').selectAll('text').data(ticks).join('text')
    .attr('x', -16).attr('y', d => ySc(d) + 6)
    .attr('text-anchor', 'end')
    .attr('fill', C.textDim).attr('font-size', 18)
    .text(d => d.toFixed(1));

  // Axis titles
  g.append('text')
    .attr('x', PW/2).attr('y', PH + 68)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textLight).attr('font-size', 22).attr('font-weight', 600)
    .text('sp_synth regret (mis-specified)');
  g.append('text')
    .attr('transform', `translate(${-90},${PH/2}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textLight).attr('font-size', 22).attr('font-weight', 600)
    .text('sp_planted regret (well-specified)');

  // ── Diagonal reference line (y = x) ───────────────────────────────────────
  const diag = g.append('g').attr('opacity', 0);
  diag.append('line')
    .attr('x1', xSc(0)).attr('y1', ySc(0))
    .attr('x2', xSc(0.8)).attr('y2', ySc(0.8))
    .attr('stroke', C.muted).attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '6 5');
  diag.append('text')
    .attr('x', xSc(0.72)).attr('y', ySc(0.76))
    .attr('text-anchor', 'end')
    .attr('fill', C.muted).attr('font-size', 16).attr('font-style', 'italic')
    .text('y = x  (Δ = 0)');

  // Region labels
  const regionLabels = g.append('g').attr('opacity', 0);
  regionLabels.append('text')
    .attr('x', xSc(0.55)).attr('y', ySc(0.15))
    .attr('text-anchor', 'middle')
    .attr('fill', C.coral).attr('font-size', 15).attr('font-style', 'italic')
    .text('worse on mis-spec');
  regionLabels.append('text')
    .attr('x', xSc(0.15)).attr('y', ySc(0.6))
    .attr('text-anchor', 'middle')
    .attr('fill', C.teal).attr('font-size', 15).attr('font-style', 'italic')
    .text('worse on well-spec');

  // ── Points ────────────────────────────────────────────────────────────────
  const ptG = g.append('g');
  const pointNodes = {};
  POINTS.forEach(p => {
    const cx = xSc(p.x), cy = ySc(p.y);
    const col = GROUP_COLOR[p.group];
    const node = ptG.append('g')
      .attr('transform', `translate(${cx},${cy}) scale(0.001)`)
      .attr('opacity', 0);
    node.append('circle')
      .attr('r', 10)
      .attr('fill', col)
      .attr('stroke', '#11111e').attr('stroke-width', 2);
    // Label offset to the right, with connector for dense cluster
    const lx = 16, ly = 6;
    node.append('text')
      .attr('x', lx).attr('y', ly)
      .attr('fill', C.textDim).attr('font-size', 18).attr('font-weight', 600)
      .text(p.label);
    pointNodes[p.id] = node;
  });

  // ── Legend ────────────────────────────────────────────────────────────────
  const LEG_X = W - MR + 30, LEG_Y = MT + 40;
  const legend = svg.append('g').attr('opacity', 0);
  legend.append('rect')
    .attr('x', LEG_X - 16).attr('y', LEG_Y - 24)
    .attr('width', 360).attr('height', 160).attr('rx', 10)
    .attr('fill', '#1a1a2e').attr('stroke', '#2a2a3e').attr('stroke-width', 1);
  legend.append('text')
    .attr('x', LEG_X).attr('y', LEG_Y + 2)
    .attr('fill', C.textLight).attr('font-size', 18).attr('font-weight', 600)
    .text('Behavior category');

  legend.append('circle').attr('cx', LEG_X + 10).attr('cy', LEG_Y + 36).attr('r', 8).attr('fill', C.teal);
  legend.append('text')
    .attr('x', LEG_X + 28).attr('y', LEG_Y + 42)
    .attr('fill', C.textDim).attr('font-size', 16)
    .text('Near origin (both regimes OK)');

  legend.append('circle').attr('cx', LEG_X + 10).attr('cy', LEG_Y + 68).attr('r', 8).attr('fill', C.coral);
  legend.append('text')
    .attr('x', LEG_X + 28).attr('y', LEG_Y + 74)
    .attr('fill', C.textDim).attr('font-size', 16)
    .text('Far from origin (fail on mis-spec)');

  legend.append('text')
    .attr('x', LEG_X).attr('y', LEG_Y + 108)
    .attr('fill', C.muted).attr('font-size', 13)
    .text('Points below diagonal:');
  legend.append('text')
    .attr('x', LEG_X).attr('y', LEG_Y + 126)
    .attr('fill', C.muted).attr('font-size', 13)
    .text('better on well-spec than mis-spec.');

  // ── Callout ───────────────────────────────────────────────────────────────
  const callout = svg.append('g').attr('opacity', 0);
  callout.append('rect')
    .attr('x', 160).attr('y', H - 110)
    .attr('width', W - 320).attr('height', 76)
    .attr('rx', 10)
    .attr('fill', '#1a1a2e').attr('stroke', C.yellow).attr('stroke-width', 1.5);
  callout.append('text')
    .attr('x', W/2).attr('y', H - 75)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textLight).attr('font-size', 20)
    .text('Decision-aware methods do not universally win on mis-spec.');
  callout.append('text')
    .attr('x', W/2).attr('y', H - 50)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textDim).attr('font-size', 17)
    .text('Whether a method wins depends on whether its surrogate can route gradient through the solver for this DAG.');

  // ── Phase controller ──────────────────────────────────────────────────────
  const MAX_PHASE = 4;
  let currentPhase = 0;
  let transitioning = false;

  function revealPoint(id, delay) {
    pointNodes[id].transition().delay(delay).duration(600).ease(d3.easeCubicOut)
      .attr('opacity', 1)
      .attrTween('transform', function () {
        const p = POINTS.find(p => p.id === id);
        const cx = xSc(p.x), cy = ySc(p.y);
        return t => `translate(${cx},${cy}) scale(${0.001 + t * 0.999})`;
      });
  }

  function advancePhase() {
    if (transitioning || currentPhase >= MAX_PHASE) return;
    transitioning = true;
    currentPhase++;

    if (currentPhase === 1) {
      // Axes are already drawn. Reveal diagonal + region labels + legend.
      diag.transition().duration(500).attr('opacity', 1);
      regionLabels.transition().delay(300).duration(500).attr('opacity', 1);
      legend.transition().duration(500).attr('opacity', 1);
    } else if (currentPhase === 2) {
      // Near-origin methods
      ['spo', 'listLTR', 'perturb', 'mse', 'pg'].forEach((id, i) =>
        revealPoint(id, i * 120));
    } else if (currentPhase === 3) {
      // Far-origin methods
      ['dfl', 'identity', 'blackbox'].forEach((id, i) =>
        revealPoint(id, i * 180));
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
