import { describe, it, expect } from 'vitest'
import { BUILDABLE_MULTIPLES } from './buildableMultiples'

describe('BUILDABLE_MULTIPLES', () => {
  it('is sorted ascending', () => {
    for (let i = 1; i < BUILDABLE_MULTIPLES.length; i++) {
      expect(BUILDABLE_MULTIPLES[i]).toBeGreaterThan(BUILDABLE_MULTIPLES[i - 1])
    }
  })

  it('contains no duplicates', () => {
    expect(new Set(BUILDABLE_MULTIPLES).size).toBe(BUILDABLE_MULTIPLES.length)
  })

  it('starts at 2 (excludes trivial factor 1)', () => {
    expect(BUILDABLE_MULTIPLES[0]).toBe(2)
    expect(BUILDABLE_MULTIPLES).not.toContain(1)
  })

  it('caps at 256', () => {
    for (const n of BUILDABLE_MULTIPLES) {
      expect(n).toBeLessThanOrEqual(256)
    }
  })

  it('contains the canonical small factors in order', () => {
    expect(BUILDABLE_MULTIPLES.slice(0, 8)).toEqual([2, 3, 4, 6, 8, 9, 12, 16])
  })

  it('contains expected mid-range values', () => {
    for (const v of [18, 24, 27, 32, 36, 48, 54, 64, 72, 81, 96, 108, 128, 144, 162, 192, 216, 243, 256]) {
      expect(BUILDABLE_MULTIPLES).toContain(v)
    }
  })

  it('excludes numbers with prime factors other than 2 or 3', () => {
    for (const v of [5, 7, 10, 11, 13, 14, 15, 20, 21, 25, 100, 200]) {
      expect(BUILDABLE_MULTIPLES).not.toContain(v)
    }
  })

  it('every value is 2^a × 3^b for non-negative integers a, b (with a+b ≥ 1)', () => {
    for (const v of BUILDABLE_MULTIPLES) {
      let n = v
      while (n % 2 === 0) n /= 2
      while (n % 3 === 0) n /= 3
      expect(n).toBe(1)
      expect(v).toBeGreaterThanOrEqual(2)
    }
  })
})
