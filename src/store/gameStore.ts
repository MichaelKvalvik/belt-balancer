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
import { solveFlow } from '../solver/solveFlow'
import { levels } from '../levels/levels'

// ── localStorage helpers ───────────────────────────────────────────────────

const STORAGE_KEY = 'belt-balancer-progress'

function loadProgress(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as number[]) : []
  } catch {
    return []
  }
}

function saveProgress(ids: number[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    /* localStorage unavailable (e.g. private browsing) — fail silently */
  }
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
    draggable: false,
    data: { kind: 'input', rate: inp.rate } satisfies InputNodeData,
  }))
  const outputNodes: Node[] = level.outputs.map((out) => ({
    id: out.id,
    type: 'outputNode',
    position: out.position,
    deletable: false,
    draggable: false,
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

  // Level
  currentLevelId: number
  completedLevelIds: number[]
  showWinModal: boolean
  hintsRevealed: number   // 0–3

  // Canvas actions
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (type: string, position: { x: number; y: number }) => void
  validate: () => void
  resetGraph: () => void

  // Level actions
  loadLevel: (levelId: number) => void
  dismissWin: () => void
  revealHint: () => void
}

// ── Initial state from level 1 ─────────────────────────────────────────────

const firstLevel = levels[0]

// ── Store ──────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState>((set, get) => ({
  nodes: nodesFromLevel(firstLevel),
  edges: [],
  flowResult: null,
  nodeBudget: firstLevel.nodeBudget,

  currentLevelId: firstLevel.id,
  completedLevelIds: loadProgress(),
  showWinModal: false,
  hintsRevealed: 0,

  // ── Canvas mutations ─────────────────────────────────────────────────────

  onNodesChange: (changes) =>
    set((s) => ({
      nodes: applyNodeChanges(changes, s.nodes),
      flowResult: null,
    })),

  onEdgesChange: (changes) =>
    set((s) => ({
      edges: applyEdgeChanges(changes, s.edges),
      flowResult: null,
    })),

  onConnect: (connection) =>
    set((s) => ({
      edges: addEdge(
        { ...connection, animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } },
        s.edges,
      ),
      flowResult: null,
    })),

  addNode: (type, position) => {
    const { nodes, nodeBudget } = get()
    const splitters = nodes.filter((n) => n.type === 'splitterNode').length
    const mergers   = nodes.filter((n) => n.type === 'mergerNode').length
    if (type === 'splitterNode' && splitters >= nodeBudget.splitters) return
    if (type === 'mergerNode'   && mergers   >= nodeBudget.mergers)   return

    const id = `${type.replace('Node', '')}-${Date.now()}`
    const data: GameNodeData =
      type === 'splitterNode'
        ? ({ kind: 'splitter' } satisfies SplitterNodeData)
        : ({ kind: 'merger'   } satisfies MergerNodeData)

    const newNode: Node = {
      id,
      type,
      position: { x: snapTo20(position.x), y: snapTo20(position.y) },
      data,
    }
    set((s) => ({ nodes: [...s.nodes, newNode], flowResult: null }))
  },

  validate: () => {
    const { nodes, edges, currentLevelId, completedLevelIds } = get()
    const result = solveFlow(buildGraph(nodes, edges))

    // Stamp actualRate onto output nodes.
    const updatedNodes = nodes.map((node) => {
      if (node.type !== 'outputNode') return node
      const or = result.outputResults[node.id]
      return or ? { ...node, data: { ...node.data, actualRate: or.actual } } : node
    })

    // Stamp rate labels onto edges.
    const updatedEdges = edges.map((edge) => {
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

    // Win detection: record completion on first solve.
    let newCompleted = completedLevelIds
    let showWin = false
    if (result.satisfied) {
      showWin = true
      if (!completedLevelIds.includes(currentLevelId)) {
        newCompleted = [...completedLevelIds, currentLevelId]
        saveProgress(newCompleted)
      }
    }

    set({
      nodes: updatedNodes,
      edges: updatedEdges,
      flowResult: result,
      completedLevelIds: newCompleted,
      showWinModal: showWin,
    })
  },

  resetGraph: () => {
    const { currentLevelId } = get()
    const level = levels.find((l) => l.id === currentLevelId)
    if (!level) return
    set({
      nodes: nodesFromLevel(level),
      edges: [],
      flowResult: null,
      showWinModal: false,
      hintsRevealed: 0,
    })
  },

  // ── Level management ─────────────────────────────────────────────────────

  loadLevel: (levelId) => {
    const level = levels.find((l) => l.id === levelId)
    if (!level) return
    set({
      currentLevelId: levelId,
      nodes: nodesFromLevel(level),
      edges: [],
      flowResult: null,
      nodeBudget: level.nodeBudget,
      showWinModal: false,
      hintsRevealed: 0,
    })
  },

  dismissWin: () => set({ showWinModal: false }),

  revealHint: () =>
    set((s) => ({ hintsRevealed: Math.min(s.hintsRevealed + 1, 3) })),
}))
