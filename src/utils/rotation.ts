import { Position } from 'reactflow'

export type Rotation = 0 | 90 | 180 | 270

// Clockwise order: Left → Top → Right → Bottom → Left
const CW_ORDER = [Position.Left, Position.Top, Position.Right, Position.Bottom] as const

export function rotatePos(base: Position, rotation: Rotation = 0): Position {
  const steps = rotation / 90
  const idx = CW_ORDER.indexOf(base)
  if (idx === -1) return base
  return CW_ORDER[(idx + steps) % 4]
}

export function nextRotation(r: Rotation): Rotation {
  const map: Record<Rotation, Rotation> = { 0: 90, 90: 180, 180: 270, 270: 0 }
  return map[r]
}
