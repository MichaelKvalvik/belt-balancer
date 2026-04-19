import Canvas from './components/Canvas'
import { useGameStore } from './store/gameStore'

export default function App() {
  const { flowResult, validate, resetGraph } = useGameStore()

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 h-11 px-4 bg-slate-900 border-b border-slate-700 shrink-0 z-10">
        <h1 className="font-mono font-bold text-amber-500 tracking-[0.2em] text-base uppercase">
          Belt Balancer
        </h1>
        <div className="h-4 w-px bg-slate-700" />
        <span className="text-xs text-slate-500 font-mono">Step 2 — Solver</span>

        <div className="flex-1" />

        {/* Flow result badge */}
        {flowResult && (
          <div className={`
            flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-mono font-bold
            ${flowResult.satisfied
              ? 'text-green-400 bg-green-500/10 border border-green-500/30'
              : 'text-red-400 bg-red-500/10 border border-red-500/30'
            }
          `}>
            <span>{flowResult.satisfied ? '✓' : '✗'}</span>
            <span>{flowResult.satisfied ? 'Solved' : 'Unsolved'}</span>
          </div>
        )}
        {flowResult?.unstable && (
          <div className="text-xs font-mono text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 px-2 py-0.5 rounded">
            ⚠ Unstable
          </div>
        )}

        <button
          onClick={validate}
          className="px-3 py-1 text-xs font-mono rounded border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 active:bg-amber-500/20 transition-colors cursor-pointer"
        >
          Validate
        </button>
        <button
          onClick={resetGraph}
          className="px-3 py-1 text-xs font-mono rounded border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors cursor-pointer"
        >
          Reset
        </button>
        <button
          disabled
          className="px-3 py-1 text-xs font-mono rounded border border-slate-700 text-slate-600 cursor-not-allowed"
        >
          Codex
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar: level list ───────────────────────────────── */}
        <aside className="w-44 bg-slate-900 border-r border-slate-700 shrink-0 flex flex-col">
          <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
            Levels
          </div>
          <div className="flex-1 p-2 space-y-1">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-amber-500/10 border border-amber-500/30">
              <span className="text-[10px] font-mono text-amber-400 w-4">01</span>
              <span className="text-xs font-mono text-amber-300 truncate">Scaffold</span>
              {flowResult?.satisfied && (
                <span className="ml-auto text-green-400 text-[10px]">✓</span>
              )}
            </div>
          </div>
        </aside>

        {/* ── Main canvas ───────────────────────────────────────────── */}
        <main className="flex-1 relative overflow-hidden">
          <Canvas />
        </main>

        {/* ── Right sidebar: goal + flow stats ──────────────────────── */}
        <aside className="w-52 bg-slate-900 border-l border-slate-700 shrink-0 flex flex-col">
          <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
            Level Goal
          </div>
          <div className="p-3 space-y-2 border-b border-slate-800">
            <div className="bg-slate-800 rounded p-2">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-0.5">Input</div>
              <div className="text-amber-400 font-mono font-bold text-sm">60 / min</div>
            </div>
            <div className="flex items-center justify-center text-slate-600 font-mono text-xs">↓</div>
            <div className="bg-slate-800 rounded p-2">
              <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider mb-0.5">Output target</div>
              <div className="text-slate-300 font-mono font-bold text-sm">60 / min</div>
            </div>
          </div>

          {/* Flow stats (populated after Validate) */}
          {flowResult && (
            <>
              <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
                Flow Result
              </div>
              <div className="p-3 space-y-1.5">
                {Object.entries(flowResult.outputResults).map(([id, or]) => (
                  <div key={id} className="bg-slate-800 rounded p-2">
                    <div className="text-[10px] text-slate-500 font-mono mb-0.5">{id}</div>
                    <div className={`text-xs font-mono font-bold ${or.satisfied ? 'text-green-400' : 'text-red-400'}`}>
                      {or.actual.toFixed(1)} / {or.target}
                      <span className="ml-1">{or.satisfied ? '✓' : '✗'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800">
            Node Palette
          </div>
          <div className="p-3">
            <div className="text-xs text-slate-600 font-mono">Coming in Step 3…</div>
          </div>
        </aside>

      </div>
    </div>
  )
}
