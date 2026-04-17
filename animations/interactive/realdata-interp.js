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
    .attr('x', W/2).attr('y', 52)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textLight).attr('font-size', 32).attr('font-weight', 700)
    .text('cook_county: interpolate weights MSE → Perturb');

  svg.append('text')
    .attr('x', W/2).attr('y', 78)
    .attr('text-anchor', 'middle')
    .attr('fill', C.muted).attr('font-size', 15)
    .text('θ(α) = (1−α)·θ_MSE + α·θ_Perturb, α ∈ [−0.5, 1.5]');

  // ── Data (from results/fig_realdata_interpolation.npz) ────────────────────
  const ALPHAS = [-0.5, -0.43103448, -0.36206897, -0.29310345, -0.22413793, -0.15517241, -0.0862069, -0.01724138, 0.05172414, 0.12068966, 0.18965517, 0.25862069, 0.32758621, 0.39655172, 0.46551724, 0.53448276, 0.60344828, 0.67241379, 0.74137931, 0.81034483, 0.87931034, 0.94827586, 1.01724138, 1.0862069, 1.15517241, 1.22413793, 1.29310345, 1.36206897, 1.43103448, 1.5];
  const REGRET = {
    train: [0.32907593, 0.32591581, 0.32337242, 0.32499933, 0.32630822, 0.32630822, 0.326085, 0.3261351, 0.32720733, 0.32445809, 0.32249364, 0.321926, 0.32309845, 0.31945309, 0.31828061, 0.32177716, 0.31611142, 0.3123008, 0.3129051, 0.31202635, 0.31191421, 0.31732008, 0.31957763, 0.32189715, 0.32266375, 0.31985202, 0.32407242, 0.32852954, 0.33480206, 0.33765203],
    val:   [0.17017828, 0.17017828, 0.17341977, 0.17017828, 0.16207455, 0.15721232, 0.15883306, 0.15072933, 0.15397082, 0.15397082, 0.15397082, 0.16045381, 0.16045381, 0.17017828, 0.16369531, 0.16369531, 0.16207455, 0.16693678, 0.16693678, 0.15883306, 0.16045381, 0.15883306, 0.15721232, 0.16531605, 0.16855754, 0.17666127, 0.18800648, 0.1993517, 0.21555915, 0.22204214],
    test:  [0.19368064, 0.18932053, 0.19290221, 0.1840578, 0.1840578, 0.18471202, 0.18471202, 0.18474308, 0.18555257, 0.1914385, 0.19293326, 0.19508225, 0.19508225, 0.19657703, 0.19657703, 0.19589174, 0.1973865, 0.1945833, 0.20317927, 0.20037605, 0.20333454, 0.21068417, 0.20993678, 0.20560774, 0.21208578, 0.21572955, 0.21644588, 0.22217654, 0.2325778, 0.26263058],
  };
  const MSE = {
    train: [1.24335063, 1.22547174, 1.21121085, 1.20035481, 1.19275236, 1.1882627, 1.18666649, 1.18784869, 1.19169736, 1.19812059, 1.20698524, 1.21812475, 1.23137891, 1.24665236, 1.26377881, 1.28268313, 1.30329978, 1.32551897, 1.34922874, 1.37440562, 1.4009459, 1.42873764, 1.4577471, 1.48797667, 1.51930964, 1.55166352, 1.58504438, 1.61949563, 1.65501308, 1.69152164],
    val:   [1.6422869, 1.61556065, 1.59805298, 1.58925307, 1.58887661, 1.59660614, 1.61210763, 1.63494503, 1.66481662, 1.70156896, 1.74471879, 1.79399347, 1.84883487, 1.90916669, 1.97462094, 2.04517627, 2.12065816, 2.2008431, 2.28554702, 2.37447047, 2.46752167, 2.56452513, 2.66543198, 2.7700274, 2.87813449, 2.98966932, 3.10460687, 3.22274518, 3.34371328, 3.46754646],
    test:  [2.29291749, 2.20360684, 2.12770534, 2.06471753, 2.01417732, 1.9756701, 1.94856191, 1.93233335, 1.92656922, 1.93088067, 1.94476986, 1.9676646, 1.99919367, 2.03913164, 2.08709049, 2.14275408, 2.20572853, 2.27570248, 2.35244441, 2.43578649, 2.5255754, 2.62145782, 2.72331667, 2.83089614, 2.94403219, 3.06246996, 3.18622756, 3.31487751, 3.44823694, 3.58608198],
  };

  // Build pts arrays for each split × metric
  function zip(xs, ys) { return xs.map((x, i) => ({ x, y: ys[i] })); }

  // ── Layout ────────────────────────────────────────────────────────────────
  // 2 rows × 3 cols of panels. Row 1 = regret. Row 2 = pred MSE.
  const PANEL_W = 420, PANEL_H = 290;
  const GAP_X = 40, GAP_Y = 36;
  const totalW = 3 * PANEL_W + 2 * GAP_X;
  const totalH = 2 * PANEL_H + GAP_Y;
  const X0 = (W - totalW) / 2;
  const Y0 = 120;

  const SPLITS = ['train', 'val', 'test'];
  const SPLIT_COLOR = { train: C.muted, val: C.teal, test: C.yellow };
  const METRICS = [
    { key: 'regret', label: 'Relative decision regret', data: REGRET, yPad: 0.02 },
    { key: 'mse',    label: 'Prediction MSE',           data: MSE,    yPad: 0.15 },
  ];

  const ML = 66, MR = 18, MT = 40, MB = 58;
  const PW = PANEL_W - ML - MR;
  const PH = PANEL_H - MT - MB;

  const xSc = d3.scaleLinear().domain([-0.5, 1.5]).range([0, PW]);

  const panels = [];

  METRICS.forEach((metric, row) => {
    SPLITS.forEach((split, col) => {
      const px = X0 + col * (PANEL_W + GAP_X);
      const py = Y0 + row * (PANEL_H + GAP_Y);

      const outer = svg.append('g').attr('transform', `translate(${px},${py})`);
      outer.append('rect')
        .attr('width', PANEL_W).attr('height', PANEL_H)
        .attr('rx', 10)
        .attr('fill', '#15151f').attr('stroke', '#2a2a3e').attr('stroke-width', 1);

      // Y scale per panel (using data range + pad)
      const ys = metric.data[split];
      const yMin = Math.min(...ys) - metric.yPad;
      const yMax = Math.max(...ys) + metric.yPad;
      const ySc = d3.scaleLinear().domain([yMin, yMax]).range([PH, 0]);

      // Panel title (row 1 shows split label prominently; row 2 shows "MSE - <split>")
      const titleText = row === 0
        ? `Regret — ${split}`
        : `MSE — ${split}`;
      outer.append('text')
        .attr('x', PANEL_W/2).attr('y', 24)
        .attr('text-anchor', 'middle')
        .attr('fill', SPLIT_COLOR[split]).attr('font-size', 15).attr('font-weight', 600)
        .text(titleText);

      const g = outer.append('g').attr('transform', `translate(${ML},${MT})`);

      // Grid
      const xTicks = [-0.5, 0, 0.5, 1, 1.5];
      const yTicks = ySc.ticks(4);
      g.append('g').selectAll('line').data(yTicks).join('line')
        .attr('x1', 0).attr('x2', PW)
        .attr('y1', d => ySc(d)).attr('y2', d => ySc(d))
        .attr('stroke', C.gridCol).attr('stroke-width', 1);
      g.append('g').selectAll('line').data(xTicks).join('line')
        .attr('x1', d => xSc(d)).attr('x2', d => xSc(d))
        .attr('y1', 0).attr('y2', PH)
        .attr('stroke', C.gridCol).attr('stroke-width', 1);

      // Axes
      g.append('line').attr('x1', 0).attr('y1', PH).attr('x2', PW).attr('y2', PH)
        .attr('stroke', C.axisCol).attr('stroke-width', 1.5);
      g.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', PH)
        .attr('stroke', C.axisCol).attr('stroke-width', 1.5);

      // X tick labels
      g.append('g').selectAll('text').data(xTicks).join('text')
        .attr('x', d => xSc(d)).attr('y', PH + 18)
        .attr('text-anchor', 'middle')
        .attr('fill', C.textDim).attr('font-size', 11)
        .text(d => d.toFixed(1));

      // Y tick labels
      g.append('g').selectAll('text').data(yTicks).join('text')
        .attr('x', -8).attr('y', d => ySc(d) + 4)
        .attr('text-anchor', 'end')
        .attr('fill', C.textDim).attr('font-size', 11)
        .text(d => d.toFixed(2));

      // X label (bottom row only)
      if (row === 1) {
        g.append('text')
          .attr('x', PW/2).attr('y', PH + 40)
          .attr('text-anchor', 'middle')
          .attr('fill', C.textDim).attr('font-size', 13)
          .text('α');
      }

      // Y label (leftmost col only, using metric label)
      if (col === 0) {
        g.append('text')
          .attr('transform', `translate(${-46},${PH/2}) rotate(-90)`)
          .attr('text-anchor', 'middle')
          .attr('fill', C.textLight).attr('font-size', 12).attr('font-weight', 600)
          .text(metric.label);
      }

      // Endpoint markers: MSE at α=0, Perturb at α=1 (interpolate y)
      const endpoints = outer.append('g').attr('opacity', 0);
      // Find y at α=0 and α=1 via linear interpolation
      function interpY(alpha) {
        for (let i = 0; i < ALPHAS.length - 1; i++) {
          if (ALPHAS[i] <= alpha && alpha <= ALPHAS[i+1]) {
            const t = (alpha - ALPHAS[i]) / (ALPHAS[i+1] - ALPHAS[i]);
            return ys[i] + t * (ys[i+1] - ys[i]);
          }
        }
        return ys[0];
      }
      const yAt0 = interpY(0);
      const yAt1 = interpY(1);
      const endG = endpoints.append('g').attr('transform', `translate(${ML},${MT})`);
      // MSE endpoint marker (teal)
      endG.append('line')
        .attr('x1', xSc(0)).attr('x2', xSc(0))
        .attr('y1', 0).attr('y2', PH)
        .attr('stroke', C.teal).attr('stroke-width', 1.2).attr('stroke-dasharray', '3 4').attr('opacity', 0.6);
      endG.append('circle')
        .attr('cx', xSc(0)).attr('cy', ySc(yAt0))
        .attr('r', 5).attr('fill', C.teal).attr('stroke', '#11111e').attr('stroke-width', 1.5);
      // Perturb endpoint marker (purple)
      endG.append('line')
        .attr('x1', xSc(1)).attr('x2', xSc(1))
        .attr('y1', 0).attr('y2', PH)
        .attr('stroke', C.purple).attr('stroke-width', 1.2).attr('stroke-dasharray', '3 4').attr('opacity', 0.6);
      endG.append('circle')
        .attr('cx', xSc(1)).attr('cy', ySc(yAt1))
        .attr('r', 5).attr('fill', C.purple).attr('stroke', '#11111e').attr('stroke-width', 1.5);

      // Endpoint text in top-left (only first panel)
      if (row === 0 && col === 0) {
        endG.append('text')
          .attr('x', xSc(0) + 6).attr('y', 14)
          .attr('fill', C.teal).attr('font-size', 12).attr('font-weight', 600)
          .text('MSE');
        endG.append('text')
          .attr('x', xSc(1) + 6).attr('y', 14)
          .attr('fill', C.purple).attr('font-size', 12).attr('font-weight', 600)
          .text('Perturb');
      }

      // Data line (hidden initially)
      const lineGen = d3.line().x(d => xSc(d.x)).y(d => ySc(d.y));
      const pts = zip(ALPHAS, ys);
      const path = g.append('path')
        .datum(pts)
        .attr('d', lineGen)
        .attr('fill', 'none')
        .attr('stroke', SPLIT_COLOR[split]).attr('stroke-width', 2.5)
        .attr('opacity', 0);
      const len = path.node().getTotalLength();
      path.attr('stroke-dasharray', `${len} ${len}`)
          .attr('stroke-dashoffset', len);

      // Highlight marker for test-regret minimum at α ≈ -0.16 (row 0, col 2)
      let minMarker = null;
      if (metric.key === 'regret' && split === 'test') {
        const minIdx = ys.indexOf(Math.min(...ys));
        const minAlpha = ALPHAS[minIdx];
        const minY = ys[minIdx];
        minMarker = g.append('g').attr('opacity', 0);
        minMarker.append('circle')
          .attr('cx', xSc(minAlpha)).attr('cy', ySc(minY))
          .attr('r', 10).attr('fill', 'none')
          .attr('stroke', C.coral).attr('stroke-width', 2.5);
        minMarker.append('text')
          .attr('x', xSc(minAlpha) + 14).attr('y', ySc(minY) - 8)
          .attr('fill', C.coral).attr('font-size', 12).attr('font-weight', 600)
          .text(`min @ α=${minAlpha.toFixed(2)}`);
      }

      panels.push({ outer, path, len, endpoints, metric: metric.key, split, minMarker });
    });
  });

  // ── Callout ───────────────────────────────────────────────────────────────
  const callout = svg.append('g').attr('opacity', 0);
  callout.append('rect')
    .attr('x', 140).attr('y', H - 86)
    .attr('width', W - 280).attr('height', 64)
    .attr('rx', 10)
    .attr('fill', '#1a1a2e').attr('stroke', C.yellow).attr('stroke-width', 1.5);
  callout.append('text')
    .attr('x', W/2).attr('y', H - 54)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textLight).attr('font-size', 19).attr('font-weight', 600)
    .text('Train is flat. Val/Test reveal distribution shift and overfitting.');
  callout.append('text')
    .attr('x', W/2).attr('y', H - 32)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textDim).attr('font-size', 16)
    .text('Perturb trades prediction calibration for decisions — but on a linear-objective TopK, the trade buys nothing on held-out data.');

  // ── Phase controller ──────────────────────────────────────────────────────
  const MAX_PHASE = 5;
  let currentPhase = 0;
  let transitioning = false;

  function drawRow(row, dur = 900) {
    panels.forEach((p, i) => {
      const isTopRow = p.metric === 'regret';
      if ((row === 0 && !isTopRow) || (row === 1 && isTopRow)) return;
      p.path.transition().delay((i % 3) * 100).duration(dur).ease(d3.easeCubicInOut)
        .attr('opacity', 1).attr('stroke-dashoffset', 0);
    });
  }

  function advancePhase() {
    if (transitioning || currentPhase >= MAX_PHASE) return;
    transitioning = true;
    currentPhase++;

    if (currentPhase === 1) {
      // Reveal endpoints on all panels
      panels.forEach(p =>
        p.endpoints.transition().duration(500).attr('opacity', 1));
    } else if (currentPhase === 2) {
      drawRow(0);
    } else if (currentPhase === 3) {
      drawRow(1);
    } else if (currentPhase === 4) {
      // Highlight test regret minimum
      panels.forEach(p => {
        if (p.minMarker) p.minMarker.transition().duration(500).attr('opacity', 1);
      });
    } else if (currentPhase === 5) {
      callout.transition().duration(500).attr('opacity', 1);
    }

    if (currentPhase >= MAX_PHASE) {
      document.getElementById('hud').classList.add('hidden');
      removeListeners();
    }

    setTimeout(() => { transitioning = false; }, 1200);
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
