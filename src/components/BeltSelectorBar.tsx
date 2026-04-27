import { useGameStore } from '../store/gameStore'
import { BELT_CAPACITY, type BeltMark } from '../types'

interface ChipPalette {
  active: string
  inactive: string
  text: string
  ring: string
}

export const BELT_PALETTE: Record<BeltMark, ChipPalette> = {
  1: { active: 'bg-slate-400',  inactive: 'bg-slate-700/40',  text: 'text-slate-300',  ring: 'ring-slate-300' },
  2: { active: 'bg-amber-400',  inactive: 'bg-amber-700/30',  text: 'text-amber-300',  ring: 'ring-amber-300' },
  3: { active: 'bg-emerald-400',inactive: 'bg-emerald-700/30',text: 'text-emerald-300',ring: 'ring-emerald-300' },
  4: { active: 'bg-sky-400',    inactive: 'bg-sky-700/30',    text: 'text-sky-300',    ring: 'ring-sky-300' },
  5: { active: 'bg-violet-400', inactive: 'bg-violet-700/30', text: 'text-violet-300', ring: 'ring-violet-300' },
  6: { active: 'bg-rose-400',   inactive: 'bg-rose-700/30',   text: 'text-rose-300',   ring: 'ring-rose-300' },
}

/** Hex stroke colors for edge rendering — must match Tailwind classes above. */
export const BELT_STROKE: Record<BeltMark, string> = {
  1: '#94a3b8', // slate-400
  2: '#fbbf24', // amber-400
  3: '#34d399', // emerald-400
  4: '#38bdf8', // sky-400
  5: '#a78bfa', // violet-400
  6: '#fb7185', // rose-400
}

interface ChipProps {
  mark: BeltMark
  label?: string
  active: boolean
  onClick: () => void
}

function Chip({ mark, label, active, onClick }: ChipProps) {
  const palette = BELT_PALETTE[mark]
  const capacity = BELT_CAPACITY[mark]
  const display = label ?? `Mk.${mark}`

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded select-none transition-colors min-w-[64px]',
        active
          ? `${palette.active} text-white ring-2 ${palette.ring} shadow-sm`
          : `${palette.inactive} ${palette.text} hover:brightness-125`,
      ].join(' ')}
      title={`${display} — ${capacity}/min  [${mark}]`}
    >
      <div className="flex items-center gap-1.5 leading-none">
        <span className="text-[11px] font-mono font-bold tracking-wide">{display}</span>
        <span className={[
          'text-[9px] font-mono',
          active ? 'text-white/80' : 'text-slate-400',
        ].join(' ')}>
          [{mark}]
        </span>
      </div>
      <div className={[
        'text-[10px] font-mono leading-none',
        active ? 'text-white/90' : 'text-slate-400',
      ].join(' ')}>
        {capacity}/min
      </div>
    </button>
  )
}

interface Props {
  /** Optional name overrides per mark, e.g. { 1: 'Yellow', 2: 'Red' }. */
  labels?: Partial<Record<BeltMark, string>>
}

export default function BeltSelectorBar({ labels }: Props) {
  const selectedMark = useGameStore((s) => s.selectedMark)
  const setSelectedMark = useGameStore((s) => s.setSelectedMark)

  const marks: BeltMark[] = [1, 2, 3, 4, 5, 6]

  return (
    <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-slate-900/90 border border-slate-700 backdrop-blur-sm shadow-lg">
      {marks.map((m) => (
        <Chip
          key={m}
          mark={m}
          label={labels?.[m]}
          active={selectedMark === m}
          onClick={() => setSelectedMark(m)}
        />
      ))}
    </div>
  )
}
