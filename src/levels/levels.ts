/**
 * Level definitions — pure data, no React or game-engine imports.
 *
 * Adding a new level: append an entry here. The rest of the game
 * reads this array; no component changes are needed.
 *
 * Position coordinates are in React Flow canvas units (pixels at 1× zoom).
 * Use fitView; exact values only matter relative to each other.
 */

import type { LevelDef } from '../types'

export const levels: LevelDef[] = [

  // ── 1. First Split ───────────────────────────────────────────────────────
  {
    id: 1,
    title: 'First Split',
    introText:
      'Your factory produces 60 items/min on one belt. ' +
      'Two downstream machines each need 30/min. ' +
      'Place a Splitter to divide the flow.',
    inputs: [
      { id: 'in-1', rate: 60, position: { x: 80, y: 140 } },
    ],
    outputs: [
      { id: 'out-1', targetRate: 30, position: { x: 480, y: 60 } },
      { id: 'out-2', targetRate: 30, position: { x: 480, y: 220 } },
    ],
    nodeBudget: { splitters: 1, mergers: 0 },
    hints: [
      'You need exactly one node from the palette.',
      'A Splitter divides its incoming rate equally among all connected outputs.',
      'Place a Splitter in the middle. Wire: Input → Splitter → both Outputs.',
    ],
  },

  // ── 2. Thirds ────────────────────────────────────────────────────────────
  {
    id: 2,
    title: 'Thirds',
    introText:
      '60 items/min — now three machines each need 20/min. ' +
      'A Splitter has three output ports; try using all of them.',
    inputs: [
      { id: 'in-1', rate: 60, position: { x: 80, y: 160 } },
    ],
    outputs: [
      { id: 'out-1', targetRate: 20, position: { x: 480, y: 40 } },
      { id: 'out-2', targetRate: 20, position: { x: 480, y: 160 } },
      { id: 'out-3', targetRate: 20, position: { x: 480, y: 280 } },
    ],
    nodeBudget: { splitters: 1, mergers: 0 },
    hints: [
      'A Splitter has three output ports on its right side.',
      'The split ratio depends on how many outputs are connected — 3 connected = 1/3 each.',
      'One Splitter, all three outputs wired → 60 ÷ 3 = 20/min each.',
    ],
  },

  // ── 3. Four Belts ────────────────────────────────────────────────────────
  {
    id: 3,
    title: 'Four Belts',
    introText:
      '120 items/min needs to feed four machines equally at 30/min each. ' +
      'One Splitter can only produce up to three outputs — you\'ll need to chain them.',
    inputs: [
      { id: 'in-1', rate: 120, position: { x: 80, y: 220 } },
    ],
    outputs: [
      { id: 'out-1', targetRate: 30, position: { x: 560, y: 40 } },
      { id: 'out-2', targetRate: 30, position: { x: 560, y: 160 } },
      { id: 'out-3', targetRate: 30, position: { x: 560, y: 280 } },
      { id: 'out-4', targetRate: 30, position: { x: 560, y: 400 } },
    ],
    nodeBudget: { splitters: 3, mergers: 0 },
    hints: [
      'Think in stages: first halve 120 into two 60s, then halve each 60.',
      '120 → S1(2 outputs) → [60, 60]. Each 60 → its own Splitter(2 outputs) → [30, 30].',
      'S1: 120 → 60 + 60.  S2: 60 → 30 + 30.  S3: 60 → 30 + 30.  Total: 3 splitters.',
    ],
  },

  // ── 4. Two Into One ──────────────────────────────────────────────────────
  {
    id: 4,
    title: 'Two Into One',
    introText:
      'Two belts each carrying 60/min need to combine into a single 120/min belt. ' +
      'This is what a Merger is for.',
    inputs: [
      { id: 'in-1', rate: 60, position: { x: 80, y: 80 } },
      { id: 'in-2', rate: 60, position: { x: 80, y: 300 } },
    ],
    outputs: [
      { id: 'out-1', targetRate: 120, position: { x: 520, y: 190 } },
    ],
    nodeBudget: { splitters: 0, mergers: 1 },
    hints: [
      'You need a different node type this time — check the palette.',
      'A Merger sums all its connected inputs into one output.',
      'Place one Merger. Connect both Inputs to its left ports, then its right port to the Output.',
    ],
  },

  // ── 5. Uneven Split ──────────────────────────────────────────────────────
  {
    id: 5,
    title: 'Uneven Split',
    introText:
      '60 items/min needs to become 45/min and 15/min. ' +
      'Equal splits give you 30 + 30 or 20 + 20 + 20 — neither is right. ' +
      'You\'ll need to split, then recombine.',
    inputs: [
      { id: 'in-1', rate: 60, position: { x: 80, y: 180 } },
    ],
    outputs: [
      { id: 'out-1', targetRate: 45, position: { x: 580, y: 80 } },
      { id: 'out-2', targetRate: 15, position: { x: 580, y: 300 } },
    ],
    nodeBudget: { splitters: 2, mergers: 1 },
    hints: [
      'Notice: 45 = 30 + 15, and 15 = 30 ÷ 2. You can reach 30 easily with one Splitter.',
      'Split 60 → 30 + 30. Split one of the 30s → 15 + 15. Merge one 30 with one 15 to get 45.',
      'S1: 60 → [30 → Merger, 30 → S2].  S2: 30 → [15 → Merger, 15 → out-2].  Merger → 45 → out-1.',
    ],
  },

  // ── 6. Consolidate ───────────────────────────────────────────────────────
  {
    id: 6,
    title: 'Consolidate',
    introText:
      'Two input belts, each running at 120/min, need to supply three machines ' +
      'at 80/min each. You\'ve merged before, and you\'ve split before — ' +
      'now you need to do both.',
    inputs: [
      { id: 'in-1', rate: 120, position: { x: 80, y: 100 } },
      { id: 'in-2', rate: 120, position: { x: 80, y: 280 } },
    ],
    outputs: [
      { id: 'out-1', targetRate: 80, position: { x: 500, y: 60 } },
      { id: 'out-2', targetRate: 80, position: { x: 500, y: 200 } },
      { id: 'out-3', targetRate: 80, position: { x: 500, y: 340 } },
    ],
    nodeBudget: { splitters: 1, mergers: 1 },
    hints: [
      'You have two inputs and need three outputs. One node type combines; the other divides.',
      'Merge the two 120/min belts first. What does 120 + 120 give you, and can that be split evenly?',
      'Merger(120+120=240) → Splitter(÷3) → [80, 80, 80].',
    ],
  },

  // ── 7. Five Ways ─────────────────────────────────────────────────────────
  {
    id: 7,
    title: 'Five Ways',
    introText:
      'One belt at 300/min feeds five machines, each requiring 60/min. ' +
      'Splitters only divide by 2 or 3 — and 5 is neither. ' +
      'Think about what happens if you route one output wire back to the start.',
    inputs: [
      { id: 'in-1', rate: 300, position: { x: 80, y: 260 } },
    ],
    outputs: [
      { id: 'out-1', targetRate: 60, position: { x: 560, y: 40 } },
      { id: 'out-2', targetRate: 60, position: { x: 560, y: 140 } },
      { id: 'out-3', targetRate: 60, position: { x: 560, y: 240 } },
      { id: 'out-4', targetRate: 60, position: { x: 560, y: 340 } },
      { id: 'out-5', targetRate: 60, position: { x: 560, y: 440 } },
    ],
    nodeBudget: { splitters: 3, mergers: 1 },
    hints: [
      '5 is not a product of 2s and 3s — splitting directly into 5 equal parts is impossible with these nodes.',
      'What if one output wire looped back as a second input to the Merger? The system would self-balance.',
      'Merger(300 + loopback 60) → Splitter(÷2) → two Splitters(each ÷3) → 6 outputs of 60. Wire one back, keep five. Internal flow: 360/min.',
    ],
  },

  // ── 8. Six Pack ──────────────────────────────────────────────────────────
  {
    id: 8,
    title: 'Six Pack',
    introText:
      '360/min needs to supply six machines at 60/min each. ' +
      'No merging required this time — just find the right chain of splits.',
    inputs: [
      { id: 'in-1', rate: 360, position: { x: 80, y: 280 } },
    ],
    outputs: [
      { id: 'out-1', targetRate: 60, position: { x: 600, y: 40 } },
      { id: 'out-2', targetRate: 60, position: { x: 600, y: 120 } },
      { id: 'out-3', targetRate: 60, position: { x: 600, y: 200 } },
      { id: 'out-4', targetRate: 60, position: { x: 600, y: 280 } },
      { id: 'out-5', targetRate: 60, position: { x: 600, y: 360 } },
      { id: 'out-6', targetRate: 60, position: { x: 600, y: 440 } },
    ],
    nodeBudget: { splitters: 4, mergers: 0 },
    hints: [
      'Think in two stages: first break the flow into thirds, then halve each third.',
      '360 ÷ 3 = 120. Three belts at 120/min — now split each one in half.',
      'Splitter(÷3) → [120, 120, 120] → three Splitters(each ÷2) → six 60s.',
    ],
  },

  // ── 9. Pool Party ────────────────────────────────────────────────────────
  {
    id: 9,
    title: 'Pool Party',
    introText:
      'Four separate input belts, each running at 120/min, need to feed ' +
      'three machines at 160/min each. ' +
      'A single Merger can\'t handle all four inputs at once — you\'ll need to chain.',
    inputs: [
      { id: 'in-1', rate: 120, position: { x: 80, y: 60 } },
      { id: 'in-2', rate: 120, position: { x: 80, y: 180 } },
      { id: 'in-3', rate: 120, position: { x: 80, y: 300 } },
      { id: 'in-4', rate: 120, position: { x: 80, y: 420 } },
    ],
    outputs: [
      { id: 'out-1', targetRate: 160, position: { x: 560, y: 140 } },
      { id: 'out-2', targetRate: 160, position: { x: 560, y: 280 } },
      { id: 'out-3', targetRate: 160, position: { x: 560, y: 420 } },
    ],
    nodeBudget: { splitters: 1, mergers: 2 },
    hints: [
      'A Merger has three input ports — but you have four belts. You\'ll need two Mergers.',
      'Feed three inputs into one Merger, then merge that result with the fourth belt.',
      'Merger1(120+120+120=360) → Merger2(360+120=480) → Splitter(÷3) → [160, 160, 160].',
    ],
  },

  // ── 10. Cascade ──────────────────────────────────────────────────────────
  {
    id: 10,
    title: 'Cascade',
    introText:
      'One 360/min belt must supply three machines at very different rates: ' +
      '180, 120, and 60/min. The outputs aren\'t equal — ' +
      'you\'ll need to split carefully and recombine.',
    inputs: [
      { id: 'in-1', rate: 360, position: { x: 80, y: 200 } },
    ],
    outputs: [
      { id: 'out-1', targetRate: 180, position: { x: 540, y: 80 } },
      { id: 'out-2', targetRate: 120, position: { x: 540, y: 220 } },
      { id: 'out-3', targetRate: 60,  position: { x: 540, y: 360 } },
    ],
    nodeBudget: { splitters: 2, mergers: 1 },
    hints: [
      'Three different output rates — notice that 60 and 120 are both fractions of 180.',
      'Split 360 in half. Keep one half as an output. Then split the other half into thirds and recombine two of them.',
      'Splitter(÷2) → [180, 180]. Keep one 180. Splitter(180÷3) → [60, 60, 60]. Merger(60+60=120). Keep one 60.',
    ],
  },

  // ── 11. Imbalance ────────────────────────────────────────────────────────
  {
    id: 11,
    title: 'Imbalance',
    introText:
      'Two belts arrive at different rates: 480 and 240/min. ' +
      'Three downstream machines each need exactly 240/min. ' +
      'Splitting the inputs independently won\'t produce equal outputs.',
    inputs: [
      { id: 'in-1', rate: 480, position: { x: 80, y: 80 } },
      { id: 'in-2', rate: 240, position: { x: 80, y: 280 } },
    ],
    outputs: [
      { id: 'out-1', targetRate: 240, position: { x: 520, y: 60 } },
      { id: 'out-2', targetRate: 240, position: { x: 520, y: 200 } },
      { id: 'out-3', targetRate: 240, position: { x: 520, y: 340 } },
    ],
    nodeBudget: { splitters: 1, mergers: 1 },
    hints: [
      'The two input rates are unequal — splitting them independently won\'t give equal outputs.',
      'What if you combined both inputs first? 480 + 240 = ?',
      'Merger(480+240=720) → Splitter(÷3) → [240, 240, 240].',
    ],
  },

  // ── 12. Seven Ways ───────────────────────────────────────────────────────
  {
    id: 12,
    title: 'Seven Ways',
    introText:
      '420/min, seven machines at 60/min each. ' +
      '7 is prime — like the five-way problem, a direct equal split is impossible. ' +
      'This time you\'ll need two feedback wires, and all three Merger input ports will be in use.',
    inputs: [
      { id: 'in-1', rate: 420, position: { x: 80, y: 260 } },
    ],
    outputs: [
      { id: 'out-1', targetRate: 60, position: { x: 620, y: 40 } },
      { id: 'out-2', targetRate: 60, position: { x: 620, y: 110 } },
      { id: 'out-3', targetRate: 60, position: { x: 620, y: 180 } },
      { id: 'out-4', targetRate: 60, position: { x: 620, y: 250 } },
      { id: 'out-5', targetRate: 60, position: { x: 620, y: 320 } },
      { id: 'out-6', targetRate: 60, position: { x: 620, y: 390 } },
      { id: 'out-7', targetRate: 60, position: { x: 620, y: 460 } },
    ],
    nodeBudget: { splitters: 4, mergers: 1 },
    hints: [
      '7 is prime — like level 7, a direct equal split is impossible. You\'ll need a loopback.',
      'To get 9 equal streams, use one 3-way split then three more 3-way splits. Two of the nine loop back — filling all three Merger input ports.',
      'Merger(420+60+60=540) → Splitter(÷3) → three Splitters(each ÷3) → 9×60. Wire two back to the Merger\'s remaining input ports. Send seven out.',
    ],
  },

  // ── 13. Refinement ───────────────────────────────────────────────────────
  {
    id: 13,
    title: 'Refinement',
    introText:
      '450/min splits unevenly: one machine needs 150/min and three need 100/min each. ' +
      'The first split is straightforward — ' +
      'what you do with the remainder is the puzzle.',
    inputs: [
      { id: 'in-1', rate: 450, position: { x: 80, y: 220 } },
    ],
    outputs: [
      { id: 'out-1', targetRate: 150, position: { x: 560, y: 60 } },
      { id: 'out-2', targetRate: 100, position: { x: 560, y: 180 } },
      { id: 'out-3', targetRate: 100, position: { x: 560, y: 300 } },
      { id: 'out-4', targetRate: 100, position: { x: 560, y: 420 } },
    ],
    nodeBudget: { splitters: 2, mergers: 1 },
    hints: [
      '450 ÷ 3 = 150. One output is a clean third — take it. What\'s left over?',
      'After keeping one 150 as an output, merge the other two 150s. What can that total be split into?',
      'Splitter(÷3) → [150, 150, 150]. Keep one. Merger(150+150=300) → Splitter(÷3) → [100, 100, 100].',
    ],
  },

  // ── 14. Full Mix ─────────────────────────────────────────────────────────
  {
    id: 14,
    title: 'Full Mix',
    introText:
      'A 480/min belt — Mk.4 belt capacity — must supply four machines ' +
      'at 240, 120, 80, and 40/min. ' +
      'Each output is a specific fraction of the whole. Work top-down.',
    inputs: [
      { id: 'in-1', rate: 480, position: { x: 80, y: 220 } },
    ],
    outputs: [
      { id: 'out-1', targetRate: 240, position: { x: 560, y: 60 } },
      { id: 'out-2', targetRate: 120, position: { x: 560, y: 180 } },
      { id: 'out-3', targetRate: 80,  position: { x: 560, y: 300 } },
      { id: 'out-4', targetRate: 40,  position: { x: 560, y: 420 } },
    ],
    nodeBudget: { splitters: 3, mergers: 1 },
    hints: [
      'Start with the largest output. 480 ÷ 2 = 240. Keep that belt, then keep working down.',
      'Each step produces one output and one remainder to split further: 480→240 and 240→120 and 120→?',
      '÷2→keep 240; ÷2→keep 120; ÷3→merge two 40s→80, keep one 40. Outputs: 240, 120, 80, 40.',
    ],
  },

  // ── 15. Grand Finale ─────────────────────────────────────────────────────
  {
    id: 15,
    title: 'Grand Finale',
    introText:
      'Three 300/min input belts. Five machines each needing 180/min. ' +
      'You\'ll need to pool all three inputs, then apply the feedback loop — ' +
      'at twice the scale of level 7. ' +
      '900 ÷ 5 = 180. Build it.',
    inputs: [
      { id: 'in-1', rate: 300, position: { x: 80, y: 140 } },
      { id: 'in-2', rate: 300, position: { x: 80, y: 300 } },
      { id: 'in-3', rate: 300, position: { x: 80, y: 460 } },
    ],
    outputs: [
      { id: 'out-1', targetRate: 180, position: { x: 620, y: 80 } },
      { id: 'out-2', targetRate: 180, position: { x: 620, y: 190 } },
      { id: 'out-3', targetRate: 180, position: { x: 620, y: 300 } },
      { id: 'out-4', targetRate: 180, position: { x: 620, y: 410 } },
      { id: 'out-5', targetRate: 180, position: { x: 620, y: 520 } },
    ],
    nodeBudget: { splitters: 3, mergers: 2 },
    hints: [
      'Start by pooling all three 300/min inputs. A single Merger has three input ports — just enough.',
      'Once you have 900/min combined, the structure is identical to level 7. Feed it into a second Merger with a loopback.',
      'Merger1(300+300+300=900) → Merger2(900+loopback 180) → Splitter(÷2) → two Splitters(each ÷3) → 6×180. Wire one back, keep five. Internal: 1080/min.',
    ],
  },
]
