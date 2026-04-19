import Canvas from './components/Canvas'

export default function App() {
  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden">

      {/* ── Top bar ───────────────────────────────────────────────────── */}
      <header className="flex items-center gap-4 h-11 px-4 bg-slate-900 border-b border-slate-700 shrink-0 z-10">
        <h1 className="font-mono font-bold text-amber-500 tracking-[0.2em] text-base uppercase">
          Belt Balancer
        </h1>
        <div className="h-4 w-px bg-slate-700" />
        <span className="text-xs text-slate-500 font-mono">Step 1 — Scaffold</span>
        <div className="flex-1" />
        <button
          disabled
          className="px-3 py-1 text-xs font-mono rounded border border-slate-600 text-slate-500 cursor-not-allowed"
        >
          Validate
        </button>
        <button
          disabled
          className="px-3 py-1 text-xs font-mono rounded border border-slate-600 text-slate-500 cursor-not-allowed"
        >
          Reset
        </button>
        <button
          disabled
          className="px-3 py-1 text-xs font-mono rounded border border-slate-600 text-slate-500 cursor-not-allowed"
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
            </div>
          </div>
        </aside>

        {/* ── Main canvas ───────────────────────────────────────────── */}
        <main className="flex-1 relative overflow-hidden">
          <Canvas />
        </main>

        {/* ── Right sidebar: goal + palette ─────────────────────────── */}
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
