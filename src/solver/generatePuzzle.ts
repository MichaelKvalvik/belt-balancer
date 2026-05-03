/**
 * generatePuzzle — produces a fresh PuzzleDef + reference SolutionDef.
 *
 * Easy / normal: build a clean splitter tree top-down; leaves become targets.
 * Hard / expert: pick an arbitrary integer input N and integer targets summing
 *   to N, then fold the surplus B − N (where B is the next "buildable" rate
 *   ≥ N) back through a loopback merger so every output rate is reachable.
 */

import type {
  BeltMark,
  Difficulty,
  GeneratedPuzzle,
  LevelInput,
  LevelOutput,
  PuzzleDef,
  SolutionDef,
  SolutionEdge,
  SolutionNode,
  SolverEdge,
  SolverNode,
} from '../types'
import { BELT_CAPACITY } from '../types'
import { solveFlow } from './solveFlow'

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

/** All integers of the form 2^a × 3^b (a, b ≥ 0) up to and including `upTo`. */
export function buildableSequence(upTo: number): number[] {
  if (upTo < 1) return []
  const out = new Set<number>()
  for (let p2 = 1; p2 <= upTo; p2 *= 2) {
    for (let v = p2; v <= upTo; v *= 3) {
      out.add(v)
    }
  }
  return [...out].sort((a, b) => a - b)
}

function nextBuildable(n: number): number | null {
  const seq = buildableSequence(Math.max(n + 32, n * 2))
  for (const b of seq) if (b >= n) return b
  return null
}

function gcd(a: number, b: number): number {
  a = Math.abs(a)
  b = Math.abs(b)
  while (b) {
    const t = b
    b = a % b
    a = t
  }
  return a
}

function isPow2x3(n: number): boolean {
  if (n < 1 || !Number.isInteger(n)) return false
  let m = n
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

/** Pick `parts` random positive integers summing to `total`. */
function randomComposition(total: number, parts: number): number[] | null {
  if (total < parts || parts < 1) return null
  const arr: number[] = []
  let remaining = total
  for (let i = 0; i < parts - 1; i++) {
    const max = remaining - (parts - i - 1)
    if (max < 1) return null
    const pick = randInt(1, max)
    arr.push(pick)
    remaining -= pick
  }
  arr.push(remaining)
  return shuffle(arr)
}

// ── Splitter tree (clean-split / easy / normal) ────────────────────────────

type Tree =
  | { kind: 'leaf'; rate: number }
  | { kind: 'split'; rate: number; k: 2 | 3; children: Tree[] }

/** Generate distributions of `total` into `parts` positive integers. */
function distributeLeaves(total: number, parts: number): number[][] {
  const results: number[][] = []
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
    outputs: [3, 4],
    roots: [],
    maxBeltMark: 3,
    allowLoopbacks: true,
  },
  expert: {
    outputs: [3, 5],
    roots: [],
    maxBeltMark: 6,
    allowLoopbacks: true,
  },
}

/** Cap on the number of leaves in the loopback tree, to keep node counts sane. */
const MAX_LOOPBACK_LEAVES = 256

// ── Layout + clean-split assembly (easy / normal / L=0 fallback) ───────────

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

function assemble(tree: Tree, cfg: DifficultyConfig): AssembleResult {
  const solNodes: SolutionNode[] = []
  const solEdges: SolutionEdge[] = []
  const outputs: LevelOutput[] = []

  let splitterCounter = 0
  let outputCounter = 0
  let leafYCursor = LAYOUT.yBase

  const totalDepth = treeMaxDepth(tree)
  const outputColX = Math.max(LAYOUT.outputX, LAYOUT.splitterColX(totalDepth) + 130)

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

// ── Loopback puzzle generation (hard / expert) ─────────────────────────────

interface Endpoint {
  sourceId: string
  sourceHandle: string | null
  /** Rate carried on the belt leaving this endpoint. */
  value: number
}

interface BuildAcc {
  nodes: SolutionNode[]
  edges: SolutionEdge[]
  outputs: LevelOutput[]
  splitterId: number
  mergerId: number
  outputId: number
}

function newAcc(): BuildAcc {
  return { nodes: [], edges: [], outputs: [], splitterId: 0, mergerId: 0, outputId: 0 }
}

function addEdge(
  acc: BuildAcc,
  from: Endpoint,
  target: string,
  targetHandle: string | undefined,
  mark: BeltMark,
): void {
  const e: SolutionEdge = { source: from.sourceId, target, mark }
  if (from.sourceHandle != null) e.sourceHandle = from.sourceHandle
  if (targetHandle != null) e.targetHandle = targetHandle
  acc.edges.push(e)
}

/** Recursively split `value` into `leafCount` equal leaves of value G = value/leafCount. */
function buildSplitterChain(
  acc: BuildAcc,
  rootInput: Endpoint,
  value: number,
  leafCount: number,
  cfg: DifficultyConfig,
  depth: number,
): Endpoint[] {
  if (leafCount === 1) return [rootInput]

  let k: 2 | 3
  if (leafCount % 2 === 0 && value % 2 === 0) k = 2
  else if (leafCount % 3 === 0 && value % 3 === 0) k = 3
  else throw new Error(`buildSplitterChain: cannot split ${value} into ${leafCount}`)

  const id = `sol-s${++acc.splitterId}`
  acc.nodes.push({
    id,
    type: 'splitterNode',
    position: { x: LAYOUT.splitterColX(depth), y: 60 + acc.splitterId * 30 },
  })
  addEdge(acc, rootInput, id, 'in', markForRate(value, cfg.maxBeltMark))

  const childValue = value / k
  const childLeafCount = leafCount / k
  const leaves: Endpoint[] = []
  for (let i = 0; i < k; i++) {
    const childInput: Endpoint = {
      sourceId: id,
      sourceHandle: `out-${i}`,
      value: childValue,
    }
    if (childLeafCount === 1) {
      leaves.push(childInput)
    } else {
      leaves.push(
        ...buildSplitterChain(acc, childInput, childValue, childLeafCount, cfg, depth + 1),
      )
    }
  }
  return leaves
}

/** Combine endpoints into a single output endpoint via a chain of mergers (≤3 ins each). */
function buildMergerChain(
  acc: BuildAcc,
  inputs: Endpoint[],
  cfg: DifficultyConfig,
  baseX: number,
): Endpoint {
  if (inputs.length === 1) return inputs[0]

  let current = inputs
  let layer = 0
  while (current.length > 1) {
    const next: Endpoint[] = []
    for (let i = 0; i < current.length; i += 3) {
      const group = current.slice(i, i + 3)
      if (group.length === 1) {
        next.push(group[0])
        continue
      }
      const id = `sol-m${++acc.mergerId}`
      acc.nodes.push({
        id,
        type: 'mergerNode',
        position: { x: baseX + layer * 100, y: 60 + acc.mergerId * 30 },
      })
      let summed = 0
      for (let j = 0; j < group.length; j++) {
        addEdge(acc, group[j], id, `in-${j}`, markForRate(group[j].value, cfg.maxBeltMark))
        summed += group[j].value
      }
      next.push({ sourceId: id, sourceHandle: 'out', value: summed })
    }
    current = next
    layer++
  }
  return current[0]
}

/** Build a complete loopback puzzle for given N + targets. Returns null if infeasible. */
function buildLoopbackPuzzle(
  N: number,
  targets: number[],
  cfg: DifficultyConfig,
): GeneratedPuzzle | null {
  if (N < 1 || targets.length < 1) return null
  if (targets.some((t) => t < 1)) return null
  if (targets.reduce((s, t) => s + t, 0) !== N) return null

  const cap = BELT_CAPACITY[cfg.maxBeltMark]
  if (N > cap) return null
  for (const t of targets) if (t > cap) return null

  // Step 1: GCD of targets only (NOT seeded with L)
  let G = targets[0]
  for (let i = 1; i < targets.length; i++) G = gcd(G, targets[i])

  // Step 2: N must be divisible by G
  if (N % G !== 0) return null
  const nUnits = N / G

  // Step 3: find next buildable in unit space, scale back up
  const nextBuildableUnits = nextBuildable(nUnits)
  if (nextBuildableUnits == null) return null
  const B = nextBuildableUnits * G
  if (B > cap) return null

  // Step 4: loopback amount
  const L = B - N

  // L=0 means N was already buildable — hand off to clean split
  if (L === 0) {
    return generateCleanSplit(cfg, N, targets.length)
  }

  // Step 5: validate L divisible by G (guaranteed by construction if tryGenerateLoopback
  // picks N as a multiple of G, but guard defensively)
  if (L % G !== 0) return null

  // Step 6: leafCount must be a 2^a×3^b integer
  const leafCount = B / G
  if (!Number.isInteger(leafCount)) return null
  if (!isPow2x3(leafCount)) return null
  if (leafCount > MAX_LOOPBACK_LEAVES) return null

  const acc = newAcc()
  const inputId = 'in-1'

  // Front merger: input + loopback → B
  const frontId = `sol-m${++acc.mergerId}`
  const frontY = LAYOUT.yBase
  acc.nodes.push({
    id: frontId,
    type: 'mergerNode',
    position: { x: LAYOUT.inputX + 100, y: frontY },
  })

  acc.edges.push({
    source: inputId,
    target: frontId,
    targetHandle: 'in-0',
    mark: markForRate(N, cfg.maxBeltMark),
  })

  const rootEndpoint: Endpoint = { sourceId: frontId, sourceHandle: 'out', value: B }

  // Build the splitter tree from B → leafCount leaves of value G.
  const leaves = buildSplitterChain(acc, rootEndpoint, B, leafCount, cfg, 1)

  // Partition leaves: targets in given order, then loopback.
  let idx = 0
  const targetGroups: Endpoint[][] = []
  for (const t of targets) {
    const cnt = t / G
    targetGroups.push(leaves.slice(idx, idx + cnt))
    idx += cnt
  }
  const loopGroup = leaves.slice(idx, idx + L / G)
  idx += L / G
  if (idx !== leaves.length) return null

  // Merger chains for each target.
  const mergerCol = LAYOUT.outputX - 250
  const targetEndpoints: Endpoint[] = targetGroups.map((g) =>
    buildMergerChain(acc, g, cfg, mergerCol),
  )
  const loopEndpoint = buildMergerChain(acc, loopGroup, cfg, mergerCol)

  // Loopback edge → front merger in-1.
  addEdge(acc, loopEndpoint, frontId, 'in-1', markForRate(L, cfg.maxBeltMark))

  // Output nodes.
  let outY = LAYOUT.yBase
  for (let i = 0; i < targets.length; i++) {
    const outId = `out-${++acc.outputId}`
    const t = targets[i]
    acc.outputs.push({
      id: outId,
      targetRate: t,
      position: { x: LAYOUT.outputX + 200, y: outY },
    })
    outY += LAYOUT.ySpacing
    addEdge(acc, targetEndpoints[i], outId, undefined, markForRate(t, cfg.maxBeltMark))
  }

  const inputs: LevelInput[] = [
    { id: inputId, rate: N, position: { x: LAYOUT.inputX, y: frontY } },
  ]

  const puzzle: PuzzleDef = {
    inputs,
    outputs: acc.outputs,
    nodeBudget: { splitters: Infinity, mergers: Infinity },
    maxBeltMark: cfg.maxBeltMark,
    allowLoopbacks: true,
  }
  const solution: SolutionDef = { nodes: acc.nodes, edges: acc.edges }

  if (!validateSolution(puzzle, solution)) return null
  return { puzzle, solution }
}

/** Test-only helper: build a loopback puzzle for a fixed N + targets. */
export function _buildLoopbackPuzzleForTest(
  N: number,
  targets: number[],
  difficulty: 'hard' | 'expert',
): GeneratedPuzzle | null {
  return buildLoopbackPuzzle(N, targets, CONFIGS[difficulty])
}

/**
 * Construct N + targets that satisfy buildLoopbackPuzzle's strict requirements
 * (N % gcd(targets) === 0 and B/G is 2^a×3^b) by construction. Working
 * backwards from a unit-space target Bunits guarantees those checks pass and
 * keeps L naturally small relative to N — no random N + isHardAppropriate
 * filter needed.
 */
function tryGenerateLoopback(cfg: DifficultyConfig, difficulty: 'hard' | 'expert'): GeneratedPuzzle | null {
  // G: base unit size
  const G = difficulty === 'expert' ? randInt(5, 20) : randInt(2, 8)

  // Bunits: the buildable unit-space target — controls max N ceiling
  const buildableUnitChoices = difficulty === 'expert'
    ? [16, 18, 24, 27, 32, 36, 48, 54, 64]
    : [6, 8, 9, 12, 16, 18]
  const Bunits = pickFrom(buildableUnitChoices)

  // Step 3: pick totalUnits below Bunits, not itself 2^a×3^b (so L > 0).
  let minUnits: number
  let maxUnits: number
  if (difficulty === 'hard') {
    minUnits = Math.max(4, cfg.outputs[0])
    maxUnits = Math.min(12, Bunits - 1)
  } else {
    minUnits = Math.max(Math.ceil(Bunits * 0.6), cfg.outputs[0])
    maxUnits = Bunits - 1
  }
  if (minUnits > maxUnits) return null
  const totalUnits = randInt(minUnits, maxUnits)
  if (isPow2x3(totalUnits)) return null

  // Step 4: N = totalUnits * G — guarantees N % G === 0.
  const N = totalUnits * G

  const cap = BELT_CAPACITY[cfg.maxBeltMark]
  if (N > cap) return null

  // Step 5: compose targets as multiples of G summing to N.
  const numTargets = randInt(cfg.outputs[0], cfg.outputs[1])
  if (totalUnits < numTargets) return null
  const unitComp = randomComposition(totalUnits, numTargets)
  if (!unitComp) return null
  const targets = unitComp.map((u) => u * G)

  if (targets.some((t) => t > cap)) return null

  // Step 6: ugly check — at least one target must not be in the buildable sequence.
  const buildSet = new Set(buildableSequence(Math.max(...targets)))
  if (targets.every((t) => buildSet.has(t))) return null

  // Balance filter: expert allows a wider spread per target
  const minOutput = Math.floor(N * (difficulty === 'expert' ? 0.10 : 0.12))
  const maxOutput = Math.floor(N * (difficulty === 'expert' ? 0.55 : 0.45))
  if (targets.some((t) => t < minOutput || t > maxOutput)) return null

  return buildLoopbackPuzzle(N, targets, cfg)
}

function generateCleanSplit(
  cfg: DifficultyConfig,
  N: number,
  numTargets: number,
): GeneratedPuzzle | null {
  const tree = buildTree(N, numTargets)
  if (!tree) return null
  if (countLeaves(tree) !== numTargets) return null
  const { inputs, outputs, solution } = assemble(tree, cfg)
  const puzzle: PuzzleDef = {
    inputs,
    outputs,
    nodeBudget: { splitters: Infinity, mergers: Infinity },
    maxBeltMark: cfg.maxBeltMark,
    allowLoopbacks: cfg.allowLoopbacks,
  }
  if (!validateSolution(puzzle, solution)) return null
  return { puzzle, solution }
}

function validateSolution(puzzle: PuzzleDef, solution: SolutionDef): boolean {
  const nodes: SolverNode[] = [
    ...puzzle.inputs.map((i) => ({
      id: i.id,
      kind: 'input' as const,
      data: { kind: 'input' as const, rate: i.rate },
    })),
    ...puzzle.outputs.map((o) => ({
      id: o.id,
      kind: 'output' as const,
      data: { kind: 'output' as const, targetRate: o.targetRate },
    })),
    ...solution.nodes.map((sn) => ({
      id: sn.id,
      kind: (sn.type === 'splitterNode' ? 'splitter' : 'merger') as 'splitter' | 'merger',
      data:
        sn.type === 'splitterNode'
          ? { kind: 'splitter' as const }
          : { kind: 'merger' as const },
    })),
  ]
  const edges: SolverEdge[] = solution.edges.map((e, i) => ({
    id: `e${i}`,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? null,
    targetHandle: e.targetHandle ?? null,
    data: { mark: e.mark ?? 1 },
  }))
  const result = solveFlow({ nodes, edges })
  if (result.unstable || !result.satisfied) return false
  for (const o of puzzle.outputs) {
    const r = result.outputResults[o.id]
    if (!r || Math.abs(r.actual - o.targetRate) > 1e-6) return false
  }
  return true
}

// ── Public entry point ──────────────────────────────────────────────────────

export function generatePuzzle(difficulty: Difficulty): GeneratedPuzzle {
  const cfg = CONFIGS[difficulty]

  if (difficulty === 'hard' || difficulty === 'expert') {
    for (let attempt = 0; attempt < 200; attempt++) {
      const result = tryGenerateLoopback(cfg, difficulty)
      if (result) return result
    }
    return easyFallback()
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    const targetOutputs = randInt(cfg.outputs[0], cfg.outputs[1])
    const root = pickFrom(cfg.roots)
    if (root > BELT_CAPACITY[cfg.maxBeltMark]) continue

    const tree = buildTree(root, targetOutputs)
    if (!tree) continue
    if (countLeaves(tree) !== targetOutputs) continue

    const { inputs, outputs, solution } = assemble(tree, cfg)

    const puzzle: PuzzleDef = {
      inputs,
      outputs,
      nodeBudget: { splitters: Infinity, mergers: Infinity },
      maxBeltMark: cfg.maxBeltMark,
      allowLoopbacks: cfg.allowLoopbacks,
    }
    return { puzzle, solution }
  }

  return easyFallback()
}

function easyFallback(): GeneratedPuzzle {
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
      nodeBudget: { splitters: Infinity, mergers: Infinity },
      maxBeltMark: 1,
      allowLoopbacks: false,
    },
    solution: fb.solution,
  }
}
