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
} from '../types'
import type { Rotation } from '../utils/rotation'
import { solveFlow } from '../solver/solveFlow'
import { levels } from '../levels/levels'
import { BELT_STROKE } from '../components/BeltSelectorBar'

// ── localStorage helpers ───────────────────────────────────────────────────

const PROGRESS_KEY   = 'belt-balancer-progress'
const TUTORIAL_KEY   = 'belt-balancer-tutorial-v1'
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

  blueprints: loadBlueprints(),

  selectedMark: 1,

  setMode: (mode) => {
    set({ mode })
    if (mode === 'tutorial') {
      get().loadLevel(1)
    } else if (mode === 'puzzles' || mode === 'free') {
      set({ nodes: [], edges: [], flowResult: null, history: [], showWinModal: false })
    }
  },

  // ── Canvas mutations ─────────────────────────────────────────────────────

  onNodesChange: (changes) =>
    set((s) => {
      const { nodes, edges, flowResult } = runSolverAndStamp(applyNodeChanges(changes, s.nodes), s.edges)
      saveCanvas(s.currentLevelId, nodes, edges)
      const win = checkWin({ prevSatisfied: !!s.flowResult?.satisfied, newSatisfied: flowResult.satisfied, currentLevelId: s.currentLevelId, completedLevelIds: s.completedLevelIds, showWinModal: s.showWinModal, tutorialStep: s.tutorialStep })
      return { nodes, edges, flowResult, ...win }
    }),

  onEdgesChange: (changes) =>
    set((s) => {
      const { nodes, edges, flowResult } = runSolverAndStamp(s.nodes, applyEdgeChanges(changes, s.edges))
      saveCanvas(s.currentLevelId, nodes, edges)
      const win = checkWin({ prevSatisfied: !!s.flowResult?.satisfied, newSatisfied: flowResult.satisfied, currentLevelId: s.currentLevelId, completedLevelIds: s.completedLevelIds, showWinModal: s.showWinModal, tutorialStep: s.tutorialStep })
      return { nodes, edges, flowResult, ...win }
    }),

  onConnect: (connection) =>
    set((s) => {
      const history = pushHistory(s.history, s.nodes, s.edges)
      const newEdges = addEdge({ ...connection, animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 }, data: { mark: get().selectedMark } }, s.edges)
      const { nodes, edges, flowResult } = runSolverAndStamp(s.nodes, newEdges)
      saveCanvas(s.currentLevelId, nodes, edges)
      const win = checkWin({ prevSatisfied: !!s.flowResult?.satisfied, newSatisfied: flowResult.satisfied, currentLevelId: s.currentLevelId, completedLevelIds: s.completedLevelIds, showWinModal: s.showWinModal, tutorialStep: s.tutorialStep })
      return { nodes, edges, flowResult, history, ...win }
    }),

  addNode: (type, position) => {
    const { nodes, edges, nodeBudget, currentLevelId } = get()
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
      const { nodes: n, edges: e, flowResult } = runSolverAndStamp([...s.nodes, newNode], edges)
      saveCanvas(currentLevelId, n, e)
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
      saveCanvas(s.currentLevelId, nodes, edges)
      return { nodes, edges, flowResult, history }
    }),

  rotateNode: (id, rotation) =>
    set((s) => {
      const history = pushHistory(s.history, s.nodes, s.edges)
      const newNodes = s.nodes.map((n) => n.id === id ? { ...n, data: { ...n.data, rotation } } : n)
      const { nodes, edges, flowResult } = runSolverAndStamp(newNodes, s.edges)
      saveCanvas(s.currentLevelId, nodes, edges)
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
      saveCanvas(s.currentLevelId, nodes, edges)
      const win = checkWin({ prevSatisfied: !!s.flowResult?.satisfied, newSatisfied: flowResult.satisfied, currentLevelId: s.currentLevelId, completedLevelIds: s.completedLevelIds, showWinModal: s.showWinModal, tutorialStep: s.tutorialStep })
      return { nodes, edges, flowResult, history, ...win }
    }),

  undo: () =>
    set((s) => {
      if (s.history.length === 0) return {}
      const prev = s.history[s.history.length - 1]
      const history = s.history.slice(0, -1)
      const { nodes, edges, flowResult } = runSolverAndStamp(prev.nodes, prev.edges)
      saveCanvas(s.currentLevelId, nodes, edges)
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
    const { currentLevelId } = get()
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
