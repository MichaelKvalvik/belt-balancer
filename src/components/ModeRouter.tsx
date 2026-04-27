import { useGameStore } from '../store/gameStore'
import HomeScreen from './HomeScreen'
import TutorialMode from './modes/TutorialMode'
import PuzzlesMode from './modes/PuzzlesMode'
import FreePlayMode from './modes/FreePlayMode'

export default function ModeRouter() {
  const mode = useGameStore((s) => s.mode)

  if (mode === 'tutorial') return <TutorialMode />
  if (mode === 'puzzles') return <PuzzlesMode />
  if (mode === 'free') return <FreePlayMode />
  return <HomeScreen />
}
