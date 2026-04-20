import { Handle, Position, type NodeProps } from 'reactflow'
import type { SplitterNodeData } from '../../types'
import { rotatePos, nextRotation, type Rotation } from '../../utils/rotation'
import { useGameStore } from '../../store/gameStore'

/**
 * SplitterNode — 1 input, up to 3 outputs on separate sides.
 *
 * Default handle positions (rotation = 0):
 *   target "in"    → Left  (center)
 *   source "out-0" → Right (center)
 *   source "out-1" → Top   (center)
 *   source "out-2" → Bottom (center)
 *
 * Rotating remaps all positions clockwise by rotation / 90 steps.
 */
export default function SplitterNode({ id, data }: NodeProps<SplitterNodeData>) {
  const rotation: Rotation = (data.rotation ?? 0) as Rotation
  const rotateNode = useGameStore((s) => s.rotateNode)

  const inPos    = rotatePos(Position.Left,   rotation)
  const out0Pos  = rotatePos(Position.Right,  rotation)
  const out1Pos  = rotatePos(Position.Top,    rotation)
  const out2Pos  = rotatePos(Position.Bottom, rotation)

  return (
    <div className="
      relative bg-slate-800 border-2 border-orange-400 rounded-lg
      w-[80px] h-[80px]
      flex flex-col items-center justify-center
      shadow-[0_0_10px_rgba(251,146,60,0.2)]
      select-none group
    ">
      <Handle
        type="target"
        position={inPos}
        id="in"
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-slate-900 !rounded-full"
      />

      {/* Label */}
      <div className="text-[9px] font-mono text-orange-400 uppercase tracking-[0.2em] leading-none">
        Split
      </div>
      <div className="text-lg font-mono text-orange-300 leading-none mt-1">÷</div>

      {/* Rotate button — appears on hover */}
      <button
        onClick={() => rotateNode(id, nextRotation(rotation))}
        className="
          absolute bottom-0.5 right-0.5
          text-[8px] font-mono text-orange-500 opacity-0 group-hover:opacity-100
          transition-opacity leading-none px-0.5
        "
        title="Rotate (R)"
      >
        ↻
      </button>

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
