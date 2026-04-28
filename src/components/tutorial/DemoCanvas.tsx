import { useEffect, useMemo, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  type NodeTypes,
  type Viewport,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useGameStore } from '../../store/gameStore'
import { chapters } from '../../tutorial/chapters'
import InputNode from '../nodes/InputNode'
import OutputNode from '../nodes/OutputNode'
import SplitterNode from '../nodes/SplitterNode'
import MergerNode from '../nodes/MergerNode'

const nodeTypes: NodeTypes = {
  inputNode: InputNode,
  outputNode: OutputNode,
  splitterNode: SplitterNode,
  mergerNode: MergerNode,
}

const NODE_W: Record<string, number> = { inputNode: 120, outputNode: 120, splitterNode: 80, mergerNode: 80 }
const NODE_H: Record<string, number> = { inputNode: 90,  outputNode: 122, splitterNode: 80, mergerNode: 80 }
const PAD = 80

/**
 * Compute a Viewport (x, y, zoom) that fits all placeNode positions for the
 * given chapter demo into a canvas of (containerW × containerH). We bypass
 * React Flow's fitView() because in our read-only configuration its viewport
 * updates don't propagate to the DOM transform.
 */
function viewportForChapter(chapterId: number | null, w: number, h: number): Viewport {
  if (!chapterId || w <= 0 || h <= 0) return { x: 0, y: 0, zoom: 1 }
  const ch = chapters.find((c) => c.id === chapterId)
  if (!ch) return { x: 0, y: 0, zoom: 1 }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const include = (x: number, y: number, nw: number, nh: number) => {
    minX = Math.min(minX, x); minY = Math.min(minY, y)
    maxX = Math.max(maxX, x + nw); maxY = Math.max(maxY, y + nh)
  }
  for (const inp of ch.tryItPuzzle.inputs) include(inp.position.x, inp.position.y, NODE_W.inputNode, NODE_H.inputNode)
  for (const out of ch.tryItPuzzle.outputs) include(out.position.x, out.position.y, NODE_W.outputNode, NODE_H.outputNode)
  for (const step of ch.demoSteps) {
    if (step.action.type !== 'placeNode') continue
    const a = step.action
    include(a.position.x, a.position.y, NODE_W[a.nodeType] ?? 100, NODE_H[a.nodeType] ?? 80)
  }
  if (!isFinite(minX)) return { x: 0, y: 0, zoom: 1 }

  const bboxW = maxX - minX
  const bboxH = maxY - minY
  const availW = Math.max(1, w - PAD * 2)
  const availH = Math.max(1, h - PAD * 2)
  const zoom = Math.min(availW / bboxW, availH / bboxH, 0.85)
  const scaledW = bboxW * zoom
  const scaledH = bboxH * zoom
  const x = (w - scaledW) / 2 - minX * zoom
  const y = (h - scaledH) / 2 - minY * zoom
  return { x, y, zoom }
}

/** Read-only canvas that renders the chapter demo's nodes/edges. */
export default function DemoCanvas() {
  const nodes = useGameStore((s) => s.demoNodes)
  const edges = useGameStore((s) => s.demoEdges)
  const currentChapterId = useGameStore((s) => s.currentChapterId)

  const wrapRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useEffect(() => {
    if (!wrapRef.current) return
    const el = wrapRef.current
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const viewport = useMemo(
    () => viewportForChapter(currentChapterId, size.w, size.h),
    [currentChapterId, size.w, size.h],
  )

  return (
    <div ref={wrapRef} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultViewport={viewport}
        fitView={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnDrag={false}
        panOnScroll={false}
        proOptions={{ hideAttribution: true }}
        key={`${currentChapterId}-${size.w}x${size.h}-${nodes.length}-${edges.length}`}
      >
        <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={20} size={1.5} />
      </ReactFlow>
    </div>
  )
}
