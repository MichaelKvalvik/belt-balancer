import { useGameStore } from '../store/gameStore'
import { nextRotation, type Rotation } from '../utils/rotation'

interface Props {
  /** Show the Validate button (true for level/puzzle, false for free play). */
  showValidate: boolean
}

/**
 * Floating action bar pinned above the bottom-sheet peek strip on mobile.
 * Replaces keyboard shortcuts (rotate, undo, delete, validate) with finger-
 * friendly buttons. Renders only at `< md` (the parent gates this).
 */
export default function MobileActionBar({ showValidate }: Props) {
  const nodes        = useGameStore((s) => s.nodes)
  const edges        = useGameStore((s) => s.edges)
  const history      = useGameStore((s) => s.history)
  const undo         = useGameStore((s) => s.undo)
  const deleteSelected = useGameStore((s) => s.deleteSelected)
  const validate     = useGameStore((s) => s.validate)
  const rotateNode   = useGameStore((s) => s.rotateNode)

  const selectedRotatable = nodes.filter(
    (n) => n.selected && (n.type === 'splitterNode' || n.type === 'mergerNode'),
  )
  const hasSelection = nodes.some((n) => n.selected) || edges.some((e) => e.selected)
  const canUndo  = history.length > 0
  const canRotate = selectedRotatable.length > 0

  function onRotate() {
    for (const n of selectedRotatable) {
      const isConnected = edges.some((e) => e.source === n.id || e.target === n.id)
      if (isConnected) continue
      const cur = ((n.data as { rotation?: number }).rotation ?? 0) as Rotation
      rotateNode(n.id, nextRotation(cur))
    }
  }

  // Hide entirely if there's nothing to show.
  if (!showValidate && !canRotate && !canUndo && !hasSelection) return null

  return (
    <div
      className="md:hidden fixed bottom-[60px] left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-2 py-1.5 rounded-md bg-slate-900/95 border border-slate-700 backdrop-blur-sm shadow-lg"
    >
      {canRotate && (
        <button
          onClick={onRotate}
          className="min-w-[44px] min-h-[44px] text-xs font-mono px-2 rounded border border-slate-600 text-slate-200 hover:bg-slate-800"
          title="Rotate selected"
        >
          ↻
        </button>
      )}
      {canUndo && (
        <button
          onClick={undo}
          className="min-w-[44px] min-h-[44px] text-xs font-mono px-2 rounded border border-slate-600 text-slate-200 hover:bg-slate-800"
          title="Undo"
        >
          ↶
        </button>
      )}
      {hasSelection && (
        <button
          onClick={deleteSelected}
          className="min-w-[44px] min-h-[44px] text-xs font-mono px-2 rounded border border-slate-600 text-red-300 hover:bg-red-950/30"
          title="Delete selected"
        >
          ✕
        </button>
      )}
      {showValidate && (
        <button
          onClick={validate}
          className="min-w-[44px] min-h-[44px] text-xs font-mono font-bold px-3 rounded border border-amber-500/60 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
        >
          Validate
        </button>
      )}
    </div>
  )
}
