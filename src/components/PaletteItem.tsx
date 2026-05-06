import { useGameStore, type ArmableNodeType } from '../store/gameStore'

interface PaletteItemProps {
  nodeType: ArmableNodeType
  label: string
  description: string
  /** Pass `Infinity` for unlimited items (renders ∞). */
  remaining: number
  borderClass: string
  hoverClass: string
  textClass: string
}

/**
 * Shared palette item used by every sidebar (puzzle, free play, try-it).
 *
 * Desktop: HTML5 drag-and-drop puts the type on the dataTransfer payload,
 * Canvas's onDrop handler reads it and calls addNode.
 *
 * Touch / mobile: tap to "arm" the type (toggle), then tap the canvas to
 * place. Both paths flow through the same store actions.
 */
export default function PaletteItem({
  nodeType, label, description, remaining,
  borderClass, hoverClass, textClass,
}: PaletteItemProps) {
  const armedNodeType = useGameStore((s) => s.armedNodeType)
  const armNode       = useGameStore((s) => s.armNode)

  const unlimited = !Number.isFinite(remaining)
  const disabled  = !unlimited && remaining <= 0
  const armed     = armedNodeType === nodeType

  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/reactflow', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  function onClick() {
    if (disabled) return
    armNode(armed ? null : nodeType)
  }

  return (
    <div
      draggable={!disabled}
      onDragStart={disabled ? undefined : onDragStart}
      onClick={disabled ? undefined : onClick}
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={[
        'rounded border px-2.5 py-2 transition-colors select-none',
        disabled
          ? 'border-slate-700 opacity-40 cursor-not-allowed'
          : `${borderClass} ${textClass} ${hoverClass} cursor-grab active:cursor-grabbing`,
        armed ? 'ring-2 ring-amber-400/60' : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold">{label}</span>
        <span className="text-[10px] font-mono text-slate-500">
          {disabled ? 'full' : unlimited ? '∞' : `${remaining} left`}
        </span>
      </div>
      <div className="text-[10px] font-mono text-slate-500 mt-0.5 leading-snug">
        {description}
      </div>
      {armed && (
        <div className="text-[10px] font-mono text-amber-400 mt-1 leading-snug">
          Tap canvas to place • tap again to cancel
        </div>
      )}
    </div>
  )
}
