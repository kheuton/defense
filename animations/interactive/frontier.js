(function () {
  'use strict';

  // ── KaTeX equations (all math, θ throughout) ──────────────────────────────
  const K = window.katex;
  function kr(id, tex, display) {
    K.render(tex, document.getElementById(id),
      { throwOnError: false, displayMode: !!display });
  }

  // Phase 1: argmax_θ Σ_t log p_θ(y_t)
  kr('eq1-main',
    '\\underset{\\theta}{\\arg\\max} \\displaystyle\\sum_t \\log p_\\theta(y_t)');

  // Phase 2: argmax_θ Σ_t BPR(r_t(θ), y_t)
  kr('eq2-main',
    '\\underset{\\theta}{\\arg\\max} \\displaystyle\\sum_t \\operatorname{BPR}(r_t(\\theta),\\, y_t)');

  // Phase 3+: argmax_θ Σ_t log p_θ(y_t)  s.t.  BPR ≥ ε
  kr('eq3-main',
    '\\underset{\\theta}{\\arg\\max} \\displaystyle\\sum_t \\log p_\\theta(y_t)');
  kr('eq3-constr',
    '\\text{subj. to: } \\operatorname{BPR}(r_t(\\theta),\\, y_t) \\geq \\epsilon \\quad \\forall\\, t');

  // ── Layout constants ──────────────────────────────────────────────────────
  const W = 1600, H = 900;

  // Scatter-plot region (right ~58%)
  const PLOT_L_PAD = W * 0.44;
  const ML = 95, MR = 50, MT = 80, MB = 135;   // tall MB keeps x-label above Reveal footer
  const PW = W - PLOT_L_PAD - ML - MR;          // ≈750
  const PH = H - MT - MB;                        // ≈685

  const OX = PLOT_L_PAD + ML;  // SVG x of y-axis
  const OY = MT;                // SVG y of plot top

  // ── Scales ────────────────────────────────────────────────────────────────
  const xSc = d3.scaleLinear().domain([0.84, 1.02]).range([0, PW]);
  const ySc = d3.scaleLinear().domain([-9.0, -3.0]).range([PH, 0]);

  // ── Data ─────────────────────────────────────────────────────────────────
  // sz = normal (settled) symbol area in viewBox²
  // FEATURED_SCALE = 9 → 3× linear size when first revealed
  const FEATURED_SCALE = 9;

  const POINTS = [
    { id: 'nll', bpr: 0.8613414776, ll: -3.6553328539,
      label: 'NLL Only',     shape: 'triangle', color: '#50c8a8', sz: 2000 },
    { id: 'bpr', bpr: 1.0000,       ll: -8.1954979427,
      label: 'BPR Only',     shape: 'circle',   color: '#7c6af7', sz: 2800 },
    { id: 'd05', bpr: 0.8566292399, ll: -3.6553328539,
      label: 'DAML (varying \u03b5)', shape: 'square', color: '#ff7c57', sz:  500 },
    { id: 'd86', bpr: 0.8915590665, ll: -3.6852879253,
      label: null,           shape: 'square',   color: '#ff7c57', sz:  800 },
    { id: 'd91', bpr: 0.9622416330, ll: -3.7512539121,
      label: null,           shape: 'square',   color: '#ff7c57', sz: 1400 },
    { id: 'd94', bpr: 0.9665003727, ll: -3.7728406351,
      label: null,           shape: 'square',   color: '#ff7c57', sz: 2600 },
    { id: 'd10', bpr: 1.0000,       ll: -3.9677646264,
      label: null,           shape: 'square',   color: '#ff7c57', sz: 2200 },
  ];

  // ── SVG setup ─────────────────────────────────────────────────────────────
  const svg = d3.select('#main-svg')
    .attr('viewBox', `0 0 ${W} ${H}`)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#11111e');

  const g = svg.append('g').attr('transform', `translate(${OX},${OY})`);

  // ── Grid lines ────────────────────────────────────────────────────────────
  const gridCol  = '#22223a';
  const xTicks   = [0.85, 0.88, 0.91, 0.94, 0.97, 1.00];
  const yTicks   = [-8, -7, -6, -5, -4];
  const axisFont = 'Inter, system-ui, sans-serif';
  const tickCol  = '#c8c8de';
  const labelCol = '#c8c8de';

  g.append('g').selectAll('line').data(xTicks).join('line')
    .attr('x1', d => xSc(d)).attr('x2', d => xSc(d))
    .attr('y1', 0).attr('y2', PH)
    .attr('stroke', gridCol).attr('stroke-width', 1);

  g.append('g').selectAll('line').data(yTicks).join('line')
    .attr('x1', 0).attr('x2', PW)
    .attr('y1', d => ySc(d)).attr('y2', d => ySc(d))
    .attr('stroke', gridCol).attr('stroke-width', 1);

  // ── Axes ──────────────────────────────────────────────────────────────────
  g.append('line')
    .attr('x1', 0).attr('y1', PH).attr('x2', PW).attr('y2', PH)
    .attr('stroke', '#555566').attr('stroke-width', 1.5);
  g.append('line')
    .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', PH)
    .attr('stroke', '#555566').attr('stroke-width', 1.5);

  // X tick labels
  g.append('g').selectAll('text').data(xTicks).join('text')
    .attr('x', d => xSc(d)).attr('y', PH + 32)
    .attr('text-anchor', 'middle')
    .attr('fill', tickCol).attr('font-size', 20).attr('font-family', axisFont)
    .text(d => d.toFixed(2));

  // X axis label
  g.append('text')
    .attr('x', PW / 2).attr('y', PH + 74)
    .attr('text-anchor', 'middle')
    .attr('fill', labelCol).attr('font-size', 22).attr('font-weight', '600')
    .attr('font-family', axisFont)
    .text('BPR');

  // Y tick labels
  g.append('g').selectAll('text').data(yTicks).join('text')
    .attr('x', -14).attr('y', d => ySc(d) + 6)
    .attr('text-anchor', 'end')
    .attr('fill', tickCol).attr('font-size', 20).attr('font-family', axisFont)
    .text(d => d.toFixed(0));

  // Y axis label
  g.append('text')
    .attr('transform', `translate(${-ML + 24},${PH / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .attr('fill', labelCol).attr('font-size', 22).attr('font-weight', '600')
    .attr('font-family', axisFont)
    .text('Log Likelihood');

  // Chart title
  g.append('text')
    .attr('x', PW / 2).attr('y', -30)
    .attr('text-anchor', 'middle')
    .attr('fill', '#ddddee').attr('font-size', 26).attr('font-weight', '700')
    .attr('font-family', axisFont)
    .text('Training Frontier');

  // ── Symbol generators ─────────────────────────────────────────────────────
  const symCircle   = d3.symbol().type(d3.symbolCircle);
  const symTriangle = d3.symbol().type(d3.symbolTriangle);
  const symSquare   = d3.symbol().type(d3.symbolSquare);

  function symPath(shape, sz) {
    if (shape === 'circle')   return symCircle.size(sz)();
    if (shape === 'triangle') return symTriangle.size(sz)();
    return symSquare.size(sz)();
  }

  // ── Legend (lower-left, builds incrementally) ─────────────────────────────
  const ROW_H = 38;
  const LEG_SYM_SZ = 180;   // fixed small size for all legend markers
  const LEG_SYM_X  = 12;    // x-center of symbol within row
  const legG = g.append('g').attr('class', 'legend');

  const legBg = legG.append('rect')
    .attr('rx', 6).attr('x', -10).attr('y', -10)
    .attr('fill', '#1a1a2e').attr('stroke', '#2a2a3e').attr('stroke-width', 1)
    .attr('width', 240).attr('height', 0);

  let legendRows = 0;

  function positionLegend() {
    const legH = legendRows * ROW_H + 20;
    legG.attr('transform', `translate(10,${PH - legH - 8})`);
    legBg.attr('height', legH);
  }

  const legendAdded = new Set();

  function addLegendItem(pt) {
    const rowMidY = legendRows * ROW_H + ROW_H / 2;
    legendRows++;

    const row = legG.append('g').attr('opacity', 0);

    row.append('path')
      .attr('d', symPath(pt.shape, LEG_SYM_SZ))
      .attr('fill', pt.color)
      .attr('transform', `translate(${LEG_SYM_X},${rowMidY})`);

    row.append('text')
      .attr('x', LEG_SYM_X + 18).attr('y', rowMidY + 6)
      .attr('fill', '#c8c8de').attr('font-size', 18)
      .attr('font-family', axisFont).attr('font-weight', '500')
      .text(pt.label);

    row.transition().duration(400).attr('opacity', 1);
    positionLegend();
  }

  // ── Points layer + featured-point tracking ────────────────────────────────
  // Each point is a <g translate(cx,cy)> wrapping a <g scale(s)> wrapping <path>.
  // Animating the inner group's scale is reliable (no SVG path interpolation needed).
  const pointsG = g.append('g').attr('class', 'points');

  let featured = null;  // { scaleG, pt }

  function showPoint(pt) {
    // Shrink previous featured point from 3× → 1× (normal)
    if (featured) {
      featured.scaleG.transition().duration(450).ease(d3.easeCubicInOut)
        .attr('transform', 'scale(1)');
      featured = null;
    }

    const cx = xSc(pt.bpr);
    const cy = ySc(pt.ll);

    // Position wrapper — never moves
    const posG = pointsG.append('g')
      .attr('transform', `translate(${cx},${cy})`);

    // Scale wrapper — animates 0.05 → 3 (pop-in at 3× normal size)
    const scaleG = posG.append('g').attr('transform', 'scale(0.05)');

    scaleG.append('path')
      .attr('d', symPath(pt.shape, pt.sz))
      .attr('fill', pt.color)
      .attr('stroke', '#11111e').attr('stroke-width', 2 / 3);  // stroke stays thin

    scaleG.transition().duration(500).ease(d3.easeCubicOut)
      .attr('transform', 'scale(3)');

    featured = { scaleG, pt };

    // Legend — one entry per shape family
    const legKey = pt.shape === 'square' ? 'daml' : pt.id;
    if (!legendAdded.has(legKey) && pt.label) {
      legendAdded.add(legKey);
      addLegendItem(pt);
    }
  }

  // ── Equation visibility ───────────────────────────────────────────────────
  function showEq(id) {
    ['eq1', 'eq2', 'eq3'].forEach(e => {
      document.getElementById(e).classList.toggle('visible', e === id);
    });
  }

  // ── Phase controller ──────────────────────────────────────────────────────
  const MAX_PHASE = POINTS.length;   // 7
  let currentPhase = 0;
  let transitioning = false;

  function advancePhase() {
    if (transitioning || currentPhase >= MAX_PHASE) return;
    transitioning = true;
    currentPhase++;

    showPoint(POINTS[currentPhase - 1]);

    if (currentPhase === 1)      showEq('eq1');
    else if (currentPhase === 2) showEq('eq2');
    else if (currentPhase === 3) showEq('eq3');
    // phases 4-7: stay on eq3

    if (currentPhase >= MAX_PHASE) {
      // Settle the last point to normal size after a short delay
      setTimeout(() => {
        if (featured) {
          featured.scaleG.transition().duration(600).ease(d3.easeCubicInOut)
            .attr('transform', 'scale(1)');
          featured = null;
        }
      }, 800);
      document.getElementById('hud').classList.add('hidden');
      removeListeners();
    }

    setTimeout(() => { transitioning = false; }, 550);
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
  try { window.parent.Reveal.on('fragmentshown', advancePhase); } catch (_) {}

})();
