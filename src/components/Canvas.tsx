import { useCallback, useEffect, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  type NodeTypes,
  type Connection,
  type ReactFlowInstance,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useGameStore } from '../store/gameStore'
import { nextRotation, type Rotation } from '../utils/rotation'
import InputNode from './nodes/InputNode'
import OutputNode from './nodes/OutputNode'
import SplitterNode from './nodes/SplitterNode'
import MergerNode from './nodes/MergerNode'

const nodeTypes: NodeTypes = {
  inputNode: InputNode,
  outputNode: OutputNode,
  splitterNode: SplitterNode,
  mergerNode: MergerNode,
}

export default function Canvas() {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, rotateNode, undo } =
    useGameStore()

  // ── Keyboard shortcuts ───────────────────────────────────────────────────

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        undo()
        return
      }

      if (e.key === 'r' || e.key === 'R') {
        // Rotate selected splitter/merger nodes that have no connected edges
        const selected = nodes.filter(
          (n) => n.selected && (n.type === 'splitterNode' || n.type === 'mergerNode'),
        )
        for (const n of selected) {
          const isConnected = edges.some((edge) => edge.source === n.id || edge.target === n.id)
          if (isConnected) continue
          const cur = ((n.data as { rotation?: number }).rotation ?? 0) as Rotation
          rotateNode(n.id, nextRotation(cur))
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [nodes, edges, rotateNode, undo])

  // ── Drag-and-drop from palette ───────────────────────────────────────────

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const nodeType = event.dataTransfer.getData('application/reactflow')
      if (!nodeType || !rfInstance || !wrapperRef.current) return

      const bounds = wrapperRef.current.getBoundingClientRect()
      const position = rfInstance.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })
      addNode(nodeType, position)
    },
    [rfInstance, addNode],
  )

  // ── Connection validation ────────────────────────────────────────────────

  const isValidConnection = useCallback(
    (connection: Connection) => {
      const { source, target, sourceHandle, targetHandle } = connection
      if (!source || !target) return false

      const srcNode = nodes.find((n) => n.id === source)
      const tgtNode = nodes.find((n) => n.id === target)
      if (!srcNode || !tgtNode) return false
      if (tgtNode.type === 'inputNode') return false
      if (srcNode.type === 'outputNode') return false
      if (source === target) return false

      // One edge per handle slot
      const slotTaken = edges.some(
        (e) =>
          (e.source === source && e.sourceHandle === sourceHandle) ||
          (e.target === target && e.targetHandle === targetHandle),
      )
      return !slotTaken
    },
    [nodes, edges],
  )

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full"
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onInit={setRfInstance}
        isValidConnection={isValidConnection}
        snapToGrid
        snapGrid={[20, 20]}
        fitView
        fitViewOptions={{ padding: 0.35 }}
        deleteKeyCode="Delete"
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#f59e0b', strokeWidth: 2 },
        }}
        proOptions={{ hideAttribution: false }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          color="#1e293b"
          gap={20}
          size={1.5}
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}
