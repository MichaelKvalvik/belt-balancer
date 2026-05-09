import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../store/gameStore'
import MobilePaletteBar from './MobilePaletteBar'

// No @testing-library installed in this project — these are smoke + behaviour
// tests that exercise the store hooks the component reads/writes, plus a basic
// assertion that the component is a callable React component.

describe('MobilePaletteBar', () => {
  beforeEach(() => {
    useGameStore.setState({ armedNodeType: null })
  })

  it('exports a function component', () => {
    expect(typeof MobilePaletteBar).toBe('function')
  })

  it('arming via store toggles when the same type is armed twice', () => {
    const { armNode } = useGameStore.getState()
    armNode('splitterNode')
    expect(useGameStore.getState().armedNodeType).toBe('splitterNode')
    armNode('splitterNode')
    expect(useGameStore.getState().armedNodeType).toBe(null)
  })

  it('arming switches between palette types', () => {
    const { armNode } = useGameStore.getState()
    armNode('mergerNode')
    expect(useGameStore.getState().armedNodeType).toBe('mergerNode')
    armNode('tempInputNode')
    expect(useGameStore.getState().armedNodeType).toBe('tempInputNode')
  })
})
