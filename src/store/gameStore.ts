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
} from '../types'
import { solveFlow } from '../solver/solveFlow'

// ── helpers ────────────────────────────────────────────────────────────────

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

function fmtRate(rate: number): string {
  const r = Math.round(rate * 1000) / 1000
  return `${r}/min`
}

function snapTo20(v: number) {
  return Math.round(v / 20) * 20
}

// ── Initial graph ──────────────────────────────────────────────────────────

const initialNodes: Node[] = [
  {
    id: 'input-1',
    type: 'inputNode',
    position: { x: 160, y: 180 },
    deletable: false,
    data: { kind: 'input', rate: 60 } satisfies InputNodeData,
  },
  {
    id: 'output-1',
    type: 'outputNode',
    position: { x: 640, y: 180 },
    deletable: false,
    data: { kind: 'output', targetRate: 60 } satisfies OutputNodeData,
  },
]

const initialEdges: Edge[] = [
  {
    id: 'e-input1-output1',
    source: 'input-1',
    target: 'output-1',
    animated: true,
    label: '60/min',
    labelStyle: { fill: '#f59e0b', fontFamily: 'ui-monospace, monospace', fontSize: 11 },
    labelBgStyle: { fill: '#0f172a', fillOpacity: 0.9 },
    labelBgPadding: [4, 3],
    style: { stroke: '#f59e0b', strokeWidth: 2 },
  },
]

// ── Store interface ────────────────────────────────────────────────────────

export interface NodeBudget {
  splitters: number
  mergers: number
}

interface GameState {
  nodes: Node[]
  edges: Edge[]
  flowResult: FlowResult | null
  nodeBudget: NodeBudget

  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (type: string, position: { x: number; y: number }) => void
  validate: () => void
  resetGraph: () => void
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useGameStore = create<GameState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  flowResult: null,
  nodeBudget: { splitters: 5, mergers: 5 },

  // Clear flowResult whenever the graph topology changes so the badge
  // never shows a stale result.
  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
      flowResult: null,
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
      flowResult: null,
    })),

  onConnect: (connection) =>
    set((state) => ({
      edges: addEdge(
        { ...connection, animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } },
        state.edges,
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
    set((state) => ({ nodes: [...state.nodes, newNode], flowResult: null }))
  },

  validate: () => {
    const { nodes, edges } = get()
    const result = solveFlow(buildGraph(nodes, edges))

    // Stamp actualRate onto output nodes so they colour themselves.
    const updatedNodes = nodes.map((node) => {
      if (node.type !== 'outputNode') return node
      const or = result.outputResults[node.id]
      return or ? { ...node, data: { ...node.data, actualRate: or.actual } } : node
    })

    // Stamp computed rate as edge label.
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

    set({ nodes: updatedNodes, edges: updatedEdges, flowResult: result })
  },

  resetGraph: () =>
    set({ nodes: initialNodes, edges: initialEdges, flowResult: null }),
}))
