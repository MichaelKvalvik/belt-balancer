import { useState } from 'react'
import Canvas from '../Canvas'
import BeltSelectorBar from '../BeltSelectorBar'
import BlueprintPanel from '../BlueprintPanel'
import { useGameStore } from '../../store/gameStore'

function FreePlaySidebar({ onAskNew }: { onAskNew: () => void }) {
  const {
    nodes,
    edges,
    flowResult,
    freePlayConfig,
    blueprints,
    saveBlueprint,
    deleteBlueprint,
    stampBlueprint,
    resetGraph,
    exitFreePlay,
  } = useGameStore()

  if (!freePlayConfig) return null

  const smSelected = nodes.some((n) => n.selected && (n.type === 'splitterNode' || n.type === 'mergerNode'))
  const isDirty    = edges.length > 0 || nodes.some((n) => n.type === 'splitterNode' || n.type === 'mergerNode')

  function onBack() {
    if (isDirty && !window.confirm('Discard your current canvas and return home?')) return
    exitFreePlay()
  }
  function onReset() {
    if (!isDirty) return
    if (!window.confirm('Clear all belts and intermediate nodes?')) return
    resetGraph()
  }

  return (
    <aside className="w-52 bg-slate-900 border-l border-slate-700 shrink-0 flex flex-col overflow-y-auto">
      <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800 flex items-center justify-between">
        <span>Free Play</span>
        <button
          onClick={onBack}
          className="text-[10px] font-mono text-slate-500 hover:text-slate-200"
          title="Return home"
        >
          ← Home
        </button>
      </div>

      {/* Goal panel */}
      <div className="p-3 border-b border-slate-800">
        <div className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-1.5">Goal</div>
        <div className="space-y-1.5">
          {freePlayConfig.inputs.map((inp) => (
            <div key={inp.id} className="bg-slate-800 rounded p-1.5 flex items-center gap-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase">In</span>
              <span className="text-amber-400 font-mono font-bold text-xs">{inp.rate}/min</span>
              <span className="ml-auto text-[9px] font-mono text-slate-500">Mk.{inp.mark}</span>
            </div>
          ))}
          <div className="text-center text-slate-600 font-mono text-[10px]">↓</div>
          {freePlayConfig.outputs.map((out) => (
            <div key={out.id} className="bg-slate-800 rounded p-1.5 flex items-center gap-2">
              <span className="text-[9px] font-mono text-slate-500 uppercase">Out</span>
              <span className="text-slate-300 font-mono font-bold text-xs">{out.targetRate}/min</span>
              {flowResult?.outputResults[out.id]?.satisfied && (
                <span className="ml-auto text-green-400 text-[10px]">✓</span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 text-[10px] font-mono text-slate-500 leading-relaxed">
          Max tier: <span className="text-slate-300">Mk.{freePlayConfig.constraints.maxMark}</span>
          {' · '}
          Loopbacks: <span className="text-slate-300">{freePlayConfig.constraints.allowLoopbacks ? 'on' : 'off'}</span>
        </div>
      </div>

      {/* Live flow */}
      {flowResult && Object.keys(flowResult.outputResults).length > 0 && (
        <>
          <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
            Live Flow
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

      {/* Node palette (no budget) */}
      <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
        Node Palette
      </div>
      <div className="p-3 space-y-2 border-b border-slate-800">
        <PaletteItem
          nodeType="splitterNode"
          label="Splitter"
          description="1 in → up to 3 out"
          borderClass="border-orange-500/40"
          textClass="text-orange-400"
          hoverClass="hover:bg-orange-500/5"
        />
        <PaletteItem
          nodeType="mergerNode"
          label="Merger"
          description="up to 3 in → 1 out"
          borderClass="border-sky-500/40"
          textClass="text-sky-400"
          hoverClass="hover:bg-sky-500/5"
        />
        <PaletteItem
          nodeType="tempInputNode"
          label="Temp Input ⚡"
          description="Stand-in for a planned loopback"
          borderClass="border-amber-400/40 border-dashed"
          textClass="text-amber-300"
          hoverClass="hover:bg-amber-500/5"
        />
        <div className="text-[10px] font-mono text-slate-600 leading-relaxed pt-1">
          Drag to canvas • Delete key removes • Unlimited
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 space-y-2 border-b border-slate-800">
        <button
          disabled
          title="Coming soon"
          className="w-full text-[11px] font-mono text-slate-500 border border-slate-700 rounded py-1.5 opacity-50 cursor-not-allowed"
        >
          Solve for me
        </button>
        <button
          onClick={onReset}
          disabled={!isDirty}
          className="w-full text-[11px] font-mono text-slate-400 border border-slate-700 rounded py-1.5 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Reset Canvas
        </button>
        <button
          onClick={onAskNew}
          className="w-full text-[11px] font-mono text-amber-400 border border-amber-500/50 rounded py-1.5 hover:bg-amber-500/10 transition-colors"
        >
          New Puzzle
        </button>
      </div>

      {/* Blueprint panel — unbounded budget, so just pass a large remaining count */}
      <div className="border-t border-slate-800">
        <BlueprintPanel
          blueprints={blueprints}
          splitterLeft={9999}
          mergerLeft={9999}
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
  borderClass: string
  hoverClass: string
  textClass: string
}

function PaletteItem({ nodeType, label, description, borderClass, hoverClass, textClass }: PaletteItemProps) {
  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData('application/reactflow', nodeType)
    e.dataTransfer.effectAllowed = 'move'
  }
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={[
        'rounded border px-2.5 py-2 transition-colors select-none cursor-grab active:cursor-grabbing',
        borderClass, textClass, hoverClass,
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold">{label}</span>
        <span className="text-[10px] font-mono text-slate-500">∞</span>
      </div>
      <div className="text-[10px] font-mono text-slate-500 mt-0.5 leading-snug">{description}</div>
    </div>
  )
}

function WinBanner({ onTryAnother }: { onTryAnother: () => void }) {
  const showWinModal = useGameStore((s) => s.showWinModal)
  const dismissWin   = useGameStore((s) => s.dismissWin)
  const exitFreePlay = useGameStore((s) => s.exitFreePlay)

  if (!showWinModal) return null

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
        <div className="text-lg font-mono font-bold text-green-400 mb-0.5">Puzzle solved!</div>
        <div className="text-xs text-slate-500 font-mono mb-6 leading-relaxed">All outputs balanced.</div>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => { dismissWin(); onTryAnother() }}
            className="px-4 py-2 text-sm font-mono font-bold rounded-lg border border-amber-500/60 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 transition-all"
          >
            Try another →
          </button>
          <button
            onClick={() => { dismissWin(); exitFreePlay() }}
            className="px-4 py-2 text-sm font-mono rounded-lg border border-slate-600 text-slate-400 hover:bg-slate-700 active:scale-95 transition-all"
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  )
}

interface BlankCanvasProps {
  onTryAnother: () => void
}

export default function BlankCanvas({ onTryAnother }: BlankCanvasProps) {
  // Stable wrapper key — prevents accidental React Flow remounts on store updates
  const [mountKey] = useState(() => `fp-${Date.now()}`)
  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden" key={mountKey}>
      <main className="flex-1 relative overflow-hidden">
        <Canvas />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-full overflow-x-auto">
          <BeltSelectorBar />
        </div>
      </main>
      <FreePlaySidebar onAskNew={onTryAnother} />
      <WinBanner onTryAnother={onTryAnother} />
    </div>
  )
}
