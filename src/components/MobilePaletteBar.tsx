import { useGameStore, type ArmableNodeType } from '../store/gameStore'

interface Props {
  splitterRemaining: number
  mergerRemaining: number
  /** Whether to show the Temp Input button. */
  showTempInput: boolean
}

interface ButtonSpec {
  type: ArmableNodeType
  label: string
  glyph: string
  remaining: number
  borderClass: string
  textClass: string
  bgClass: string
  activeBgClass: string
}

/**
 * Always-visible mobile palette pinned next to the action bar. Tap a button
 * to arm a node type, then tap the canvas to drop. Tapping an armed button
 * disarms it. Renders only at `< md` (the parent gates this).
 */
export default function MobilePaletteBar({ splitterRemaining, mergerRemaining, showTempInput }: Props) {
  const armedNodeType = useGameStore((s) => s.armedNodeType)
  const armNode       = useGameStore((s) => s.armNode)

  const buttons: ButtonSpec[] = [
    {
      type: 'splitterNode',
      label: 'Split',
      glyph: '⊥',
      remaining: splitterRemaining,
      borderClass: 'border-orange-500/50',
      textClass: 'text-orange-300',
      bgClass: 'bg-slate-900/0',
      activeBgClass: 'bg-orange-500/15',
    },
    {
      type: 'mergerNode',
      label: 'Merge',
      glyph: '⊤',
      remaining: mergerRemaining,
      borderClass: 'border-sky-500/50',
      textClass: 'text-sky-300',
      bgClass: 'bg-slate-900/0',
      activeBgClass: 'bg-sky-500/15',
    },
  ]
  if (showTempInput) {
    buttons.push({
      type: 'tempInputNode',
      label: 'Temp',
      glyph: '⚡',
      remaining: Infinity,
      borderClass: 'border-amber-400/50 border-dashed',
      textClass: 'text-amber-300',
      bgClass: 'bg-slate-900/0',
      activeBgClass: 'bg-amber-500/15',
    })
  }

  return (
    <div className="relative flex items-center gap-2 px-2 py-1.5 rounded-md bg-slate-900/95 border border-slate-700 backdrop-blur-sm shadow-lg">
      {buttons.map((b) => {
        const unlimited = !Number.isFinite(b.remaining)
        const disabled  = !unlimited && b.remaining <= 0
        const armed     = armedNodeType === b.type
        return (
          <button
            key={b.type}
            type="button"
            onClick={() => { if (!disabled) armNode(armed ? null : b.type) }}
            disabled={disabled}
            title={disabled ? `${b.label} — full` : `${b.label}${unlimited ? '' : ` — ${b.remaining} left`}`}
            className={[
              'relative min-w-[56px] min-h-[56px] rounded border flex flex-col items-center justify-center select-none transition-colors',
              disabled
                ? 'border-slate-700 text-slate-600 opacity-50 cursor-not-allowed'
                : `${b.borderClass} ${b.textClass} ${armed ? b.activeBgClass : b.bgClass} hover:brightness-125`,
              armed ? 'ring-2 ring-amber-400/70' : '',
            ].join(' ')}
            aria-pressed={armed}
            aria-label={b.label}
          >
            <span className="text-base leading-none font-mono font-bold">{b.glyph}</span>
            <span className="text-[10px] font-mono leading-none mt-0.5">{b.label}</span>
            <span className={[
              'absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-mono font-bold flex items-center justify-center',
              disabled
                ? 'bg-slate-800 text-slate-500 border border-slate-700'
                : 'bg-slate-800 text-slate-300 border border-slate-600',
            ].join(' ')}>
              {disabled ? '0' : unlimited ? '∞' : b.remaining}
            </span>
          </button>
        )
      })}
      {armedNodeType && buttons.some((b) => b.type === armedNodeType) && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono text-amber-300 bg-slate-900/90 border border-amber-500/40 rounded px-2 py-0.5 shadow">
          Tap canvas to place
        </div>
      )}
    </div>
  )
}
