import { useEffect, useState } from 'react'
import Canvas from '../Canvas'
import BeltSelectorBar from '../BeltSelectorBar'
import DemoCanvas from './DemoCanvas'
import { useGameStore } from '../../store/gameStore'
import { chapters } from '../../tutorial/chapters'

const DEFAULT_STEP_MS = 1800

export default function ChapterPlayer() {
  const currentChapterId = useGameStore((s) => s.currentChapterId)
  const demoPlaying      = useGameStore((s) => s.demoPlaying)
  const demoPaused       = useGameStore((s) => s.demoPaused)
  const demoStepIndex    = useGameStore((s) => s.demoStepIndex)
  const stepDemo         = useGameStore((s) => s.stepDemo)
  const replayDemo       = useGameStore((s) => s.replayDemo)
  const skipDemo         = useGameStore((s) => s.skipDemo)
  const pauseDemo        = useGameStore((s) => s.pauseDemo)
  const resumeDemo       = useGameStore((s) => s.resumeDemo)
  const flowResult       = useGameStore((s) => s.flowResult)
  const completedChapters = useGameStore((s) => s.completedChapters)
  const completeChapterTryIt = useGameStore((s) => s.completeChapterTryIt)
  const closeChapter     = useGameStore((s) => s.closeChapter)
  const openChapter      = useGameStore((s) => s.openChapter)
  const resetGraph       = useGameStore((s) => s.resetGraph)
  const undo             = useGameStore((s) => s.undo)
  const deleteSelected   = useGameStore((s) => s.deleteSelected)
  const validate         = useGameStore((s) => s.validate)
  const loadChapterSolution = useGameStore((s) => s.loadChapterSolution)

  const chapter = chapters.find((c) => c.id === currentChapterId)

  // Auto-advance demo using setTimeout
  useEffect(() => {
    if (!chapter) return
    if (!demoPlaying || demoPaused) return
    if (demoStepIndex >= chapter.demoSteps.length) return
    const step = chapter.demoSteps[demoStepIndex]
    const ms = step?.durationMs ?? DEFAULT_STEP_MS
    const timer = window.setTimeout(() => stepDemo(), ms)
    return () => window.clearTimeout(timer)
  }, [chapter, demoPlaying, demoPaused, demoStepIndex, stepDemo])

  // After demo completes, transition to try-it mode after a short pause
  const inDemo = demoPlaying || demoStepIndex < (chapter?.demoSteps.length ?? 0)
  const [showTryIt, setShowTryIt] = useState(false)
  useEffect(() => {
    if (!chapter) return
    if (inDemo) { setShowTryIt(false); return }
    const t = window.setTimeout(() => setShowTryIt(true), 1500)
    return () => window.clearTimeout(t)
  }, [chapter, inDemo])

  // Mark complete when try-it puzzle is satisfied
  useEffect(() => {
    if (!chapter) return
    if (!showTryIt) return
    if (flowResult?.satisfied && !completedChapters.includes(chapter.id)) {
      completeChapterTryIt(chapter.id)
    }
  }, [chapter, showTryIt, flowResult?.satisfied, completedChapters, completeChapterTryIt])

  if (!chapter) return null

  const totalSteps = chapter.demoSteps.length
  const lastApplied = Math.min(Math.max(demoStepIndex - 1, 0), totalSteps - 1)
  const justCompleted = showTryIt && flowResult?.satisfied
  const nextChapter = chapters.find((c) => c.id === chapter.id + 1)

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">

      {/* Top bar */}
      <header className="flex items-center gap-3 h-11 px-4 bg-slate-900 border-b border-slate-700 shrink-0">
        <button
          onClick={closeChapter}
          className="text-xs font-mono text-slate-400 hover:text-amber-400 transition-colors"
          title="Back to chapter list"
        >
          ← Chapters
        </button>
        <div className="h-4 w-px bg-slate-700" />
        <h1 className="font-mono font-bold text-amber-500 tracking-[0.2em] text-base uppercase">
          Belt Balancer
        </h1>
        <div className="h-4 w-px bg-slate-700" />
        <span className="text-xs text-slate-400 font-mono">
          Chapter {chapter.id} — {chapter.title}
        </span>
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest ml-2">
          {inDemo ? 'Demo' : 'Try it'}
        </span>

        <div className="flex-1" />

        {!inDemo && flowResult && (
          <div className={[
            'flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold border',
            flowResult.satisfied
              ? 'text-green-400 bg-green-500/10 border-green-500/30'
              : 'text-red-400 bg-red-500/10 border-red-500/30',
          ].join(' ')}>
            {flowResult.satisfied ? '✓ Solved' : '✗ Unsolved'}
          </div>
        )}

        {!inDemo && (
          <>
            <button
              onClick={undo}
              className="px-3 py-1 text-xs font-mono rounded border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors"
            >
              Undo
            </button>
            <button
              onClick={deleteSelected}
              className="px-3 py-1 text-xs font-mono rounded border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={validate}
              className="px-3 py-1 text-xs font-mono rounded border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 transition-colors"
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
              onClick={replayDemo}
              className="px-3 py-1 text-xs font-mono rounded border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors"
              title="Replay the demo"
            >
              ↺ Demo
            </button>
          </>
        )}
      </header>

      {/* Body */}
      {inDemo ? (
        <div className="flex flex-1 overflow-hidden">
          {/* Narration panel */}
          <aside className="w-72 bg-slate-900 border-r border-slate-700 shrink-0 flex flex-col">
            <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
              Concept
            </div>
            <div className="px-3 py-3 border-b border-slate-800">
              <div className="font-mono text-amber-400 text-sm font-bold">{chapter.title}</div>
              <div className="font-mono text-slate-400 text-[11px] mt-1 leading-relaxed">{chapter.concept}</div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {chapter.demoSteps.map((step, i) => {
                const isPast    = i < lastApplied
                const isCurrent = i === lastApplied && demoStepIndex > 0
                const isUpcoming = i > lastApplied || demoStepIndex === 0 && i > 0
                if (!step.narration) return null
                return (
                  <div
                    key={i}
                    className={[
                      'font-mono text-[11px] leading-relaxed rounded px-2 py-1.5 border',
                      isCurrent
                        ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                        : isPast
                          ? 'text-slate-500 bg-slate-800/40 border-slate-800'
                          : isUpcoming
                            ? 'text-slate-600 bg-slate-900/40 border-slate-800/60'
                            : 'text-slate-500 bg-slate-800/40 border-slate-800',
                    ].join(' ')}
                  >
                    {step.narration}
                  </div>
                )
              })}
            </div>
            {/* Demo controls */}
            <div className="border-t border-slate-700 px-3 py-2 flex items-center gap-2">
              {demoPaused ? (
                <button
                  onClick={resumeDemo}
                  className="flex-1 text-[11px] font-mono px-2 py-1 rounded border border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                >
                  ▶ Play
                </button>
              ) : (
                <button
                  onClick={pauseDemo}
                  disabled={!demoPlaying}
                  className="flex-1 text-[11px] font-mono px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                >
                  ⏸ Pause
                </button>
              )}
              <button
                onClick={stepDemo}
                disabled={demoStepIndex >= totalSteps}
                className="text-[11px] font-mono px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                title="Step forward"
              >
                ⏵
              </button>
              <button
                onClick={replayDemo}
                className="text-[11px] font-mono px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800"
                title="Replay"
              >
                ↺
              </button>
              <button
                onClick={skipDemo}
                className="text-[11px] font-mono px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800"
                title="Skip to try-it"
              >
                Skip ⤳
              </button>
            </div>
            <div className="px-3 py-1.5 border-t border-slate-800 text-[10px] font-mono text-slate-600 uppercase tracking-widest">
              Step {Math.min(demoStepIndex, totalSteps)} / {totalSteps}
            </div>
          </aside>

          {/* Demo canvas */}
          <main className="flex-1 relative overflow-hidden bg-slate-950">
            <DemoCanvas />
          </main>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Try-it canvas */}
          <main className="flex-1 relative overflow-hidden">
            <Canvas />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-full overflow-x-auto">
              <BeltSelectorBar />
            </div>
            {justCompleted && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-green-500/50 rounded-lg px-5 py-3 shadow-lg flex items-center gap-4">
                <div>
                  <div className="font-mono text-green-400 text-sm font-bold tracking-wider">
                    ✓ Chapter complete!
                  </div>
                  <div className="font-mono text-slate-400 text-[11px] mt-0.5">
                    {nextChapter ? `Next: ${nextChapter.title}` : 'You finished the tutorial.'}
                  </div>
                </div>
                {nextChapter ? (
                  <button
                    onClick={() => openChapter(nextChapter.id)}
                    className="text-xs font-mono px-3 py-1.5 rounded border border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  >
                    Next chapter →
                  </button>
                ) : (
                  <button
                    onClick={closeChapter}
                    className="text-xs font-mono px-3 py-1.5 rounded border border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  >
                    Back to chapters
                  </button>
                )}
              </div>
            )}
          </main>

          {/* Try-it sidebar */}
          <TryItSidebar onShowSolution={loadChapterSolution} />
        </div>
      )}
    </div>
  )
}

function TryItSidebar({ onShowSolution }: { onShowSolution: () => void }) {
  const currentChapterId = useGameStore((s) => s.currentChapterId)
  const nodes = useGameStore((s) => s.nodes)
  const flowResult = useGameStore((s) => s.flowResult)
  const nodeBudget = useGameStore((s) => s.nodeBudget)

  const chapter = chapters.find((c) => c.id === currentChapterId)
  if (!chapter) return null

  const splitterUsed = nodes.filter((n) => n.type === 'splitterNode').length
  const mergerUsed   = nodes.filter((n) => n.type === 'mergerNode').length

  return (
    <aside className="w-56 bg-slate-900 border-l border-slate-700 shrink-0 flex flex-col overflow-y-auto">
      <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
        Goal
      </div>
      <div className="p-3 border-b border-slate-800">
        <p className="text-[11px] font-mono text-slate-400 leading-relaxed mb-3">
          {chapter.concept}
        </p>
        <div className="space-y-1.5">
          {chapter.tryItPuzzle.inputs.map((inp) => (
            <div key={inp.id} className="bg-slate-800 rounded p-1.5 flex items-center gap-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase">In</span>
              <span className="text-amber-400 font-mono font-bold text-xs">{inp.rate}/min</span>
            </div>
          ))}
          <div className="text-center text-slate-600 font-mono text-[10px]">↓</div>
          {chapter.tryItPuzzle.outputs.map((out) => (
            <div key={out.id} className="bg-slate-800 rounded p-1.5 flex items-center gap-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase">Out</span>
              <span className="text-slate-300 font-mono font-bold text-xs">{out.targetRate}/min</span>
              {flowResult?.outputResults[out.id]?.satisfied && (
                <span className="ml-auto text-green-400 text-[10px]">✓</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
        Node Palette
      </div>
      <div className="p-3 space-y-2 border-b border-slate-800">
        <PaletteItem
          nodeType="splitterNode"
          label="Splitter"
          description="1 in → up to 3 out"
          remaining={nodeBudget.splitters - splitterUsed}
          color="orange"
        />
        <PaletteItem
          nodeType="mergerNode"
          label="Merger"
          description="up to 3 in → 1 out"
          remaining={nodeBudget.mergers - mergerUsed}
          color="sky"
        />
        <div className="text-[10px] font-mono text-slate-600 leading-relaxed pt-1">
          Drag to canvas • Delete to remove
        </div>
      </div>

      <div className="p-3">
        <button
          onClick={onShowSolution}
          className="w-full text-[11px] font-mono text-slate-500 border border-slate-700 rounded py-1.5 hover:bg-red-950/30 hover:border-red-700/40 hover:text-red-400 transition-colors"
          title="Replaces your canvas with a reference solution"
        >
          Show solution
        </button>
      </div>
    </aside>
  )
}

interface PaletteItemProps { nodeType: string; label: string; description: string; remaining: number; color: 'orange' | 'sky' }
function PaletteItem({ nodeType, label, description, remaining, color }: PaletteItemProps) {
  const disabled = remaining <= 0
  const colorClasses =
    color === 'orange'
      ? { border: 'border-orange-500/40', text: 'text-orange-400', hover: 'hover:bg-orange-500/5' }
      : { border: 'border-sky-500/40',    text: 'text-sky-400',    hover: 'hover:bg-sky-500/5' }
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
          : `${colorClasses.border} ${colorClasses.text} ${colorClasses.hover} cursor-grab active:cursor-grabbing`,
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold">{label}</span>
        <span className="text-[10px] font-mono text-slate-500">{disabled ? 'full' : `${remaining} left`}</span>
      </div>
      <div className="text-[10px] font-mono text-slate-500 mt-0.5 leading-snug">{description}</div>
    </div>
  )
}
