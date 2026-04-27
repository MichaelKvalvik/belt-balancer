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

  // ── 15. Belt within capacity ──────────────────────────────────────────────
  it('15. belt within capacity: Mk.1 edge carrying 60/min is not overloaded', () => {
    const graph: Graph = {
      nodes: [n.input('i1', 60), n.output('o1', 60)],
      edges: [{ id: 'e1', source: 'i1', target: 'o1', data: { mark: 1 } }],
    };
    const r = solveFlow(graph);
    expect(r.edgeRates['e1']).toBeCloseTo(60);
    expect(r.overloadedEdges.size).toBe(0);
    expect(r.satisfied).toBe(true);
  });

  // ── 16. Belt over capacity ────────────────────────────────────────────────
  it('16. belt over capacity: Mk.1 edge carrying 120/min is overloaded', () => {
    const graph: Graph = {
      nodes: [n.input('i1', 120), n.output('o1', 120)],
      edges: [{ id: 'e1', source: 'i1', target: 'o1', data: { mark: 1 } }],
    };
    const r = solveFlow(graph);
    expect(r.edgeRates['e1']).toBeCloseTo(120);
    expect(r.overloadedEdges.has('e1')).toBe(true);
    // Overloaded is informational only — solver still reports satisfied if rates match.
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

  it('L6: [120, 120] → M → S(÷3) → [80×3]', () => {
    // Two inputs merge to 240, then split three ways → 80 each
    const graph: Graph = {
      nodes: [
        n.input('in-1', 120), n.input('in-2', 120),
        n.merger('m1'), n.splitter('s1'),
        n.output('out-1', 80), n.output('out-2', 80), n.output('out-3', 80),
      ],
      edges: [
        e('e1','in-1','m1'), e('e2','in-2','m1'),
        e('e3','m1','s1'),
        e('e4','s1','out-1'), e('e5','s1','out-2'), e('e6','s1','out-3'),
      ],
    }
    const r = solveFlow(graph)
    expect(r.edgeRates['e3']).toBeCloseTo(240)
    expect(r.edgeRates['e4']).toBeCloseTo(80)
    expect(r.satisfied).toBe(true)
  })

  it('L7: 5-way loopback — 300 → [60×5] (Y=360, 1 stream loops back)', () => {
    // Y = M throughput. M←[in(300), loopback(Y/6)]
    // M→S1(÷2)→[Y/2, Y/2]→S2,S3(each ÷3)→6 streams of Y/6
    // 5 streams → outputs, 1 loops back to M
    // Y = 300 + Y/6  →  Y = 360, each output = 60
    const graph: Graph = {
      nodes: [
        n.input('in-1', 300),
        n.merger('m1'), n.splitter('s1'), n.splitter('s2'), n.splitter('s3'),
        n.output('out-1', 60), n.output('out-2', 60), n.output('out-3', 60),
        n.output('out-4', 60), n.output('out-5', 60),
      ],
      edges: [
        e('e1','in-1','m1'),    // 300 → merger in-0
        e('e2','m1','s1'),      // Y → s1
        e('e3','s1','s2'),      // Y/2 → s2
        e('e4','s1','s3'),      // Y/2 → s3
        e('e5','s2','out-1'),   // Y/6 → out-1
        e('e6','s2','out-2'),   // Y/6 → out-2
        e('e7','s2','out-3'),   // Y/6 → out-3
        e('e8','s3','out-4'),   // Y/6 → out-4
        e('e9','s3','out-5'),   // Y/6 → out-5
        e('e10','s3','m1'),     // Y/6 → loopback to merger in-1
      ],
    }
    const r = solveFlow(graph)
    expect(r.edgeRates['e2']).toBeCloseTo(360)   // M throughput
    expect(r.edgeRates['e5']).toBeCloseTo(60)    // each output stream
    expect(r.edgeRates['e10']).toBeCloseTo(60)   // loopback
    expect(r.satisfied).toBe(true)
    expect(r.unstable).toBe(false)
  })

  it('L8: 360 → S1(÷3) → [S2,S3,S4](each ÷2) → [60×6]', () => {
    const graph: Graph = {
      nodes: [
        n.input('in-1', 360),
        n.splitter('s1'), n.splitter('s2'), n.splitter('s3'), n.splitter('s4'),
        n.output('out-1', 60), n.output('out-2', 60), n.output('out-3', 60),
        n.output('out-4', 60), n.output('out-5', 60), n.output('out-6', 60),
      ],
      edges: [
        e('e1','in-1','s1'),
        e('e2','s1','s2'), e('e3','s1','s3'), e('e4','s1','s4'),
        e('e5','s2','out-1'), e('e6','s2','out-2'),
        e('e7','s3','out-3'), e('e8','s3','out-4'),
        e('e9','s4','out-5'), e('e10','s4','out-6'),
      ],
    }
    const r = solveFlow(graph)
    expect(r.edgeRates['e2']).toBeCloseTo(120)  // each S1 output
    expect(r.edgeRates['e5']).toBeCloseTo(60)
    expect(r.satisfied).toBe(true)
  })

  it('L9: [120×4] → M1(3-in) + M2 → S(÷3) → [160×3]', () => {
    // M1 gets 3 inputs of 120 = 360; M2 gets M1 + 4th input = 480; S÷3 = 160 each
    const graph: Graph = {
      nodes: [
        n.input('in-1', 120), n.input('in-2', 120),
        n.input('in-3', 120), n.input('in-4', 120),
        n.merger('m1'), n.merger('m2'), n.splitter('s1'),
        n.output('out-1', 160), n.output('out-2', 160), n.output('out-3', 160),
      ],
      edges: [
        e('e1','in-1','m1'), e('e2','in-2','m1'), e('e3','in-3','m1'),
        e('e4','m1','m2'), e('e5','in-4','m2'),
        e('e6','m2','s1'),
        e('e7','s1','out-1'), e('e8','s1','out-2'), e('e9','s1','out-3'),
      ],
    }
    const r = solveFlow(graph)
    expect(r.edgeRates['e6']).toBeCloseTo(480)
    expect(r.edgeRates['e7']).toBeCloseTo(160)
    expect(r.satisfied).toBe(true)
  })

  it('L10: 360 → S1(÷2)→[180→out-1, 180→S2(÷3)→[60→out-3, 60+60→M→out-2(120)]]', () => {
    // S1 splits 360→[180, 180]. First 180 → out-1.
    // Second 180 → S2(÷3)→[60×3]: one to out-3, two feed M1→out-2(120)
    const graph: Graph = {
      nodes: [
        n.input('in-1', 360),
        n.splitter('s1'), n.splitter('s2'), n.merger('m1'),
        n.output('out-1', 180), n.output('out-2', 120), n.output('out-3', 60),
      ],
      edges: [
        e('e1','in-1','s1'),
        e('e2','s1','out-1'),  // 180
        e('e3','s1','s2'),     // 180 → S2
        e('e4','s2','out-3'),  // 60
        e('e5','s2','m1'),     // 60 → merger in-0
        e('e6','s2','m1'),     // 60 → merger in-1  (second edge s2→m1)
        e('e7','m1','out-2'),  // 120
      ],
    }
    const r = solveFlow(graph)
    expect(r.edgeRates['e2']).toBeCloseTo(180)
    expect(r.edgeRates['e7']).toBeCloseTo(120)
    expect(r.edgeRates['e4']).toBeCloseTo(60)
    expect(r.satisfied).toBe(true)
  })

  it('L11: [480, 240] → M → S(÷3) → [240×3]', () => {
    const graph: Graph = {
      nodes: [
        n.input('in-1', 480), n.input('in-2', 240),
        n.merger('m1'), n.splitter('s1'),
        n.output('out-1', 240), n.output('out-2', 240), n.output('out-3', 240),
      ],
      edges: [
        e('e1','in-1','m1'), e('e2','in-2','m1'),
        e('e3','m1','s1'),
        e('e4','s1','out-1'), e('e5','s1','out-2'), e('e6','s1','out-3'),
      ],
    }
    const r = solveFlow(graph)
    expect(r.edgeRates['e3']).toBeCloseTo(720)
    expect(r.edgeRates['e4']).toBeCloseTo(240)
    expect(r.satisfied).toBe(true)
  })

  it('L12: 7-way loopback — 420 → [60×7] (Y=540, 2 streams loop back)', () => {
    // Y = M throughput. M←[in(420), lb1(Y/9), lb2(Y/9)]
    // M→S1(÷3)→[Y/3×3]→S2,S3,S4(each ÷3)→9 streams of Y/9
    // 7 → outputs, 2 loop back  →  Y = 420 + 2Y/9  →  Y = 540, each output = 60
    const graph: Graph = {
      nodes: [
        n.input('in-1', 420),
        n.merger('m1'), n.splitter('s1'),
        n.splitter('s2'), n.splitter('s3'), n.splitter('s4'),
        n.output('out-1', 60), n.output('out-2', 60), n.output('out-3', 60),
        n.output('out-4', 60), n.output('out-5', 60),
        n.output('out-6', 60), n.output('out-7', 60),
      ],
      edges: [
        e('e1','in-1','m1'),    // 420 → m1 in-0
        e('e2','m1','s1'),      // Y → s1
        e('e3','s1','s2'),      // Y/3 → s2
        e('e4','s1','s3'),      // Y/3 → s3
        e('e5','s1','s4'),      // Y/3 → s4
        e('e6','s2','out-1'), e('e7','s2','out-2'), e('e8','s2','out-3'),
        e('e9','s3','out-4'), e('e10','s3','out-5'),
        e('e11','s3','m1'),     // loopback 1 → m1 in-1
        e('e12','s4','out-6'), e('e13','s4','out-7'),
        e('e14','s4','m1'),     // loopback 2 → m1 in-2
      ],
    }
    const r = solveFlow(graph)
    expect(r.edgeRates['e2']).toBeCloseTo(540)   // M throughput
    expect(r.edgeRates['e3']).toBeCloseTo(180)   // each S1 output
    expect(r.edgeRates['e6']).toBeCloseTo(60)    // each output stream
    expect(r.edgeRates['e11']).toBeCloseTo(60)   // loopback 1
    expect(r.edgeRates['e14']).toBeCloseTo(60)   // loopback 2
    expect(r.satisfied).toBe(true)
    expect(r.unstable).toBe(false)
  })

  it('L13: 450 → S1(÷3)→[150→out-1, 150+150→M→S2(÷3)→[100×3]]', () => {
    // S1 splits 450→[150×3]. Keep one 150 for out-1.
    // Other two 150s merge (M=300) → S2(÷3) → [100×3]
    const graph: Graph = {
      nodes: [
        n.input('in-1', 450),
        n.splitter('s1'), n.merger('m1'), n.splitter('s2'),
        n.output('out-1', 150), n.output('out-2', 100),
        n.output('out-3', 100), n.output('out-4', 100),
      ],
      edges: [
        e('e1','in-1','s1'),
        e('e2','s1','out-1'),  // 150
        e('e3','s1','m1'),     // 150 → m1 in-0
        e('e4','s1','m1'),     // 150 → m1 in-1
        e('e5','m1','s2'),     // 300
        e('e6','s2','out-2'), e('e7','s2','out-3'), e('e8','s2','out-4'),
      ],
    }
    const r = solveFlow(graph)
    expect(r.edgeRates['e2']).toBeCloseTo(150)
    expect(r.edgeRates['e5']).toBeCloseTo(300)
    expect(r.edgeRates['e6']).toBeCloseTo(100)
    expect(r.satisfied).toBe(true)
  })

  it('L14: 480 → S1(÷2)→[240→out-1, 240→S2(÷2)→[120→out-2, 120→S3(÷3)→[40→out-4, 40+40→M→out-3(80)]]]', () => {
    const graph: Graph = {
      nodes: [
        n.input('in-1', 480),
        n.splitter('s1'), n.splitter('s2'), n.splitter('s3'), n.merger('m1'),
        n.output('out-1', 240), n.output('out-2', 120),
        n.output('out-3', 80), n.output('out-4', 40),
      ],
      edges: [
        e('e1','in-1','s1'),
        e('e2','s1','out-1'),  // 240
        e('e3','s1','s2'),     // 240
        e('e4','s2','out-2'),  // 120
        e('e5','s2','s3'),     // 120
        e('e6','s3','out-4'),  // 40
        e('e7','s3','m1'),     // 40 → m1 in-0
        e('e8','s3','m1'),     // 40 → m1 in-1
        e('e9','m1','out-3'),  // 80
      ],
    }
    const r = solveFlow(graph)
    expect(r.edgeRates['e2']).toBeCloseTo(240)
    expect(r.edgeRates['e4']).toBeCloseTo(120)
    expect(r.edgeRates['e6']).toBeCloseTo(40)
    expect(r.edgeRates['e9']).toBeCloseTo(80)
    expect(r.satisfied).toBe(true)
  })

  it('L15: boss loopback — [300×3] → [180×5] (M1=900, Y=1080, 1 stream loops back)', () => {
    // M1 sums 3×300=900. M2←[M1(900), loopback(Y/6)].
    // M2→S1(÷2)→[Y/2×2]→S2,S3(each ÷3)→6 streams of Y/6.
    // 5 → outputs, 1 loops back to M2.
    // Y = 900 + Y/6  →  Y = 1080, each output = 180
    const graph: Graph = {
      nodes: [
        n.input('in-1', 300), n.input('in-2', 300), n.input('in-3', 300),
        n.merger('m1'), n.merger('m2'),
        n.splitter('s1'), n.splitter('s2'), n.splitter('s3'),
        n.output('out-1', 180), n.output('out-2', 180), n.output('out-3', 180),
        n.output('out-4', 180), n.output('out-5', 180),
      ],
      edges: [
        e('e1','in-1','m1'), e('e2','in-2','m1'), e('e3','in-3','m1'),
        e('e4','m1','m2'),      // 900 → m2 in-0
        e('e5','m2','s1'),      // Y → s1
        e('e6','s1','s2'),      // Y/2 → s2
        e('e7','s1','s3'),      // Y/2 → s3
        e('e8','s2','out-1'), e('e9','s2','out-2'), e('e10','s2','out-3'),
        e('e11','s3','out-4'), e('e12','s3','out-5'),
        e('e13','s3','m2'),     // loopback Y/6 → m2 in-1
      ],
    }
    const r = solveFlow(graph)
    expect(r.edgeRates['e4']).toBeCloseTo(900)   // M1 throughput
    expect(r.edgeRates['e5']).toBeCloseTo(1080)  // M2 throughput (Y)
    expect(r.edgeRates['e6']).toBeCloseTo(540)   // S1 half
    expect(r.edgeRates['e8']).toBeCloseTo(180)   // each output stream
    expect(r.edgeRates['e13']).toBeCloseTo(180)  // loopback
    expect(r.satisfied).toBe(true)
    expect(r.unstable).toBe(false)
  })

})
