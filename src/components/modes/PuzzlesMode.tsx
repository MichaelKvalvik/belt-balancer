import { useGameStore } from '../../store/gameStore'
import DifficultyPicker from '../puzzle/DifficultyPicker'
import GeneratedPuzzleScreen from '../puzzle/GeneratedPuzzle'

export default function PuzzlesMode() {
  const generatedPuzzle = useGameStore((s) => s.generatedPuzzle)
  if (generatedPuzzle === null) return <DifficultyPicker />
  return <GeneratedPuzzleScreen />
}
