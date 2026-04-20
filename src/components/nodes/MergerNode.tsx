import { useEffect } from 'react'
import { Handle, Position, type NodeProps, useUpdateNodeInternals } from 'reactflow'
import type { MergerNodeData } from '../../types'
import { rotatePos, nextRotation, type Rotation } from '../../utils/rotation'
import { useGameStore } from '../../store/gameStore'

/**
 * MergerNode — up to 3 inputs on separate sides, 1 output.
 *
 * Default handle positions (rotation = 0):
 *   target "in-0" → Left   — hollow ring (receives)
 *   target "in-1" → Top    — hollow ring (receives)
 *   target "in-2" → Bottom — hollow ring (receives)
 *   source "out"  → Right  — solid dot (sends)
 *
 * Rotation remaps all positions CW. useUpdateNodeInternals() tells React Flow
 * to re-measure handle DOM positions after each rotation change.
 */
export default function MergerNode({ id, data, selected }: NodeProps<MergerNodeData>) {
  const rotation: Rotation = (data.rotation ?? 0) as Rotation
  const rotateNode = useGameStore((s) => s.rotateNode)
  const isConnected = useGameStore((s) => s.edges.some((e) => e.source === id || e.target === id))
  const updateNodeInternals = useUpdateNodeInternals()

  // Tell React Flow to re-measure handle positions whenever rotation changes
  useEffect(() => {
    updateNodeInternals(id)
  }, [id, rotation, updateNodeInternals])

  const in0Pos = rotatePos(Position.Left,   rotation)
  const in1Pos = rotatePos(Position.Top,    rotation)
  const in2Pos = rotatePos(Position.Bottom, rotation)
  const outPos = rotatePos(Position.Right,  rotation)

  const borderCls = selected
    ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25),0_0_12px_rgba(56,189,248,0.4)]'
    : 'border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.2)]'

  return (
    <div className={`
      relative bg-slate-800 border-2 ${borderCls} rounded-lg
      w-[80px] h-[80px]
      flex flex-col items-center justify-center
      select-none group transition-shadow duration-100
    `}>
      {/* Input handles — hollow ring = "receives" */}
      <Handle
        type="target"
        position={in0Pos}
        id="in-0"
        className="!w-3 !h-3 !bg-slate-900 !border-2 !border-sky-400 !rounded-full"
      />
      <Handle
        type="target"
        position={in1Pos}
        id="in-1"
        className="!w-3 !h-3 !bg-slate-900 !border-2 !border-sky-400 !rounded-full"
      />
      <Handle
        type="target"
        position={in2Pos}
        id="in-2"
        className="!w-3 !h-3 !bg-slate-900 !border-2 !border-sky-400 !rounded-full"
      />

      {/* Label */}
      <div className="text-[9px] font-mono text-sky-400 uppercase tracking-[0.2em] leading-none">
        Merge
      </div>
      <div className="text-lg font-mono text-sky-300 leading-none mt-1">+</div>

      {/* Rotate button */}
      <button
        disabled={isConnected}
        onClick={(e) => {
          e.stopPropagation()
          rotateNode(id, nextRotation(rotation))
        }}
        className={[
          'absolute bottom-0.5 right-0.5',
          'text-[8px] font-mono leading-none px-0.5',
          'opacity-0 group-hover:opacity-100 transition-opacity',
          isConnected
            ? 'text-slate-600 cursor-not-allowed'
            : 'text-sky-500 cursor-pointer',
        ].join(' ')}
        title={isConnected ? 'Disconnect edges to rotate' : 'Rotate (R)'}
      >
        ↻
      </button>

      {/* Output handle — solid dot = "sends" */}
      <Handle
        type="source"
        position={outPos}
        id="out"
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-slate-900 !rounded-full"
      />
    </div>
  )
}
