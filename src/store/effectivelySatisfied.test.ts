import { describe, it, expect } from 'vitest'
import type { Node } from 'reactflow'
import type { FlowResult } from '../types'
import { effectivelySatisfied } from './gameStore'

function input(id: string, rate: number): Node {
  return { id, type: 'inputNode', position: { x: 0, y: 0 }, data: { kind: 'input', rate } }
}
function tempInput(id: string, rate: number): Node {
  return { id, type: 'tempInputNode', position: { x: 0, y: 0 }, data: { kind: 'input', rate, isTemp: true } }
}
function output(id: string, targetRate: number): Node {
  return { id, type: 'outputNode', position: { x: 0, y: 0 }, data: { kind: 'output', targetRate } }
}
function flow(satisfied: boolean): FlowResult {
  return {
    edgeRates: {},
    nodeThroughput: {},
    outputResults: {},
    satisfied,
    unstable: false,
    overloadedEdges: new Set<string>(),
  }
}

describe('effectivelySatisfied', () => {
  it('returns false when flowResult is null', () => {
    expect(effectivelySatisfied([input('i', 60), output('o', 60)], null)).toBe(false)
  })

  it('returns false when outputs are not all met', () => {
    expect(effectivelySatisfied([input('i', 60), output('o', 60)], flow(false))).toBe(false)
  })

  it('returns true for a clean solution with no temp inputs', () => {
    const nodes = [input('i', 60), output('o1', 30), output('o2', 30)]
    expect(effectivelySatisfied(nodes, flow(true))).toBe(true)
  })

  it('returns true when temp input balance is exactly accounted for', () => {
    // Genuine loopback scaffolding: real 60 + temp 30 = 90 = total output target
    const nodes = [input('i', 60), tempInput('t', 30), output('o', 90)]
    expect(effectivelySatisfied(nodes, flow(true))).toBe(true)
  })

  it('returns false when a temp input adds slack absorbed by dead-end nodes (the exploit)', () => {
    // Outputs satisfied by real input alone (60 → 60); a sneaky temp input 60
    // is dumped into a disconnected splitter. flowResult.satisfied is true,
    // but real (60) + temp (60) ≠ output (60).
    const nodes = [input('i', 60), tempInput('t', 60), output('o', 60)]
    expect(effectivelySatisfied(nodes, flow(true))).toBe(false)
  })

  it('returns false when total inputs short of output (under-provisioning)', () => {
    // Pathological / shouldn't normally pass flowResult.satisfied, but guard anyway:
    // outputs sum 100, inputs sum 60.
    const nodes = [input('i', 60), output('o', 100)]
    // (Even if flowResult somehow claimed satisfied here, the math check fails.)
    expect(effectivelySatisfied(nodes, flow(true))).toBe(false)
  })

  it('tolerates float epsilon < 0.001', () => {
    const nodes = [input('i', 60.0001), output('o', 60)]
    expect(effectivelySatisfied(nodes, flow(true))).toBe(true)
  })

  it('rejects float drift > 0.001', () => {
    const nodes = [input('i', 60.01), output('o', 60)]
    expect(effectivelySatisfied(nodes, flow(true))).toBe(false)
  })

  it('handles multiple temp inputs summed', () => {
    // real 30 + temp 20 + temp 10 = 60 = output 60
    const nodes = [input('i', 30), tempInput('t1', 20), tempInput('t2', 10), output('o', 60)]
    expect(effectivelySatisfied(nodes, flow(true))).toBe(true)
  })
})
