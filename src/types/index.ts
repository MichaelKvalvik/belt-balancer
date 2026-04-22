// Core domain types for Belt Balancer
// React Flow-specific node/edge types live in the store and components.
// These types are used by the solver and level definitions.

export type NodeKind = 'input' | 'output' | 'splitter' | 'merger';

// ── Node data shapes (stored in React Flow node.data) ──────────────────────

export interface InputNodeData {
  kind: 'input';
  rate: number;          // fixed source rate (items/min)
}

export interface OutputNodeData {
  kind: 'output';
  targetRate: number;    // required output rate
  actualRate?: number;   // computed by solver; undefined = not yet run
}

export interface SplitterNodeData {
  kind: 'splitter';
  rotation?: 0 | 90 | 180 | 270;
}

export interface MergerNodeData {
  kind: 'merger';
  rotation?: 0 | 90 | 180 | 270;
}

export type GameNodeData =
  | InputNodeData
  | OutputNodeData
  | SplitterNodeData
  | MergerNodeData;

// ── Pure graph representation (solver input — no React Flow types) ─────────

export interface SolverNode {
  id: string;
  kind: NodeKind;
  data: GameNodeData;
}

export interface SolverEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface Graph {
  nodes: SolverNode[];
  edges: SolverEdge[];
}

// ── Solver output ──────────────────────────────────────────────────────────

export interface OutputResult {
  target: number;
  actual: number;
  satisfied: boolean;
}

export interface FlowResult {
  /** Rate carried by each edge (items/min). */
  edgeRates: Record<string, number>;
  /** Total throughput at each node. */
  nodeThroughput: Record<string, number>;
  /** Per-output-node result. */
  outputResults: Record<string, OutputResult>;
  /** True when every output is satisfied. */
  satisfied: boolean;
  /** True when a cyclic graph failed to converge. */
  unstable: boolean;
}

// ── Level definition ───────────────────────────────────────────────────────

export interface LevelInput {
  id: string;
  rate: number;
  position: { x: number; y: number };
}

export interface LevelOutput {
  id: string;
  targetRate: number;
  position: { x: number; y: number };
}

/** A single intermediate node (splitter or merger) in a reference solution. */
export interface SolutionNode {
  id: string;
  type: 'splitterNode' | 'mergerNode';
  position: { x: number; y: number };
}

/** An edge in a reference solution. Uses the same handle IDs as the live canvas. */
export interface SolutionEdge {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

/** A complete reference solution graph for one level. */
export interface SolutionDef {
  nodes: SolutionNode[];
  edges: SolutionEdge[];
}

export interface LevelDef {
  id: number;
  title: string;
  introText: string;
  inputs: LevelInput[];
  outputs: LevelOutput[];
  nodeBudget: {
    splitters: number;
    mergers: number;
  };
  /** Exactly three progressive hints, from vague to specific. */
  hints: [string, string, string];
  /** Reference solution loaded onto the canvas when the player gives up. */
  solution: SolutionDef;
}
