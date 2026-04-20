import { useEffect } from 'react'
import { Handle, Position, type NodeProps, useUpdateNodeInternals } from 'reactflow'
import type { SplitterNodeData } from '../../types'
import { rotatePos, nextRotation, type Rotation } from '../../utils/rotation'
import { useGameStore } from '../../store/gameStore'

/**
 * SplitterNode — 1 input, up to 3 outputs on separate sides.
 *
 * Default handle positions (rotation = 0):
 *   target "in"    → Left   — hollow ring (receives)
 *   source "out-0" → Right  — solid dot (sends)
 *   source "out-1" → Top    — solid dot (sends)
 *   source "out-2" → Bottom — solid dot (sends)
 *
 * Rotation remaps all positions CW. useUpdateNodeInternals() tells React Flow
 * to re-measure handle DOM positions after each rotation change.
 */
export default function SplitterNode({ id, data, selected }: NodeProps<SplitterNodeData>) {
  const rotation: Rotation = (data.rotation ?? 0) as Rotation
  const rotateNode = useGameStore((s) => s.rotateNode)
  const isConnected = useGameStore((s) => s.edges.some((e) => e.source === id || e.target === id))
  const updateNodeInternals = useUpdateNodeInternals()

  // Tell React Flow to re-measure handle positions whenever rotation changes
  useEffect(() => {
    updateNodeInternals(id)
  }, [id, rotation, updateNodeInternals])

  const inPos   = rotatePos(Position.Left,   rotation)
  const out0Pos = rotatePos(Position.Right,  rotation)
  const out1Pos = rotatePos(Position.Top,    rotation)
  const out2Pos = rotatePos(Position.Bottom, rotation)

  const borderCls = selected
    ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25),0_0_12px_rgba(251,146,60,0.4)]'
    : 'border-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.2)]'

  return (
    <div className={`
      relative bg-slate-800 border-2 ${borderCls} rounded-lg
      w-[80px] h-[80px]
      flex flex-col items-center justify-center
      select-none group transition-shadow duration-100
    `}>
      {/* Input handle — hollow ring = "receives" */}
      <Handle
        type="target"
        position={inPos}
        id="in"
        className="!w-3 !h-3 !bg-slate-900 !border-2 !border-orange-400 !rounded-full"
      />

      {/* Label */}
      <div className="text-[9px] font-mono text-orange-400 uppercase tracking-[0.2em] leading-none">
        Split
      </div>
      <div className="text-lg font-mono text-orange-300 leading-none mt-1">÷</div>

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
            : 'text-orange-500 cursor-pointer',
        ].join(' ')}
        title={isConnected ? 'Disconnect edges to rotate' : 'Rotate (R)'}
      >
        ↻
      </button>

      {/* Output handles — solid dot = "sends" */}
      <Handle
        type="source"
        position={out0Pos}
        id="out-0"
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-slate-900 !rounded-full"
      />
      <Handle
        type="source"
        position={out1Pos}
        id="out-1"
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-slate-900 !rounded-full"
      />
      <Handle
        type="source"
        position={out2Pos}
        id="out-2"
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-slate-900 !rounded-full"
      />
    </div>
  )
}
