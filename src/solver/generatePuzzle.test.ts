import { describe, it, expect } from 'vitest'
import { generatePuzzle, isBuiltable } from './generatePuzzle'
import { solveFlow } from './solveFlow'
import type {
  GeneratedPuzzle,
  Graph,
  SolverEdge,
  SolverNode,
  Difficulty,
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
})

describe('generatePuzzle — hard', () => {
  it('returns 3–5 outputs, verifies; loopbacks (if any) target a splitter input', () => {
    for (let i = 0; i < 10; i++) {
      const gen = generatePuzzle('hard')
      expect(gen.puzzle.outputs.length).toBeGreaterThanOrEqual(3)
      expect(gen.puzzle.outputs.length).toBeLessThanOrEqual(5)
      expectVerifies(gen)

      // If a back-edge exists, it must target a splitter input handle.
      if (hasLoopback(gen)) {
        const splitterIds = new Set(
          gen.solution.nodes.filter((n) => n.type === 'splitterNode').map((n) => n.id),
        )
        // Identify back-edges via DFS.
        const adj = new Map<string, { target: string; targetHandle?: string }[]>()
        for (const e of gen.solution.edges) {
          if (!adj.has(e.source)) adj.set(e.source, [])
          adj.get(e.source)!.push({ target: e.target, targetHandle: e.targetHandle })
        }
        const color = new Map<string, 0 | 1 | 2>()
        const backEdges: { target: string; targetHandle?: string }[] = []
        function dfs(id: string): void {
          color.set(id, 1)
          for (const next of adj.get(id) ?? []) {
            const c = color.get(next.target) ?? 0
            if (c === 1) backEdges.push(next)
            else if (c === 0) dfs(next.target)
          }
          color.set(id, 2)
        }
        for (const inp of gen.puzzle.inputs) {
          if ((color.get(inp.id) ?? 0) === 0) dfs(inp.id)
        }
        for (const be of backEdges) {
          expect(splitterIds.has(be.target)).toBe(true)
          expect(be.targetHandle).toBe('in')
        }
      }
    }
  })
})

describe('generatePuzzle — expert', () => {
  it('returns 4–6 outputs, verifies', () => {
    for (let i = 0; i < 10; i++) {
      const gen = generatePuzzle('expert')
      expect(gen.puzzle.outputs.length).toBeGreaterThanOrEqual(4)
      expect(gen.puzzle.outputs.length).toBeLessThanOrEqual(6)
      expectVerifies(gen)
    }
  })
})

describe('generatePuzzle — nodeBudget accuracy', () => {
  it('budget counts equal solution-node counts for every difficulty', () => {
    const diffs: Difficulty[] = ['easy', 'normal', 'hard', 'expert']
    for (const d of diffs) {
      for (let i = 0; i < 5; i++) {
        const gen = generatePuzzle(d)
        const splitterCount = gen.solution.nodes.filter((n) => n.type === 'splitterNode').length
        const mergerCount   = gen.solution.nodes.filter((n) => n.type === 'mergerNode').length
        expect(gen.puzzle.nodeBudget.splitters).toBe(splitterCount)
        expect(gen.puzzle.nodeBudget.mergers).toBe(mergerCount)
      }
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
