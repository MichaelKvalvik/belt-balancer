import { Handle, Position, type NodeProps } from 'reactflow'
import type { MergerNodeData } from '../../types'
import { rotatePos, nextRotation, type Rotation } from '../../utils/rotation'
import { useGameStore } from '../../store/gameStore'

/**
 * MergerNode — up to 3 inputs on separate sides, 1 output.
 *
 * Default handle positions (rotation = 0):
 *   target "in-0" → Left   (center)
 *   target "in-1" → Top    (center)
 *   target "in-2" → Bottom (center)
 *   source "out"  → Right  (center)
 *
 * Rotating remaps all positions clockwise by rotation / 90 steps.
 */
export default function MergerNode({ id, data }: NodeProps<MergerNodeData>) {
  const rotation: Rotation = (data.rotation ?? 0) as Rotation
  const rotateNode = useGameStore((s) => s.rotateNode)

  const in0Pos  = rotatePos(Position.Left,   rotation)
  const in1Pos  = rotatePos(Position.Top,    rotation)
  const in2Pos  = rotatePos(Position.Bottom, rotation)
  const outPos  = rotatePos(Position.Right,  rotation)

  return (
    <div className="
      relative bg-slate-800 border-2 border-sky-400 rounded-lg
      w-[80px] h-[80px]
      flex flex-col items-center justify-center
      shadow-[0_0_10px_rgba(56,189,248,0.2)]
      select-none group
    ">
      <Handle
        type="target"
        position={in0Pos}
        id="in-0"
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-slate-900 !rounded-full"
      />
      <Handle
        type="target"
        position={in1Pos}
        id="in-1"
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-slate-900 !rounded-full"
      />
      <Handle
        type="target"
        position={in2Pos}
        id="in-2"
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-slate-900 !rounded-full"
      />

      {/* Label */}
      <div className="text-[9px] font-mono text-sky-400 uppercase tracking-[0.2em] leading-none">
        Merge
      </div>
      <div className="text-lg font-mono text-sky-300 leading-none mt-1">+</div>

      {/* Rotate button — appears on hover */}
      <button
        onClick={() => rotateNode(id, nextRotation(rotation))}
        className="
          absolute bottom-0.5 right-0.5
          text-[8px] font-mono text-sky-500 opacity-0 group-hover:opacity-100
          transition-opacity leading-none px-0.5
        "
        title="Rotate (R)"
      >
        ↻
      </button>

      <Handle
        type="source"
        position={outPos}
        id="out"
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-slate-900 !rounded-full"
      />
    </div>
  )
}
