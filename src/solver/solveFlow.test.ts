/**
 * solveFlow unit tests.
 *
 * Every expected value is hand-computed from first principles so the test
 * suite acts as an independent specification for the solver.
 *
 * Coverage:
 *  1.  Empty graph
 *  2.  Simple pass-through (no transformation)
 *  3.  Unsatisfied output (rate mismatch)
 *  4.  2-way even split  (level 1 pattern)
 *  5.  3-way even split  (level 2 pattern)
 *  6.  Two inputs merged (level 4 pattern)
 *  7.  Asymmetric merge  (40 + 20 → 60)
 *  8.  4-belt balanced splitter tree (level 3 pattern)
 *  9.  Uneven 45 + 15 via split-then-merge (level 5 pattern)
 * 10.  Multiple outputs, partial satisfaction
 * 11.  Disconnected output receives 0/min
 * 12.  Cyclic loopback — converges to correct steady state
 * 13.  Deeper cycle (triple-stage loopback)
 * 14.  Splitter with only 1 output connected (no-op pass-through)
 */

import { describe, it, expect } from 'vitest';
import { solveFlow } from './solveFlow';
import type { Graph, SolverNode, SolverEdge } from '../types';

// ── tiny test-graph builders ───────────────────────────────────────────────

const n = {
  input: (id: string, rate: number): SolverNode => ({
    id,
    kind: 'input',
    data: { kind: 'input', rate },
  }),
  output: (id: string, targetRate: number): SolverNode => ({
    id,
    kind: 'output',
    data: { kind: 'output', targetRate },
  }),
  splitter: (id: string): SolverNode => ({
    id,
    kind: 'splitter',
    data: { kind: 'splitter' },
  }),
  merger: (id: string): SolverNode => ({
    id,
    kind: 'merger',
    data: { kind: 'merger' },
  }),
};

const e = (id: string, source: string, target: string): SolverEdge => ({
  id,
  source,
  target,
});

// ── test suite ─────────────────────────────────────────────────────────────

describe('solveFlow', () => {

  // ── 1. Empty graph ────────────────────────────────────────────────────────
  it('1. empty graph → satisfied, not unstable', () => {
    const result = solveFlow({ nodes: [], edges: [] });
    expect(result.satisfied).toBe(true);
    expect(result.unstable).toBe(false);
    expect(result.edgeRates).toEqual({});
    expect(result.outputResults).toEqual({});
  });

  // ── 2. Simple pass-through ────────────────────────────────────────────────
  it('2. pass-through: Input(60) → Output(60) — edge carries 60, satisfied', () => {
    const graph: Graph = {
      nodes: [n.input('i1', 60), n.output('o1', 60)],
      edges: [e('e1', 'i1', 'o1')],
    };
    const r = solveFlow(graph);
    expect(r.edgeRates['e1']).toBeCloseTo(60);
    expect(r.outputResults['o1'].actual).toBeCloseTo(60);
    expect(r.outputResults['o1'].target).toBe(60);
    expect(r.outputResults['o1'].satisfied).toBe(true);
    expect(r.satisfied).toBe(true);
    expect(r.unstable).toBe(false);
  });

  // ── 3. Unsatisfied output ─────────────────────────────────────────────────
  it('3. mismatch: Input(60) → Output(target=30) — reports unsatisfied', () => {
    const graph: Graph = {
      nodes: [n.input('i1', 60), n.output('o1', 30)],
      edges: [e('e1', 'i1', 'o1')],
    };
    const r = solveFlow(graph);
    expect(r.edgeRates['e1']).toBeCloseTo(60);
    expect(r.outputResults['o1'].actual).toBeCloseTo(60);
    expect(r.outputResults['o1'].satisfied).toBe(false);
    expect(r.satisfied).toBe(false);
  });

  // ── 4. 2-way even split (level 1) ─────────────────────────────────────────
  it('4. 2-way split: Input(60) → S → [Output(30), Output(30)]', () => {
    //
    //  i1(60) → s1 → o1(30)
    //                o2(30)
    //
    const graph: Graph = {
      nodes: [n.input('i1', 60), n.splitter('s1'), n.output('o1', 30), n.output('o2', 30)],
      edges: [
        e('e1', 'i1', 's1'),
        e('e2', 's1', 'o1'),
        e('e3', 's1', 'o2'),
      ],
    };
    const r = solveFlow(graph);
    expect(r.edgeRates['e1']).toBeCloseTo(60);
    expect(r.edgeRates['e2']).toBeCloseTo(30);
    expect(r.edgeRates['e3']).toBeCloseTo(30);
    expect(r.satisfied).toBe(true);
    expect(r.nodeThroughput['s1']).toBeCloseTo(60);
  });

  // ── 5. 3-way even split (level 2) ─────────────────────────────────────────
  it('5. 3-way split: Input(60) → S → [Output(20) × 3]', () => {
    const graph: Graph = {
      nodes: [
        n.input('i1', 60), n.splitter('s1'),
        n.output('o1', 20), n.output('o2', 20), n.output('o3', 20),
      ],
      edges: [
        e('e1', 'i1', 's1'),
        e('e2', 's1', 'o1'),
        e('e3', 's1', 'o2'),
        e('e4', 's1', 'o3'),
      ],
    };
    const r = solveFlow(graph);
    expect(r.edgeRates['e2']).toBeCloseTo(20);
    expect(r.edgeRates['e3']).toBeCloseTo(20);
    expect(r.edgeRates['e4']).toBeCloseTo(20);
    expect(r.satisfied).toBe(true);
  });

  // ── 6. Merger: two equal inputs (level 4) ─────────────────────────────────
  it('6. merger: Input(60) + Input(60) → Merger → Output(120)', () => {
    const graph: Graph = {
      nodes: [n.input('i1', 60), n.input('i2', 60), n.merger('m1'), n.output('o1', 120)],
      edges: [
        e('e1', 'i1', 'm1'),
        e('e2', 'i2', 'm1'),
        e('e3', 'm1', 'o1'),
      ],
    };
    const r = solveFlow(graph);
    expect(r.edgeRates['e3']).toBeCloseTo(120);
    expect(r.nodeThroughput['m1']).toBeCloseTo(120);
    expect(r.satisfied).toBe(true);
  });

  // ── 7. Asymmetric merge ───────────────────────────────────────────────────
  it('7. asymmetric merge: Input(40) + Input(20) → Merger → Output(60)', () => {
    const graph: Graph = {
      nodes: [n.input('i1', 40), n.input('i2', 20), n.merger('m1'), n.output('o1', 60)],
      edges: [
        e('e1', 'i1', 'm1'),
        e('e2', 'i2', 'm1'),
        e('e3', 'm1', 'o1'),
      ],
    };
    const r = solveFlow(graph);
    expect(r.edgeRates['e3']).toBeCloseTo(60);
    expect(r.satisfied).toBe(true);
  });

  // ── 8. 4-belt balancer tree (level 3) ─────────────────────────────────────
  it('8. 4-belt balanced: Input(120) → S1 → [S2 → 2×30, S3 → 2×30]', () => {
    //
    //  i1(120) → s1 → s2 → o1(30)
    //                     → o2(30)
    //                 s3 → o3(30)
    //                     → o4(30)
    //
    const graph: Graph = {
      nodes: [
        n.input('i1', 120), n.splitter('s1'), n.splitter('s2'), n.splitter('s3'),
        n.output('o1', 30), n.output('o2', 30), n.output('o3', 30), n.output('o4', 30),
      ],
      edges: [
        e('e1', 'i1', 's1'),
        e('e2', 's1', 's2'),
        e('e3', 's1', 's3'),
        e('e4', 's2', 'o1'),
        e('e5', 's2', 'o2'),
        e('e6', 's3', 'o3'),
        e('e7', 's3', 'o4'),
      ],
    };
    const r = solveFlow(graph);
    expect(r.edgeRates['e2']).toBeCloseTo(60);
    expect(r.edgeRates['e3']).toBeCloseTo(60);
    expect(r.edgeRates['e4']).toBeCloseTo(30);
    expect(r.edgeRates['e5']).toBeCloseTo(30);
    expect(r.edgeRates['e6']).toBeCloseTo(30);
    expect(r.edgeRates['e7']).toBeCloseTo(30);
    expect(r.satisfied).toBe(true);
  });

  // ── 9. Uneven 45 + 15 via split-merge (level 5) ──────────────────────────
  it('9. 45+15 split-merge: 60 → S1 → [30→Merger, 30→S2 → [15→Merger, 15→o2]]', () => {
    //
    //  i1(60) → s1 → (30) → m1 → o1(45)
    //               → (30) → s2 → (15) → m1
    //                             (15) → o2(15)
    //
    // Hand-check: m1 receives 30 + 15 = 45 → o1 = 45 ✓   o2 = 15 ✓
    //
    const graph: Graph = {
      nodes: [
        n.input('i1', 60), n.splitter('s1'), n.splitter('s2'),
        n.merger('m1'), n.output('o1', 45), n.output('o2', 15),
      ],
      edges: [
        e('e1', 'i1', 's1'),
        e('e2', 's1', 'm1'),   // 30 → merger
        e('e3', 's1', 's2'),   // 30 → second splitter
        e('e4', 's2', 'm1'),   // 15 → merger
        e('e5', 's2', 'o2'),   // 15 → o2
        e('e6', 'm1', 'o1'),   // 45 → o1
      ],
    };
    const r = solveFlow(graph);
    expect(r.edgeRates['e2']).toBeCloseTo(30);
    expect(r.edgeRates['e3']).toBeCloseTo(30);
    expect(r.edgeRates['e4']).toBeCloseTo(15);
    expect(r.edgeRates['e5']).toBeCloseTo(15);
    expect(r.edgeRates['e6']).toBeCloseTo(45);
    expect(r.outputResults['o1'].actual).toBeCloseTo(45);
    expect(r.outputResults['o2'].actual).toBeCloseTo(15);
    expect(r.satisfied).toBe(true);
  });

  // ── 10. Partial satisfaction ──────────────────────────────────────────────
  it('10. partial: one output met, one not — satisfied=false', () => {
    //  i1(60) → s1 → o1(target=30, actual=30) ✓
    //               → o2(target=25, actual=30) ✗
    const graph: Graph = {
      nodes: [
        n.input('i1', 60), n.splitter('s1'),
        n.output('o1', 30), n.output('o2', 25),
      ],
      edges: [
        e('e1', 'i1', 's1'),
        e('e2', 's1', 'o1'),
        e('e3', 's1', 'o2'),
      ],
    };
    const r = solveFlow(graph);
    expect(r.outputResults['o1'].satisfied).toBe(true);
    expect(r.outputResults['o2'].satisfied).toBe(false);
    expect(r.satisfied).toBe(false);
  });

  // ── 11. Disconnected output ───────────────────────────────────────────────
  it('11. disconnected output gets 0/min, reports unsatisfied', () => {
    const graph: Graph = {
      nodes: [
        n.input('i1', 60),
        n.output('o1', 60),
        n.output('o2', 30), // no incoming edge
      ],
      edges: [e('e1', 'i1', 'o1')],
    };
    const r = solveFlow(graph);
    expect(r.outputResults['o1'].satisfied).toBe(true);
    expect(r.outputResults['o2'].actual).toBeCloseTo(0);
    expect(r.outputResults['o2'].satisfied).toBe(false);
    expect(r.satisfied).toBe(false);
  });

  // ── 12. Cyclic loopback (simple) ──────────────────────────────────────────
  it('12. 1-loop cycle converges: Input(60) → Merger → Splitter(2) → [Output, loopback]', () => {
    //
    //  i1(60) ──→ m1 ──→ s1 ──→ o1(60)
    //              ↑            │
    //              └────────────┘  (loopback)
    //
    // Steady-state:  let x = rate on e2 (m1 → s1)
    //   x  = 60 + x/2   →   x/2 = 60   →   x = 120
    //   e3 = e4 = 60
    //
    const graph: Graph = {
      nodes: [n.input('i1', 60), n.merger('m1'), n.splitter('s1'), n.output('o1', 60)],
      edges: [
        e('e1', 'i1', 'm1'),   // 60
        e('e2', 'm1', 's1'),   // 120 (steady state)
        e('e3', 's1', 'o1'),   // 60
        e('e4', 's1', 'm1'),   // 60  ← loopback
      ],
    };
    const r = solveFlow(graph);
    expect(r.unstable).toBe(false);
    expect(r.edgeRates['e1']).toBeCloseTo(60);
    expect(r.edgeRates['e2']).toBeCloseTo(120);
    expect(r.edgeRates['e3']).toBeCloseTo(60);
    expect(r.edgeRates['e4']).toBeCloseTo(60);
    expect(r.outputResults['o1'].actual).toBeCloseTo(60);
    expect(r.satisfied).toBe(true);
  });

  // ── 13. Deeper cyclic graph ───────────────────────────────────────────────
  it('13. 2-loop cycle converges to correct steady state', () => {
    //
    //  i1(60) → m1 → s1(3-way) → o1
    //            ↑            → s2(2-way) → o2
    //            │                       → m1  ← loopback via s2
    //            └── s1 ──────────────────────  ← loopback direct
    //
    // s1 has 3 outputs: e3→o1, e4→s2, e5→m1
    // s2 has 2 outputs: e6→o2, e7→m1
    //
    // Steady-state: let x = rate on e2 (m1 → s1)
    //   s1 splits x into thirds → x/3 each
    //   s2 receives x/3, splits in half → x/6 each
    //   loopback to m1 = e5 + e7 = x/3 + x/6 = x/2
    //
    //   x = 60 + x/2   →   x = 120
    //   o1 = x/3 = 40,  o2 = x/6 = 20
    //
    const graph: Graph = {
      nodes: [
        n.input('i1', 60), n.merger('m1'), n.splitter('s1'),
        n.splitter('s2'), n.output('o1', 40), n.output('o2', 20),
      ],
      edges: [
        e('e1', 'i1', 'm1'),
        e('e2', 'm1', 's1'),
        e('e3', 's1', 'o1'),   // x/3 = 40
        e('e4', 's1', 's2'),   // x/3 = 40
        e('e5', 's1', 'm1'),   // x/3 = 40  ← loopback arm 1
        e('e6', 's2', 'o2'),   // x/6 = 20
        e('e7', 's2', 'm1'),   // x/6 = 20  ← loopback arm 2
      ],
    };
    const r = solveFlow(graph);
    expect(r.unstable).toBe(false);
    expect(r.edgeRates['e2']).toBeCloseTo(120);
    expect(r.edgeRates['e3']).toBeCloseTo(40);
    expect(r.edgeRates['e4']).toBeCloseTo(40);
    expect(r.edgeRates['e5']).toBeCloseTo(40);
    expect(r.edgeRates['e6']).toBeCloseTo(20);
    expect(r.edgeRates['e7']).toBeCloseTo(20);
    expect(r.outputResults['o1'].actual).toBeCloseTo(40);
    expect(r.outputResults['o2'].actual).toBeCloseTo(20);
    expect(r.satisfied).toBe(true);
  });

  // ── 14. Splitter with 1 output (degenerate pass-through) ──────────────────
  it('14. splitter with 1 output acts as pass-through', () => {
    //  i1(90) → s1(1 output) → o1(90)
    const graph: Graph = {
      nodes: [n.input('i1', 90), n.splitter('s1'), n.output('o1', 90)],
      edges: [
        e('e1', 'i1', 's1'),
        e('e2', 's1', 'o1'),
      ],
    };
    const r = solveFlow(graph);
    expect(r.edgeRates['e2']).toBeCloseTo(90);
    expect(r.satisfied).toBe(true);
  });

});

// ── Level reference solutions ──────────────────────────────────────────────
// These pin the exact graphs the levels are designed around.

describe('level reference solutions', () => {

  it('L1: 60 → Splitter → [30, 30]', () => {
    const graph: Graph = {
      nodes: [n.input('in-1', 60), n.splitter('s1'), n.output('out-1', 30), n.output('out-2', 30)],
      edges: [e('e1','in-1','s1'), e('e2','s1','out-1'), e('e3','s1','out-2')],
    }
    const r = solveFlow(graph)
    expect(r.edgeRates['e2']).toBeCloseTo(30)
    expect(r.edgeRates['e3']).toBeCloseTo(30)
    expect(r.satisfied).toBe(true)
  })

  it('L2: 60 → Splitter(3) → [20, 20, 20]', () => {
    const graph: Graph = {
      nodes: [n.input('in-1', 60), n.splitter('s1'),
              n.output('out-1', 20), n.output('out-2', 20), n.output('out-3', 20)],
      edges: [e('e1','in-1','s1'), e('e2','s1','out-1'), e('e3','s1','out-2'), e('e4','s1','out-3')],
    }
    const r = solveFlow(graph)
    expect(r.edgeRates['e2']).toBeCloseTo(20)
    expect(r.edgeRates['e3']).toBeCloseTo(20)
    expect(r.edgeRates['e4']).toBeCloseTo(20)
    expect(r.satisfied).toBe(true)
  })

  it('L3: 120 → S1 → [S2→[30,30], S3→[30,30]]', () => {
    const graph: Graph = {
      nodes: [
        n.input('in-1', 120), n.splitter('s1'), n.splitter('s2'), n.splitter('s3'),
        n.output('out-1', 30), n.output('out-2', 30), n.output('out-3', 30), n.output('out-4', 30),
      ],
      edges: [
        e('e1','in-1','s1'), e('e2','s1','s2'), e('e3','s1','s3'),
        e('e4','s2','out-1'), e('e5','s2','out-2'),
        e('e6','s3','out-3'), e('e7','s3','out-4'),
      ],
    }
    const r = solveFlow(graph)
    expect(r.edgeRates['e2']).toBeCloseTo(60)
    expect(r.edgeRates['e4']).toBeCloseTo(30)
    expect(r.edgeRates['e7']).toBeCloseTo(30)
    expect(r.satisfied).toBe(true)
  })

  it('L4: [60, 60] → Merger → 120', () => {
    const graph: Graph = {
      nodes: [n.input('in-1', 60), n.input('in-2', 60), n.merger('m1'), n.output('out-1', 120)],
      edges: [e('e1','in-1','m1'), e('e2','in-2','m1'), e('e3','m1','out-1')],
    }
    const r = solveFlow(graph)
    expect(r.edgeRates['e3']).toBeCloseTo(120)
    expect(r.satisfied).toBe(true)
  })

  it('L5: 60 → S1→[30→M, 30→S2→[15→M, 15→out-2]] → M→45, out-2→15', () => {
    const graph: Graph = {
      nodes: [
        n.input('in-1', 60), n.splitter('s1'), n.splitter('s2'),
        n.merger('m1'), n.output('out-1', 45), n.output('out-2', 15),
      ],
      edges: [
        e('e1','in-1','s1'),
        e('e2','s1','m1'),    // 30 → merger
        e('e3','s1','s2'),    // 30 → s2
        e('e4','s2','m1'),    // 15 → merger
        e('e5','s2','out-2'), // 15 → out-2
        e('e6','m1','out-1'), // 45 → out-1
      ],
    }
    const r = solveFlow(graph)
    expect(r.edgeRates['e6']).toBeCloseTo(45)
    expect(r.edgeRates['e5']).toBeCloseTo(15)
    expect(r.satisfied).toBe(true)
  })

})
