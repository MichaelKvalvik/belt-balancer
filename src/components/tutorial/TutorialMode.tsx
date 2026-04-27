import { useGameStore } from '../../store/gameStore'
import ChapterList from './ChapterList'
import ChapterPlayer from './ChapterPlayer'

export default function TutorialMode() {
  const currentChapterId = useGameStore((s) => s.currentChapterId)
  const setMode = useGameStore((s) => s.setMode)

  if (currentChapterId == null) {
    return (
      <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">
        <header className="flex items-center gap-3 h-11 px-4 bg-slate-900 border-b border-slate-700 shrink-0">
          <button
            onClick={() => setMode('home')}
            className="text-xs font-mono text-slate-400 hover:text-amber-400 transition-colors"
          >
            ← Home
          </button>
          <div className="h-4 w-px bg-slate-700" />
          <h1 className="font-mono font-bold text-amber-500 tracking-[0.2em] text-base uppercase">
            Belt Balancer
          </h1>
        </header>
        <ChapterList />
      </div>
    )
  }

  return <ChapterPlayer />
}
