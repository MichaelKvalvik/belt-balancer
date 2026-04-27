import { useGameStore } from '../../store/gameStore'

export default function PuzzlesMode() {
  const setMode = useGameStore((s) => s.setMode)
  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400 font-mono">
      <div className="text-center space-y-4">
        <div className="text-amber-500 text-xl">Puzzles — Coming in Phase 4</div>
        <button onClick={() => setMode('home')} className="text-sm underline">← Back</button>
      </div>
    </div>
  )
}
