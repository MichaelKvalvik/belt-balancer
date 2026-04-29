import { useGameStore } from '../../store/gameStore'
import type { Difficulty } from '../../types'

interface CardProps {
  difficulty: Difficulty
  title: string
  description: string
  badgeColor: string
  onPick: (d: Difficulty) => void
}

function Card({ difficulty, title, description, badgeColor, onPick }: CardProps) {
  return (
    <button
      onClick={() => onPick(difficulty)}
      className="
        group flex flex-col items-start text-left rounded-xl border bg-slate-900 px-6 py-5 w-full transition-all
        border-slate-700 hover:border-amber-500/60 hover:bg-slate-800/60 active:scale-[0.99] cursor-pointer
      "
    >
      <div className="flex items-center justify-between w-full mb-2">
        <h2 className="font-mono font-bold uppercase tracking-[0.18em] text-lg text-amber-400 group-hover:text-amber-300">
          {title}
        </h2>
        <span className={`text-[10px] font-mono uppercase tracking-widest border rounded px-2 py-0.5 ${badgeColor}`}>
          {difficulty}
        </span>
      </div>
      <p className="text-xs font-mono text-slate-400 leading-relaxed">{description}</p>
    </button>
  )
}

export default function DifficultyPicker() {
  const setMode = useGameStore((s) => s.setMode)
  const loadGeneratedPuzzle = useGameStore((s) => s.loadGeneratedPuzzle)

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-auto">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <header className="mb-10 text-center">
            <h1 className="font-mono font-bold text-amber-500 tracking-[0.32em] text-3xl uppercase mb-2">
              Pick a Difficulty
            </h1>
            <div className="text-[11px] font-mono text-slate-500 uppercase tracking-[0.2em]">
              A fresh puzzle is generated each time
            </div>
          </header>

          <div className="space-y-3">
            <Card
              difficulty="easy"
              title="Easy"
              description="2–3 outputs, small numbers, no loopbacks. Great warm-up."
              badgeColor="text-green-400 border-green-700"
              onPick={loadGeneratedPuzzle}
            />
            <Card
              difficulty="normal"
              title="Normal"
              description="3–4 outputs, bigger ratios, merges required."
              badgeColor="text-amber-400 border-amber-700"
              onPick={loadGeneratedPuzzle}
            />
            <Card
              difficulty="hard"
              title="Hard"
              description="3–5 outputs, one loopback, tighter constraints."
              badgeColor="text-orange-400 border-orange-700"
              onPick={loadGeneratedPuzzle}
            />
            <Card
              difficulty="expert"
              title="Expert"
              description="4–6 outputs, nested loopbacks, any belt tier. No hand-holding."
              badgeColor="text-red-400 border-red-700"
              onPick={loadGeneratedPuzzle}
            />
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setMode('home')}
              className="text-xs font-mono text-slate-500 hover:text-amber-400 transition-colors"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
