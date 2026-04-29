import { useGameStore } from '../store/gameStore'
import { chapters } from '../tutorial/chapters'

interface ModeCardProps {
  title: string
  description: string
  badge?: string
  progress?: string
  disabled?: boolean
  onClick?: () => void
}

function ModeCard({ title, description, badge, progress, disabled, onClick }: ModeCardProps) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={[
        'group flex flex-col items-start text-left rounded-xl border bg-slate-900 px-6 py-5 w-full transition-all',
        disabled
          ? 'border-slate-800 opacity-60 cursor-not-allowed'
          : 'border-slate-700 hover:border-amber-500/60 hover:bg-slate-800/60 active:scale-[0.99] cursor-pointer',
      ].join(' ')}
    >
      <div className="flex items-center justify-between w-full mb-2">
        <h2 className={[
          'font-mono font-bold uppercase tracking-[0.18em] text-lg',
          disabled ? 'text-slate-500' : 'text-amber-400 group-hover:text-amber-300',
        ].join(' ')}>
          {title}
        </h2>
        {badge && (
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 border border-slate-700 rounded px-2 py-0.5">
            {badge}
          </span>
        )}
      </div>
      <p className="text-xs font-mono text-slate-400 leading-relaxed">
        {description}
      </p>
      {progress && (
        <div className="mt-3 text-[10px] font-mono text-slate-500 uppercase tracking-widest">
          {progress}
        </div>
      )}
    </button>
  )
}

export default function HomeScreen() {
  const setMode = useGameStore((s) => s.setMode)
  const completedChapters = useGameStore((s) => s.completedChapters)

  const totalChapters = chapters.length
  const completedCount = completedChapters.length
  const progressLabel = `${completedCount} of ${totalChapters} chapters complete`

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-auto">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <header className="mb-10 text-center">
            <h1 className="font-mono font-bold text-amber-500 tracking-[0.32em] text-3xl uppercase mb-2">
              Belt Balancer
            </h1>
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em]">
              Throughput puzzles for the patient
            </div>
          </header>

          <div className="space-y-3">
            <ModeCard
              title="Tutorial"
              description="Learn belt balancing step by step"
              progress={progressLabel}
              onClick={() => setMode('tutorial')}
            />
            <ModeCard
              title="Puzzles"
              description="Challenge yourself with generated puzzles"
              onClick={() => setMode('puzzles')}
            />
            <ModeCard
              title="Free Play"
              description="Build your own belt network"
              badge="Coming soon"
              disabled
            />
          </div>
        </div>
      </div>
    </div>
  )
}
