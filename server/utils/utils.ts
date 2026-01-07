/**
 * Utility math functions for simulation engine
 */

/**
 * Clamp a value between min and max
 */
export function clamp(min: number, max: number, value: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Sigmoid function: 1 / (1 + exp(-x))
 */
export function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Logistic function (same as sigmoid, explicit name for clarity)
 */
export function logistic(x: number): number {
  return sigmoid(x);
}

/**
 * Normal distribution random number generator (Box-Muller transform)
 */
export function randomNormal(mean: number = 0, stdDev: number = 1): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z0 * stdDev + mean;
}

/**
 * Z-score calculation
 */
export function zscore(value: number, mean: number, std: number): number {
  if (std <= 1e-9) return 0;
  return (value - mean) / std;
}

/**
 * ReLU activation (max(0, x))
 */
export function relu(x: number): number {
  return Math.max(0, x);
}

/**
 * Weighted average
 */
export function weightedAverage(values: number[], weights: number[]): number {
  if (values.length !== weights.length) {
    throw new Error('Values and weights must have same length');
  }
  if (values.length === 0) return 0;

  const sum = values.reduce((acc, val, i) => acc + val * weights[i], 0);
  const weightSum = weights.reduce((acc, w) => acc + w, 0);

  return weightSum === 0 ? 0 : sum / weightSum;
}

/**
 * Normalize weights to sum to 1
 */
export function normalizeWeights(weights: number[]): number[] {
  const sum = weights.reduce((acc, w) => acc + w, 0);
  if (sum === 0) {
    return weights.map(() => 1 / weights.length);
  }
  return weights.map(w => w / sum);
}

/**
 * Scale a value using min-max normalization (optional, for impact ratings)
 * This is a placeholder - actual scaling should use population statistics
 */
export function scale(value: number, min: number = 0, max: number = 1): number {
  if (max - min === 0) return 0;
  return (value - min) / (max - min);
}

/**
 * Linear interpolation
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Exponential decay function
 */
export function exponentialDecay(x: number, rate: number): number {
  return Math.exp(-rate * x);
}

/**
 * Safe division (returns 0 if denominator is 0)
 */
export function safeDivide(numerator: number, denominator: number, epsilon: number = 1e-9): number {
  return denominator === 0 || Math.abs(denominator) < epsilon ? 0 : numerator / denominator;
}
