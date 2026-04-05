(async function () {
  'use strict';

  // ── Render secondary KaTeX equations (synchronous, runs before await) ────
  if (window.katex) {
    katex.render(
      '\\text{RMSE} = \\displaystyle\\sqrt{\\frac{1}{n}\\sum_i (\\hat{y}_i - y_i)^2}',
      document.getElementById('rmse-eq'),
      { throwOnError: false, displayMode: false }
    );
    katex.render(
      'p(y \\mid x;\\,\\theta) = \\mathcal{N}\\!\\left(y;\\;\\mu_\\theta(x),\\,\\sigma^2\\right)',
      document.getElementById('likelihood-eq'),
      { throwOnError: false, displayMode: false }
    );
  }

  // ── Color helpers (matching config.js / ma-choropleth.html) ──────────────
  function hexToRgb(hex) {
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
  }
  function lerpRgb(a, b, t) { return a.map((v,i) => Math.round(v+(b[i]-v)*t)); }
  function rgbToHex([r,g,b]) { return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join(''); }
  const C = {
    muted:  hexToRgb('#888899'), teal:   hexToRgb('#50c8a8'),
    purple: hexToRgb('#7c6af7'), coral:  hexToRgb('#ff7c57'),
    yellow: hexToRgb('#ffd166'),
  };
  function valueColor(t) {
    if (t === 0)  return rgbToHex(C.muted);
    if (t < 0.15) return rgbToHex(lerpRgb(C.teal,   C.purple, t/0.15));
    if (t < 0.5)  return rgbToHex(lerpRgb(C.purple,  C.coral,  (t-0.15)/0.35));
    return          rgbToHex(lerpRgb(C.coral,  C.yellow, (t-0.5)/0.5));
  }

  // ── Layout ───────────────────────────────────────────────────────────────
  const W = window.innerWidth;   // 1600 in Reveal.js
  const H = window.innerHeight;  // 900 in Reveal.js
  const maxDeaths = 9;

  // Choropleth: sized for right half, starts centered, slides right
  const mapW  = W * 0.53;
  const mapH  = H * 0.88;
  const mapInitX  = (W - mapW) / 2;   // centered
  const mapFinalX = W * 0.47;         // right half
  const mapY  = H * 0.05;

  // Left panel
  const LEFT_W  = W * 0.47;   // total left panel width
  const EQ_LEFT = 36;          // left padding
  const EQ_TOP  = H * 0.09;   // equation top

  // Plot dims (within the left panel)
  const PL = 80;   // left margin (y-label + axis)
  const PR = 20;   // right margin
  const PB = 32;   // bottom margin (x-label)

  const PLOT_W    = LEFT_W - EQ_LEFT - PL - PR;   // ~616px
  const PLOTS_Y   = H * 0.46;                      // where plot area starts
  const PLOTS_H   = H - PLOTS_Y - 30;
  const PLOT_SLOT = PLOTS_H / 3;
  const PLOT_H    = PLOT_SLOT * 0.72;

  const X_MAX = 12;
  const SIGMA = 1.4;
  const BAR_H = PLOT_H * 0.75;   // fixed height for all observed-value bars

  // Three census tract examples
  const PLOTS = [
    { actual: 7, finalMu: 7.8 },
    { actual: 4, finalMu: 6.0 },
    { actual: 1, finalMu: 0.7 },
  ];
  PLOTS.forEach(p => { p.color = valueColor(p.actual / maxDeaths); p.mu = 5.0; });

  // D3 linear scale: deaths → pixels
  const xSc = d3.scaleLinear().domain([0, X_MAX]).range([0, PLOT_W]);

  // ── SVG root ─────────────────────────────────────────────────────────────
  const svg = d3.select('#main-svg');

  // ── Choropleth ───────────────────────────────────────────────────────────
  const mapGroup = svg.append('g').attr('id', 'map-group');
  const geojson  = await d3.json('../../data/ma_tract_deaths_2020.geojson');

  const proj = d3.geoConicConformal()
    .parallels([41.7, 42.7]).rotate([71.5, 0])
    .fitSize([mapW, mapH], geojson);
  const gPath = d3.geoPath().projection(proj);

  mapGroup.selectAll('path').data(geojson.features).join('path')
    .attr('class', 'tract').attr('d', gPath)
    .attr('fill', d => valueColor((d.properties.deaths_2020 || 0) / maxDeaths));

  // Legend (same as ma-choropleth.html)
  const lVals = [0,1,2,3,4,5,6,7,8,9];
  const sw = 25, sh = 12, sg = 2;
  const ltw = lVals.length * (sw + sg) - sg;
  const lgG = mapGroup.append('g').attr('transform', `translate(${(mapW-ltw)/2}, ${mapH+6})`);
  lgG.append('text').attr('class','legend-title').attr('x', ltw/2).attr('y', -3)
    .attr('text-anchor','middle').text('Opioid overdose deaths per tract (2020)');
  lVals.forEach((v, i) => {
    const x = i * (sw + sg);
    lgG.append('rect').attr('x',x).attr('y',0).attr('width',sw).attr('height',sh)
      .attr('rx',2).attr('fill', valueColor(v / maxDeaths));
    if ([0,3,6,9].includes(v)) {
      lgG.append('text').attr('class','legend-label')
        .attr('x', x + sw/2).attr('y', sh + 10).attr('text-anchor','middle')
        .text(v === 9 ? '9+' : String(v));
    }
  });

  // Initial position: centered
  mapGroup.attr('transform', `translate(${mapInitX}, ${mapY})`);

  // ── Panel group (mini-plots live here) ───────────────────────────────────
  const panelG = svg.append('g').attr('id', 'panel-group').style('opacity', 0);

  // Per-plot element store
  const PE = [{}, {}, {}];

  // ── Gaussian path (in plot-local coordinates) ────────────────────────────
  function gaussPath(mu, sigma) {
    const n = 160;
    let d = `M ${xSc(0)} ${PLOT_H}`;
    for (let i = 0; i <= n; i++) {
      const x = i * X_MAX / n;
      const y = PLOT_H * (1 - Math.exp(-0.5 * ((x - mu) / sigma) ** 2) * 0.85);
      d += ` L ${xSc(x)} ${y}`;
    }
    return d + ` L ${xSc(X_MAX)} ${PLOT_H} Z`;
  }

  // ── Settling state (per-plot: true = D3 tween owns the mu) ───────────────
  const settling = [false, false, false];

  function updateOnePlot(i) {
    if (!PE[i].gaussCurve) return;
    const path = gaussPath(PLOTS[i].mu, SIGMA);
    PE[i].gaussCurve.attr('d', path);
    if (PE[i].gaussFill) PE[i].gaussFill.attr('d', path);
  }

  // ── RAF loop (drift during phase 5) ──────────────────────────────────────
  let rafId = null, gaussDrifting = false, rafStart = null;

  function rafLoop(ts) {
    if (!rafStart) rafStart = ts;
    const t = ts - rafStart;
    if (gaussDrifting) {
      if (!settling[0]) PLOTS[0].mu = 5.0 + 1.2 * Math.sin(t * 0.0015);
      if (!settling[1]) PLOTS[1].mu = 5.0 + 1.0 * Math.sin(t * 0.0018 + 1.2);
      if (!settling[2]) PLOTS[2].mu = 5.0 + 1.5 * Math.sin(t * 0.0012 + 2.5);
      PE.forEach((_, i) => { if (!settling[i]) updateOnePlot(i); });
    }
    rafId = requestAnimationFrame(rafLoop);
  }
  function startRAF() {
    if (!rafId) { rafStart = null; rafId = requestAnimationFrame(rafLoop); }
  }
  function stopRAF() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  // Ease one Gaussian mu to its final value using d3.timer
  function settleGauss(i, delay) {
    setTimeout(() => {
      settling[i] = true;
      const startMu = PLOTS[i].mu;
      const targetMu = PLOTS[i].finalMu;
      const duration = 700;
      const ease = d3.easeCubicOut;
      const timer = d3.timer(elapsed => {
        const t = ease(Math.min(elapsed / duration, 1));
        PLOTS[i].mu = startMu + (targetMu - startMu) * t;
        updateOnePlot(i);
        if (elapsed >= duration) { PLOTS[i].mu = targetMu; timer.stop(); }
      });
    }, delay);
  }

  // Slot machine stop
  function stopSlot(reelId, delay) {
    setTimeout(() => {
      const el = document.getElementById(reelId);
      // Capture current animated position, then start transition toward 0
      const matrix = new DOMMatrix(window.getComputedStyle(el).transform);
      const currentY = matrix.m42;
      el.classList.remove('spinning');
      el.style.transform = `translateY(${currentY}px)`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        el.style.transform = 'translateY(0)';
        // Delay gold + lock until AFTER the 300ms CSS transition finishes
        // so no sliver of the next reel character is ever gold-colored
        setTimeout(() => {
          el.classList.add('gold');
          el.classList.add('locked');   // max-height clips any sub-pixel overflow
        }, 320);
      }));
    }, delay);
  }

  // ── Phase controller ─────────────────────────────────────────────────────
  let currentPhase = 0;
  let transitioning = false;
  const MAX_PHASE = 8;

  // ── Phase 1: map slides right, equation fades in ──────────────────────────
  function phase1() {
    transitioning = true;
    document.getElementById('hud').classList.add('hidden');

    d3.select('#map-group').transition().duration(900).ease(d3.easeCubicInOut)
      .attr('transform', `translate(${mapFinalX}, ${mapY})`);

    const eqBox = document.getElementById('eq-box');
    eqBox.style.left = EQ_LEFT + 'px';
    eqBox.style.top  = EQ_TOP  + 'px';
    setTimeout(() => eqBox.classList.add('visible'),              350);
    setTimeout(() => document.getElementById('eq1').classList.add('visible'), 480);
    setTimeout(() => document.getElementById('eq2').classList.add('visible'), 720);
    setTimeout(() => { transitioning = false; }, 1150);
  }

  // ── Phase 2: plot axes appear ─────────────────────────────────────────────
  function phase2() {
    transitioning = true;
    d3.select('#panel-group').transition().duration(300).style('opacity', 1);

    PLOTS.forEach((p, i) => {
      const delay = i * 160;
      const slotTop = PLOTS_Y + i * PLOT_SLOT;
      // Center plot + x-label within the slot
      const oy = slotTop + (PLOT_SLOT - PLOT_H - PB) / 2;
      const ox = EQ_LEFT + PL;

      const g = panelG.append('g').attr('transform', `translate(${ox}, ${oy})`);
      PE[i].g = g;

      // Y axis
      g.append('line')
        .attr('x1',0).attr('y1',0).attr('x2',0).attr('y2',PLOT_H)
        .attr('stroke','#555568').attr('stroke-width',1.5).attr('opacity',0)
        .transition().delay(delay).duration(350).attr('opacity',1);

      // X axis
      g.append('line')
        .attr('x1',0).attr('y1',PLOT_H).attr('x2',PLOT_W).attr('y2',PLOT_H)
        .attr('stroke','#555568').attr('stroke-width',1.5).attr('opacity',0)
        .transition().delay(delay).duration(350).attr('opacity',1);

      // X label "deaths"
      g.append('text')
        .attr('x', PLOT_W/2).attr('y', PLOT_H + PB - 4)
        .attr('text-anchor','middle').attr('fill','#888899').attr('font-size',13)
        .attr('font-family','Inter,system-ui,sans-serif')
        .text('deaths').attr('opacity',0)
        .transition().delay(delay+80).duration(350).attr('opacity',1);

      // Y label "probability" (rotated)
      g.append('text')
        .attr('transform', `translate(${-PL+20}, ${PLOT_H/2}) rotate(-90)`)
        .attr('text-anchor','middle').attr('fill','#888899').attr('font-size',13)
        .attr('font-family','Inter,system-ui,sans-serif')
        .text('probability').attr('opacity',0)
        .transition().delay(delay+80).duration(350).attr('opacity',1);
    });

    setTimeout(() => { transitioning = false; }, 2 * 160 + 350 + 80 + 50);
  }

  // ── Phase 3: bars appear ──────────────────────────────────────────────────
  function phase3() {
    transitioning = true;

    PLOTS.forEach((p, i) => {
      const delay = i * 220;
      const barH = BAR_H;
      // ~1/5 of one death-unit wide — a thin spike marking the observation
      const barW = Math.max(Math.round((xSc(1.0) - xSc(0)) / 5), 3);
      const barX = xSc(p.actual) - barW / 2;

      PE[i].g.append('rect')
        .attr('x', barX).attr('y', PLOT_H)
        .attr('width', barW).attr('height', 0)
        .attr('fill', p.color).attr('opacity', 0.9)
        .transition().delay(delay).duration(480).ease(d3.easeBackOut.overshoot(0.4))
        .attr('y', PLOT_H - barH).attr('height', barH);
    });

    // Show RMSE equation as bars appear
    setTimeout(() => document.getElementById('rmse-eq').classList.add('visible'), 2 * 220 + 200);

    setTimeout(() => { transitioning = false; }, 2 * 220 + 480);
  }

  // ── Phase 4: Gaussian curves appear (mean=5.0) ────────────────────────────
  function phase4() {
    transitioning = true;

    PLOTS.forEach((p, i) => {
      const delay = i * 220;
      const path = gaussPath(5.0, SIGMA);

      // Fill (shown in phase 7)
      const fill = PE[i].g.append('path').attr('d', path)
        .attr('fill', p.color).attr('fill-opacity', 0).attr('stroke','none');
      PE[i].gaussFill = fill;

      // Stroke curve
      const curve = PE[i].g.append('path').attr('d', path)
        .attr('fill','none').attr('stroke', p.color).attr('stroke-width', 2.5)
        .attr('stroke-opacity', 0);
      curve.transition().delay(delay).duration(450).attr('stroke-opacity', 0.9);
      PE[i].gaussCurve = curve;

      // Mean dot at bar-top height (shown in phase 8)
      const dotY = PLOT_H - BAR_H;
      const dot = PE[i].g.append('circle')
        .attr('cx', xSc(p.finalMu)).attr('cy', dotY)
        .attr('r', 0).attr('fill', p.color).attr('opacity', 0);
      PE[i].meanDot = dot;

      // Gap line at bar-top height from observation to prediction (shown in phase 8)
      const gap = PE[i].g.append('line')
        .attr('x1', xSc(p.actual)).attr('y1', dotY)
        .attr('x2', xSc(p.finalMu)).attr('y2', dotY)
        .attr('stroke','#ff7c57').attr('stroke-width', 2.5)
        .attr('stroke-dasharray','5,3').attr('stroke-opacity', 0);
      PE[i].gapLine = gap;
    });

    setTimeout(() => { transitioning = false; }, 2 * 220 + 450);
  }

  // ── Phase 5: slots spin, Gaussians drift ──────────────────────────────────
  function phase5() {
    transitioning = true;

    ['reel-0','reel-1','reel-2','reel-3'].forEach(id =>
      document.getElementById(id).classList.add('spinning'));

    gaussDrifting = true;
    startRAF();

    // Allow advancing after 800ms minimum dwell
    setTimeout(() => { transitioning = false; }, 800);
  }

  // ── Phase 6: slots stop (staggered), Gaussians settle ────────────────────
  function phase6() {
    transitioning = true;

    // Stop slots staggered
    stopSlot('reel-0', 0);
    stopSlot('reel-1', 450);
    stopSlot('reel-2', 900);
    stopSlot('reel-3', 1300);

    // Settle each Gaussian as each location/time/demo theta stops
    // Plot 0 (high): settles when reel-1 stops (location param)
    // Plot 1 (mod):  settles when reel-2 stops (time param)
    // Plot 2 (low):  settles when reel-3 stops (demo param)
    settleGauss(0, 500);    // ~50ms after reel-1 stops
    settleGauss(1, 950);    // ~50ms after reel-2 stops
    settleGauss(2, 1350);   // ~50ms after reel-3 stops

    // Stop drift once all settling begins
    setTimeout(() => { gaussDrifting = false; }, 1350);

    // Stop RAF after all tweens finish (1350 + 700 settle + 100 buffer)
    setTimeout(() => {
      stopRAF();
      transitioning = false;
    }, 2200);
  }

  // ── Phase 7: area under curve shades in + likelihood equation ───────────────
  function phase7() {
    transitioning = true;
    PLOTS.forEach((p, i) => {
      PE[i].gaussFill.transition().duration(650).attr('fill-opacity', 0.18);
    });
    setTimeout(() => document.getElementById('likelihood-eq').classList.add('visible'), 300);
    setTimeout(() => { transitioning = false; }, 750);
  }

  // ── Phase 8: curves collapse to point, gap lines appear ───────────────────
  function phase8() {
    transitioning = true;

    PLOTS.forEach((p, i) => {
      // Fade out Gaussian stroke and fill
      PE[i].gaussCurve.transition().duration(420).attr('stroke-opacity', 0);
      PE[i].gaussFill.transition().duration(420).attr('fill-opacity', 0);

      // Show mean dot
      PE[i].meanDot.transition().delay(150 + i * 80).duration(320)
        .attr('r', 5.5).attr('opacity', 1);

      // Show gap line
      PE[i].gapLine.transition().delay(480 + i * 80).duration(420)
        .attr('stroke-opacity', 1);
    });

    setTimeout(() => {
      removeListeners();
      transitioning = false;
    }, 1050);
  }

  // ── advancePhase ──────────────────────────────────────────────────────────
  function advancePhase() {
    if (transitioning || currentPhase >= MAX_PHASE) return;
    currentPhase++;
    switch (currentPhase) {
      case 1: phase1(); break;
      case 2: phase2(); break;
      case 3: phase3(); break;
      case 4: phase4(); break;
      case 5: phase5(); break;
      case 6: phase6(); break;
      case 7: phase7(); break;
      case 8: phase8(); break;
    }
  }

  function onClick()  { advancePhase(); }
  function onKeyDown(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); advancePhase(); }
  }
  function removeListeners() {
    document.getElementById('main-svg').removeEventListener('click', onClick);
    document.removeEventListener('keydown', onKeyDown);
  }

  document.getElementById('main-svg').addEventListener('click', onClick);
  document.addEventListener('keydown', onKeyDown);

  // Reveal.js fragment integration
  try {
    const Reveal = window.parent && window.parent.Reveal;
    if (Reveal) Reveal.on('fragmentshown', () => advancePhase());
  } catch (_) {}

})();
