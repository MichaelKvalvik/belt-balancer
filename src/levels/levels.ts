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
]
