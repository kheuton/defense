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
    .attr('x', W/2).attr('y', 56)
    .attr('text-anchor', 'middle')
    .attr('fill', C.textLight).attr('font-size', 34).attr('font-weight', 700)
    .text('Small-data regime: test regret vs training size');

  svg.append('text')
    .attr('x', W/2).attr('y', 86)
    .attr('text-anchor', 'middle')
    .attr('fill', C.muted).attr('font-size', 16)
    .text('Phase-1-best (lr, batch) per method; seed = 2023.');

  // ── Data ──────────────────────────────────────────────────────────────────
  // From rethink_exp/fig_small_data.py output (no test-leakage note shown).
  const METHODS = [
    { id: 'mse',     label: 'MSE',     color: C.teal   },
    { id: 'dfl',     label: 'DFL',     color: C.coral  },
    { id: 'perturb', label: 'Perturb', color: C.purple },
    { id: 'lodl',    label: 'LODL',    color: C.yellow },
  ];

  const PANELS = [
    {
      id: 'knapsack',
      title: 'knapsack (synth, linear obj)',
      xlabel: 'Train size (instances)',
      xs: [50, 100, 200, 320],
      xType: 'log',
      yMax: 0.30,
      data: {
        mse:     [0.0759, 0.0640, 0.0593, 0.0544],
        dfl:     [0.2430, 0.2426, 0.2429, 0.2418],
        perturb: [0.1955, 0.2020, 0.1207, 0.1364],
        lodl:    [0.2542, 0.2588, 0.2558, 0.2374],
      },
      highlight: { method: 'mse', note: 'MSE nearly flat' },
    },
    {
      id: 'sp_synth',
      title: 'sp_synth (mis-spec, linear head)',
      xlabel: 'Train size (instances)',
      xs: [50, 100, 200, 320],
      xType: 'log',
      yMax: 0.80,
      data: {
        mse:     [0.2521, 0.1279, 0.1040, 0.0959],
        dfl:     [0.7350, 0.7081, 0.7463, 0.7468],
        perturb: [0.2464, 0.1320, 0.1175, 0.1156],
        lodl:    [0.7456, 0.6665, 0.5175, 0.6025],
      },
      highlight: { method: 'perturb', note: 'Perturb tracks MSE; DFL/LODL fail' },
    },
    {
      id: 'cook_county',
      title: 'cook_county (real, TopK time-series)',
      xlabel: 'Train size (years)',
      xs: [1, 2, 3, 4],
      xType: 'linear',
      yMax: 0.55,
      data: {
        mse:     [0.4338, 0.2846, 0.2217, 0.1880],
        dfl:     [0.4265, 0.3841, 0.2465, 0.1960],
        perturb: [0.4214, 0.4492, 0.4426, 0.4813],
        lodl:    [0.4587, 0.3094, 0.2041, 0.1814],
      },
      highlight: { method: 'perturb', note: 'Perturb worsens with MORE data' },
    },
  ];

  // ── Panel layout ──────────────────────────────────────────────────────────
  const PANEL_W = 460, PANEL_H = 500;
  const PANEL_GAP = 50;
  const ROW_Y = 145;
  const totalPanelsW = 3 * PANEL_W + 2 * PANEL_GAP;
  const ROW_X0 = (W - totalPanelsW) / 2;

  const MLp = 80, MRp = 30, MTp = 60, MBp = 90;
  const PW = PANEL_W - MLp - MRp;
  const PH = PANEL_H - MTp - MBp;

  const panelGroups = [];

  PANELS.forEach((panel, idx) => {
    const px = ROW_X0 + idx * (PANEL_W + PANEL_GAP);
    const py = ROW_Y;

    const outer = svg.append('g').attr('transform', `translate(${px},${py})`);

    // Panel card
    outer.append('rect')
      .attr('x', 0).attr('y', 0)
      .attr('width', PANEL_W).attr('height', PANEL_H)
      .attr('rx', 12)
      .attr('fill', '#15151f').attr('stroke', '#2a2a3e').attr('stroke-width', 1);

    // Panel title
    outer.append('text')
      .attr('x', PANEL_W/2).attr('y', 32)
      .attr('text-anchor', 'middle')
      .attr('fill', C.textLight).attr('font-size', 18).attr('font-weight', 600)
      .text(panel.title);

    // Plot inner
    const g = outer.append('g').attr('transform', `translate(${MLp},${MTp})`);

    const xSc = (panel.xType === 'log')
      ? d3.scaleLog().domain([panel.xs[0] * 0.9, panel.xs[panel.xs.length-1] * 1.1]).range([0, PW])
      : d3.scaleLinear().domain([panel.xs[0] - 0.3, panel.xs[panel.xs.length-1] + 0.3]).range([0, PW]);
    const ySc = d3.scaleLinear().domain([0, panel.yMax]).range([PH, 0]);

    // Grid
    const yTicks = ySc.ticks(5);
    g.append('g').selectAll('line').data(yTicks).join('line')
      .attr('x1', 0).attr('x2', PW)
      .attr('y1', d => ySc(d)).attr('y2', d => ySc(d))
      .attr('stroke', C.gridCol).attr('stroke-width', 1);

    // Axes
    g.append('line').attr('x1', 0).attr('y1', PH).attr('x2', PW).attr('y2', PH)
      .attr('stroke', C.axisCol).attr('stroke-width', 1.5);
    g.append('line').attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', PH)
      .attr('stroke', C.axisCol).attr('stroke-width', 1.5);

    // X tick labels (on data x-values exactly)
    g.append('g').selectAll('text').data(panel.xs).join('text')
      .attr('x', d => xSc(d)).attr('y', PH + 24)
      .attr('text-anchor', 'middle')
      .attr('fill', C.textDim).attr('font-size', 14)
      .text(d => String(d));

    // Y tick labels
    g.append('g').selectAll('text').data(yTicks).join('text')
      .attr('x', -10).attr('y', d => ySc(d) + 4)
      .attr('text-anchor', 'end')
      .attr('fill', C.textDim).attr('font-size', 13)
      .text(d => d.toFixed(2));

    // X label
    g.append('text')
      .attr('x', PW/2).attr('y', PH + 54)
      .attr('text-anchor', 'middle')
      .attr('fill', C.textLight).attr('font-size', 15)
      .text(panel.xlabel);

    // Y label (only on leftmost)
    if (idx === 0) {
      g.append('text')
        .attr('transform', `translate(${-56},${PH/2}) rotate(-90)`)
        .attr('text-anchor', 'middle')
        .attr('fill', C.textLight).attr('font-size', 16).attr('font-weight', 600)
        .text('Test regret (relative)');
    }

    // Data lines (hidden initially)
    const linesG = g.append('g');
    const line = d3.line()
      .x(d => xSc(d.x))
      .y(d => ySc(d.y));

    const methodPaths = {};

    METHODS.forEach(m => {
      const pts = panel.xs.map((x, i) => ({ x, y: panel.data[m.id][i] }));
      const path = linesG.append('path')
        .datum(pts)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', m.color).attr('stroke-width', 3)
        .attr('opacity', 0);

      // Stroke-dash trick for drawing animation
      const len = path.node().getTotalLength();
      path.attr('stroke-dasharray', `${len} ${len}`)
          .attr('stroke-dashoffset', len);

      // Dots per x value
      const dotG = linesG.append('g');
      pts.forEach(pt => {
        dotG.append('circle')
          .attr('cx', xSc(pt.x)).attr('cy', ySc(pt.y))
          .attr('r', 5)
          .attr('fill', m.color)
          .attr('stroke', '#11111e').attr('stroke-width', 1.5)
          .attr('opacity', 0)
          .attr('class', `dot-${m.id}`);
      });

      methodPaths[m.id] = { path, len, group: dotG };
    });

    // Highlight callout (hidden initially)
    const hlGroup = outer.append('g').attr('opacity', 0);
    hlGroup.append('rect')
      .attr('x', 14).attr('y', PANEL_H - 48)
      .attr('width', PANEL_W - 28).attr('height', 36)
      .attr('rx', 8)
      .attr('fill', '#1a1a2e')
      .attr('stroke', METHODS.find(m => m.id === panel.highlight.method).color)
      .attr('stroke-width', 1.5);
    hlGroup.append('text')
      .attr('x', PANEL_W/2).attr('y', PANEL_H - 24)
      .attr('text-anchor', 'middle')
      .attr('fill', C.textLight).attr('font-size', 15).attr('font-weight', 600)
      .text(panel.highlight.note);

    panelGroups.push({ outer, methodPaths, hlGroup });
  });

  // ── Legend (shared, top-right-ish) ────────────────────────────────────────
  const legendG = svg.append('g').attr('opacity', 1);
  const LEG_X = ROW_X0 + totalPanelsW - 280;
  const LEG_Y = 102;
  legendG.append('rect')
    .attr('x', LEG_X - 10).attr('y', LEG_Y - 22)
    .attr('width', 280).attr('height', 34).attr('rx', 6)
    .attr('fill', '#1a1a2e').attr('stroke', '#2a2a3e').attr('stroke-width', 1);
  METHODS.forEach((m, i) => {
    const x = LEG_X + i * 66;
    legendG.append('rect')
      .attr('x', x).attr('y', LEG_Y - 8)
      .attr('width', 14).attr('height', 4)
      .attr('fill', m.color);
    legendG.append('text')
      .attr('x', x + 18).attr('y', LEG_Y)
      .attr('fill', C.textDim).attr('font-size', 14)
      .text(m.label);
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
    .text('More tunable HPs → more small-N risk. MSE is the flattest baseline.');

  // ── Phase controller ──────────────────────────────────────────────────────
  const MAX_PHASE = 4;
  let currentPhase = 0;
  let transitioning = false;

  function drawPanel(idx) {
    const { methodPaths, hlGroup } = panelGroups[idx];
    METHODS.forEach((m, i) => {
      const mp = methodPaths[m.id];
      mp.path.transition().delay(i * 120).duration(900).ease(d3.easeCubicInOut)
        .attr('opacity', 1)
        .attr('stroke-dashoffset', 0);
      mp.group.selectAll('circle')
        .transition().delay(i * 120 + 400).duration(400)
        .attr('opacity', 1);
    });
    hlGroup.transition().delay(900).duration(500).attr('opacity', 1);
  }

  function advancePhase() {
    if (transitioning || currentPhase >= MAX_PHASE) return;
    transitioning = true;
    currentPhase++;

    if (currentPhase <= 3) {
      drawPanel(currentPhase - 1);
    } else if (currentPhase === 4) {
      callout.transition().duration(500).attr('opacity', 1);
    }

    if (currentPhase >= MAX_PHASE) {
      document.getElementById('hud').classList.add('hidden');
      removeListeners();
    }

    setTimeout(() => { transitioning = false; }, 1500);
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
