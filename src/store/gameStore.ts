import { create } from 'zustand';
import {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from 'reactflow';
import type { InputNodeData, OutputNodeData, GameNodeData, NodeKind, Graph, FlowResult } from '../types';
import { solveFlow } from '../solver/solveFlow';

// ── helpers ────────────────────────────────────────────────────────────────

function nodeTypeToKind(type: string | undefined): NodeKind {
  switch (type) {
    case 'inputNode':    return 'input';
    case 'outputNode':   return 'output';
    case 'splitterNode': return 'splitter';
    case 'mergerNode':   return 'merger';
    default:             return 'input';
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
  };
}

/** Format a rate for display on an edge label. Removes trailing .00 noise. */
function fmtRate(rate: number): string {
  const rounded = Math.round(rate * 1000) / 1000;
  return Number.isInteger(rounded) ? `${rounded}/min` : `${rounded}/min`;
}

// ── Initial graph (hardcoded Step 1/2 demo level) ─────────────────────────

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
];

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
];

// ── Store ──────────────────────────────────────────────────────────────────

interface GameState {
  nodes: Node[];
  edges: Edge[];
  flowResult: FlowResult | null;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  validate: () => void;
  resetGraph: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  flowResult: null,

  onNodesChange: (changes) =>
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),

  onEdgesChange: (changes) =>
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

  onConnect: (connection) =>
    set((state) => ({
      edges: addEdge(
        { ...connection, animated: true, style: { stroke: '#f59e0b', strokeWidth: 2 } },
        state.edges,
      ),
    })),

  validate: () => {
    const { nodes, edges } = get();
    const graph = buildGraph(nodes, edges);
    const result = solveFlow(graph);

    // Stamp actualRate onto every output node so OutputNode can colour itself.
    const updatedNodes = nodes.map((node) => {
      if (node.type !== 'outputNode') return node;
      const or = result.outputResults[node.id];
      if (!or) return node;
      return { ...node, data: { ...node.data, actualRate: or.actual } };
    });

    // Stamp computed rate as a label on every edge.
    const updatedEdges = edges.map((edge) => {
      const rate = result.edgeRates[edge.id];
      if (rate === undefined) return edge;
      return {
        ...edge,
        label: fmtRate(rate),
        labelStyle: { fill: '#f59e0b', fontFamily: 'ui-monospace, monospace', fontSize: 11 },
        labelBgStyle: { fill: '#0f172a', fillOpacity: 0.9 },
        labelBgPadding: [4, 3] as [number, number],
      };
    });

    set({ nodes: updatedNodes, edges: updatedEdges, flowResult: result });
  },

  resetGraph: () =>
    set({ nodes: initialNodes, edges: initialEdges, flowResult: null }),
}));
