import { create } from 'zustand'
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from 'reactflow'
import type {
  InputNodeData,
  OutputNodeData,
  SplitterNodeData,
  MergerNodeData,
  GameNodeData,
  NodeKind,
  Graph,
  FlowResult,
  LevelDef,
  SolutionDef,
  Blueprint,
  BlueprintNode,
  BlueprintEdge,
  BeltMark,
  DemoStep,
} from '../types'
import type { Rotation } from '../utils/rotation'
import { solveFlow } from '../solver/solveFlow'
import { levels } from '../levels/levels'
import { chapters } from '../tutorial/chapters'
import { BELT_STROKE } from '../components/BeltSelectorBar'

// ── localStorage helpers ───────────────────────────────────────────────────

const PROGRESS_KEY   = 'belt-balancer-progress'
const TUTORIAL_KEY   = 'belt-balancer-tutorial-v1'
const CHAPTERS_KEY   = 'belt-balancer-tutorial-chapters'
const BLUEPRINTS_KEY = 'belt-balancer-blueprints'
const canvasKey = (id: number) => `belt-balancer-canvas-${id}`

function loadProgress(): number[] {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '[]') as number[] }
  catch { return [] }
}
function saveProgress(ids: number[]): void {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(ids)) } catch { /* noop */ }
}

function loadTutorialDone(): boolean {
  try { return localStorage.getItem(TUTORIAL_KEY) === '1' } catch { return false }
}
function saveTutorialDone(): void {
  try { localStorage.setItem(TUTORIAL_KEY, '1') } catch { /* noop */ }
}

function loadCompletedChapters(): number[] {
  try { return JSON.parse(localStorage.getItem(CHAPTERS_KEY) ?? '[]') as number[] }
  catch { return [] }
}
function saveCompletedChapters(ids: number[]): void {
  try { localStorage.setItem(CHAPTERS_KEY, JSON.stringify(ids)) } catch { /* noop */ }
}

function loadBlueprints(): Blueprint[] {
  try { return JSON.parse(localStorage.getItem(BLUEPRINTS_KEY) ?? '[]') as Blueprint[] }
  catch { return [] }
}
function saveBlueprints(bps: Blueprint[]): void {
  try { localStorage.setItem(BLUEPRINTS_KEY, JSON.stringify(bps)) } catch { /* noop */ }
}

interface CanvasSnapshot { nodes: Node[]; edges: Edge[] }
function saveCanvas(levelId: number, nodes: Node[], edges: Edge[]): void {
  try { localStorage.setItem(canvasKey(levelId), JSON.stringify({ nodes, edges })) } catch { /* noop */ }
}
/** Persist canvas only when not in a tutorial-chapter try-it (which is ephemeral). */
function persistCanvasIfPersistable(s: { currentChapterId: number | null; mode: string; currentLevelId: number }, nodes: Node[], edges: Edge[]): void {
  if (s.mode === 'tutorial' && s.currentChapterId != null) return
  saveCanvas(s.currentLevelId, nodes, edges)
}
function loadCanvas(levelId: number): CanvasSnapshot | null {
  try {
    const raw = localStorage.getItem(canvasKey(levelId))
    if (!raw) return null
    const snap = JSON.parse(raw) as CanvasSnapshot
    // Migration: ensure every edge carries data.mark (defaults to Mk.1).
    snap.edges = (snap.edges ?? []).map((e) => {
      const existingMark = (e.data as { mark?: BeltMark } | undefined)?.mark
      return { ...e, data: { ...(e.data ?? {}), mark: existingMark ?? 1 } }
    })
    return snap
  } catch { return null }
}
function clearCanvas(levelId: number): void {
  try { localStorage.removeItem(canvasKey(levelId)) } catch { /* noop */ }
}

// ── Graph helpers ──────────────────────────────────────────────────────────

function nodeTypeToKind(type: string | undefined): NodeKind {
  switch (type) {
    case 'inputNode':    return 'input'
    case 'outputNode':   return 'output'
    case 'splitterNode': return 'splitter'
    case 'mergerNode':   return 'merger'
    default:             return 'input'
  }
}

function buildGraph(nodes: Node[], edges: Edge[]): Graph {
  return {
    nodes: nodes.map((n) => ({ id: n.id, kind: nodeTypeToKind(n.type), data: n.data as GameNodeData })),
    edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle, data: e.data as { mark?: BeltMark } | undefined })),
  }
}

function nodesFromPuzzle(puzzle: { inputs: LevelDef['inputs']; outputs: LevelDef['outputs'] }): Node[] {
  return [
    ...puzzle.inputs.map((inp) => ({
      id: inp.id, type: 'inputNode', position: inp.position, deletable: false,
      data: { kind: 'input', rate: inp.rate } satisfies InputNodeData,
    })),
    ...puzzle.outputs.map((out) => ({
      id: out.id, type: 'outputNode', position: out.position, deletable: false,
      data: { kind: 'output', targetRate: out.targetRate } satisfies OutputNodeData,
    })),
  ]
}

/** I/O nodes for the demo canvas — locked, with explicit dimensions for fitView. */
function demoIoNodesFromPuzzle(puzzle: { inputs: LevelDef['inputs']; outputs: LevelDef['outputs'] }): Node[] {
  return [
    ...puzzle.inputs.map((inp) => ({
      id: inp.id, type: 'inputNode', position: inp.position,
      deletable: false, draggable: false, selectable: false,
      width: 120, height: 90,
      data: { kind: 'input', rate: inp.rate } satisfies InputNodeData,
    })),
    ...puzzle.outputs.map((out) => ({
      id: out.id, type: 'outputNode', position: out.position,
      deletable: false, draggable: false, selectable: false,
      width: 120, height: 122,
      data: { kind: 'output', targetRate: out.targetRate } satisfies OutputNodeData,
    })),
  ]
}

// Approximate node sizes — set explicitly so ReactFlow can compute fitView
// bbox without waiting for DOM measurement (which doesn't fire reliably in
// our read-only demo canvas configuration).
const DEMO_NODE_SIZE: Record<string, { width: number; height: number }> = {
  inputNode:    { width: 120, height: 90 },
  outputNode:   { width: 120, height: 122 },
  splitterNode: { width: 80,  height: 80 },
  mergerNode:   { width: 80,  height: 80 },
}

/** Apply a single DemoStep to demo nodes/edges (presentational, no solver). */
function applyDemoStepToCanvas(step: DemoStep, nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const a = step.action
  if (a.type === 'placeNode') {
    let data: GameNodeData
    if (a.nodeType === 'inputNode')        data = { kind: 'input',  rate: a.rate ?? 0 }
    else if (a.nodeType === 'outputNode')  data = { kind: 'output', targetRate: a.targetRate ?? 0 }
    else if (a.nodeType === 'splitterNode') data = { kind: 'splitter', rotation: 0 }
    else                                    data = { kind: 'merger',   rotation: 0 }
    const size = DEMO_NODE_SIZE[a.nodeType] ?? { width: 100, height: 80 }
    const newNode: Node = {
      id: a.id,
      type: a.nodeType,
      position: a.position,
      deletable: false,
      draggable: false,
      selectable: false,
      width: size.width,
      height: size.height,
      data,
    }
    return { nodes: [...nodes, newNode], edges }
  }
  if (a.type === 'drawEdge') {
    const mark: BeltMark = a.mark ?? 1
    const newEdge: Edge = {
      id: a.id,
      source: a.source,
      target: a.target,
      ...(a.sourceHandle ? { sourceHandle: a.sourceHandle } : {}),
      ...(a.targetHandle ? { targetHandle: a.targetHandle } : {}),
      animated: true,
      style: { stroke: BELT_STROKE[mark], strokeWidth: 2 },
      data: { mark },
    }
    return { nodes, edges: [...edges, newEdge] }
  }
  if (a.type === 'setBeltMark') {
    const newEdges = edges.map((e) =>
      e.id === a.edgeId
        ? { ...e, data: { ...(e.data ?? {}), mark: a.mark }, style: { ...(e.style ?? {}), stroke: BELT_STROKE[a.mark] } }
        : e,
    )
    return { nodes, edges: newEdges }
  }
  return { nodes, edges }
}

function nodesFromLevel(level: LevelDef): Node[] {
  return [
    ...level.inputs.map((inp) => ({
      id: inp.id, type: 'inputNode', position: inp.position, deletable: false,
      data: { kind: 'input', rate: inp.rate } satisfies InputNodeData,
    })),
    ...level.outputs.map((out) => ({
      id: out.id, type: 'outputNode', position: out.position, deletable: false,
      data: { kind: 'output', targetRate: out.targetRate } satisfies OutputNodeData,
    })),
  ]
}

function fmtRate(rate: number): string {
  return `${Math.round(rate * 1000) / 1000}/min`
}
function snapTo20(v: number) { return Math.round(v / 20) * 20 }

// ── Live solver ────────────────────────────────────────────────────────────

function runSolverAndStamp(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[]; flowResult: FlowResult } {
  const result = solveFlow(buildGraph(nodes, edges))
  const stampedNodes = nodes.map((node) => {
    if (node.type !== 'outputNode') return node
    const or = result.outputResults[node.id]
    return or ? { ...node, data: { ...node.data, actualRate: or.actual } } : node
  })
  const stampedEdges = edges.map((edge) => {
    const rate = result.edgeRates[edge.id]
    const mark = ((edge.data as { mark?: BeltMark } | undefined)?.mark ?? 1) as BeltMark
    const overloaded = result.overloadedEdges.has(edge.id)
    const stroke = overloaded ? '#ef4444' : BELT_STROKE[mark]
    const strokeWidth = overloaded ? 3 : 2
    const stamped: Edge = {
      ...edge,
      animated: true,
      style: { ...(edge.style ?? {}), stroke, strokeWidth },
    }
    if (rate !== undefined) {
      stamped.label = fmtRate(rate)
      stamped.labelStyle = { fill: overloaded ? '#fca5a5' : '#f59e0b', fontFamily: 'ui-monospace, monospace', fontSize: 11 }
      stamped.labelBgStyle = { fill: '#0f172a', fillOpacity: 0.9 }
      stamped.labelBgPadding = [4, 3] as [number, number]
    }
    return stamped
  })
  return { nodes: stampedNodes, edges: stampedEdges, flowResult: result }
}

// ── Win + tutorial helper ──────────────────────────────────────────────────

interface WinCheckIn {
  prevSatisfied: boolean
  newSatisfied: boolean
  currentLevelId: number
  completedLevelIds: number[]
  showWinModal: boolean
  tutorialStep: 0 | 1 | 2 | null
}
interface WinCheckOut {
  completedLevelIds: number[]
  showWinModal: boolean
  tutorialStep: 0 | 1 | 2 | null
}

function checkWin(s: WinCheckIn): WinCheckOut {
  if (!s.prevSatisfied && s.newSatisfied) {
    let completedLevelIds = s.completedLevelIds
    if (!completedLevelIds.includes(s.currentLevelId)) {
      completedLevelIds = [...completedLevelIds, s.currentLevelId]
      saveProgress(completedLevelIds)
    }
    let tutorialStep = s.tutorialStep
    if (s.currentLevelId === 1 && tutorialStep !== null) {
      saveTutorialDone()
      tutorialStep = null
    }
    return { completedLevelIds, showWinModal: true, tutorialStep }
  }
  return { completedLevelIds: s.completedLevelIds, showWinModal: s.showWinModal, tutorialStep: s.tutorialStep }
}

// ── History ────────────────────────────────────────────────────────────────

const MAX_HISTORY = 30
interface HistoryEntry { nodes: Node[]; edges: Edge[] }

function pushHistory(history: HistoryEntry[], nodes: Node[], edges: Edge[]): HistoryEntry[] {
  return [...history.slice(-(MAX_HISTORY - 1)), { nodes, edges }]
}

// ── Store interface ────────────────────────────────────────────────────────

export interface NodeBudget { splitters: number; mergers: number }

export type AppMode = 'home' | 'tutorial' | 'puzzles' | 'free'

interface GameState {
  nodes: Node[]
  edges: Edge[]
  flowResult: FlowResult | null
  nodeBudget: NodeBudget
  history: HistoryEntry[]

  mode: AppMode

  currentLevelId: number
  completedLevelIds: number[]
  showWinModal: boolean
  hintsRevealed: number
  tutorialStep: 0 | 1 | 2 | null

  // Tutorial chapter state
  unlockedChapters: number[]
  completedChapters: number[]
  currentChapterId: number | null

  // Demo playback state
  demoPlaying: boolean
  demoPaused: boolean
  demoStepIndex: number
  demoNodes: Node[]
  demoEdges: Edge[]

  blueprints: Blueprint[]

  selectedMark: BeltMark

  setMode: (mode: AppMode) => void

  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (type: string, position: { x: number; y: number }) => void
  deleteSelected: () => void
  rotateNode: (id: string, rotation: Rotation) => void
  setSelectedMark: (mark: BeltMark) => void
  remarkEdge: (edgeId: string, mark: BeltMark) => void
  undo: () => void
  validate: () => void
  resetGraph: () => void

  loadLevel: (levelId: number) => void
  loadSolution: () => void
  dismissWin: () => void
  revealHint: () => void
  advanceTutorial: () => void
  dismissTutorial: () => void

  // Tutorial chapter actions
  openChapter: (id: number) => void
  closeChapter: () => void
  completeChapterTryIt: (id: number) => void
  startDemo: () => void
  pauseDemo: () => void
  resumeDemo: () => void
  stepDemo: () => void
  replayDemo: () => void
  skipDemo: () => void
  loadChapterSolution: () => void

  saveBlueprint: (name: string) => void
  deleteBlueprint: (id: string) => void
  stampBlueprint: (id: string) => void
}

// ── Store ──────────────────────────────────────────────────────────────────

const firstLevel = levels[0]

function makeInitialCanvas(level: LevelDef) {
  const saved = loadCanvas(level.id)
  return runSolverAndStamp(saved?.nodes ?? nodesFromLevel(level), saved?.edges ?? [])
}

const initial = makeInitialCanvas(firstLevel)

export const useGameStore = create<GameState>((set, get) => ({
  nodes: initial.nodes,
  edges: initial.edges,
  flowResult: initial.flowResult,
  nodeBudget: firstLevel.nodeBudget,
  history: [],

  mode: 'home',

  currentLevelId: firstLevel.id,
  completedLevelIds: loadProgress(),
  showWinModal: false,
  hintsRevealed: 0,
  tutorialStep: loadTutorialDone() ? null : 0,

  unlockedChapters: (() => {
    const completed = loadCompletedChapters()
    const unlocked = new Set<number>([1])
    for (const id of completed) {
      unlocked.add(id)
      unlocked.add(id + 1)
    }
    return Array.from(unlocked).filter((id) => id >= 1 && id <= chapters.length).sort((a, b) => a - b)
  })(),
  completedChapters: loadCompletedChapters(),
  currentChapterId: null,

  demoPlaying: false,
  demoPaused: false,
  demoStepIndex: 0,
  demoNodes: [],
  demoEdges: [],

  blueprints: loadBlueprints(),

  selectedMark: 1,

  setMode: (mode) => {
    set({ mode })
    if (mode === 'tutorial') {
      // Tutorial mode shows the chapter list; canvas/demo are wiped until a chapter is opened
      set({
        nodes: [], edges: [], flowResult: null, history: [], showWinModal: false,
        currentChapterId: null,
        demoPlaying: false, demoPaused: false, demoStepIndex: 0, demoNodes: [], demoEdges: [],
      })
    } else if (mode === 'puzzles' || mode === 'free') {
      set({ nodes: [], edges: [], flowResult: null, history: [], showWinModal: false })
    }
  },

  // ── Canvas mutations ─────────────────────────────────────────────────────

  onNodesChange: (changes) =>
    set((s) => {
      const { nodes, edges, flowResult } = runSolverAndStamp(applyNodeChanges(changes, s.nodes), s.edges)
      persistCanvasIfPersistable(s, nodes, edges)
      const inChapter = s.mode === 'tutorial' && s.currentChapterId != null
      const win = inChapter
        ? { completedLevelIds: s.completedLevelIds, showWinModal: s.showWinModal, tutorialStep: s.tutorialStep }
        : checkWin({ prevSatisfied: !!s.flowResult?.satisfied, newSatisfied: flowResult.satisfied, currentLevelId: s.currentLevelId, completedLevelIds: s.completedLevelIds, showWinModal: s.showWinModal, tutorialStep: s.tutorialStep })
      return { nodes, edges, flowResult, ...win }
    }),

  onEdgesChange: (changes) =>
    set((s) => {
      const { nodes, edges, flowResult } = runSolverAndStamp(s.nodes, applyEdgeChanges(changes, s.edges))
      persistCanvasIfPersistable(s, nodes, edges)
      const inChapter = s.mode === 'tutorial' && s.currentChapterId != null
      const win = inChapter
        ? { completedLevelIds: s.completedLevelIds, showWinModal: s.showWinModal, tutorialStep: s.tutorialStep }
        : checkWin({ prevSatisfied: !!s.flowResult?.satisfied, newSatisfied: flowResult.satisfied, currentLevelId: s.currentLevelId, completedLevelIds: s.completedLevelIds, showWinModal: s.showWinModal, tutorialStep: s.tutorialStep })
      return { nodes, edges, flowResult, ...win }
    }),

  onConnect: (connection) =>
    set((s) => {
      const history = pushHistory(s.history, s.nodes, s.edges)
      const newEdges = addEdge({ ...connection, animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 }, data: { mark: get().selectedMark } }, s.edges)
      const { nodes, edges, flowResult } = runSolverAndStamp(s.nodes, newEdges)
      persistCanvasIfPersistable(s, nodes, edges)
      const inChapter = s.mode === 'tutorial' && s.currentChapterId != null
      const win = inChapter
        ? { completedLevelIds: s.completedLevelIds, showWinModal: s.showWinModal, tutorialStep: s.tutorialStep }
        : checkWin({ prevSatisfied: !!s.flowResult?.satisfied, newSatisfied: flowResult.satisfied, currentLevelId: s.currentLevelId, completedLevelIds: s.completedLevelIds, showWinModal: s.showWinModal, tutorialStep: s.tutorialStep })
      return { nodes, edges, flowResult, history, ...win }
    }),

  addNode: (type, position) => {
    const { nodes, nodeBudget } = get()
    const splitters = nodes.filter((n) => n.type === 'splitterNode').length
    const mergers   = nodes.filter((n) => n.type === 'mergerNode').length
    if (type === 'splitterNode' && splitters >= nodeBudget.splitters) return
    if (type === 'mergerNode'   && mergers   >= nodeBudget.mergers)   return

    const id = `${type.replace('Node', '')}-${Date.now()}`
    const data: GameNodeData = type === 'splitterNode'
      ? ({ kind: 'splitter', rotation: 0 } satisfies SplitterNodeData)
      : ({ kind: 'merger',   rotation: 0 } satisfies MergerNodeData)
    const newNode: Node = { id, type, position: { x: snapTo20(position.x), y: snapTo20(position.y) }, data }

    set((s) => {
      const history = pushHistory(s.history, s.nodes, s.edges)
      const { nodes: n, edges: e, flowResult } = runSolverAndStamp([...s.nodes, newNode], s.edges)
      persistCanvasIfPersistable(s, n, e)
      return { nodes: n, edges: e, flowResult, history }
    })
  },

  deleteSelected: () =>
    set((s) => {
      const history = pushHistory(s.history, s.nodes, s.edges)
      const kept = s.nodes.filter((n) => !n.selected || n.deletable === false)
      const keptIds = new Set(kept.map((n) => n.id))
      const keptEdges = s.edges.filter((e) => !e.selected && keptIds.has(e.source) && keptIds.has(e.target))
      const { nodes, edges, flowResult } = runSolverAndStamp(kept, keptEdges)
      persistCanvasIfPersistable(s, nodes, edges)
      return { nodes, edges, flowResult, history }
    }),

  rotateNode: (id, rotation) =>
    set((s) => {
      const history = pushHistory(s.history, s.nodes, s.edges)
      const newNodes = s.nodes.map((n) => n.id === id ? { ...n, data: { ...n.data, rotation } } : n)
      const { nodes, edges, flowResult } = runSolverAndStamp(newNodes, s.edges)
      persistCanvasIfPersistable(s, nodes, edges)
      return { nodes, edges, flowResult, history }
    }),

  setSelectedMark: (mark) => set({ selectedMark: mark }),

  remarkEdge: (edgeId, mark) =>
    set((s) => {
      const history = pushHistory(s.history, s.nodes, s.edges)
      const newEdges = s.edges.map((e) =>
        e.id === edgeId ? { ...e, data: { ...(e.data ?? {}), mark } } : e,
      )
      const { nodes, edges, flowResult } = runSolverAndStamp(s.nodes, newEdges)
      persistCanvasIfPersistable(s, nodes, edges)
      const inChapter = s.mode === 'tutorial' && s.currentChapterId != null
      const win = inChapter
        ? { completedLevelIds: s.completedLevelIds, showWinModal: s.showWinModal, tutorialStep: s.tutorialStep }
        : checkWin({ prevSatisfied: !!s.flowResult?.satisfied, newSatisfied: flowResult.satisfied, currentLevelId: s.currentLevelId, completedLevelIds: s.completedLevelIds, showWinModal: s.showWinModal, tutorialStep: s.tutorialStep })
      return { nodes, edges, flowResult, history, ...win }
    }),

  undo: () =>
    set((s) => {
      if (s.history.length === 0) return {}
      const prev = s.history[s.history.length - 1]
      const history = s.history.slice(0, -1)
      const { nodes, edges, flowResult } = runSolverAndStamp(prev.nodes, prev.edges)
      persistCanvasIfPersistable(s, nodes, edges)
      return { nodes, edges, flowResult, history }
    }),

  validate: () =>
    set((s) => {
      const { nodes, edges, flowResult } = runSolverAndStamp(s.nodes, s.edges)
      // validate always shows modal when satisfied (not just on transition)
      let completedLevelIds = s.completedLevelIds
      let showWinModal = s.showWinModal
      let tutorialStep = s.tutorialStep
      if (flowResult.satisfied) {
        showWinModal = true
        if (!completedLevelIds.includes(s.currentLevelId)) {
          completedLevelIds = [...completedLevelIds, s.currentLevelId]
          saveProgress(completedLevelIds)
        }
        if (s.currentLevelId === 1 && tutorialStep !== null) {
          saveTutorialDone()
          tutorialStep = null
        }
      }
      return { nodes, edges, flowResult, completedLevelIds, showWinModal, tutorialStep }
    }),

  resetGraph: () => {
    const { currentLevelId, currentChapterId, mode } = get()
    if (mode === 'tutorial' && currentChapterId != null) {
      const ch = chapters.find((c) => c.id === currentChapterId)
      if (!ch) return
      const { nodes, edges, flowResult } = runSolverAndStamp(nodesFromPuzzle(ch.tryItPuzzle), [])
      set({ nodes, edges, flowResult, history: [], showWinModal: false })
      return
    }
    const level = levels.find((l) => l.id === currentLevelId)
    if (!level) return
    clearCanvas(currentLevelId)
    const { nodes, edges, flowResult } = runSolverAndStamp(nodesFromLevel(level), [])
    set({ nodes, edges, flowResult, history: [], showWinModal: false, hintsRevealed: 0 })
  },

  // ── Level management ─────────────────────────────────────────────────────

  loadLevel: (levelId) => {
    const level = levels.find((l) => l.id === levelId)
    if (!level) return
    const saved = loadCanvas(levelId)
    const { nodes, edges, flowResult } = runSolverAndStamp(saved?.nodes ?? nodesFromLevel(level), saved?.edges ?? [])
    set({ currentLevelId: levelId, nodes, edges, flowResult, nodeBudget: level.nodeBudget, history: [], showWinModal: false, hintsRevealed: 0 })
  },

  loadSolution: () => {
    const { currentLevelId } = get()
    const level = levels.find((l) => l.id === currentLevelId)
    if (!level) return
    const sol: SolutionDef = level.solution

    // Fixed I/O nodes from the level definition
    const ioNodes = nodesFromLevel(level)

    // Intermediate nodes (splitters / mergers) specified by the solution
    const intermediateNodes: Node[] = sol.nodes.map((sn) => ({
      id: sn.id,
      type: sn.type,
      position: sn.position,
      deletable: true,
      data: (sn.type === 'splitterNode'
        ? { kind: 'splitter', rotation: 0 } satisfies SplitterNodeData
        : { kind: 'merger',   rotation: 0 } satisfies MergerNodeData),
    }))

    // Edges with the same visual style as user-drawn edges
    const solutionEdges: Edge[] = sol.edges.map((se, i) => ({
      id: `sol-e${i}`,
      source: se.source,
      target: se.target,
      ...(se.sourceHandle != null ? { sourceHandle: se.sourceHandle } : {}),
      ...(se.targetHandle != null ? { targetHandle: se.targetHandle } : {}),
      animated: true,
      style: { stroke: '#f59e0b', strokeWidth: 2 },
    }))

    const allNodes = [...ioNodes, ...intermediateNodes]
    const { nodes, edges, flowResult } = runSolverAndStamp(allNodes, solutionEdges)
    saveCanvas(currentLevelId, nodes, edges)

    // Mark level complete
    let { completedLevelIds, tutorialStep } = get()
    if (!completedLevelIds.includes(currentLevelId)) {
      completedLevelIds = [...completedLevelIds, currentLevelId]
      saveProgress(completedLevelIds)
    }
    if (currentLevelId === 1 && tutorialStep !== null) {
      saveTutorialDone()
      tutorialStep = null
    }

    set({ nodes, edges, flowResult, history: [], completedLevelIds, tutorialStep, showWinModal: flowResult.satisfied })
  },

  dismissWin: () => set({ showWinModal: false }),

  revealHint: () => set((s) => ({ hintsRevealed: Math.min(s.hintsRevealed + 1, 3) })),

  // ── Tutorial ─────────────────────────────────────────────────────────────

  advanceTutorial: () =>
    set((s) => {
      if (s.tutorialStep === null) return {}
      if (s.tutorialStep >= 2) { saveTutorialDone(); return { tutorialStep: null } }
      return { tutorialStep: (s.tutorialStep + 1) as 0 | 1 | 2 }
    }),

  dismissTutorial: () => {
    saveTutorialDone()
    set({ tutorialStep: null })
  },

  // ── Tutorial chapters ────────────────────────────────────────────────────

  openChapter: (id) => {
    const ch = chapters.find((c) => c.id === id)
    if (!ch) return
    const ioNodes = nodesFromPuzzle(ch.tryItPuzzle)
    const { nodes, edges, flowResult } = runSolverAndStamp(ioNodes, [])
    set({
      currentChapterId: id,
      nodes,
      edges,
      flowResult,
      nodeBudget: ch.tryItPuzzle.nodeBudget,
      history: [],
      showWinModal: false,
      hintsRevealed: 0,
      demoPlaying: true,
      demoPaused: true,
      demoStepIndex: 0,
      demoNodes: demoIoNodesFromPuzzle(ch.tryItPuzzle),
      demoEdges: [],
    })
  },

  closeChapter: () => set({
    currentChapterId: null,
    nodes: [], edges: [], flowResult: null, history: [],
    demoPlaying: false, demoPaused: false, demoStepIndex: 0, demoNodes: [], demoEdges: [],
  }),

  completeChapterTryIt: (id) =>
    set((s) => {
      if (s.completedChapters.includes(id)) return {}
      const completedChapters = [...s.completedChapters, id]
      saveCompletedChapters(completedChapters)
      const unlocked = new Set(s.unlockedChapters)
      unlocked.add(id)
      if (id + 1 <= chapters.length) unlocked.add(id + 1)
      const unlockedChapters = Array.from(unlocked).sort((a, b) => a - b)
      return { completedChapters, unlockedChapters }
    }),

  startDemo: () => set({ demoPlaying: true, demoPaused: false, demoStepIndex: 0, demoNodes: [], demoEdges: [] }),

  pauseDemo: () => set({ demoPaused: true }),

  resumeDemo: () => set({ demoPaused: false }),

  stepDemo: () =>
    set((s) => {
      if (s.currentChapterId == null) return {}
      const ch = chapters.find((c) => c.id === s.currentChapterId)
      if (!ch) return {}
      if (s.demoStepIndex >= ch.demoSteps.length) {
        return { demoPlaying: false }
      }
      const step = ch.demoSteps[s.demoStepIndex]
      const next = applyDemoStepToCanvas(step, s.demoNodes, s.demoEdges)
      const nextIndex = s.demoStepIndex + 1
      const isLast = nextIndex >= ch.demoSteps.length
      return {
        demoNodes: next.nodes,
        demoEdges: next.edges,
        demoStepIndex: nextIndex,
        demoPlaying: isLast ? false : s.demoPlaying,
      }
    }),

  replayDemo: () =>
    set((s) => {
      if (s.currentChapterId == null) return {}
      const ch = chapters.find((c) => c.id === s.currentChapterId)
      if (!ch) return {}
      return {
        demoPlaying: true,
        demoPaused: true,
        demoStepIndex: 0,
        demoNodes: demoIoNodesFromPuzzle(ch.tryItPuzzle),
        demoEdges: [],
      }
    }),

  skipDemo: () =>
    set((s) => {
      if (s.currentChapterId == null) return {}
      const ch = chapters.find((c) => c.id === s.currentChapterId)
      if (!ch) return {}
      // Apply all remaining steps so the demo canvas shows the final state, then end.
      let nodes = s.demoNodes
      let edges = s.demoEdges
      for (let i = s.demoStepIndex; i < ch.demoSteps.length; i++) {
        const r = applyDemoStepToCanvas(ch.demoSteps[i], nodes, edges)
        nodes = r.nodes
        edges = r.edges
      }
      return {
        demoNodes: nodes,
        demoEdges: edges,
        demoStepIndex: ch.demoSteps.length,
        demoPlaying: false,
        demoPaused: false,
      }
    }),

  loadChapterSolution: () => {
    const { currentChapterId } = get()
    if (currentChapterId == null) return
    const ch = chapters.find((c) => c.id === currentChapterId)
    if (!ch) return
    const sol: SolutionDef = ch.tryItPuzzle.solution
    const ioNodes = nodesFromPuzzle(ch.tryItPuzzle)
    const intermediateNodes: Node[] = sol.nodes.map((sn) => ({
      id: sn.id,
      type: sn.type,
      position: sn.position,
      deletable: true,
      data: (sn.type === 'splitterNode'
        ? { kind: 'splitter', rotation: 0 } satisfies SplitterNodeData
        : { kind: 'merger',   rotation: 0 } satisfies MergerNodeData),
    }))
    const solutionEdges: Edge[] = sol.edges.map((se, i) => {
      const mark: BeltMark = se.mark ?? 1
      return {
        id: `chsol-e${i}`,
        source: se.source,
        target: se.target,
        ...(se.sourceHandle != null ? { sourceHandle: se.sourceHandle } : {}),
        ...(se.targetHandle != null ? { targetHandle: se.targetHandle } : {}),
        animated: true,
        style: { stroke: BELT_STROKE[mark], strokeWidth: 2 },
        data: { mark },
      }
    })
    const { nodes, edges, flowResult } = runSolverAndStamp([...ioNodes, ...intermediateNodes], solutionEdges)
    set({ nodes, edges, flowResult, history: [] })
  },

  // ── Blueprints ────────────────────────────────────────────────────────────

  saveBlueprint: (name) => {
    const { nodes, edges, blueprints } = get()

    // Only save selected splitters/mergers
    const selected = nodes.filter(
      (n) => n.selected && (n.type === 'splitterNode' || n.type === 'mergerNode'),
    )
    if (selected.length === 0) return

    const selectedIds = new Set(selected.map((n) => n.id))
    const cx = selected.reduce((s, n) => s + n.position.x, 0) / selected.length
    const cy = selected.reduce((s, n) => s + n.position.y, 0) / selected.length

    const bpNodes: BlueprintNode[] = selected.map((n) => ({
      bpId: n.id,
      type: n.type as 'splitterNode' | 'mergerNode',
      relX: n.position.x - cx,
      relY: n.position.y - cy,
    }))

    const bpEdges: BlueprintEdge[] = edges
      .filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target))
      .map((e) => ({
        sourceBpId: e.source,
        targetBpId: e.target,
        ...(e.sourceHandle != null ? { sourceHandle: e.sourceHandle } : {}),
        ...(e.targetHandle != null ? { targetHandle: e.targetHandle } : {}),
      }))

    const bp: Blueprint = {
      id: `bp-${Date.now()}`,
      name: name.trim() || 'Blueprint',
      nodes: bpNodes,
      edges: bpEdges,
      splitterCount: bpNodes.filter((n) => n.type === 'splitterNode').length,
      mergerCount:   bpNodes.filter((n) => n.type === 'mergerNode').length,
      createdAt: Date.now(),
    }

    const updated = [...blueprints, bp]
    saveBlueprints(updated)
    set({ blueprints: updated })
  },

  deleteBlueprint: (id) => {
    const updated = get().blueprints.filter((b) => b.id !== id)
    saveBlueprints(updated)
    set({ blueprints: updated })
  },

  stampBlueprint: (id) =>
    set((s) => {
      const bp = s.blueprints.find((b) => b.id === id)
      if (!bp) return {}

      // Place near the existing intermediate nodes' centroid, or a sensible default
      const intermediates = s.nodes.filter(
        (n) => n.type === 'splitterNode' || n.type === 'mergerNode',
      )
      const baseX = intermediates.length
        ? intermediates.reduce((sum, n) => sum + n.position.x, 0) / intermediates.length + 100
        : 280
      const baseY = intermediates.length
        ? intermediates.reduce((sum, n) => sum + n.position.y, 0) / intermediates.length
        : 180

      const prefix = `stamp-${Date.now()}`
      const idMap = new Map(bp.nodes.map((n) => [n.bpId, `${prefix}-${n.bpId}`]))

      const newNodes: Node[] = bp.nodes.map((n) => ({
        id: idMap.get(n.bpId)!,
        type: n.type,
        position: { x: baseX + n.relX, y: baseY + n.relY },
        deletable: true,
        selected: true,
        data: (n.type === 'splitterNode'
          ? { kind: 'splitter', rotation: 0 } satisfies SplitterNodeData
          : { kind: 'merger',   rotation: 0 } satisfies MergerNodeData),
      }))

      const newEdges: Edge[] = bp.edges.map((e, i) => ({
        id: `${prefix}-e${i}`,
        source: idMap.get(e.sourceBpId)!,
        target: idMap.get(e.targetBpId)!,
        ...(e.sourceHandle != null ? { sourceHandle: e.sourceHandle } : {}),
        ...(e.targetHandle != null ? { targetHandle: e.targetHandle } : {}),
        animated: true,
        style: { stroke: '#f59e0b', strokeWidth: 2 },
      }))

      // Deselect existing nodes so the newly stamped ones stand out
      const history = pushHistory(s.history, s.nodes, s.edges)
      const allNodes = [...s.nodes.map((n) => ({ ...n, selected: false })), ...newNodes]
      const allEdges = [...s.edges, ...newEdges]
      const { nodes, edges, flowResult } = runSolverAndStamp(allNodes, allEdges)
      saveCanvas(s.currentLevelId, nodes, edges)
      return { nodes, edges, flowResult, history }
    }),
}))
