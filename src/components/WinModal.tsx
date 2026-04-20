import { levels } from '../levels/levels'

interface WinModalProps {
  levelId: number
  onNext: () => void
  onClose: () => void
}

export default function WinModal({ levelId, onNext, onClose }: WinModalProps) {
  const level = levels.find((l) => l.id === levelId)
  const isLast = levelId >= levels.length

  return (
    /* Backdrop — click outside to dismiss */
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      {/* Card */}
      <div
        className="bg-slate-800 border border-green-500/40 rounded-2xl p-8 text-center w-80 shadow-2xl shadow-green-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Checkmark */}
        <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/40 flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl text-green-400 font-bold">✓</span>
        </div>

        <div className="text-lg font-mono font-bold text-green-400 mb-0.5">
          Level {levelId} Complete!
        </div>
        {level && (
          <div className="text-sm font-mono text-slate-400 mb-4">{level.title}</div>
        )}

        <div className="text-xs text-slate-500 font-mono mb-6 leading-relaxed">
          {isLast
            ? 'You\'ve solved all available levels.\nMore coming soon!'
            : 'Belt balanced. Ready for the next challenge?'}
        </div>

        <div className="flex gap-3 justify-center">
          {!isLast && (
            <button
              onClick={onNext}
              className="
                px-4 py-2 text-sm font-mono font-bold rounded-lg
                border border-amber-500/60 text-amber-400
                bg-amber-500/10 hover:bg-amber-500/20
                active:scale-95 transition-all
              "
            >
              Next Level →
            </button>
          )}
          <button
            onClick={onClose}
            className="
              px-4 py-2 text-sm font-mono rounded-lg
              border border-slate-600 text-slate-400
              hover:bg-slate-700 active:scale-95 transition-all
            "
          >
            Keep Playing
          </button>
        </div>
      </div>
    </div>
  )
}
