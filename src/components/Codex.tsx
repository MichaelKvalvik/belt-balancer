interface CodexProps {
  onClose: () => void
}

// ── Node entries ──────────────────────────────────────────────────────────

const NODE_ENTRIES = [
  {
    name: 'Input Node',
    symbol: '→',
    borderCls: 'border-amber-500',
    textCls: 'text-amber-400',
    glowCls: 'shadow-[0_0_8px_rgba(245,158,11,0.15)]',
    description: 'A fixed-rate belt entry point. Rate is determined by the level and cannot be changed.',
    rule: 'Source only — connections leave from its right-side dot.',
  },
  {
    name: 'Output Node',
    symbol: '✓',
    borderCls: 'border-slate-500',
    textCls: 'text-slate-300',
    glowCls: 'shadow-[0_0_8px_rgba(100,116,139,0.15)]',
    description: 'A demand sink. Each Output node requires exactly its target rate to satisfy the level.',
    rule: 'Turns green when actual rate matches target within 0.1%.',
  },
  {
    name: 'Splitter',
    symbol: '÷',
    borderCls: 'border-orange-400',
    textCls: 'text-orange-300',
    glowCls: 'shadow-[0_0_8px_rgba(251,146,60,0.15)]',
    description: 'Divides incoming flow equally among all connected output ports.',
    rule: '2 outputs connected → 50% each. 3 outputs → 33.3% each.',
  },
  {
    name: 'Merger',
    symbol: '+',
    borderCls: 'border-sky-400',
    textCls: 'text-sky-300',
    glowCls: 'shadow-[0_0_8px_rgba(56,189,248,0.15)]',
    description: 'Sums all connected input flows into a single output belt.',
    rule: 'Three 20/min inputs → one 60/min output.',
  },
]

// ── Concept entries ───────────────────────────────────────────────────────

const CONCEPT_ENTRIES = [
  {
    title: 'Flow Conservation',
    body: 'Every item entering a node must exit. Splitters and mergers never create or destroy items — what goes in must come out.',
  },
  {
    title: 'Equal Split',
    body: 'A splitter divides by the number of connected output ports, ignoring any unconnected ones. Disconnect a port to change the ratio.',
  },
  {
    title: 'Uneven Split',
    body: "You can't get a 3:1 ratio from a single splitter. Chain nodes — e.g., split into thirds, then re-merge two of those thirds to get 2/3 on one belt.",
  },
  {
    title: 'Chaining',
    body: 'The output of any node feeds directly into the input of the next. Chains of splitters and mergers can produce any rational ratio.',
  },
]

// ── Component ─────────────────────────────────────────────────────────────

export default function Codex({ onClose }: CodexProps) {
  return (
    <div
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="font-mono font-bold text-amber-500 tracking-[0.2em] uppercase text-sm">
            Codex
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-mono text-base transition-colors leading-none"
          >
            ✕
          </button>
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">

          {/* Left: Nodes */}
          <div className="p-5">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">
              Nodes
            </div>
            <div className="space-y-3">
              {NODE_ENTRIES.map((e) => (
                <div
                  key={e.name}
                  className={`flex gap-3 items-start bg-slate-800/60 rounded-lg p-3 border ${e.borderCls}/30 ${e.glowCls}`}
                >
                  {/* Mini icon */}
                  <div className={`shrink-0 w-8 h-8 rounded border-2 ${e.borderCls} flex items-center justify-center font-mono font-bold text-base ${e.textCls}`}>
                    {e.symbol}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-mono font-bold ${e.textCls} mb-0.5`}>{e.name}</div>
                    <div className="text-[11px] font-mono text-slate-400 leading-relaxed mb-1">{e.description}</div>
                    <div className="text-[10px] font-mono text-slate-500 italic">{e.rule}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Handle legend */}
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-1.5">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
                Handle guide
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-slate-900 border-2 border-orange-400 shrink-0" />
                <span className="text-[10px] font-mono text-slate-400">Hollow ring — receives flow (target)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-400 border-2 border-slate-900 shrink-0" />
                <span className="text-[10px] font-mono text-slate-400">Solid dot — sends flow (source)</span>
              </div>
            </div>
          </div>

          {/* Right: Concepts */}
          <div className="p-5">
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-4">
              Concepts
            </div>
            <div className="space-y-3">
              {CONCEPT_ENTRIES.map((e) => (
                <div key={e.title} className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/40">
                  <div className="text-xs font-mono font-bold text-slate-200 mb-1">{e.title}</div>
                  <div className="text-[11px] font-mono text-slate-400 leading-relaxed">{e.body}</div>
                </div>
              ))}
            </div>

            {/* Tips */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest mb-2">
                Controls
              </div>
              <div className="space-y-1">
                {[
                  ['Del', 'Remove selected node or edge'],
                  ['R', 'Rotate selected splitter / merger'],
                  ['Ctrl+Z', 'Undo last action'],
                  ['Drag', 'Move nodes freely on canvas'],
                ].map(([key, desc]) => (
                  <div key={key} className="flex items-center gap-2">
                    <kbd className="text-[9px] font-mono bg-slate-700 border border-slate-600 rounded px-1.5 py-0.5 text-slate-300 shrink-0">{key}</kbd>
                    <span className="text-[10px] font-mono text-slate-500">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
