import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from './gameStore'

// Reset relevant slice between tests so they don't bleed.
function reset() {
  useGameStore.setState({
    armedNodeType: null,
    nodes: useGameStore.getState().nodes,
    edges: useGameStore.getState().edges,
  })
}

describe('armedNodeType', () => {
  beforeEach(reset)

  it('starts null', () => {
    expect(useGameStore.getState().armedNodeType).toBe(null)
  })

  it('arms a type via armNode', () => {
    useGameStore.getState().armNode('splitterNode')
    expect(useGameStore.getState().armedNodeType).toBe('splitterNode')
  })

  it('toggles off when armed with the same type', () => {
    useGameStore.getState().armNode('splitterNode')
    useGameStore.getState().armNode('splitterNode')
    expect(useGameStore.getState().armedNodeType).toBe(null)
  })

  it('switches when armed with a different type', () => {
    useGameStore.getState().armNode('splitterNode')
    useGameStore.getState().armNode('mergerNode')
    expect(useGameStore.getState().armedNodeType).toBe('mergerNode')
  })

  it('disarms unconditionally when called with null', () => {
    useGameStore.getState().armNode('splitterNode')
    useGameStore.getState().armNode(null)
    expect(useGameStore.getState().armedNodeType).toBe(null)
  })

  it('placeArmedNode is a no-op when nothing is armed', () => {
    const before = useGameStore.getState().nodes.length
    useGameStore.getState().placeArmedNode({ x: 100, y: 100 })
    expect(useGameStore.getState().nodes.length).toBe(before)
    expect(useGameStore.getState().armedNodeType).toBe(null)
  })

  it('placeArmedNode adds a node and disarms', () => {
    // Start in puzzles mode with a budget so adds aren't blocked by level state.
    useGameStore.setState({
      mode: 'free',
      nodeBudget: { splitters: 5, mergers: 5 },
      nodes: [],
      edges: [],
      flowResult: null,
      history: [],
      armedNodeType: 'splitterNode',
    })
    useGameStore.getState().placeArmedNode({ x: 200, y: 200 })
    const s = useGameStore.getState()
    expect(s.armedNodeType).toBe(null)
    expect(s.nodes.some((n) => n.type === 'splitterNode')).toBe(true)
  })

  it('placeArmedNode disarms even when budget is full', () => {
    useGameStore.setState({
      mode: 'puzzles',
      nodeBudget: { splitters: 0, mergers: 0 },
      nodes: [],
      edges: [],
      flowResult: null,
      history: [],
      armedNodeType: 'splitterNode',
    })
    const before = useGameStore.getState().nodes.length
    useGameStore.getState().placeArmedNode({ x: 200, y: 200 })
    const s = useGameStore.getState()
    expect(s.armedNodeType).toBe(null)
    expect(s.nodes.length).toBe(before)
  })

  it('setMode disarms', () => {
    useGameStore.getState().armNode('splitterNode')
    useGameStore.getState().setMode('home')
    expect(useGameStore.getState().armedNodeType).toBe(null)
  })

  it('clearGeneratedPuzzle disarms', () => {
    useGameStore.setState({ armedNodeType: 'mergerNode' })
    useGameStore.getState().clearGeneratedPuzzle()
    expect(useGameStore.getState().armedNodeType).toBe(null)
  })

  it('exitFreePlay disarms', () => {
    useGameStore.setState({ armedNodeType: 'tempInputNode' })
    useGameStore.getState().exitFreePlay()
    expect(useGameStore.getState().armedNodeType).toBe(null)
  })
})
