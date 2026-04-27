import { useState } from 'react'
import Canvas from './components/Canvas'
import WinModal from './components/WinModal'
import Tutorial from './components/Tutorial'
import Codex from './components/Codex'
import BlueprintPanel from './components/BlueprintPanel'
import BeltSelectorBar from './components/BeltSelectorBar'
import { useGameStore } from './store/gameStore'
import { levels } from './levels/levels'

// ── Palette drag item ─────────────────────────────────────────────────────

interface PaletteItemProps {
  nodeType: string
  label: string
  description: string
  remaining: number
  borderClass: string
  hoverClass: string
  textClass: string
}

function PaletteItem({
  nodeType, label, description, remaining,
  borderClass, hoverClass, textClass,
}: PaletteItemProps) {
  const disabled = remaining <= 0

  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/reactflow', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div
      draggable={!disabled}
      onDragStart={disabled ? undefined : onDragStart}
      className={[
        'rounded border px-2.5 py-2 transition-colors select-none',
        disabled
          ? 'border-slate-700 opacity-40 cursor-not-allowed'
          : `${borderClass} ${textClass} ${hoverClass} cursor-grab active:cursor-grabbing`,
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold">{label}</span>
        <span className="text-[10px] font-mono text-slate-500">
          {disabled ? 'full' : `${remaining} left`}
        </span>
      </div>
      <div className="text-[10px] font-mono text-slate-500 mt-0.5 leading-snug">
        {description}
      </div>
    </div>
  )
}

// ── Hint ladder ───────────────────────────────────────────────────────────

function HintSection({
  hints,
  hintsRevealed,
  onReveal,
  onShowSolution,
}: {
  hints: [string, string, string]
  hintsRevealed: number
  onReveal: () => void
  onShowSolution: () => void
}) {
  return (
    <div className="p-3 space-y-2">
      {hints.slice(0, hintsRevealed).map((hint, i) => (
        <div
          key={i}
          className="text-[11px] font-mono text-slate-400 bg-slate-800/80 rounded p-2 leading-relaxed border border-slate-700/50"
        >
          <span className="text-slate-600 mr-1">{i + 1}.</span>
          {hint}
        </div>
      ))}

      {hintsRevealed < 3 ? (
        <button
          onClick={onReveal}
          className="w-full text-[11px] font-mono text-slate-500 border border-slate-700 rounded py-1.5 hover:bg-slate-800 hover:text-slate-300 transition-colors"
        >
          {hintsRevealed === 0 ? '? Show hint' : `+ More specific (${hintsRevealed}/3)`}
        </button>
      ) : (
        <button
          onClick={onShowSolution}
          className="w-full text-[11px] font-mono text-slate-600 border border-slate-700/50 rounded py-1.5 hover:bg-red-950/30 hover:border-red-700/40 hover:text-red-400 transition-colors"
          title="Replaces your current canvas with the reference solution"
        >
          Show solution
        </button>
      )}
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────

export default function App() {
  const [showCodex, setShowCodex] = useState(false)

  const {
    nodes,
    flowResult,
    nodeBudget,
    currentLevelId,
    completedLevelIds,
    showWinModal,
    hintsRevealed,
    history,
    blueprints,
    validate,
    resetGraph,
    loadLevel,
    loadSolution,
    dismissWin,
    revealHint,
    undo,
    deleteSelected,
    saveBlueprint,
    deleteBlueprint,
    stampBlueprint,
  } = useGameStore()

  const currentLevel = levels.find((l) => l.id === currentLevelId)

  const splitterCount = nodes.filter((n) => n.type === 'splitterNode').length
  const mergerCount   = nodes.filter((n) => n.type === 'mergerNode').length
  const splitterLeft  = nodeBudget.splitters - splitterCount
  const mergerLeft    = nodeBudget.mergers   - mergerCount
  const smSelected    = nodes.some((n) => n.selected && (n.type === 'splitterNode' || n.type === 'mergerNode'))

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
      <Tutorial />

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 h-11 px-4 bg-slate-900 border-b border-slate-700 shrink-0 z-10">
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
        <aside className="w-52 bg-slate-900 border-l border-slate-700 shrink-0 flex flex-col overflow-y-auto">

          {/* Level goal */}
          <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
            Level Goal
          </div>
          <div className="p-3 border-b border-slate-800">
            {currentLevel && (
              <>
                <p className="text-[10px] font-mono text-slate-500 leading-relaxed mb-3">
                  {currentLevel.introText}
                </p>
                <div className="space-y-1.5">
                  {currentLevel.inputs.map((inp) => (
                    <div key={inp.id} className="bg-slate-800 rounded p-1.5 flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-500 uppercase">In</span>
                      <span className="text-amber-400 font-mono font-bold text-xs">{inp.rate}/min</span>
                    </div>
                  ))}
                  <div className="text-center text-slate-600 font-mono text-[10px]">↓</div>
                  {currentLevel.outputs.map((out) => (
                    <div key={out.id} className="bg-slate-800 rounded p-1.5 flex items-center gap-2">
                      <span className="text-[9px] font-mono text-slate-500 uppercase">Out</span>
                      <span className="text-slate-300 font-mono font-bold text-xs">{out.targetRate}/min</span>
                      {flowResult?.outputResults[out.id]?.satisfied && (
                        <span className="ml-auto text-green-400 text-[10px]">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Flow result detail */}
          {flowResult && (
            <>
              <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
                Flow Result
              </div>
              <div className="p-3 space-y-1.5 border-b border-slate-800">
                {Object.entries(flowResult.outputResults).map(([id, or]) => (
                  <div key={id} className="bg-slate-800 rounded p-2">
                    <div className="text-[10px] text-slate-500 font-mono mb-0.5 truncate">{id}</div>
                    <div className={`text-xs font-mono font-bold ${or.satisfied ? 'text-green-400' : 'text-red-400'}`}>
                      {or.actual % 1 === 0 ? or.actual : or.actual.toFixed(2)}
                      {' / '}
                      {or.target}/min
                      <span className="ml-1">{or.satisfied ? '✓' : '✗'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Node palette */}
          <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
            Node Palette
          </div>
          <div className="p-3 space-y-2 border-b border-slate-800" data-tutorial="palette">
            <PaletteItem
              nodeType="splitterNode"
              label="Splitter"
              description="1 in → up to 3 out (÷ equally)"
              remaining={splitterLeft}
              borderClass="border-orange-500/40"
              textClass="text-orange-400"
              hoverClass="hover:bg-orange-500/5"
            />
            <PaletteItem
              nodeType="mergerNode"
              label="Merger"
              description="up to 3 in → 1 out (Σ)"
              remaining={mergerLeft}
              borderClass="border-sky-500/40"
              textClass="text-sky-400"
              hoverClass="hover:bg-sky-500/5"
            />
            <div className="text-[10px] font-mono text-slate-600 leading-relaxed pt-1">
              Drag to canvas • Delete key removes
            </div>
          </div>

          {/* Hint ladder */}
          {currentLevel && (
            <>
              <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
                Hints
              </div>
              <HintSection
                hints={currentLevel.hints}
                hintsRevealed={hintsRevealed}
                onReveal={revealHint}
                onShowSolution={loadSolution}
              />
            </>
          )}

          {/* Blueprint panel */}
          <div className="border-t border-slate-800">
            <BlueprintPanel
              blueprints={blueprints}
              splitterLeft={splitterLeft}
              mergerLeft={mergerLeft}
              hasSelection={smSelected}
              onSave={saveBlueprint}
              onStamp={stampBlueprint}
              onDelete={deleteBlueprint}
            />
          </div>

        </aside>
      </div>
    </div>
  )
}
