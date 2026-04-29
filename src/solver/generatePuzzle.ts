/**
 * generatePuzzle — produces a fresh PuzzleDef + reference SolutionDef.
 *
 * Algorithm: build a valid splitter-tree solution first, then expose its
 * leaves (input rate at the root, output rates at the leaves) as the puzzle.
 * Because we only emit puzzles whose solutions we already constructed, every
 * generated puzzle is provably solvable.
 */

import type {
  BeltMark,
  Difficulty,
  GeneratedPuzzle,
  LevelInput,
  LevelOutput,
  SolutionDef,
  SolutionEdge,
  SolutionNode,
} from '../types'
import { BELT_CAPACITY } from '../types'

// ── Buildable rate check ───────────────────────────────────────────────────

/** A rate is buildable iff it equals 60 × (2^a × 3^b) for non-negative a, b. */
export function isBuiltable(n: number): boolean {
  if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) return false
  if (n % 60 !== 0) return false
  let m = n / 60
  while (m % 2 === 0) m /= 2
  while (m % 3 === 0) m /= 3
  return m === 1
}

function markForRate(rate: number, maxMark: BeltMark): BeltMark {
  for (let m = 1; m <= maxMark; m++) {
    if (BELT_CAPACITY[m as BeltMark] >= rate - 1e-9) return m as BeltMark
  }
  return maxMark
}

// ── Random helpers ──────────────────────────────────────────────────────────

function pickFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1))
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ── Splitter tree ───────────────────────────────────────────────────────────

type Tree =
  | { kind: 'leaf'; rate: number }
  | { kind: 'split'; rate: number; k: 2 | 3; children: Tree[] }

/** Generate distributions of `total` into `parts` positive integers (a few attempts). */
function distributeLeaves(total: number, parts: number): number[][] {
  const results: number[][] = []
  // Even split first (most natural).
  if (total % parts === 0 && total / parts >= 1) {
    results.push(Array(parts).fill(total / parts))
  }
  for (let attempt = 0; attempt < 6; attempt++) {
    if (total < parts) break
    const arr: number[] = []
    let remaining = total
    for (let i = 0; i < parts - 1; i++) {
      const max = remaining - (parts - i - 1)
      if (max < 1) { arr.length = 0; break }
      const pick = 1 + Math.floor(Math.random() * max)
      arr.push(pick)
      remaining -= pick
    }
    if (arr.length === parts - 1 && remaining >= 1) {
      arr.push(remaining)
      results.push(arr)
    }
  }
  return results
}

/** Build a splitter tree with `rate` at the root and exactly `leaves` leaves.
 * Any rate divisible by k is a valid split — sub-rates do not need to be
 * "buildable" in the input-side sense (a 60-belt split by 2 yields 30s). */
function buildTree(rate: number, leaves: number, maxDepth = 6): Tree | null {
  if (leaves < 1) return null
  if (leaves === 1) return { kind: 'leaf', rate }
  if (maxDepth === 0) return null

  const ks: (2 | 3)[] = shuffle([2, 3])
  for (const k of ks) {
    if (rate % k !== 0) continue
    const childRate = rate / k
    if (childRate <= 0) continue

    for (const dist of distributeLeaves(leaves, k)) {
      const children: Tree[] = []
      let ok = true
      for (const cl of dist) {
        const child = buildTree(childRate, cl, maxDepth - 1)
        if (!child) { ok = false; break }
        children.push(child)
      }
      if (ok) return { kind: 'split', rate, k, children }
    }
  }
  return null
}

function countLeaves(t: Tree): number {
  return t.kind === 'leaf' ? 1 : t.children.reduce((s, c) => s + countLeaves(c), 0)
}

function countSplitters(t: Tree): number {
  return t.kind === 'leaf' ? 0 : 1 + t.children.reduce((s, c) => s + countSplitters(c), 0)
}

// ── Difficulty configuration ───────────────────────────────────────────────

interface DifficultyConfig {
  outputs: [number, number]
  roots:   number[]
  maxBeltMark: BeltMark
  allowLoopbacks: boolean
}

const CONFIGS: Record<Difficulty, DifficultyConfig> = {
  easy: {
    outputs: [2, 3],
    roots: [60],
    maxBeltMark: 1,
    allowLoopbacks: false,
  },
  normal: {
    outputs: [3, 4],
    roots: [60, 120],
    maxBeltMark: 2,
    allowLoopbacks: false,
  },
  hard: {
    outputs: [3, 5],
    roots: [120, 180, 240],
    maxBeltMark: 3,
    allowLoopbacks: false,
  },
  expert: {
    outputs: [4, 6],
    roots: [120, 240, 360, 480, 540, 720, 1080],
    maxBeltMark: 6,
    allowLoopbacks: false,
  },
}

// ── Layout + solution assembly ─────────────────────────────────────────────

const LAYOUT = {
  inputX: 80,
  outputX: 700,
  splitterColX: (depth: number) => 200 + depth * 130,
  ySpacing: 80,
  yBase: 80,
}

interface AssembleResult {
  inputs: LevelInput[]
  outputs: LevelOutput[]
  solution: SolutionDef
}

function treeMaxDepth(t: Tree): number {
  if (t.kind === 'leaf') return 0
  return 1 + Math.max(...t.children.map(treeMaxDepth))
}

/** Walk the tree, producing input + outputs + solution nodes/edges. */
function assemble(tree: Tree, cfg: DifficultyConfig): AssembleResult {
  const solNodes: SolutionNode[] = []
  const solEdges: SolutionEdge[] = []
  const outputs: LevelOutput[] = []

  let splitterCounter = 0
  let outputCounter = 0
  let leafYCursor = LAYOUT.yBase

  const totalDepth = treeMaxDepth(tree)
  const outputColX = Math.max(LAYOUT.outputX, LAYOUT.splitterColX(totalDepth) + 130)

  /** Recurse, returning the node id created for `t` and its mid-y for layout. */
  function walk(
    t: Tree,
    depth: number,
    parent: { sourceId: string; sourceHandle: string | null } | null,
  ): { id: string; midY: number } {
    if (t.kind === 'leaf') {
      const id = `out-${++outputCounter}`
      const y = leafYCursor
      leafYCursor += LAYOUT.ySpacing
      outputs.push({ id, targetRate: t.rate, position: { x: outputColX, y } })
      if (parent) {
        const edge: SolutionEdge = {
          source: parent.sourceId,
          target: id,
          mark: markForRate(t.rate, cfg.maxBeltMark),
        }
        if (parent.sourceHandle != null) edge.sourceHandle = parent.sourceHandle
        solEdges.push(edge)
      }
      return { id, midY: y + 40 }
    }

    // splitter: walk children first to learn their y positions
    const id = `sol-s${++splitterCounter}`
    const childResults: { id: string; midY: number }[] = []
    for (let i = 0; i < t.children.length; i++) {
      const child = t.children[i]
      const r = walk(child, depth + 1, { sourceId: id, sourceHandle: `out-${i}` })
      childResults.push(r)
    }
    const midY = childResults.reduce((s, c) => s + c.midY, 0) / childResults.length
    solNodes.push({
      id,
      type: 'splitterNode',
      position: { x: LAYOUT.splitterColX(depth), y: Math.round(midY) - 40 },
    })
    if (parent) {
      const edge: SolutionEdge = {
        source: parent.sourceId,
        target: id,
        targetHandle: 'in',
        mark: markForRate(t.rate, cfg.maxBeltMark),
      }
      if (parent.sourceHandle != null) edge.sourceHandle = parent.sourceHandle
      solEdges.push(edge)
    }
    return { id, midY }
  }

  // Create the input node and walk from the root.
  const inputId = 'in-1'
  const rootResult = walk(tree, 0, { sourceId: inputId, sourceHandle: null })

  const inputs: LevelInput[] = [
    {
      id: inputId,
      rate: tree.rate,
      position: { x: LAYOUT.inputX, y: Math.round(rootResult.midY) - 45 },
    },
  ]

  return { inputs, outputs, solution: { nodes: solNodes, edges: solEdges } }
}

// ── Public entry point ──────────────────────────────────────────────────────

export function generatePuzzle(difficulty: Difficulty): GeneratedPuzzle {
  const cfg = CONFIGS[difficulty]

  for (let attempt = 0; attempt < 50; attempt++) {
    const targetOutputs = randInt(cfg.outputs[0], cfg.outputs[1])
    const root = pickFrom(cfg.roots)
    if (root > BELT_CAPACITY[cfg.maxBeltMark]) continue

    const tree = buildTree(root, targetOutputs)
    if (!tree) continue
    if (countLeaves(tree) !== targetOutputs) continue

    const { inputs, outputs, solution } = assemble(tree, cfg)
    const splitters = countSplitters(tree)

    const puzzle = {
      inputs,
      outputs,
      nodeBudget: { splitters, mergers: 0 },
      maxBeltMark: cfg.maxBeltMark,
      allowLoopbacks: cfg.allowLoopbacks,
    }
    return { puzzle, solution }
  }

  // Deterministic fallback: a trivial 60 → 30 + 30 puzzle that always validates.
  const fallbackTree: Tree = {
    kind: 'split',
    rate: 60,
    k: 2,
    children: [
      { kind: 'leaf', rate: 30 },
      { kind: 'leaf', rate: 30 },
    ],
  }
  const fb = assemble(fallbackTree, CONFIGS.easy)
  return {
    puzzle: {
      inputs: fb.inputs,
      outputs: fb.outputs,
      nodeBudget: { splitters: 1, mergers: 0 },
      maxBeltMark: 1,
      allowLoopbacks: false,
    },
    solution: fb.solution,
  }
}
