import { useGameStore } from '../../store/gameStore'
import { chapters } from '../../tutorial/chapters'

export default function ChapterList() {
  const unlocked = useGameStore((s) => s.unlockedChapters)
  const completed = useGameStore((s) => s.completedChapters)
  const openChapter = useGameStore((s) => s.openChapter)

  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-mono text-amber-500 tracking-[0.2em] uppercase text-xs mb-1">
          Tutorial
        </h2>
        <h1 className="font-mono font-bold text-slate-100 text-2xl tracking-wider mb-6">
          Chapters
        </h1>

        <div className="space-y-2">
          {chapters.map((ch) => {
            const isUnlocked  = unlocked.includes(ch.id)
            const isCompleted = completed.includes(ch.id)
            return (
              <button
                key={ch.id}
                onClick={isUnlocked ? () => openChapter(ch.id) : undefined}
                disabled={!isUnlocked}
                className={[
                  'w-full text-left rounded-lg border px-4 py-3 transition-colors flex items-start gap-3',
                  isUnlocked
                    ? 'border-slate-700 bg-slate-900 hover:border-amber-500/60 hover:bg-slate-800/60 cursor-pointer'
                    : 'border-slate-800 bg-slate-900/40 cursor-not-allowed',
                ].join(' ')}
              >
                <div className={[
                  'shrink-0 w-9 h-9 rounded border flex items-center justify-center font-mono text-sm',
                  isCompleted
                    ? 'bg-green-500/10 border-green-500/40 text-green-400'
                    : isUnlocked
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-400'
                      : 'bg-slate-800/40 border-slate-700 text-slate-600',
                ].join(' ')}>
                  {isCompleted ? '✓' : isUnlocked ? ch.id : '🔒'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={[
                    'font-mono font-bold text-sm tracking-wide truncate',
                    isUnlocked ? 'text-slate-100' : 'text-slate-600',
                  ].join(' ')}>
                    {ch.title}
                  </div>
                  <div className={[
                    'font-mono text-[11px] mt-0.5 leading-relaxed',
                    isUnlocked ? 'text-slate-400' : 'text-slate-700',
                  ].join(' ')}>
                    {ch.concept}
                  </div>
                </div>
                {isCompleted && (
                  <span className="shrink-0 text-[10px] font-mono uppercase tracking-widest text-green-400/80">
                    Done
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
