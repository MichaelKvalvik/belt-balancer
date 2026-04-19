import { Handle, Position, type NodeProps } from 'reactflow'
import type { SplitterNodeData } from '../../types'

/**
 * SplitterNode — 1 input on the left, up to 3 outputs on the right.
 *
 * Handle IDs:
 *   target: "in"   (left center)
 *   source: "out-0", "out-1", "out-2"  (right, top→bottom)
 *
 * The solver counts how many "out-*" edges are connected and divides
 * the incoming rate equally among them.
 */
export default function SplitterNode(_props: NodeProps<SplitterNodeData>) {
  return (
    <div className="
      relative bg-slate-800 border-2 border-orange-400 rounded-lg
      w-[80px] h-[80px]
      flex flex-col items-center justify-center
      shadow-[0_0_10px_rgba(251,146,60,0.2)]
      select-none
    ">
      {/* Single input — left center */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-slate-900 !rounded-full"
      />

      {/* Label */}
      <div className="text-[9px] font-mono text-orange-400 uppercase tracking-[0.2em] leading-none">
        Split
      </div>
      <div className="text-lg font-mono text-orange-300 leading-none mt-1 select-none">
        ÷
      </div>

      {/* Three outputs — right side, evenly spaced */}
      <Handle
        type="source"
        position={Position.Right}
        id="out-0"
        style={{ top: '25%' }}
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-slate-900 !rounded-full"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out-1"
        style={{ top: '50%' }}
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-slate-900 !rounded-full"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out-2"
        style={{ top: '75%' }}
        className="!w-3 !h-3 !bg-orange-400 !border-2 !border-slate-900 !rounded-full"
      />
    </div>
  )
}
