import { useGameStore } from '../../store/gameStore'
import PuzzleConfig from '../free/PuzzleConfig'
import BlankCanvas from '../free/BlankCanvas'

export default function FreePlayMode() {
  const freePlayConfig    = useGameStore((s) => s.freePlayConfig)
  const tryAnotherFreePlay = useGameStore((s) => s.tryAnotherFreePlay)

  if (freePlayConfig === null) return <PuzzleConfig />
  return <BlankCanvas onTryAnother={tryAnotherFreePlay} />
}
