import BlueprintPanel from './BlueprintPanel'
import { useGameStore } from '../store/gameStore'
import { levels } from '../levels/levels'

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

export default function PuzzleSidebar() {
  const {
    nodes,
    flowResult,
    nodeBudget,
    currentLevelId,
    hintsRevealed,
    blueprints,
    loadSolution,
    revealHint,
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

  return (
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
  )
}
