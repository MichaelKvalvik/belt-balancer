import { useState } from 'react'
import type { Blueprint } from '../types'

interface BlueprintPanelProps {
  blueprints: Blueprint[]
  splitterLeft: number
  mergerLeft: number
  hasSelection: boolean
  onSave: (name: string) => void
  onStamp: (id: string) => void
  onDelete: (id: string) => void
}

export default function BlueprintPanel({
  blueprints,
  splitterLeft,
  mergerLeft,
  hasSelection,
  onSave,
  onStamp,
  onDelete,
}: BlueprintPanelProps) {
  const [saving, setSaving] = useState(false)
  const [name, setName]     = useState('')

  function handleSave() {
    onSave(name)
    setName('')
    setSaving(false)
  }

  function canStamp(bp: Blueprint) {
    return bp.splitterCount <= splitterLeft && bp.mergerCount <= mergerLeft
  }

  function costLabel(bp: Blueprint) {
    const parts: string[] = []
    if (bp.splitterCount > 0) parts.push(`${bp.splitterCount}S`)
    if (bp.mergerCount   > 0) parts.push(`${bp.mergerCount}M`)
    return parts.length > 0 ? parts.join(' ') : '—'
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 text-[10px] font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800 flex items-center justify-between">
        <span>Blueprints</span>
        {!saving && hasSelection && (
          <button
            onClick={() => setSaving(true)}
            className="text-[10px] font-mono text-amber-500 hover:text-amber-300 transition-colors leading-none"
            title="Save selected splitters/mergers as a blueprint"
          >
            + Save selection
          </button>
        )}
      </div>

      {/* Inline save form */}
      {saving && (
        <div className="p-3 border-b border-slate-800 space-y-2">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') { setSaving(false); setName('') }
            }}
            placeholder="Blueprint name…"
            className="w-full text-[11px] font-mono bg-slate-800 border border-slate-600 rounded px-2 py-1 text-slate-200 placeholder-slate-600 outline-none focus:border-amber-500/60"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 text-[10px] font-mono text-amber-400 border border-amber-500/40 rounded py-1 hover:bg-amber-500/10 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => { setSaving(false); setName('') }}
              className="flex-1 text-[10px] font-mono text-slate-500 border border-slate-700 rounded py-1 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Blueprint list */}
      <div className="p-3 space-y-1.5">
        {blueprints.length === 0 ? (
          <p className="text-[10px] font-mono text-slate-600 leading-relaxed">
            Select splitters or mergers on the canvas, then use <span className="text-slate-500">+ Save selection</span> above to save a reusable blueprint.
          </p>
        ) : (
          blueprints.map((bp) => {
            const stampable = canStamp(bp)
            return (
              <div
                key={bp.id}
                className={[
                  'flex items-center gap-2 rounded p-2 border',
                  stampable
                    ? 'bg-slate-800/60 border-slate-700/40'
                    : 'bg-slate-800/20 border-slate-800/60 opacity-50',
                ].join(' ')}
              >
                {/* Name + cost */}
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono text-slate-200 truncate">{bp.name}</div>
                  <div className="text-[9px] font-mono text-slate-500">{costLabel(bp)}</div>
                </div>

                {/* Stamp */}
                <button
                  onClick={() => stampable && onStamp(bp.id)}
                  disabled={!stampable}
                  title={stampable ? 'Stamp onto canvas' : 'Not enough budget'}
                  className={[
                    'text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors',
                    stampable
                      ? 'text-amber-400 border-amber-500/40 hover:bg-amber-500/10'
                      : 'text-slate-600 border-slate-700 cursor-not-allowed',
                  ].join(' ')}
                >
                  ↓
                </button>

                {/* Delete */}
                <button
                  onClick={() => onDelete(bp.id)}
                  title="Delete blueprint"
                  className="text-[10px] font-mono text-slate-600 hover:text-red-400 px-1 transition-colors"
                >
                  ✕
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
