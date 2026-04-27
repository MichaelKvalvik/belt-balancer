import { useState } from 'react'
import Canvas from '../Canvas'
import WinModal from '../WinModal'
import OnboardingCoachmark from '../OnboardingCoachmark'
import Codex from '../Codex'
import BeltSelectorBar from '../BeltSelectorBar'
import PuzzleSidebar from '../PuzzleSidebar'
import { useGameStore } from '../../store/gameStore'
import { levels } from '../../levels/levels'

export default function TutorialMode() {
  const [showCodex, setShowCodex] = useState(false)

  const {
    flowResult,
    currentLevelId,
    completedLevelIds,
    showWinModal,
    history,
    validate,
    resetGraph,
    loadLevel,
    dismissWin,
    undo,
    deleteSelected,
    setMode,
  } = useGameStore()

  const currentLevel = levels.find((l) => l.id === currentLevelId)

  function handleNext() {
    const nextId = currentLevelId + 1
    if (nextId <= levels.length) loadLevel(nextId)
    dismissWin()
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">

      {/* Overlays */}
      {showWinModal && (
        <WinModal levelId={currentLevelId} onNext={handleNext} onClose={dismissWin} />
      )}
      {showCodex && <Codex onClose={() => setShowCodex(false)} />}
      <OnboardingCoachmark />

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 h-11 px-4 bg-slate-900 border-b border-slate-700 shrink-0 z-10">
        <button
          onClick={() => setMode('home')}
          className="text-xs font-mono text-slate-400 hover:text-amber-400 transition-colors"
          title="Back to home"
        >
          ← Back
        </button>
        <div className="h-4 w-px bg-slate-700" />
        <h1 className="font-mono font-bold text-amber-500 tracking-[0.2em] text-base uppercase">
          Belt Balancer
        </h1>
        <div className="h-4 w-px bg-slate-700" />
        {currentLevel && (
          <span className="text-xs text-slate-400 font-mono">
            Level {currentLevel.id} — {currentLevel.title}
          </span>
        )}

        <div className="flex-1" />

        {/* Solver result badge */}
        {flowResult && (
          <div className={[
            'flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold border',
            flowResult.satisfied
              ? 'text-green-400 bg-green-500/10 border-green-500/30'
              : 'text-red-400 bg-red-500/10 border-red-500/30',
          ].join(' ')}>
            {flowResult.satisfied ? '✓ Solved' : '✗ Unsolved'}
          </div>
        )}
        {flowResult?.unstable && (
          <div className="text-xs font-mono text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded">
            ⚠ Unstable
          </div>
        )}

        <button
          onClick={undo}
          disabled={history.length === 0}
          className="px-3 py-1 text-xs font-mono rounded border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          onClick={deleteSelected}
          className="px-3 py-1 text-xs font-mono rounded border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors"
          title="Delete selected (Del)"
        >
          Delete
        </button>
        <button
          onClick={validate}
          className="px-3 py-1 text-xs font-mono rounded border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 active:bg-amber-500/20 transition-colors"
        >
          Validate
        </button>
        <button
          onClick={resetGraph}
          className="px-3 py-1 text-xs font-mono rounded border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors"
        >
          Reset
        </button>
        <button
          onClick={() => setShowCodex(true)}
          className="px-3 py-1 text-xs font-mono rounded border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors"
        >
          Codex
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar: level list ─────────────────────────────── */}
        <aside className="w-44 bg-slate-900 border-r border-slate-700 shrink-0 flex flex-col">
          <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
            Levels
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {levels.map((lvl) => {
              const isCurrent   = lvl.id === currentLevelId
              const isCompleted = completedLevelIds.includes(lvl.id)
              return (
                <button
                  key={lvl.id}
                  onClick={() => loadLevel(lvl.id)}
                  className={[
                    'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors',
                    isCurrent
                      ? 'bg-amber-500/10 border border-amber-500/30'
                      : 'border border-transparent hover:bg-slate-800',
                  ].join(' ')}
                >
                  <span className={[
                    'text-[10px] font-mono w-4 shrink-0',
                    isCurrent ? 'text-amber-400' : 'text-slate-500',
                  ].join(' ')}>
                    {String(lvl.id).padStart(2, '0')}
                  </span>
                  <span className={[
                    'text-xs font-mono truncate flex-1',
                    isCurrent ? 'text-amber-300' : 'text-slate-400',
                  ].join(' ')}>
                    {lvl.title}
                  </span>
                  {isCompleted && (
                    <span className="text-green-400 text-[10px] shrink-0">✓</span>
                  )}
                </button>
              )
            })}
          </div>
        </aside>

        {/* ── Main canvas ──────────────────────────────────────────── */}
        <main className="flex-1 relative overflow-hidden" data-tutorial="canvas">
          <Canvas />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 sm:bottom-4 max-w-full overflow-x-auto">
            <BeltSelectorBar />
          </div>
        </main>

        {/* ── Right sidebar ────────────────────────────────────────── */}
        <PuzzleSidebar />
      </div>
    </div>
  )
}
