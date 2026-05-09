import { useGameStore } from '../store/gameStore'

export interface NodeBudgetCounts {
  /** Splitters left in the budget. `Infinity` when no budget applies. */
  splitterLeft: number
  /** Mergers left in the budget. `Infinity` when no budget applies. */
  mergerLeft: number
}

/**
 * Live splitter/merger counts derived from the current graph and node budget.
 *
 * Pass `unlimited` for screens (e.g. free play) that don't impose a budget;
 * the returned counts will be `Infinity` so palette UIs render the ∞ glyph.
 */
export function useNodeBudgetCounts(unlimited = false): NodeBudgetCounts {
  const nodes = useGameStore((s) => s.nodes)
  const nodeBudget = useGameStore((s) => s.nodeBudget)

  if (unlimited) {
    return { splitterLeft: Infinity, mergerLeft: Infinity }
  }

  const splitterUsed = nodes.filter((n) => n.type === 'splitterNode').length
  const mergerUsed   = nodes.filter((n) => n.type === 'mergerNode').length

  return {
    splitterLeft: nodeBudget.splitters - splitterUsed,
    mergerLeft:   nodeBudget.mergers   - mergerUsed,
  }
}
