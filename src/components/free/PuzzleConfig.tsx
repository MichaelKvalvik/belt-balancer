import { useMemo, useState } from 'react'
import { useGameStore } from '../../store/gameStore'
import { BELT_CAPACITY, type BeltMark, type FreePlayConfig, type FreePlayInput, type FreePlayOutput } from '../../types'

const BELT_MARKS: BeltMark[] = [1, 2, 3, 4, 5, 6]

function lowestMarkForRate(rate: number): BeltMark {
  for (const m of BELT_MARKS) if (BELT_CAPACITY[m] >= rate) return m
  return 6
}

interface InputDraft  { id: string; rate: number; mark: BeltMark; markTouched: boolean }
interface OutputDraft { id: string; targetRate: number }

function makeInput(idx: number, rate = 60): InputDraft {
  return { id: `fp-in-${idx}`, rate, mark: lowestMarkForRate(rate), markTouched: false }
}
function makeOutput(idx: number, targetRate = 60): OutputDraft {
  return { id: `fp-out-${idx}`, targetRate }
}

/** Heuristic: warn when allowLoopbacks is off and a single-input puzzle's outputs
 *  are not power-of-2 fractions of the input rate (a known loopback signal). */
function maybeNeedsLoopback(inputs: InputDraft[], outputs: OutputDraft[]): boolean {
  if (inputs.length !== 1) return false
  const r = inputs[0].rate
  const eps = 1e-6
  return outputs.some((o) => {
    let v = r
    for (let k = 0; k < 8; k++) {
      if (Math.abs(v - o.targetRate) < eps) return false
      v /= 2
      if (v < o.targetRate - eps) break
    }
    return true
  })
}

export default function PuzzleConfig() {
  const startFreePlay = useGameStore((s) => s.startFreePlay)
  const setMode       = useGameStore((s) => s.setMode)

  const [inputs,  setInputs]  = useState<InputDraft[]> ([makeInput(1, 60)])
  const [outputs, setOutputs] = useState<OutputDraft[]>([makeOutput(1, 60)])
  const [maxMark, setMaxMark] = useState<BeltMark>(6)
  const [allowLoopbacks, setAllowLoopbacks] = useState(false)

  const inputSum  = useMemo(() => inputs .reduce((s, i) => s + (Number.isFinite(i.rate)       ? i.rate       : 0), 0), [inputs])
  const outputSum = useMemo(() => outputs.reduce((s, o) => s + (Number.isFinite(o.targetRate) ? o.targetRate : 0), 0), [outputs])

  const inputErrors  = inputs .map((i) => !Number.isInteger(i.rate)       || i.rate       <= 0)
  const outputErrors = outputs.map((o) => !Number.isInteger(o.targetRate) || o.targetRate <= 0)
  const anyFieldError = inputErrors.some(Boolean) || outputErrors.some(Boolean)
  const sumsMatch     = !anyFieldError && inputSum === outputSum && inputSum > 0
  const canStart      = sumsMatch
  const loopbackWarn  = canStart && !allowLoopbacks && maybeNeedsLoopback(inputs, outputs)

  function updateInputRate(idx: number, val: number) {
    setInputs((prev) => prev.map((row, i) => {
      if (i !== idx) return row
      const rate = val
      const mark = row.markTouched ? row.mark : lowestMarkForRate(rate)
      return { ...row, rate, mark }
    }))
  }
  function updateInputMark(idx: number, mark: BeltMark) {
    setInputs((prev) => prev.map((row, i) => i === idx ? { ...row, mark, markTouched: true } : row))
  }
  function updateOutputRate(idx: number, val: number) {
    setOutputs((prev) => prev.map((row, i) => i === idx ? { ...row, targetRate: val } : row))
  }
  function addInput() {
    setInputs((prev) => prev.length >= 6 ? prev : [...prev, makeInput(prev.length + 1, 60)])
  }
  function removeInput(idx: number) {
    setInputs((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx))
  }
  function addOutput() {
    setOutputs((prev) => prev.length >= 6 ? prev : [...prev, makeOutput(prev.length + 1, 60)])
  }
  function removeOutput(idx: number) {
    setOutputs((prev) => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx))
  }

  function onStart() {
    if (!canStart) return
    // Re-key IDs sequentially so removals don't leave gaps.
    const config: FreePlayConfig = {
      inputs:  inputs .map<FreePlayInput> ((row, i) => ({ id: `fp-in-${i + 1}`,  rate: row.rate, mark: row.mark })),
      outputs: outputs.map<FreePlayOutput>((row, i) => ({ id: `fp-out-${i + 1}`, targetRate: row.targetRate })),
      constraints: { maxMark, allowLoopbacks },
    }
    startFreePlay(config)
  }

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-200 font-mono overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[11px] text-slate-500 uppercase tracking-widest">Free Play</div>
            <h1 className="text-2xl font-bold text-amber-400">Design your puzzle</h1>
          </div>
          <button
            onClick={() => setMode('home')}
            className="text-xs text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 rounded px-3 py-1.5 transition-colors"
          >
            ← Home
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Inputs column */}
          <section className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-amber-300 text-sm font-bold uppercase tracking-wider">Inputs</h2>
              <span className="text-[10px] text-slate-500">{inputs.length}/6</span>
            </div>
            <div className="space-y-2">
              {inputs.map((row, i) => (
                <div key={i} className="bg-slate-800/60 rounded p-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase w-12">In {i + 1}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={10}
                      value={Number.isFinite(row.rate) ? row.rate : ''}
                      onChange={(e) => updateInputRate(i, Math.floor(Number(e.target.value)))}
                      className={[
                        'flex-1 bg-slate-950 border rounded px-2 py-1 text-sm text-amber-300',
                        inputErrors[i] ? 'border-red-500/60' : 'border-slate-700 focus:border-amber-500/60',
                        'focus:outline-none',
                      ].join(' ')}
                      aria-label={`Input ${i + 1} rate`}
                    />
                    <span className="text-[10px] text-slate-500">/min</span>
                    <button
                      onClick={() => removeInput(i)}
                      disabled={inputs.length <= 1}
                      className="text-[10px] text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed px-1.5"
                      aria-label="Remove input"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pl-14">
                    <span className="text-[10px] text-slate-500 uppercase">Belt</span>
                    <select
                      value={row.mark}
                      onChange={(e) => updateInputMark(i, Number(e.target.value) as BeltMark)}
                      className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-slate-300 focus:outline-none focus:border-amber-500/60"
                      aria-label={`Input ${i + 1} belt tier`}
                    >
                      {BELT_MARKS.map((m) => (
                        <option key={m} value={m}>
                          Mk.{m} ({BELT_CAPACITY[m]}/min)
                        </option>
                      ))}
                    </select>
                    {row.rate > BELT_CAPACITY[row.mark] && (
                      <span className="text-[10px] text-red-400">⚠ rate exceeds Mk.{row.mark}</span>
                    )}
                  </div>
                  {inputErrors[i] && (
                    <div className="text-[10px] text-red-400 pl-14">Must be a positive integer.</div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addInput}
              disabled={inputs.length >= 6}
              className="mt-3 w-full text-[11px] text-amber-400 border border-amber-500/40 hover:bg-amber-500/10 disabled:opacity-30 disabled:cursor-not-allowed rounded py-1.5 transition-colors"
            >
              + Add input
            </button>
            <div className="mt-2 text-[11px] text-slate-500">Total: <span className="text-amber-300">{inputSum}/min</span></div>
          </section>

          {/* Outputs column */}
          <section className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sky-300 text-sm font-bold uppercase tracking-wider">Outputs</h2>
              <span className="text-[10px] text-slate-500">{outputs.length}/6</span>
            </div>
            <div className="space-y-2">
              {outputs.map((row, i) => (
                <div key={i} className="bg-slate-800/60 rounded p-2 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 uppercase w-12">Out {i + 1}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={10}
                      value={Number.isFinite(row.targetRate) ? row.targetRate : ''}
                      onChange={(e) => updateOutputRate(i, Math.floor(Number(e.target.value)))}
                      className={[
                        'flex-1 bg-slate-950 border rounded px-2 py-1 text-sm text-sky-300',
                        outputErrors[i] ? 'border-red-500/60' : 'border-slate-700 focus:border-sky-500/60',
                        'focus:outline-none',
                      ].join(' ')}
                      aria-label={`Output ${i + 1} target rate`}
                    />
                    <span className="text-[10px] text-slate-500">/min</span>
                    <button
                      onClick={() => removeOutput(i)}
                      disabled={outputs.length <= 1}
                      className="text-[10px] text-slate-500 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed px-1.5"
                      aria-label="Remove output"
                    >
                      ✕
                    </button>
                  </div>
                  {outputErrors[i] && (
                    <div className="text-[10px] text-red-400 pl-14">Must be a positive integer.</div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addOutput}
              disabled={outputs.length >= 6}
              className="mt-3 w-full text-[11px] text-sky-400 border border-sky-500/40 hover:bg-sky-500/10 disabled:opacity-30 disabled:cursor-not-allowed rounded py-1.5 transition-colors"
            >
              + Add output
            </button>
            <div className="mt-2 text-[11px] text-slate-500">Total: <span className="text-sky-300">{outputSum}/min</span></div>
          </section>
        </div>

        {/* Constraints */}
        <section className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-6">
          <h2 className="text-slate-300 text-sm font-bold uppercase tracking-wider mb-3">Constraints (optional)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center justify-between gap-3 bg-slate-800/60 rounded p-2">
              <span className="text-xs text-slate-300">Max belt tier</span>
              <select
                value={maxMark}
                onChange={(e) => setMaxMark(Number(e.target.value) as BeltMark)}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-amber-500/60"
              >
                {BELT_MARKS.map((m) => (
                  <option key={m} value={m}>
                    Mk.{m}{m === 6 ? ' (no limit)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between gap-3 bg-slate-800/60 rounded p-2 cursor-pointer">
              <span className="text-xs text-slate-300">Allow loopbacks</span>
              <input
                type="checkbox"
                checked={allowLoopbacks}
                onChange={(e) => setAllowLoopbacks(e.target.checked)}
                className="accent-amber-500 w-4 h-4"
              />
            </label>
          </div>
        </section>

        {/* Pre-flight check */}
        <section className="mb-6">
          {!sumsMatch && !anyFieldError && (
            <div className="bg-red-950/40 border border-red-500/40 text-red-300 text-xs rounded p-3">
              Input total ({inputSum}/min) must equal output total ({outputSum}/min).
            </div>
          )}
          {anyFieldError && (
            <div className="bg-red-950/40 border border-red-500/40 text-red-300 text-xs rounded p-3">
              All rates must be positive integers.
            </div>
          )}
          {loopbackWarn && (
            <div className="mt-2 bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs rounded p-3">
              This puzzle likely requires a loopback — consider enabling loopbacks or adjusting your rates.
            </div>
          )}
          {sumsMatch && !loopbackWarn && (
            <div className="bg-green-950/30 border border-green-500/30 text-green-300 text-xs rounded p-3">
              Sums balanced ({inputSum}/min). Ready to play.
            </div>
          )}
        </section>

        <div className="flex justify-end">
          <button
            onClick={onStart}
            disabled={!canStart}
            className={[
              'px-5 py-2 text-sm font-bold rounded-lg border transition-all',
              canStart
                ? 'border-amber-500/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 active:scale-95'
                : 'border-slate-700 text-slate-500 opacity-60 cursor-not-allowed',
            ].join(' ')}
          >
            Start Puzzle →
          </button>
        </div>
      </div>
    </div>
  )
}
