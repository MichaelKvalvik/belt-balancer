import { Handle, Position, type NodeProps } from 'reactflow'
import type { MergerNodeData } from '../../types'

/**
 * MergerNode — up to 3 inputs on the left, 1 output on the right.
 *
 * Handle IDs:
 *   target: "in-0", "in-1", "in-2"  (left, top→bottom)
 *   source: "out"  (right center)
 *
 * The solver sums all connected "in-*" edge rates and pushes the total
 * onto the single "out" edge.
 */
export default function MergerNode(_props: NodeProps<MergerNodeData>) {
  return (
    <div className="
      relative bg-slate-800 border-2 border-sky-400 rounded-lg
      w-[80px] h-[80px]
      flex flex-col items-center justify-center
      shadow-[0_0_10px_rgba(56,189,248,0.2)]
      select-none
    ">
      {/* Three inputs — left side, evenly spaced */}
      <Handle
        type="target"
        position={Position.Left}
        id="in-0"
        style={{ top: '25%' }}
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-slate-900 !rounded-full"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="in-1"
        style={{ top: '50%' }}
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-slate-900 !rounded-full"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="in-2"
        style={{ top: '75%' }}
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-slate-900 !rounded-full"
      />

      {/* Label */}
      <div className="text-[9px] font-mono text-sky-400 uppercase tracking-[0.2em] leading-none">
        Merge
      </div>
      <div className="text-lg font-mono text-sky-300 leading-none mt-1 select-none">
        +
      </div>

      {/* Single output — right center */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-slate-900 !rounded-full"
      />
    </div>
  )
}
