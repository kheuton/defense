(function () {
  'use strict';

  const W = 1600, H = 900;
  const svg = d3.select('#main-svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');
  svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#11111e');

  // ── Colors ────────────────────────────────────────────────────────────────
  const C = {
    teal:   '#50c8a8',
    purple: '#7c6af7',
    coral:  '#ff7c57',
    yellow: '#ffd166',
    muted:  '#888899',
    textLight: '#ddddee',
    textDim:   '#c8c8de',
    binBg:     '#1a1a2e',
    binBorder: '#2a2a3e',
  };

  // ── Title ─────────────────────────────────────────────────────────────────
  svg.append('text')
    .attr('x', W/2).attr('y', 78)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textLight).attr('font-size', 38).attr('font-weight', 700)
    .text('How methods become decision-aware');

  // ── Methods & start positions ─────────────────────────────────────────────
  const STACK_X = 120;
  const STACK_Y0 = 170;
  const CHIP_W = 200, CHIP_H = 50, CHIP_GAP = 14;

  // MSE goes into HP-grid bin. All others go into gradient bin.
  const METHODS = [
    { id: 'mse',      label: 'MSE',      color: C.teal,   bin: 'hp' },
    { id: 'spo',      label: 'SPO+',     color: C.purple, bin: 'grad' },
    { id: 'perturb',  label: 'Perturb',  color: C.purple, bin: 'grad' },
    { id: 'dfl',      label: 'DFL',      color: C.purple, bin: 'grad' },
    { id: 'identity', label: 'Identity', color: C.purple, bin: 'grad' },
    { id: 'blackbox', label: 'Blackbox', color: C.purple, bin: 'grad' },
    { id: 'pg',       label: 'PG',       color: C.purple, bin: 'grad' },
    { id: 'listLTR',  label: 'listLTR',  color: C.purple, bin: 'grad' },
    { id: 'lodl',     label: 'LODL',     color: C.purple, bin: 'grad' },
  ];

  METHODS.forEach((m, i) => {
    m.startX = STACK_X;
    m.startY = STACK_Y0 + i * (CHIP_H + CHIP_GAP);
  });

  // ── Bin layouts ───────────────────────────────────────────────────────────
  const BIN_Y = 240, BIN_H = 500;
  const BIN_A = { x: 460,  w: 460, cx: 460 + 230 };   // HP-grid (narrow)
  const BIN_B = { x: 980,  w: 560, cx: 980 + 280 };   // Gradient (wider)

  // Target positions inside bins
  const BIN_A_TARGETS = [
    { x: BIN_A.cx - CHIP_W/2, y: BIN_Y + 120 },  // MSE only
  ];
  // Gradient methods: 4 rows × 2 cols grid inside bin B
  const GRAD_COLS = 2, GRAD_ROWS = 4;
  const GRAD_START_X = BIN_B.x + 30;
  const GRAD_START_Y = BIN_Y + 95;
  const GRAD_DX = (BIN_B.w - 60 - CHIP_W) / (GRAD_COLS - 1);
  const GRAD_DY = CHIP_H + 18;
  const gradMethods = METHODS.filter(m => m.bin === 'grad');
  gradMethods.forEach((m, i) => {
    const col = i % GRAD_COLS, row = Math.floor(i / GRAD_COLS);
    m.targetX = GRAD_START_X + col * GRAD_DX;
    m.targetY = GRAD_START_Y + row * GRAD_DY;
  });
  METHODS.find(m => m.id === 'mse').targetX = BIN_A_TARGETS[0].x;
  METHODS.find(m => m.id === 'mse').targetY = BIN_A_TARGETS[0].y;

  // ── Draw bin containers (initially hidden) ────────────────────────────────
  const binA = svg.append('g').attr('opacity', 0);
  binA.append('rect')
    .attr('x', BIN_A.x).attr('y', BIN_Y)
    .attr('width', BIN_A.w).attr('height', BIN_H)
    .attr('rx', 14)
    .attr('fill', C.binBg).attr('stroke', C.teal).attr('stroke-width', 2)
    .attr('stroke-dasharray', '8 6');
  binA.append('text')
    .attr('x', BIN_A.cx).attr('y', BIN_Y + 44)
    .attr('text-anchor', 'middle')
    .attr('fill', C.teal).attr('font-size', 22).attr('font-weight', 700)
    .text('Decision-aware via');
  binA.append('text')
    .attr('x', BIN_A.cx).attr('y', BIN_Y + 74)
    .attr('text-anchor', 'middle')
    .attr('fill', C.teal).attr('font-size', 22).attr('font-weight', 700)
    .text('HP grid (finite)');

  const binB = svg.append('g').attr('opacity', 0);
  binB.append('rect')
    .attr('x', BIN_B.x).attr('y', BIN_Y)
    .attr('width', BIN_B.w).attr('height', BIN_H)
    .attr('rx', 14)
    .attr('fill', C.binBg).attr('stroke', C.purple).attr('stroke-width', 2)
    .attr('stroke-dasharray', '8 6');
  binB.append('text')
    .attr('x', BIN_B.cx).attr('y', BIN_Y + 44)
    .attr('text-anchor', 'middle')
    .attr('fill', C.purple).attr('font-size', 22).attr('font-weight', 700)
    .text('Decision-aware via');
  binB.append('text')
    .attr('x', BIN_B.cx).attr('y', BIN_Y + 74)
    .attr('text-anchor', 'middle')
    .attr('fill', C.purple).attr('font-size', 22).attr('font-weight', 700)
    .text('gradient (continuous)');

  // ── Chips ─────────────────────────────────────────────────────────────────
  const chipsG = svg.append('g');
  const chips = {};
  METHODS.forEach(m => {
    const g = chipsG.append('g')
      .attr('transform', `translate(${m.startX},${m.startY})`);
    g.append('rect')
      .attr('width', CHIP_W).attr('height', CHIP_H).attr('rx', 10)
      .attr('fill', '#1a1a2e')
      .attr('stroke', m.color).attr('stroke-width', 2);
    g.append('text')
      .attr('x', CHIP_W/2).attr('y', CHIP_H/2 + 7)
      .attr('text-anchor', 'middle')
      .attr('fill', C.textDim).attr('font-size', 22).attr('font-weight', 600)
      .text(m.label);
    chips[m.id] = g;
  });

  // ── Captions ──────────────────────────────────────────────────────────────
  const capA = svg.append('g').attr('opacity', 0);
  capA.append('text')
    .attr('x', BIN_A.cx).attr('y', BIN_Y + BIN_H - 90)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textDim).attr('font-size', 17)
    .text('Minimize prediction loss,');
  capA.append('text')
    .attr('x', BIN_A.cx).attr('y', BIN_Y + BIN_H - 65)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textDim).attr('font-size', 17)
    .text('pick (lr, batch) by val decision regret.');
  capA.append('text')
    .attr('x', BIN_A.cx).attr('y', BIN_Y + BIN_H - 30)
    .attr('text-anchor', 'middle')
    .attr('fill', C.yellow).attr('font-size', 16).attr('font-weight', 600)
    .text('+ 2 tunable HPs');

  const capB = svg.append('g').attr('opacity', 0);
  capB.append('text')
    .attr('x', BIN_B.cx).attr('y', BIN_Y + BIN_H - 90)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textDim).attr('font-size', 17)
    .text('Differentiable surrogate routes');
  capB.append('text')
    .attr('x', BIN_B.cx).attr('y', BIN_Y + BIN_H - 65)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textDim).attr('font-size', 17)
    .text('gradient through the solver.');
  capB.append('text')
    .attr('x', BIN_B.cx).attr('y', BIN_Y + BIN_H - 30)
    .attr('text-anchor', 'middle')
    .attr('fill', C.coral).attr('font-size', 16).attr('font-weight', 600)
    .text('+ 2–4 tunable HPs, extra solver calls');

  // ── Callout ───────────────────────────────────────────────────────────────
  const callout = svg.append('g').attr('opacity', 0);
  callout.append('rect')
    .attr('x', 160).attr('y', H - 100)
    .attr('width', W - 320).attr('height', 66)
    .attr('rx', 10)
    .attr('fill', '#1a1a2e').attr('stroke', C.yellow).attr('stroke-width', 1.5);
  callout.append('text')
    .attr('x', W/2).attr('y', H - 60)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textLight).attr('font-size', 20)
    .text('Every "prediction-only" method is decision-aware — just via a finite grid instead of gradients.');

  // ── Phase controller ──────────────────────────────────────────────────────
  const MAX_PHASE = 4;
  let currentPhase = 0;
  let transitioning = false;

  function moveChip(m) {
    chips[m.id].transition().duration(650).ease(d3.easeCubicInOut)
      .attr('transform', `translate(${m.targetX},${m.targetY})`);
  }

  function advancePhase() {
    if (transitioning || currentPhase >= MAX_PHASE) return;
    transitioning = true;
    currentPhase++;

    if (currentPhase === 1) {
      // Reveal bin labels
      binA.transition().duration(500).attr('opacity', 1);
      binB.transition().duration(500).attr('opacity', 1);
    } else if (currentPhase === 2) {
      // MSE into bin A
      moveChip(METHODS.find(m => m.id === 'mse'));
      capA.transition().delay(400).duration(500).attr('opacity', 1);
    } else if (currentPhase === 3) {
      // Gradient methods into bin B
      gradMethods.forEach((m, i) => {
        chips[m.id].transition().delay(i * 70).duration(650).ease(d3.easeCubicInOut)
          .attr('transform', `translate(${m.targetX},${m.targetY})`);
      });
      capB.transition().delay(700).duration(500).attr('opacity', 1);
    } else if (currentPhase === 4) {
      callout.transition().duration(500).attr('opacity', 1);
    }

    if (currentPhase >= MAX_PHASE) {
      document.getElementById('hud').classList.add('hidden');
      removeListeners();
    }

    setTimeout(() => { transitioning = false; }, 750);
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
