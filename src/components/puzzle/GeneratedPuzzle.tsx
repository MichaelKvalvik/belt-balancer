import Canvas from '../Canvas'
import BeltSelectorBar from '../BeltSelectorBar'
import BlueprintPanel from '../BlueprintPanel'
import { useGameStore } from '../../store/gameStore'
import type { Difficulty } from '../../types'

const DIFFICULTY_BADGE: Record<Difficulty, string> = {
  easy:   'text-green-400 border-green-700',
  normal: 'text-amber-400 border-amber-700',
  hard:   'text-orange-400 border-orange-700',
  expert: 'text-red-400 border-red-700',
}

function GeneratedPuzzleSidebar() {
  const {
    nodes,
    flowResult,
    nodeBudget,
    currentDifficulty,
    generatedPuzzle,
    blueprints,
    loadGeneratedPuzzle,
    loadSolution,
    saveBlueprint,
    deleteBlueprint,
    stampBlueprint,
    clearGeneratedPuzzle,
  } = useGameStore()

  if (!generatedPuzzle || !currentDifficulty) return null

  const splitterCount = nodes.filter((n) => n.type === 'splitterNode').length
  const mergerCount   = nodes.filter((n) => n.type === 'mergerNode').length
  const splitterLeft  = nodeBudget.splitters - splitterCount
  const mergerLeft    = nodeBudget.mergers   - mergerCount
  const smSelected    = nodes.some((n) => n.selected && (n.type === 'splitterNode' || n.type === 'mergerNode'))

  const { puzzle } = generatedPuzzle
  const badge = DIFFICULTY_BADGE[currentDifficulty]

  return (
    <aside className="w-52 bg-slate-900 border-l border-slate-700 shrink-0 flex flex-col overflow-y-auto">
      <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800 flex items-center justify-between">
        <span>Generated Puzzle</span>
        <span className={`text-[9px] font-mono uppercase tracking-widest border rounded px-1.5 py-0.5 ${badge}`}>
          {currentDifficulty}
        </span>
      </div>

      {/* Inputs / outputs */}
      <div className="p-3 border-b border-slate-800">
        <div className="space-y-1.5">
          {puzzle.inputs.map((inp) => (
            <div key={inp.id} className="bg-slate-800 rounded p-1.5 flex items-center gap-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase">In</span>
              <span className="text-amber-400 font-mono font-bold text-xs">{inp.rate}/min</span>
            </div>
          ))}
          <div className="text-center text-slate-600 font-mono text-[10px]">↓</div>
          {puzzle.outputs.map((out) => (
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

      {/* Flow result detail */}
      {flowResult && Object.keys(flowResult.outputResults).length > 0 && (
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
      <div className="p-3 space-y-2 border-b border-slate-800">
        <PaletteItem
          nodeType="splitterNode"
          label="Splitter"
          description="1 in → up to 3 out"
          remaining={splitterLeft}
          borderClass="border-orange-500/40"
          textClass="text-orange-400"
          hoverClass="hover:bg-orange-500/5"
        />
        <PaletteItem
          nodeType="mergerNode"
          label="Merger"
          description="up to 3 in → 1 out"
          remaining={mergerLeft}
          borderClass="border-sky-500/40"
          textClass="text-sky-400"
          hoverClass="hover:bg-sky-500/5"
        />
        <div className="text-[10px] font-mono text-slate-600 leading-relaxed pt-1">
          Drag to canvas • Delete key removes
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 space-y-2 border-b border-slate-800">
        <button
          onClick={() => loadGeneratedPuzzle(currentDifficulty)}
          className="w-full text-[11px] font-mono text-amber-400 border border-amber-500/50 rounded py-1.5 hover:bg-amber-500/10 transition-colors"
        >
          New Puzzle
        </button>
        <button
          onClick={loadSolution}
          className="w-full text-[11px] font-mono text-slate-400 border border-slate-700 rounded py-1.5 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          title="Reveal the reference solution (free in puzzle mode)"
        >
          Solve for me
        </button>
        <button
          onClick={clearGeneratedPuzzle}
          className="w-full text-[11px] font-mono text-slate-500 border border-slate-700 rounded py-1.5 hover:bg-slate-800 hover:text-slate-300 transition-colors"
        >
          Change Difficulty
        </button>
      </div>

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
  )
}

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

function WinBanner() {
  const showWinModal     = useGameStore((s) => s.showWinModal)
  const dismissWin       = useGameStore((s) => s.dismissWin)
  const currentDifficulty = useGameStore((s) => s.currentDifficulty)
  const loadGeneratedPuzzle = useGameStore((s) => s.loadGeneratedPuzzle)

  if (!showWinModal || !currentDifficulty) return null

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={dismissWin}
    >
      <div
        className="bg-slate-800 border border-green-500/40 rounded-2xl p-8 text-center w-80 shadow-2xl shadow-green-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/40 flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl text-green-400 font-bold">✓</span>
        </div>
        <div className="text-lg font-mono font-bold text-green-400 mb-0.5">
          Puzzle Solved!
        </div>
        <div className="text-sm font-mono text-slate-400 mb-4 capitalize">{currentDifficulty}</div>
        <div className="text-xs text-slate-500 font-mono mb-6 leading-relaxed">
          Belt balanced. Try another?
        </div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { dismissWin(); loadGeneratedPuzzle(currentDifficulty) }}
            className="px-4 py-2 text-sm font-mono font-bold rounded-lg border border-amber-500/60 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 transition-all"
          >
            New Puzzle →
          </button>
          <button
            onClick={dismissWin}
            className="px-4 py-2 text-sm font-mono rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700 active:scale-95 transition-all"
          >
            Keep Playing
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GeneratedPuzzleScreen() {
  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden">
      <main className="flex-1 relative overflow-hidden">
        <Canvas />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-full overflow-x-auto">
          <BeltSelectorBar />
        </div>
      </main>
      <GeneratedPuzzleSidebar />
      <WinBanner />
    </div>
  )
}
