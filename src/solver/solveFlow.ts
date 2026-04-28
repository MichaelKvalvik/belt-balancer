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

  // Belt capacity per outgoing edge — looked up once.
  const edgeCap: Record<string, number> = {};
  for (const edge of graph.edges) {
    edgeCap[edge.id] = BELT_CAPACITY[(edge.data?.mark ?? 1) as BeltMark];
  }

  let unstable = true;

  // ── Fixed-point iteration ────────────────────────────────────────────────
  // Each edge carries min(intended_rate, capacity). Excess is "lost" — the
  // splitter/merger physically can't shove more through a slower belt.
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let maxDelta = 0;

    for (const node of graph.nodes) {
      const outs = outEdges.get(node.id)!;
      // Nodes with no outgoing edges (sinks) need no rate update.
      if (outs.length === 0) continue;

      switch (node.kind) {
        case 'input': {
          // Fixed source: pushes its configured rate, clamped to belt cap.
          const rate = (node.data as InputNodeData).rate;
          for (const e of outs) {
            const clamped = Math.min(rate, edgeCap[e.id]);
            maxDelta = Math.max(maxDelta, Math.abs(clamped - rates[e.id]));
            rates[e.id] = clamped;
          }
          break;
        }

        case 'splitter': {
          // Even split with spillover: capacity-capped ports give up their
          // residual to uncapped ports. Iteration handles cascades.
          const ins = inEdges.get(node.id)!;
          const remaining = sum(ins, rates);
          const assigned: Record<string, number> = {};
          for (const e of outs) assigned[e.id] = 0;
          let pool = remaining;
          let active = outs.slice();
          while (active.length > 0 && pool > 1e-12) {
            const share = pool / active.length;
            const next: typeof active = [];
            let consumed = 0;
            for (const e of active) {
              const headroom = edgeCap[e.id] - assigned[e.id];
              if (share >= headroom - 1e-12) {
                assigned[e.id] = edgeCap[e.id];
                consumed += headroom;
              } else {
                assigned[e.id] += share;
                consumed += share;
                next.push(e);
              }
            }
            pool -= consumed;
            if (next.length === active.length) break; // no progress; all uncapped
            active = next;
          }
          for (const e of outs) {
            const v = assigned[e.id];
            maxDelta = Math.max(maxDelta, Math.abs(v - rates[e.id]));
            rates[e.id] = v;
          }
          break;
        }

        case 'merger': {
          // Sums all incoming rates into one outgoing belt, clamped to cap.
          const ins = inEdges.get(node.id)!;
          const inTotal = sum(ins, rates);
          for (const e of outs) {
            const clamped = Math.min(inTotal, edgeCap[e.id]);
            maxDelta = Math.max(maxDelta, Math.abs(clamped - rates[e.id]));
            rates[e.id] = clamped;
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
  // Edge rates are already clamped to capacity, so we recompute the *intended*
  // rate from each upstream node and flag the edge if intended > capacity.
  const overloadedEdges = new Set<string>();
  for (const node of graph.nodes) {
    const outs = outEdges.get(node.id)!;
    if (outs.length === 0) continue;
    let intended = 0;
    switch (node.kind) {
      case 'input':
        intended = (node.data as InputNodeData).rate;
        break;
      case 'splitter':
        intended = sum(inEdges.get(node.id)!, rates) / outs.length;
        break;
      case 'merger':
        intended = sum(inEdges.get(node.id)!, rates);
        break;
      case 'output':
        continue;
    }
    for (const e of outs) {
      if (intended > edgeCap[e.id] + 1e-9) overloadedEdges.add(e.id);
    }
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
