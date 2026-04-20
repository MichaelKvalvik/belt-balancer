import { Handle, Position, type NodeProps } from 'reactflow'
import type { OutputNodeData } from '../../types'

export default function OutputNode({ data, selected }: NodeProps<OutputNodeData>) {
  const { targetRate, actualRate } = data
  const hasActual = actualRate !== undefined
  const satisfied = hasActual && Math.abs(actualRate - targetRate) < 0.001

  const borderCls = selected
    ? 'border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25)]'
    : hasActual
      ? satisfied
        ? 'border-green-500 shadow-[0_0_12px_rgba(34,197,94,0.3)]'
        : 'border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
      : 'border-slate-500 shadow-[0_0_12px_rgba(0,0,0,0.3)]'

  const rateColor = hasActual
    ? satisfied ? 'text-green-400' : 'text-red-400'
    : 'text-slate-300'

  return (
    <div className={`
      relative bg-slate-800 border-2 ${borderCls} rounded-lg
      w-[120px] px-4 py-3 text-center transition-shadow duration-100
    `}>
      {/* Target handle — hollow ring (receives) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-slate-900 !border-2 !border-slate-500 !rounded-full"
      />

      <div className="text-[9px] font-mono text-slate-500 uppercase tracking-[0.2em] mb-1">
        Output
      </div>
      <div className={`text-2xl font-bold font-mono ${rateColor} leading-none`}>
        {targetRate}
      </div>
      <div className="text-[9px] font-mono text-slate-500 mt-1 tracking-wider">
        target / min
      </div>

      {hasActual && (
        <div className={`text-[9px] font-mono mt-1.5 ${rateColor}`}>
          actual: {actualRate.toFixed(1)}
        </div>
      )}

      {hasActual && (
        <div className={`text-[9px] font-mono mt-0.5 font-bold tracking-wider ${satisfied ? 'text-green-400' : 'text-red-400'}`}>
          {satisfied ? '✓ MET' : '✗ UNMET'}
        </div>
      )}
    </div>
  )
}
