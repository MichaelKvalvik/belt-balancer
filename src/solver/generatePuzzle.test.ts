import { describe, it, expect } from 'vitest'
import {
  generatePuzzle,
  isBuiltable,
  buildableSequence,
  _buildLoopbackPuzzleForTest,
} from './generatePuzzle'
import { solveFlow } from './solveFlow'
import type {
  GeneratedPuzzle,
  Graph,
  SolverEdge,
  SolverNode,
} from '../types'

// ── helpers ────────────────────────────────────────────────────────────────

function toGraph(gen: GeneratedPuzzle): Graph {
  const nodes: SolverNode[] = [
    ...gen.puzzle.inputs.map((i) => ({
      id: i.id,
      kind: 'input' as const,
      data: { kind: 'input' as const, rate: i.rate },
    })),
    ...gen.puzzle.outputs.map((o) => ({
      id: o.id,
      kind: 'output' as const,
      data: { kind: 'output' as const, targetRate: o.targetRate },
    })),
    ...gen.solution.nodes.map((sn) => ({
      id: sn.id,
      kind: (sn.type === 'splitterNode' ? 'splitter' : 'merger') as 'splitter' | 'merger',
      data: sn.type === 'splitterNode'
        ? { kind: 'splitter' as const }
        : { kind: 'merger' as const },
    })),
  ]
  const edges: SolverEdge[] = gen.solution.edges.map((e, i) => ({
    id: `e${i}`,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
    data: { mark: e.mark ?? 1 },
  }))
  return { nodes, edges }
}

function expectVerifies(gen: GeneratedPuzzle): void {
  const result = solveFlow(toGraph(gen))
  expect(result.unstable).toBe(false)
  expect(result.satisfied).toBe(true)
  for (const out of gen.puzzle.outputs) {
    const r = result.outputResults[out.id]
    expect(r).toBeDefined()
    expect(r.actual).toBeCloseTo(out.targetRate, 5)
    expect(r.satisfied).toBe(true)
  }
}

/** Detect a loopback (cycle) by checking for back-edges via DFS. */
function hasLoopback(gen: GeneratedPuzzle): boolean {
  const adj = new Map<string, string[]>()
  for (const e of gen.solution.edges) {
    if (!adj.has(e.source)) adj.set(e.source, [])
    adj.get(e.source)!.push(e.target)
  }
  const color = new Map<string, 0 | 1 | 2>()
  function dfs(id: string): boolean {
    color.set(id, 1)
    for (const next of adj.get(id) ?? []) {
      const c = color.get(next) ?? 0
      if (c === 1) return true
      if (c === 0 && dfs(next)) return true
    }
    color.set(id, 2)
    return false
  }
  for (const inp of gen.puzzle.inputs) {
    if ((color.get(inp.id) ?? 0) === 0 && dfs(inp.id)) return true
  }
  return false
}

// ── tests ─────────────────────────────────────────────────────────────────

describe('isBuiltable', () => {
  it('accepts buildable rates', () => {
    expect(isBuiltable(60)).toBe(true)
    expect(isBuiltable(120)).toBe(true)
    expect(isBuiltable(180)).toBe(true)
    expect(isBuiltable(540)).toBe(true)
    expect(isBuiltable(1080)).toBe(true)
  })
  it('rejects non-buildable rates', () => {
    expect(isBuiltable(100)).toBe(false)
    expect(isBuiltable(150)).toBe(false)
    expect(isBuiltable(200)).toBe(false)
  })
  it('rejects degenerate inputs', () => {
    expect(isBuiltable(0)).toBe(false)
    expect(isBuiltable(-60)).toBe(false)
    expect(isBuiltable(45)).toBe(false)
  })
})

describe('buildableSequence', () => {
  it('returns the canonical 2^a × 3^b sequence', () => {
    expect(buildableSequence(36)).toEqual([1, 2, 3, 4, 6, 8, 9, 12, 16, 18, 24, 27, 32, 36])
  })
  it('starts with 1', () => {
    expect(buildableSequence(1)).toEqual([1])
  })
  it('handles upTo < 1 by returning []', () => {
    expect(buildableSequence(0)).toEqual([])
    expect(buildableSequence(-5)).toEqual([])
  })
  it('contains every value of form 2^a × 3^b ≤ upTo', () => {
    const seq = buildableSequence(100)
    const set = new Set(seq)
    for (let a = 0; (1 << a) <= 100; a++) {
      for (let b = 0; (1 << a) * 3 ** b <= 100; b++) {
        expect(set.has((1 << a) * 3 ** b)).toBe(true)
      }
    }
  })
})

describe('generatePuzzle — easy', () => {
  it('returns 2–3 outputs with rates ≤120, no loopback, verifies', () => {
    for (let i = 0; i < 10; i++) {
      const gen = generatePuzzle('easy')
      expect(gen.puzzle.outputs.length).toBeGreaterThanOrEqual(2)
      expect(gen.puzzle.outputs.length).toBeLessThanOrEqual(3)
      for (const o of gen.puzzle.outputs) {
        expect(o.targetRate).toBeLessThanOrEqual(120)
      }
      expect(hasLoopback(gen)).toBe(false)
      expectVerifies(gen)
    }
  })
  it('uses Infinity node budgets', () => {
    const gen = generatePuzzle('easy')
    expect(gen.puzzle.nodeBudget.splitters).toBe(Infinity)
    expect(gen.puzzle.nodeBudget.mergers).toBe(Infinity)
  })
})

describe('generatePuzzle — normal', () => {
  it('returns 3–4 outputs, no loopback, verifies', () => {
    for (let i = 0; i < 10; i++) {
      const gen = generatePuzzle('normal')
      expect(gen.puzzle.outputs.length).toBeGreaterThanOrEqual(3)
      expect(gen.puzzle.outputs.length).toBeLessThanOrEqual(4)
      expect(hasLoopback(gen)).toBe(false)
      expectVerifies(gen)
    }
  })
  it('uses Infinity node budgets', () => {
    const gen = generatePuzzle('normal')
    expect(gen.puzzle.nodeBudget.splitters).toBe(Infinity)
    expect(gen.puzzle.nodeBudget.mergers).toBe(Infinity)
  })
})

describe('generatePuzzle — hard', () => {
  it('returns 3–4 outputs, allowLoopbacks=true, verifies', () => {
    for (let i = 0; i < 10; i++) {
      const gen = generatePuzzle('hard')
      expect(gen.puzzle.outputs.length).toBeGreaterThanOrEqual(3)
      expect(gen.puzzle.outputs.length).toBeLessThanOrEqual(4)
      expect(gen.puzzle.allowLoopbacks).toBe(true)
      expect(gen.puzzle.maxBeltMark).toBe(3)
      expect(gen.puzzle.nodeBudget.splitters).toBe(Infinity)
      expect(gen.puzzle.nodeBudget.mergers).toBe(Infinity)
      expectVerifies(gen)
    }
  })
})

describe('generatePuzzle — expert', () => {
  it('returns 3–5 outputs, allowLoopbacks=true, verifies', () => {
    for (let i = 0; i < 10; i++) {
      const gen = generatePuzzle('expert')
      expect(gen.puzzle.outputs.length).toBeGreaterThanOrEqual(3)
      expect(gen.puzzle.outputs.length).toBeLessThanOrEqual(5)
      expect(gen.puzzle.allowLoopbacks).toBe(true)
      expect(gen.puzzle.maxBeltMark).toBe(6)
      expect(gen.puzzle.nodeBudget.splitters).toBe(Infinity)
      expect(gen.puzzle.nodeBudget.mergers).toBe(Infinity)
      expectVerifies(gen)
    }
  })
})

describe('generatePuzzle — easy stress test', () => {
  it('20 runs all verify and have output count in [2,3]', () => {
    for (let i = 0; i < 20; i++) {
      const gen = generatePuzzle('easy')
      expect(gen.puzzle.outputs.length).toBeGreaterThanOrEqual(2)
      expect(gen.puzzle.outputs.length).toBeLessThanOrEqual(3)
      expectVerifies(gen)
    }
  })
})

// ── Loopback-specific scenarios ────────────────────────────────────────────

describe('buildLoopbackPuzzle — L=1 (smallest non-trivial loopback)', () => {
  it('produces a verifying puzzle for N=11, targets [3,4,4]', () => {
    // N=11, next buildable B=12, so L=1.
    const gen = _buildLoopbackPuzzleForTest(11, [3, 4, 4], 'hard')
    expect(gen).not.toBeNull()
    if (!gen) return
    expect(gen.puzzle.inputs[0].rate).toBe(11)
    expect(gen.puzzle.outputs.map((o) => o.targetRate).sort()).toEqual([3, 4, 4])
    expect(gen.puzzle.allowLoopbacks).toBe(true)
    expect(hasLoopback(gen)).toBe(true)
    expectVerifies(gen)
  })
})

describe('buildLoopbackPuzzle — larger L=5', () => {
  it('produces a verifying puzzle for N=19, targets [5,7,7]', () => {
    // N=19, next buildable B=24, so L=5.
    const gen = _buildLoopbackPuzzleForTest(19, [5, 7, 7], 'hard')
    expect(gen).not.toBeNull()
    if (!gen) return
    expect(gen.puzzle.inputs[0].rate).toBe(19)
    expect(gen.puzzle.outputs.map((o) => o.targetRate).sort()).toEqual([5, 7, 7])
    expect(gen.puzzle.allowLoopbacks).toBe(true)
    expect(hasLoopback(gen)).toBe(true)
    expectVerifies(gen)
  })
})

describe('buildLoopbackPuzzle — L=0 (N already buildable, no loopback)', () => {
  it('falls through to a clean-split puzzle when N is buildable (N=12)', () => {
    // N=12 is buildable → no loopback; the helper hands off to clean split.
    const gen = _buildLoopbackPuzzleForTest(12, [4, 4, 4], 'hard')
    expect(gen).not.toBeNull()
    if (!gen) return
    expect(gen.puzzle.inputs[0].rate).toBe(12)
    expect(hasLoopback(gen)).toBe(false)
    expect(gen.puzzle.outputs.length).toBeGreaterThanOrEqual(3)
    expect(gen.puzzle.outputs.length).toBeLessThanOrEqual(4)
    expectVerifies(gen)
  })
})
