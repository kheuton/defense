// bench-bump-utils.js — shared utilities for bench-bump animations

const NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, text) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (text !== undefined) e.textContent = text;
  return e;
}

// Returns SVG path d string centered at (0,0). Returns null for 'circle'.
export function markerPath(shape, r) {
  switch (shape) {
    case 'star': {
      const o = r, i = r * 0.42;
      const pts = [];
      for (let k = 0; k < 10; k++) {
        const a = (k * 36 - 90) * Math.PI / 180;
        const rad = k % 2 === 0 ? o : i;
        pts.push(`${(rad * Math.cos(a)).toFixed(2)},${(rad * Math.sin(a)).toFixed(2)}`);
      }
      return 'M' + pts.join('L') + 'Z';
    }
    case 'hex': {
      const pts = [];
      for (let k = 0; k < 6; k++) {
        const a = k * 60 * Math.PI / 180;
        pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`);
      }
      return 'M' + pts.join('L') + 'Z';
    }
    case 'triangle': {
      const h = (r * Math.sqrt(3) / 2).toFixed(2);
      return `M0,${(-r).toFixed(2)}L${h},${(r * 0.5).toFixed(2)}L${(-h)},${(r * 0.5).toFixed(2)}Z`;
    }
    case 'square': {
      const s = (r * 0.88).toFixed(2);
      return `M${-s},${-s}L${s},${-s}L${s},${s}L${-s},${s}Z`;
    }
    case 'diamond': {
      return `M0,${(-r).toFixed(2)}L${r.toFixed(2)},0L0,${r.toFixed(2)}L${(-r).toFixed(2)},0Z`;
    }
    default:
      return null;
  }
}

// Create and append a marker. `extra` may include 'data-group', opacity (→style), transition (→style).
export function drawMarker(g, cx, cy, shape, color, r, extra = {}) {
  const { opacity, transition, ...attrExtra } = extra;
  let node;
  if (shape === 'circle') {
    node = el('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r, fill: color, ...attrExtra });
  } else {
    const d = markerPath(shape, r);
    node = el('path', { d, transform: `translate(${cx.toFixed(1)},${cy.toFixed(1)})`, fill: color, ...attrExtra });
  }
  if (opacity !== undefined) node.style.opacity = String(opacity);
  if (transition !== undefined) node.style.transition = transition;
  g.appendChild(node);
  return node;
}

// Log scale: lower val → smaller yPx (top = better performance).
export function scaleLog(val, yMin, yMax, topY, H) {
  const norm = (Math.log10(val) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin));
  return topY + Math.max(0, Math.min(1, norm)) * H;
}

// Linear scale: lower val → smaller yPx.
export function scaleLinear(val, yMin, yMax, topY, H) {
  const norm = (val - yMin) / (yMax - yMin);
  return topY + Math.max(0, Math.min(1, norm)) * H;
}

// Deterministic pseudo-random in [-range, range].
export function jitter(s1, s2, range) {
  let h = ((s1 * 2654435761 + s2 * 1013904223) & 0xffffffff) >>> 0;
  h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) >>> 0;
  h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return (h / 0xffffffff - 0.5) * 2 * range;
}

// Draw axis: gridlines, left spine, optional tick labels, and 1–2 line title.
// cfg: { cl, cr, ct, cb, yMin, yMax, type ('log'|'lin'),
//        ticks, tickFmt, labels (bool), title, title2, titleX, titleY }
// labelGroup: optional <g> to place labels into (enables deferred reveal).
//   If null, labels go directly into g (always visible with the axis).
export function buildAxis(g, cfg, labelGroup = null) {
  const { cl, cr, ct, cb } = cfg;
  const H = cb - ct;
  const ys = v => cfg.type === 'log'
    ? scaleLog(v, cfg.yMin, cfg.yMax, ct, H)
    : scaleLinear(v, cfg.yMin, cfg.yMax, ct, H);
  const font = 'Inter, system-ui, sans-serif';

  cfg.ticks.forEach(t => g.appendChild(el('line', {
    x1: cl, y1: ys(t).toFixed(1), x2: cr, y2: ys(t).toFixed(1),
    stroke: '#1c1c30', 'stroke-width': 1
  })));

  g.appendChild(el('line', {
    x1: cl, y1: ct, x2: cl, y2: cb, stroke: '#383858', 'stroke-width': 1.5
  }));

  if (cfg.labels) {
    const target = labelGroup || g;

    // Opaque background strip behind labels so gridlines don't bleed through.
    target.appendChild(el('rect', {
      x: cl - 52, y: ct - 6, width: 50, height: cb - ct + 12,
      fill: '#11111e'
    }));

    // Tick marks (dashes) + labels
    cfg.ticks.forEach(t => {
      const yp = ys(t).toFixed(1);
      target.appendChild(el('line', {
        x1: cl - 4, y1: yp, x2: cl, y2: yp, stroke: '#383858', 'stroke-width': 1.5
      }));
      target.appendChild(el('text', {
        x: cl - 7, y: +yp + 5, 'text-anchor': 'end',
        fill: '#b8b8d0', 'font-size': 14, 'font-weight': 700, 'font-family': font
      }, cfg.tickFmt(t)));
    });
  }

  if (cfg.title) g.appendChild(el('text', {
    x: cfg.titleX, y: cfg.titleY, 'text-anchor': 'middle',
    fill: '#b0b0c8', 'font-size': 16, 'font-weight': 600, 'font-family': font
  }, cfg.title));
  if (cfg.title2) g.appendChild(el('text', {
    x: cfg.titleX, y: cfg.titleY + 18, 'text-anchor': 'middle',
    fill: '#8a8aa0', 'font-size': 15, 'font-family': font
  }, cfg.title2));
}

// Build a legend <g>. groups: [{head, items:[{display,shape,color}]}]
export function buildLegend(groups, x, y, w) {
  const PAD = 10, HH = 30, RH = 34, GG = 7;
  const font = 'Inter, system-ui, sans-serif';
  const g = el('g');

  let h = PAD;
  groups.forEach(grp => { h += HH + grp.items.length * RH + GG; });
  h += PAD;

  g.appendChild(el('rect', {
    x, y, width: w, height: h, rx: 4,
    fill: '#0b0b18', 'fill-opacity': 0.93, stroke: '#252538', 'stroke-width': 1
  }));

  let cy = y + PAD;
  groups.forEach(grp => {
    g.appendChild(el('text', {
      x: x + PAD, y: cy + 20, fill: '#52526a', 'font-size': 18,
      'font-family': font, 'font-weight': 700
    }, grp.head.toUpperCase()));
    cy += HH;

    grp.items.forEach(item => {
      const mx = x + PAD + 8, my = cy + 12;
      if (item.shape === 'circle') {
        g.appendChild(el('circle', { cx: mx, cy: my, r: 8, fill: item.color }));
      } else {
        g.appendChild(el('path', {
          d: markerPath(item.shape, 8),
          transform: `translate(${mx},${my})`, fill: item.color
        }));
      }
      g.appendChild(el('text', {
        x: mx + 16, y: my + 7, fill: '#c0c0d8', 'font-size': 22, 'font-family': font
      }, item.display));
      cy += RH;
    });
    cy += GG;
  });
  return g;
}

// ── Method lists ─────────────────────────────────────────────────────────────

export const ORIG_METHODS = [
  { key: 'Two-stage', display: 'Two-stage', shape: 'star',     color: '#ff7c57', group: 'decision-unaware' },
  { key: 'SPO',       display: 'SPO',       shape: 'hex',      color: '#50c8a8', group: 'surrogate-gradient' },
  { key: 'DFL',       display: 'DFL',       shape: 'hex',      color: '#3aaa90', group: 'surrogate-gradient' },
  { key: 'Blackbox',  display: 'Blackbox',  shape: 'hex',      color: '#2a8870', group: 'surrogate-gradient' },
  { key: 'Identity',  display: 'Identity',  shape: 'hex',      color: '#1a6650', group: 'surrogate-gradient' },
  { key: 'LODL',      display: 'LODL',      shape: 'circle',   color: '#ffd166', group: 'trained-surrogate' },
  { key: 'CPLayer',   display: 'CPLayer',   shape: 'triangle', color: '#7c6af7', group: 'continuous' },
  { key: 'list-LTR',  display: 'L-LTR',     shape: 'square',   color: '#4ecdc4', group: 'statistical' },
  { key: 'pair-LTR',  display: 'pr-LTR',    shape: 'square',   color: '#6ed9d2', group: 'statistical' },
  { key: 'point-LTR', display: 'pt-LTR',    shape: 'square',   color: '#8ee4dc', group: 'statistical' },
  { key: 'NCE',       display: 'NCE',       shape: 'square',   color: '#aeeee8', group: 'statistical' },
];

export const RERUN_METHODS = [
  { key: 'mse',      display: 'MSE',      shape: 'star',     color: '#ff7c57', group: 'decision-unaware' },
  { key: 'spo',      display: 'SPO+',     shape: 'diamond',  color: '#50c8a8', group: 'surrogate-gradient' },
  { key: 'pg',       display: 'PG',       shape: 'diamond',  color: '#70dcbc', group: 'surrogate-gradient' },
  { key: 'dfl',      display: 'DFL',      shape: 'hex',      color: '#3aaa90', group: 'surrogate-gradient' },
  { key: 'blackbox', display: 'Blackbox', shape: 'hex',      color: '#2a8870', group: 'surrogate-gradient' },
  { key: 'identity', display: 'Identity', shape: 'hex',      color: '#1a6650', group: 'surrogate-gradient' },
  { key: 'perturb',  display: 'DPO',      shape: 'hex',      color: '#0e4a38', group: 'surrogate-gradient' },
  { key: 'lodl',     display: 'LODL',     shape: 'circle',   color: '#ffd166', group: 'trained-surrogate' },
  { key: 'cpLayer',  display: 'cpLayer',  shape: 'triangle', color: '#7c6af7', group: 'continuous' },
  { key: 'qptl',     display: 'QPTL',     shape: 'triangle', color: '#9b8ef9', group: 'continuous' },
  { key: 'listLTR',  display: 'L-LTR',    shape: 'square',   color: '#4ecdc4', group: 'statistical' },
  { key: 'pairLTR',  display: 'pr-LTR',   shape: 'square',   color: '#6ed9d2', group: 'statistical' },
  { key: 'pointLTR', display: 'pt-LTR',   shape: 'square',   color: '#8ee4dc', group: 'statistical' },
  { key: 'nce',      display: 'NCE',      shape: 'square',   color: '#aeeee8', group: 'statistical' },
];

export const ORIG_LEGEND_GROUPS = [
  { head: 'Decision-Unaware', items: [
    { display: 'Two-stage', shape: 'star', color: '#ff7c57' },
  ]},
  { head: 'Surrogate Gradient', items: [
    { display: 'SPO',      shape: 'hex', color: '#50c8a8' },
    { display: 'DFL',      shape: 'hex', color: '#3aaa90' },
    { display: 'Blackbox', shape: 'hex', color: '#2a8870' },
    { display: 'Identity', shape: 'hex', color: '#1a6650' },
  ]},
  { head: 'Trained Surrogate', items: [
    { display: 'LODL', shape: 'circle', color: '#ffd166' },
  ]},
  { head: 'Continuous', items: [
    { display: 'CPLayer', shape: 'triangle', color: '#7c6af7' },
  ]},
  { head: 'Statistical', items: [
    { display: 'L-LTR',  shape: 'square', color: '#4ecdc4' },
    { display: 'pr-LTR', shape: 'square', color: '#6ed9d2' },
    { display: 'pt-LTR', shape: 'square', color: '#8ee4dc' },
    { display: 'NCE',    shape: 'square', color: '#aeeee8' },
  ]},
];

export const RERUN_LEGEND_GROUPS = [
  { head: 'Decision-Unaware', items: [
    { display: 'MSE', shape: 'star', color: '#ff7c57' },
  ]},
  { head: 'Surrogate Gradient', items: [
    { display: 'SPO+',     shape: 'diamond', color: '#50c8a8' },
    { display: 'PG',       shape: 'diamond', color: '#70dcbc' },
    { display: 'DFL',      shape: 'hex',     color: '#3aaa90' },
    { display: 'Blackbox', shape: 'hex',     color: '#2a8870' },
    { display: 'Identity', shape: 'hex',     color: '#1a6650' },
    { display: 'DPO',      shape: 'hex',     color: '#0e4a38' },
  ]},
  { head: 'Trained Surrogate', items: [
    { display: 'LODL', shape: 'circle', color: '#ffd166' },
  ]},
  { head: 'Continuous', items: [
    { display: 'cpLayer', shape: 'triangle', color: '#7c6af7' },
    { display: 'QPTL',    shape: 'triangle', color: '#9b8ef9' },
  ]},
  { head: 'Statistical', items: [
    { display: 'L-LTR',  shape: 'square', color: '#4ecdc4' },
    { display: 'pr-LTR', shape: 'square', color: '#6ed9d2' },
    { display: 'pt-LTR', shape: 'square', color: '#8ee4dc' },
    { display: 'NCE',    shape: 'square', color: '#aeeee8' },
  ]},
];
