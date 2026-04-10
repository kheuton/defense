/**
 * prediction-utils.js — Shared prediction computation for animations.
 *
 * Extracted from opioid-grid.js so that both the opioid-grid and
 * mse-gradient animations produce identical predictions from the
 * same seeded PRNG + config parameters.
 */

// ── Seeded PRNG (LCG) ───────────────────────────────────────
export function makePRNG(seed) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

// ── Gaussian RNG (Box-Muller) ────────────────────────────────
export function makeGaussRNG(seed) {
  const rand = makePRNG(seed);
  let spare = null;
  return () => {
    if (spare !== null) { const v = spare; spare = null; return v; }
    let u, v, s;
    do { u = rand() * 2 - 1; v = rand() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
    const mul = Math.sqrt(-2 * Math.log(s) / s);
    spare = v * mul;
    return u * mul;
  };
}

// ── Left model predictions (MSE-optimized, noisy) ────────────
// config: { seed, noiseSigma, topNoiseSigma, swapOffset }
export function computeLeftPredictions(data, k, config) {
  const gauss = makeGaussRNG(config.seed);
  const n = data.length;
  const preds = data.map((v, i) => {
    const isTopK = i >= n - k;
    const sigma = isTopK ? config.topNoiseSigma : config.noiseSigma;
    return Math.max(0, v + gauss() * sigma);
  });

  // Swap highest top-K prediction with a bar well below cutoff
  const topStart = n - k;
  let maxPredIdx = topStart;
  for (let i = topStart + 1; i < n; i++) {
    if (preds[i] > preds[maxPredIdx]) maxPredIdx = i;
  }
  const swapIdx = topStart - config.swapOffset;
  if (swapIdx >= 0) {
    const tmp = preds[maxPredIdx];
    preds[maxPredIdx] = preds[swapIdx];
    preds[swapIdx] = tmp;
  }
  return preds;
}

// ── Right model predictions (decision-aware, parabola) ───────
// config: { a, c, d }
export function computeRightPredictions(data, config) {
  return data.map((_, i) => {
    const val = config.a * (i - config.c) ** 2 + config.d;
    return Math.max(0, val);
  });
}
