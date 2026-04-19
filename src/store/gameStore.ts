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
import type { InputNodeData, OutputNodeData } from '../types';

// ── Initial graph (Step 1 hardcoded level) ─────────────────────────────────

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
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  resetGraph: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  nodes: initialNodes,
  edges: initialEdges,

  onNodesChange: (changes) =>
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),

  onEdgesChange: (changes) =>
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

  onConnect: (connection) =>
    set((state) => ({
      edges: addEdge(
        {
          ...connection,
          animated: true,
          style: { stroke: '#f59e0b', strokeWidth: 2 },
        },
        state.edges,
      ),
    })),

  resetGraph: () =>
    set({ nodes: initialNodes, edges: initialEdges }),
}));
