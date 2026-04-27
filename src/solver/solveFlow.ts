/**
 * solveFlow — pure, side-effect-free flow propagation engine.
 *
 * Algorithm: fixed-point iteration.
 *   • Input nodes always emit their configured rate (anchors the system).
 *   • Splitters divide incoming rate evenly across all connected outputs.
 *   • Mergers sum all incoming rates.
 *   • Iteration repeats until every edge rate changes by less than CONVERGENCE_EPS
 *     (or MAX_ITER is reached, in which case `unstable` is set).
 *
 * This handles both acyclic graphs (converges in ≤2 passes with good node
 * ordering) and cyclic loopback graphs (converges geometrically, typically
 * within ~40 passes for a single loop with ratio 1/2).
 */

import type {
  Graph,
  FlowResult,
  OutputResult,
  InputNodeData,
  OutputNodeData,
  SolverEdge,
  BeltMark,
} from '../types';
import { BELT_CAPACITY } from '../types';

const MAX_ITER = 1000;
/** Stop iterating when no edge changes by more than this. */
const CONVERGENCE_EPS = 1e-9;
/** Two rates are "equal" for the satisfied check at this tolerance. */
const SATISFIED_EPS = 1e-6;

// ── helpers ────────────────────────────────────────────────────────────────

function sum(edges: SolverEdge[], rates: Record<string, number>): number {
  let total = 0;
  for (const e of edges) total += rates[e.id] ?? 0;
  return total;
}

function buildAdjacency(graph: Graph) {
  const inEdges = new Map<string, SolverEdge[]>();
  const outEdges = new Map<string, SolverEdge[]>();
  for (const node of graph.nodes) {
    inEdges.set(node.id, []);
    outEdges.set(node.id, []);
  }
  for (const edge of graph.edges) {
    inEdges.get(edge.target)?.push(edge);
    outEdges.get(edge.source)?.push(edge);
  }
  return { inEdges, outEdges };
}

// ── main export ────────────────────────────────────────────────────────────

export function solveFlow(graph: Graph): FlowResult {
  if (graph.nodes.length === 0) {
    return {
      edgeRates: {},
      nodeThroughput: {},
      outputResults: {},
      satisfied: true,
      unstable: false,
      overloadedEdges: new Set<string>(),
    };
  }

  const { inEdges, outEdges } = buildAdjacency(graph);

  // Initialise all edge rates to 0
  const rates: Record<string, number> = {};
  for (const edge of graph.edges) rates[edge.id] = 0;

  let unstable = true;

  // ── Fixed-point iteration ────────────────────────────────────────────────
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let maxDelta = 0;

    for (const node of graph.nodes) {
      const outs = outEdges.get(node.id)!;
      // Nodes with no outgoing edges (sinks) need no rate update.
      if (outs.length === 0) continue;

      switch (node.kind) {
        case 'input': {
          // Fixed source: always pushes its configured rate.
          const rate = (node.data as InputNodeData).rate;
          for (const e of outs) {
            maxDelta = Math.max(maxDelta, Math.abs(rate - rates[e.id]));
            rates[e.id] = rate;
          }
          break;
        }

        case 'splitter': {
          // Divides total incoming rate equally among all connected outputs.
          const ins = inEdges.get(node.id)!;
          const inTotal = sum(ins, rates);
          const perOut = inTotal / outs.length;   // outs.length > 0 (guard above)
          for (const e of outs) {
            maxDelta = Math.max(maxDelta, Math.abs(perOut - rates[e.id]));
            rates[e.id] = perOut;
          }
          break;
        }

        case 'merger': {
          // Sums all incoming rates into one outgoing belt.
          const ins = inEdges.get(node.id)!;
          const inTotal = sum(ins, rates);
          for (const e of outs) {
            maxDelta = Math.max(maxDelta, Math.abs(inTotal - rates[e.id]));
            rates[e.id] = inTotal;
          }
          break;
        }

        case 'output':
          // Pure sink — nothing to propagate.
          break;
      }
    }

    if (maxDelta < CONVERGENCE_EPS) {
      unstable = false;
      break;
    }
  }

  // ── Derive per-node throughput and output results ────────────────────────
  const nodeThroughput: Record<string, number> = {};
  const outputResults: Record<string, OutputResult> = {};

  for (const node of graph.nodes) {
    const ins = inEdges.get(node.id)!;
    const outs = outEdges.get(node.id)!;
    const inTotal = sum(ins, rates);
    const outTotal = sum(outs, rates);
    // For display: take the higher of in/out (they match on healthy nodes;
    // differ only on the Input node where in=0 and out=rate).
    nodeThroughput[node.id] = Math.max(inTotal, outTotal);

    if (node.kind === 'output') {
      const targetRate = (node.data as OutputNodeData).targetRate;
      const actual = inTotal;
      outputResults[node.id] = {
        target: targetRate,
        actual,
        satisfied: Math.abs(actual - targetRate) < SATISFIED_EPS,
      };
    }
  }

  // ── Per-edge belt capacity check ─────────────────────────────────────────
  const overloadedEdges = new Set<string>();
  for (const edge of graph.edges) {
    const mark: BeltMark = edge.data?.mark ?? 1;
    const capacity = BELT_CAPACITY[mark];
    const rate = rates[edge.id] ?? 0;
    if (rate > capacity + 1e-9) overloadedEdges.add(edge.id);
  }

  return {
    edgeRates: rates,
    nodeThroughput,
    outputResults,
    satisfied: Object.values(outputResults).every((r) => r.satisfied),
    unstable,
    overloadedEdges,
  };
}
