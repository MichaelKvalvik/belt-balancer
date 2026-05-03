/**
 * Buildable factors = numbers of the form 2^a × 3^b (with a + b ≥ 1).
 * These are the scale factors achievable by trees of equal-split splitters
 * and equal-merge mergers, so they're a quick reference for "ratios you
 * can compose."  Starts at 2 (excludes the trivial factor 1).
 */

const MAX_VALUE = 256
const A_MAX = 8 // 2^8 = 256
const B_MAX = 5 // 3^5 = 243

function computeBuildableMultiples(): number[] {
  const set = new Set<number>()
  for (let a = 0; a <= A_MAX; a++) {
    for (let b = 0; b <= B_MAX; b++) {
      if (a === 0 && b === 0) continue
      const v = Math.pow(2, a) * Math.pow(3, b)
      if (v <= MAX_VALUE) set.add(v)
    }
  }
  return Array.from(set).sort((x, y) => x - y)
}

export const BUILDABLE_MULTIPLES: readonly number[] = computeBuildableMultiples()
