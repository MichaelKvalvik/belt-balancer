import { useEffect, useRef, useState } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import type { TempInputNodeData } from '../../types'
import { useGameStore } from '../../store/gameStore'

/**
 * Temporary scaffolding input — visually distinct from inputNode but flows
 * identically through the solver. Click to edit the rate; useful as a stand-in
 * for a planned loopback that hasn't been wired yet.
 */
export default function TempInputNode({ id, data, selected }: NodeProps<TempInputNodeData>) {
  const setTempInputRate = useGameStore((s) => s.setTempInputRate)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(data.rate))
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(String(data.rate))
  }, [data.rate, editing])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function commit() {
    const parsed = Number(draft)
    if (Number.isFinite(parsed) && parsed >= 0 && parsed !== data.rate) {
      setTempInputRate(id, parsed)
    } else {
      setDraft(String(data.rate))
    }
    setEditing(false)
  }

  const borderCls = selected
    ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25),0_0_12px_rgba(245,158,11,0.4)]'
    : 'border-amber-400/80 shadow-[0_0_10px_rgba(245,158,11,0.18)]'

  return (
    <div
      className={`relative bg-slate-800 border-2 border-dashed ${borderCls} rounded-lg
        w-[120px] px-4 py-3 text-center transition-shadow duration-100`}
      title="Temporary input — remove once your loopback is wired."
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
    >
      <span
        className="absolute top-0.5 right-1 text-[10px] font-mono text-amber-300/90 leading-none"
        aria-label="temporary"
      >
        ⚡
      </span>

      <div className="text-[9px] font-mono text-amber-400 uppercase tracking-[0.2em] mb-1">
        Input
      </div>

      {editing ? (
        <input
          ref={inputRef}
          type="number"
          min={0}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            else if (e.key === 'Escape') { setDraft(String(data.rate)); setEditing(false) }
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-full bg-slate-900 border border-amber-400/60 rounded text-center
            text-lg font-bold font-mono text-amber-300 leading-none px-1 py-0.5
            outline-none focus:border-amber-300"
        />
      ) : (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setEditing(true) }}
          className="block w-full text-2xl font-bold font-mono text-amber-300 leading-none cursor-text hover:text-amber-200"
          title="Click to edit rate"
        >
          {data.rate}
        </button>
      )}

      <div className="text-[9px] font-mono text-slate-500 mt-1 tracking-wider">
        items / min
      </div>
      <div className="text-[9px] font-mono text-amber-400/60 mt-0.5 italic tracking-wider">
        temp
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-slate-900 !rounded-full"
      />
    </div>
  )
}
