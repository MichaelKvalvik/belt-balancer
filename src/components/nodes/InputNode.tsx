import { Handle, Position, type NodeProps } from 'reactflow'
import type { InputNodeData } from '../../types'

export default function InputNode({ data, selected }: NodeProps<InputNodeData>) {
  const borderCls = selected
    ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25),0_0_12px_rgba(245,158,11,0.4)]'
    : 'border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.25)]'

  return (
    <div className={`
      relative bg-slate-800 border-2 ${borderCls} rounded-lg
      w-[120px] px-4 py-3 text-center transition-shadow duration-100
    `}>
      <div className="text-[9px] font-mono text-amber-500 uppercase tracking-[0.2em] mb-1">
        Input
      </div>
      <div className="text-2xl font-bold font-mono text-amber-400 leading-none">
        {data.rate}
      </div>
      <div className="text-[9px] font-mono text-slate-500 mt-1 tracking-wider">
        items / min
      </div>

      {/* Source handle — solid dot (sends) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-slate-900 !rounded-full"
      />
    </div>
  )
}
