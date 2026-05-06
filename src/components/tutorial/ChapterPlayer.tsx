import { useEffect, useRef, useState } from 'react'
import Canvas from '../Canvas'
import BeltSelectorBar from '../BeltSelectorBar'
import PaletteItem from '../PaletteItem'
import MobileBottomSheet from '../MobileBottomSheet'
import MobileActionBar from '../MobileActionBar'
import DemoCanvas from './DemoCanvas'
import { useIsMobile } from '../../hooks/useIsMobile'
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

  const isMobile = useIsMobile()

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

  // Demo and try-it are mutually exclusive views; the user opts in to try-it
  // by clicking the "Try it" button once the demo has finished playing.
  const [showTryIt, setShowTryIt] = useState(false)
  const inDemo = !showTryIt
  useEffect(() => {
    setShowTryIt(false)
  }, [chapter?.id])

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

      <ChapterHeader
        title={chapter.title}
        chapterId={chapter.id}
        inDemo={inDemo}
        flowResult={flowResult}
        onCloseChapter={closeChapter}
        onUndo={undo}
        onDelete={deleteSelected}
        onValidate={validate}
        onReset={resetGraph}
        onReplayDemo={replayDemo}
      />

      {/* Body */}
      {inDemo ? (
        isMobile ? (
          <DemoBodyMobile
            chapter={chapter}
            totalSteps={totalSteps}
            lastApplied={lastApplied}
            demoStepIndex={demoStepIndex}
            demoPaused={demoPaused}
            demoPlaying={demoPlaying}
            onStartTryIt={() => setShowTryIt(true)}
            onPause={pauseDemo}
            onResume={resumeDemo}
            onStep={stepDemo}
            onReplay={replayDemo}
            onSkip={skipDemo}
          />
        ) : (
          <DemoBodyDesktop
            chapter={chapter}
            totalSteps={totalSteps}
            lastApplied={lastApplied}
            demoStepIndex={demoStepIndex}
            demoPaused={demoPaused}
            demoPlaying={demoPlaying}
            onStartTryIt={() => setShowTryIt(true)}
            onPause={pauseDemo}
            onResume={resumeDemo}
            onStep={stepDemo}
            onReplay={replayDemo}
            onSkip={skipDemo}
          />
        )
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Try-it canvas */}
          <main className="flex-1 relative overflow-hidden">
            <Canvas />
            <div className="absolute bottom-32 md:bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-full overflow-x-auto">
              <BeltSelectorBar />
            </div>
            <MobileActionBar showValidate={true} />
            {justCompleted && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 border border-green-500/50 rounded-lg px-5 py-3 shadow-lg flex items-center gap-4 max-w-[calc(100vw-2rem)]">
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
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={closeChapter}
                    className="text-xs font-mono px-3 py-1.5 rounded border border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                  >
                    Chapters
                  </button>
                )}
              </div>
            )}
          </main>

          {/* Try-it sidebar — desktop aside or mobile sheet */}
          <TryItSidebar onShowSolution={loadChapterSolution} />
          {isMobile && (
            <MobileBottomSheet peek={<TryItPeek />}>
              <TryItSidebarBody onShowSolution={loadChapterSolution} />
            </MobileBottomSheet>
          )}
        </div>
      )}
    </div>
  )
}

// ── Header ──────────────────────────────────────────────────────────────────

interface ChapterHeaderProps {
  title: string
  chapterId: number
  inDemo: boolean
  flowResult: ReturnType<typeof useGameStore.getState>['flowResult']
  onCloseChapter: () => void
  onUndo: () => void
  onDelete: () => void
  onValidate: () => void
  onReset: () => void
  onReplayDemo: () => void
}

function ChapterHeader({
  title, chapterId, inDemo, flowResult,
  onCloseChapter, onUndo, onDelete, onValidate, onReset, onReplayDemo,
}: ChapterHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="flex items-center gap-2 md:gap-3 h-11 px-2 md:px-4 bg-slate-900 border-b border-slate-700 shrink-0">
      <button
        onClick={onCloseChapter}
        className="text-xs font-mono text-slate-400 hover:text-amber-400 transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
        title="Back to chapter list"
      >
        ← <span className="hidden sm:inline ml-0.5">Chapters</span>
      </button>
      <div className="hidden md:block h-4 w-px bg-slate-700" />
      <h1 className="hidden md:inline font-mono font-bold text-amber-500 tracking-[0.2em] text-base uppercase">
        Belt Balancer
      </h1>
      <div className="hidden md:block h-4 w-px bg-slate-700" />
      <span className="text-xs text-slate-400 font-mono truncate min-w-0">
        <span className="hidden sm:inline">Chapter </span>{chapterId}
        <span className="hidden md:inline"> — {title}</span>
        <span className="md:hidden"> · {title.length > 18 ? title.slice(0, 16) + '…' : title}</span>
      </span>
      <span className="hidden md:inline text-[10px] font-mono text-slate-500 uppercase tracking-widest ml-2">
        {inDemo ? 'Demo' : 'Try it'}
      </span>

      <div className="flex-1" />

      {!inDemo && flowResult && (
        <div className={[
          'flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold border shrink-0',
          flowResult.satisfied
            ? 'text-green-400 bg-green-500/10 border-green-500/30'
            : 'text-red-400 bg-red-500/10 border-red-500/30',
        ].join(' ')}>
          {flowResult.satisfied ? '✓ Solved' : '✗ Unsolved'}
        </div>
      )}

      {/* Desktop: full button row */}
      {!inDemo && (
        <div className="hidden md:flex items-center gap-3">
          <button onClick={onUndo}     className="px-3 py-1 text-xs font-mono rounded border border-slate-600 text-slate-400 hover:bg-slate-700">Undo</button>
          <button onClick={onDelete}   className="px-3 py-1 text-xs font-mono rounded border border-slate-600 text-slate-400 hover:bg-slate-700">Delete</button>
          <button onClick={onValidate} className="px-3 py-1 text-xs font-mono rounded border border-amber-500/50 text-amber-400 hover:bg-amber-500/10">Validate</button>
          <button onClick={onReset}    className="px-3 py-1 text-xs font-mono rounded border border-slate-600 text-slate-400 hover:bg-slate-700">Reset</button>
          <button onClick={onReplayDemo} title="Replay the demo" className="px-3 py-1 text-xs font-mono rounded border border-slate-600 text-slate-400 hover:bg-slate-700">↺ Demo</button>
        </div>
      )}

      {/* Mobile: validate inline + overflow menu */}
      {!inDemo && (
        <div className="md:hidden flex items-center gap-1 relative">
          <button
            onClick={onValidate}
            className="px-3 min-w-[40px] min-h-[40px] text-xs font-mono rounded border border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
          >
            Validate
          </button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="px-2 min-w-[40px] min-h-[40px] text-base font-mono rounded border border-slate-600 text-slate-300 hover:bg-slate-700"
            title="More actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} aria-hidden />
              <div
                className="absolute right-0 top-full mt-1 z-40 bg-slate-900 border border-slate-700 rounded shadow-lg flex flex-col min-w-[140px]"
                role="menu"
              >
                <button
                  onClick={() => { setMenuOpen(false); onReset() }}
                  className="text-left px-3 py-2 text-xs font-mono text-slate-300 hover:bg-slate-800 border-b border-slate-800"
                >Reset</button>
                <button
                  onClick={() => { setMenuOpen(false); onReplayDemo() }}
                  className="text-left px-3 py-2 text-xs font-mono text-slate-300 hover:bg-slate-800"
                >↺ Replay demo</button>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  )
}

// ── Demo body — desktop ─────────────────────────────────────────────────────

interface DemoBodyProps {
  chapter: typeof chapters[number]
  totalSteps: number
  lastApplied: number
  demoStepIndex: number
  demoPaused: boolean
  demoPlaying: boolean
  onStartTryIt: () => void
  onPause: () => void
  onResume: () => void
  onStep: () => void
  onReplay: () => void
  onSkip: () => void
}

function DemoBodyDesktop(props: DemoBodyProps) {
  const { chapter, totalSteps, lastApplied, demoStepIndex } = props

  return (
    <div className="flex flex-1 overflow-hidden">
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
            const isUpcoming = i > lastApplied || (demoStepIndex === 0 && i > 0)
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
        <DemoControls {...props} variant="aside" />
        <div className="px-3 py-1.5 border-t border-slate-800 text-[10px] font-mono text-slate-600 uppercase tracking-widest">
          Step {Math.min(demoStepIndex, totalSteps)} / {totalSteps}
        </div>
      </aside>

      <main className="flex-1 relative overflow-hidden bg-slate-950">
        <DemoCanvas />
      </main>
    </div>
  )
}

// ── Demo body — mobile (swipeable carousel + canvas + controls bar) ─────────

function DemoBodyMobile(props: DemoBodyProps) {
  const { chapter, totalSteps, lastApplied, demoStepIndex } = props
  const trackRef = useRef<HTMLDivElement>(null)

  // Auto-scroll the carousel to the current step.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const child = track.children[lastApplied] as HTMLElement | undefined
    if (!child) return
    track.scrollTo({ left: child.offsetLeft - track.offsetLeft - 8, behavior: 'smooth' })
  }, [lastApplied])

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Concept blurb (compact) */}
      <div className="px-3 py-2 border-b border-slate-800 bg-slate-900 shrink-0">
        <div className="font-mono text-amber-400 text-xs font-bold">{chapter.title}</div>
        <div className="font-mono text-slate-400 text-[10px] mt-0.5 leading-snug line-clamp-2">{chapter.concept}</div>
      </div>

      {/* Step carousel (~30vh max) */}
      <div
        ref={trackRef}
        className="shrink-0 flex gap-2 overflow-x-auto px-3 py-2 bg-slate-900 border-b border-slate-800 snap-x snap-mandatory"
        style={{ maxHeight: '30vh', scrollbarWidth: 'none' }}
      >
        {chapter.demoSteps.map((step, i) => {
          if (!step.narration) return null
          const isPast    = i < lastApplied
          const isCurrent = i === lastApplied && demoStepIndex > 0
          return (
            <div
              key={i}
              className={[
                'snap-start shrink-0 w-[80vw] max-w-[320px] font-mono text-[11px] leading-relaxed rounded px-2.5 py-2 border',
                isCurrent
                  ? 'text-amber-300 bg-amber-500/10 border-amber-500/30'
                  : isPast
                    ? 'text-slate-500 bg-slate-800/40 border-slate-800'
                    : 'text-slate-600 bg-slate-900/40 border-slate-800/60',
              ].join(' ')}
            >
              <div className="text-[9px] font-mono uppercase tracking-widest text-slate-500 mb-0.5">
                Step {i + 1} / {totalSteps}
              </div>
              {step.narration}
            </div>
          )
        })}
      </div>

      {/* Demo canvas */}
      <main className="flex-1 relative overflow-hidden bg-slate-950">
        <DemoCanvas />
      </main>

      {/* Controls bar */}
      <DemoControls {...props} variant="bar" />
    </div>
  )
}

// ── Shared demo controls ────────────────────────────────────────────────────

function DemoControls({
  totalSteps, demoStepIndex, demoPaused, demoPlaying,
  onStartTryIt, onPause, onResume, onStep, onReplay, onSkip,
  variant,
}: DemoBodyProps & { variant: 'aside' | 'bar' }) {
  const isBar = variant === 'bar'
  const wrap = isBar
    ? 'border-t border-slate-700 px-2 py-1.5 flex items-center gap-1 bg-slate-900 shrink-0 overflow-x-auto'
    : 'border-t border-slate-700 px-3 py-2 flex items-center gap-2'
  const btn = isBar
    ? 'text-[11px] font-mono px-2 min-w-[40px] min-h-[40px] rounded border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-40'
    : 'text-[11px] font-mono px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-40'

  return (
    <div className={wrap}>
      {demoStepIndex >= totalSteps ? (
        <button
          onClick={onStartTryIt}
          className={[
            isBar
              ? 'flex-1 text-[11px] font-mono px-2 min-h-[40px] rounded border border-amber-500/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-bold tracking-wider'
              : 'flex-1 text-[11px] font-mono px-2 py-1 rounded border border-amber-500/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-bold tracking-wider',
          ].join(' ')}
        >
          Try it →
        </button>
      ) : demoPaused ? (
        <button onClick={onResume} className={[
          isBar
            ? 'flex-1 text-[11px] font-mono px-2 min-h-[40px] rounded border border-amber-500/50 text-amber-400 hover:bg-amber-500/10'
            : 'flex-1 text-[11px] font-mono px-2 py-1 rounded border border-amber-500/50 text-amber-400 hover:bg-amber-500/10',
        ].join(' ')}>
          ▶ Play
        </button>
      ) : (
        <button onClick={onPause} disabled={!demoPlaying} className={[
          isBar
            ? 'flex-1 text-[11px] font-mono px-2 min-h-[40px] rounded border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-40'
            : 'flex-1 text-[11px] font-mono px-2 py-1 rounded border border-slate-600 text-slate-300 hover:bg-slate-800 disabled:opacity-40',
        ].join(' ')}>
          ⏸ Pause
        </button>
      )}
      <button onClick={onStep} disabled={demoStepIndex >= totalSteps} className={btn} title="Step forward">⏵</button>
      <button onClick={onReplay} className={btn} title="Replay">↺</button>
      <button onClick={onSkip} className={btn} title="Skip to try-it">Skip ⤳</button>
    </div>
  )
}

// ── Try-it sidebar ──────────────────────────────────────────────────────────

function TryItPeek() {
  const currentChapterId = useGameStore((s) => s.currentChapterId)
  const flowResult = useGameStore((s) => s.flowResult)
  const chapter = chapters.find((c) => c.id === currentChapterId)
  if (!chapter) return null
  if (flowResult?.satisfied) {
    return <span className="text-[11px] font-mono text-green-400 font-bold">✓ Solved</span>
  }
  const concept = chapter.concept
  return (
    <span className="text-[11px] font-mono text-slate-400 line-clamp-1">
      {concept.length > 60 ? concept.slice(0, 58) + '…' : concept}
    </span>
  )
}

function TryItSidebarBody({ onShowSolution }: { onShowSolution: () => void }) {
  const currentChapterId = useGameStore((s) => s.currentChapterId)
  const nodes = useGameStore((s) => s.nodes)
  const flowResult = useGameStore((s) => s.flowResult)
  const nodeBudget = useGameStore((s) => s.nodeBudget)

  const chapter = chapters.find((c) => c.id === currentChapterId)
  if (!chapter) return null

  const splitterUsed = nodes.filter((n) => n.type === 'splitterNode').length
  const mergerUsed   = nodes.filter((n) => n.type === 'mergerNode').length

  return (
    <>
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
          borderClass="border-orange-500/40"
          textClass="text-orange-400"
          hoverClass="hover:bg-orange-500/5"
        />
        <PaletteItem
          nodeType="mergerNode"
          label="Merger"
          description="up to 3 in → 1 out"
          remaining={nodeBudget.mergers - mergerUsed}
          borderClass="border-sky-500/40"
          textClass="text-sky-400"
          hoverClass="hover:bg-sky-500/5"
        />
        <div className="text-[10px] font-mono text-slate-600 leading-relaxed pt-1">
          Drag (or tap) to place • Delete to remove
        </div>
      </div>

      <div className="p-3">
        <button
          onClick={onShowSolution}
          className="w-full min-h-[44px] text-[11px] font-mono text-slate-500 border border-slate-700 rounded py-1.5 hover:bg-red-950/30 hover:border-red-700/40 hover:text-red-400 transition-colors"
          title="Replaces your canvas with a reference solution"
        >
          Show solution
        </button>
      </div>
    </>
  )
}

function TryItSidebar({ onShowSolution }: { onShowSolution: () => void }) {
  return (
    <aside className="hidden md:flex w-56 bg-slate-900 border-l border-slate-700 shrink-0 flex-col overflow-y-auto">
      <TryItSidebarBody onShowSolution={onShowSolution} />
    </aside>
  )
}
