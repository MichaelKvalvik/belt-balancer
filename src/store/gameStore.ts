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
} from '../types'
import type { Rotation } from '../utils/rotation'
import { solveFlow } from '../solver/solveFlow'
import { levels } from '../levels/levels'

// ── localStorage helpers ───────────────────────────────────────────────────

const PROGRESS_KEY = 'belt-balancer-progress'
const canvasKey = (levelId: number) => `belt-balancer-canvas-${levelId}`

function loadProgress(): number[] {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    return raw ? (JSON.parse(raw) as number[]) : []
  } catch { return [] }
}

function saveProgress(ids: number[]): void {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(ids)) } catch { /* noop */ }
}

interface CanvasSnapshot { nodes: Node[]; edges: Edge[] }

function saveCanvas(levelId: number, nodes: Node[], edges: Edge[]): void {
  try {
    localStorage.setItem(canvasKey(levelId), JSON.stringify({ nodes, edges }))
  } catch { /* noop */ }
}

function loadCanvas(levelId: number): CanvasSnapshot | null {
  try {
    const raw = localStorage.getItem(canvasKey(levelId))
    return raw ? (JSON.parse(raw) as CanvasSnapshot) : null
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
    nodes: nodes.map((n) => ({
      id: n.id,
      kind: nodeTypeToKind(n.type),
      data: n.data as GameNodeData,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    })),
  }
}

/** Convert a LevelDef into the initial React Flow nodes (no edges). */
function nodesFromLevel(level: LevelDef): Node[] {
  const inputNodes: Node[] = level.inputs.map((inp) => ({
    id: inp.id,
    type: 'inputNode',
    position: inp.position,
    deletable: false,
    data: { kind: 'input', rate: inp.rate } satisfies InputNodeData,
  }))
  const outputNodes: Node[] = level.outputs.map((out) => ({
    id: out.id,
    type: 'outputNode',
    position: out.position,
    deletable: false,
    data: { kind: 'output', targetRate: out.targetRate } satisfies OutputNodeData,
  }))
  return [...inputNodes, ...outputNodes]
}

function fmtRate(rate: number): string {
  const r = Math.round(rate * 1000) / 1000
  return `${r}/min`
}

function snapTo20(v: number) {
  return Math.round(v / 20) * 20
}

// ── Live solver helper ─────────────────────────────────────────────────────

function runSolverAndStamp(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[]; flowResult: FlowResult } {
  const result = solveFlow(buildGraph(nodes, edges))

  const stampedNodes = nodes.map((node) => {
    if (node.type !== 'outputNode') return node
    const or = result.outputResults[node.id]
    return or ? { ...node, data: { ...node.data, actualRate: or.actual } } : node
  })

  const stampedEdges = edges.map((edge) => {
    const rate = result.edgeRates[edge.id]
    if (rate === undefined) return edge
    return {
      ...edge,
      label: fmtRate(rate),
      labelStyle: { fill: '#f59e0b', fontFamily: 'ui-monospace, monospace', fontSize: 11 },
      labelBgStyle: { fill: '#0f172a', fillOpacity: 0.9 },
      labelBgPadding: [4, 3] as [number, number],
    }
  })

  return { nodes: stampedNodes, edges: stampedEdges, flowResult: result }
}

// ── History (undo) ─────────────────────────────────────────────────────────

const MAX_HISTORY = 30

interface HistoryEntry { nodes: Node[]; edges: Edge[] }

// ── Store interface ────────────────────────────────────────────────────────

export interface NodeBudget {
  splitters: number
  mergers: number
}

interface GameState {
  // Canvas
  nodes: Node[]
  edges: Edge[]
  flowResult: FlowResult | null
  nodeBudget: NodeBudget

  // History
  history: HistoryEntry[]

  // Level
  currentLevelId: number
  completedLevelIds: number[]
  showWinModal: boolean
  hintsRevealed: number

  // Canvas actions
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (type: string, position: { x: number; y: number }) => void
  deleteSelected: () => void
  rotateNode: (id: string, rotation: Rotation) => void
  undo: () => void
  validate: () => void
  resetGraph: () => void

  // Level actions
  loadLevel: (levelId: number) => void
  dismissWin: () => void
  revealHint: () => void
}

// ── Store ──────────────────────────────────────────────────────────────────

const firstLevel = levels[0]

function makeInitialState(level: LevelDef) {
  const saved = loadCanvas(level.id)
  const baseNodes = saved ? saved.nodes : nodesFromLevel(level)
  const baseEdges = saved ? saved.edges : []
  const stamped = runSolverAndStamp(baseNodes, baseEdges)
  return {
    nodes: stamped.nodes,
    edges: stamped.edges,
    flowResult: stamped.flowResult,
  }
}

const initial = makeInitialState(firstLevel)

export const useGameStore = create<GameState>((set, get) => ({
  nodes: initial.nodes,
  edges: initial.edges,
  flowResult: initial.flowResult,
  nodeBudget: firstLevel.nodeBudget,
  history: [],

  currentLevelId: firstLevel.id,
  completedLevelIds: loadProgress(),
  showWinModal: false,
  hintsRevealed: 0,

  // ── Helper: push snapshot to history ──────────────────────────────────────

  // ── Canvas mutations ─────────────────────────────────────────────────────

  onNodesChange: (changes) =>
    set((s) => {
      const newNodes = applyNodeChanges(changes, s.nodes)
      const { nodes, edges, flowResult } = runSolverAndStamp(newNodes, s.edges)
      saveCanvas(s.currentLevelId, nodes, edges)

      let completedLevelIds = s.completedLevelIds
      let showWinModal = s.showWinModal
      if (!s.flowResult?.satisfied && flowResult.satisfied) {
        showWinModal = true
        if (!completedLevelIds.includes(s.currentLevelId)) {
          completedLevelIds = [...completedLevelIds, s.currentLevelId]
          saveProgress(completedLevelIds)
        }
      }

      return { nodes, edges, flowResult, completedLevelIds, showWinModal }
    }),

  onEdgesChange: (changes) =>
    set((s) => {
      const newEdges = applyEdgeChanges(changes, s.edges)
      const { nodes, edges, flowResult } = runSolverAndStamp(s.nodes, newEdges)
      saveCanvas(s.currentLevelId, nodes, edges)

      let completedLevelIds = s.completedLevelIds
      let showWinModal = s.showWinModal
      if (!s.flowResult?.satisfied && flowResult.satisfied) {
        showWinModal = true
        if (!completedLevelIds.includes(s.currentLevelId)) {
          completedLevelIds = [...completedLevelIds, s.currentLevelId]
          saveProgress(completedLevelIds)
        }
      }

      return { nodes, edges, flowResult, completedLevelIds, showWinModal }
    }),

  onConnect: (connection) =>
    set((s) => {
      const history = [
        ...s.history.slice(-(MAX_HISTORY - 1)),
        { nodes: s.nodes, edges: s.edges },
      ]
      const newEdges = addEdge(
        { ...connection, animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } },
        s.edges,
      )
      const { nodes, edges, flowResult } = runSolverAndStamp(s.nodes, newEdges)
      saveCanvas(s.currentLevelId, nodes, edges)

      let completedLevelIds = s.completedLevelIds
      let showWinModal = s.showWinModal
      if (!s.flowResult?.satisfied && flowResult.satisfied) {
        showWinModal = true
        if (!completedLevelIds.includes(s.currentLevelId)) {
          completedLevelIds = [...completedLevelIds, s.currentLevelId]
          saveProgress(completedLevelIds)
        }
      }

      return { nodes, edges, flowResult, history, completedLevelIds, showWinModal }
    }),

  addNode: (type, position) => {
    const { nodes, edges, nodeBudget, currentLevelId } = get()
    const splitters = nodes.filter((n) => n.type === 'splitterNode').length
    const mergers   = nodes.filter((n) => n.type === 'mergerNode').length
    if (type === 'splitterNode' && splitters >= nodeBudget.splitters) return
    if (type === 'mergerNode'   && mergers   >= nodeBudget.mergers)   return

    const id = `${type.replace('Node', '')}-${Date.now()}`
    const data: GameNodeData =
      type === 'splitterNode'
        ? ({ kind: 'splitter', rotation: 0 } satisfies SplitterNodeData)
        : ({ kind: 'merger',   rotation: 0 } satisfies MergerNodeData)

    const newNode: Node = {
      id,
      type,
      position: { x: snapTo20(position.x), y: snapTo20(position.y) },
      data,
    }

    set((s) => {
      const history = [
        ...s.history.slice(-(MAX_HISTORY - 1)),
        { nodes: s.nodes, edges: s.edges },
      ]
      const newNodes = [...s.nodes, newNode]
      const { nodes: stampedNodes, edges: stampedEdges, flowResult } =
        runSolverAndStamp(newNodes, edges)
      saveCanvas(currentLevelId, stampedNodes, stampedEdges)
      return { nodes: stampedNodes, edges: stampedEdges, flowResult, history }
    })
  },

  deleteSelected: () =>
    set((s) => {
      const history = [
        ...s.history.slice(-(MAX_HISTORY - 1)),
        { nodes: s.nodes, edges: s.edges },
      ]
      const keepNodes = s.nodes.filter((n) => !n.selected || n.deletable === false)
      const keepNodeIds = new Set(keepNodes.map((n) => n.id))
      const keepEdges = s.edges.filter(
        (e) => !e.selected && keepNodeIds.has(e.source) && keepNodeIds.has(e.target),
      )
      const { nodes, edges, flowResult } = runSolverAndStamp(keepNodes, keepEdges)
      saveCanvas(s.currentLevelId, nodes, edges)
      return { nodes, edges, flowResult, history }
    }),

  rotateNode: (id, rotation) =>
    set((s) => {
      const history = [
        ...s.history.slice(-(MAX_HISTORY - 1)),
        { nodes: s.nodes, edges: s.edges },
      ]
      const newNodes = s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, rotation } } : n,
      )
      const { nodes, edges, flowResult } = runSolverAndStamp(newNodes, s.edges)
      saveCanvas(s.currentLevelId, nodes, edges)
      return { nodes, edges, flowResult, history }
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

  validate: () => {
    // Re-runs solver and triggers win modal (idempotent).
    set((s) => {
      const { nodes, edges, flowResult } = runSolverAndStamp(s.nodes, s.edges)
      let completedLevelIds = s.completedLevelIds
      let showWinModal = s.showWinModal
      if (flowResult.satisfied) {
        showWinModal = true
        if (!completedLevelIds.includes(s.currentLevelId)) {
          completedLevelIds = [...completedLevelIds, s.currentLevelId]
          saveProgress(completedLevelIds)
        }
      }
      return { nodes, edges, flowResult, completedLevelIds, showWinModal }
    })
  },

  resetGraph: () => {
    const { currentLevelId } = get()
    const level = levels.find((l) => l.id === currentLevelId)
    if (!level) return
    clearCanvas(currentLevelId)
    const baseNodes = nodesFromLevel(level)
    const { nodes, edges, flowResult } = runSolverAndStamp(baseNodes, [])
    set({
      nodes,
      edges,
      flowResult,
      history: [],
      showWinModal: false,
      hintsRevealed: 0,
    })
  },

  // ── Level management ─────────────────────────────────────────────────────

  loadLevel: (levelId) => {
    const level = levels.find((l) => l.id === levelId)
    if (!level) return
    const saved = loadCanvas(levelId)
    const baseNodes = saved ? saved.nodes : nodesFromLevel(level)
    const baseEdges = saved ? saved.edges : []
    const { nodes, edges, flowResult } = runSolverAndStamp(baseNodes, baseEdges)
    set({
      currentLevelId: levelId,
      nodes,
      edges,
      flowResult,
      nodeBudget: level.nodeBudget,
      history: [],
      showWinModal: false,
      hintsRevealed: 0,
    })
  },

  dismissWin: () => set({ showWinModal: false }),

  revealHint: () =>
    set((s) => ({ hintsRevealed: Math.min(s.hintsRevealed + 1, 3) })),
}))
