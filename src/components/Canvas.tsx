import { useCallback, useEffect, useRef, useState } from 'react'
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  type NodeTypes,
  type Connection,
  type ReactFlowInstance,
  type NodeChange,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useGameStore } from '../store/gameStore'
import { nextRotation, type Rotation } from '../utils/rotation'
import InputNode from './nodes/InputNode'
import OutputNode from './nodes/OutputNode'
import SplitterNode from './nodes/SplitterNode'
import MergerNode from './nodes/MergerNode'
import TempInputNode from './nodes/TempInputNode'
import BuildablePanel from './BuildablePanel'

const nodeTypes: NodeTypes = {
  inputNode: InputNode,
  outputNode: OutputNode,
  splitterNode: SplitterNode,
  mergerNode: MergerNode,
  tempInputNode: TempInputNode,
}

interface SelBox { startX: number; startY: number; curX: number; curY: number }

export default function Canvas() {
  const wrapperRef    = useRef<HTMLDivElement>(null)
  // Store the RF instance in a ref so stable event handlers can read it without closure staleness
  const rfRef         = useRef<ReactFlowInstance | null>(null)
  const [selBox, setSelBox] = useState<SelBox | null>(null)
  const selBoxRef     = useRef<SelBox | null>(null)

  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, rotateNode, undo, setSelectedMark, remarkEdge, selectedMark, toggleBuildablePanel } =
    useGameStore()

  // Keep selBoxRef in sync for use inside stable window listeners
  useEffect(() => { selBoxRef.current = selBox }, [selBox])

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

      if (e.key === 'b' || e.key === 'B') {
        if (e.ctrlKey || e.metaKey || e.altKey) return
        toggleBuildablePanel()
        return
      }

      if (e.key === 'r' || e.key === 'R') {
        const selected = nodes.filter(
          (n) => n.selected && (n.type === 'splitterNode' || n.type === 'mergerNode'),
        )
        for (const n of selected) {
          const isConnected = edges.some((edge) => edge.source === n.id || edge.target === n.id)
          if (isConnected) continue
          const cur = ((n.data as { rotation?: number }).rotation ?? 0) as Rotation
          rotateNode(n.id, nextRotation(cur))
        }
        return
      }

      if (e.key >= '1' && e.key <= '6' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setSelectedMark(Number(e.key) as 1 | 2 | 3 | 4 | 5 | 6)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [nodes, edges, rotateNode, undo, setSelectedMark, toggleBuildablePanel])

  // ── Right-click drag: box selection ─────────────────────────────────────

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!selBoxRef.current) return
      setSelBox((prev) => prev ? { ...prev, curX: e.clientX, curY: e.clientY } : null)
    }

    function onMouseUp(e: MouseEvent) {
      if (e.button !== 2) return
      const box = selBoxRef.current
      if (!box || !rfRef.current || !wrapperRef.current) { setSelBox(null); return }

      const wRect  = wrapperRef.current.getBoundingClientRect()
      const { x: vpX, y: vpY, zoom } = rfRef.current.getViewport()

      // Selection rect in canvas-relative screen coordinates
      const selL = Math.min(box.startX, box.curX) - wRect.left
      const selR = Math.max(box.startX, box.curX) - wRect.left
      const selT = Math.min(box.startY, box.curY) - wRect.top
      const selB = Math.max(box.startY, box.curY) - wRect.top

      // Only bother selecting if the box has meaningful size
      if (selR - selL < 4 && selB - selT < 4) { setSelBox(null); return }

      // Convert each node's center to canvas-relative screen coords and test containment
      const changes: NodeChange[] = rfRef.current.getNodes().map((node) => {
        const w  = node.width  ?? 80
        const h  = node.height ?? 80
        const cx = (node.position.x + w / 2) * zoom + vpX
        const cy = (node.position.y + h / 2) * zoom + vpY
        return { type: 'select', id: node.id, selected: cx >= selL && cx <= selR && cy >= selT && cy <= selB }
      })

      onNodesChange(changes)
      setSelBox(null)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [onNodesChange]) // onNodesChange is stable from Zustand

  function onWrapperMouseDown(e: React.MouseEvent) {
    if (e.button !== 2) return
    e.preventDefault()
    setSelBox({ startX: e.clientX, startY: e.clientY, curX: e.clientX, curY: e.clientY })
  }

  // ── Drag-and-drop from palette ───────────────────────────────────────────

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      const nodeType = event.dataTransfer.getData('application/reactflow')
      if (!nodeType || !rfRef.current || !wrapperRef.current) return

      const bounds = wrapperRef.current.getBoundingClientRect()
      const position = rfRef.current.project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      })
      addNode(nodeType, position)
    },
    [addNode],
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

      const slotTaken = edges.some(
        (e) =>
          (e.source === source && e.sourceHandle === sourceHandle) ||
          (e.target === target && e.targetHandle === targetHandle),
      )
      return !slotTaken
    },
    [nodes, edges],
  )

  // ── Selection box overlay ────────────────────────────────────────────────

  const selBoxStyle = selBox && wrapperRef.current
    ? {
        left:   Math.min(selBox.startX, selBox.curX) - wrapperRef.current.getBoundingClientRect().left,
        top:    Math.min(selBox.startY, selBox.curY) - wrapperRef.current.getBoundingClientRect().top,
        width:  Math.abs(selBox.curX - selBox.startX),
        height: Math.abs(selBox.curY - selBox.startY),
      }
    : null

  return (
    <div
      ref={wrapperRef}
      className="w-full h-full relative"
      onDragOver={onDragOver}
      onDrop={onDrop}
      onMouseDown={onWrapperMouseDown}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Right-click drag selection rectangle */}
      {selBoxStyle && (
        <div
          className="absolute pointer-events-none z-50"
          style={{
            ...selBoxStyle,
            border: '1px solid rgba(245,158,11,0.55)',
            background: 'rgba(245,158,11,0.07)',
          }}
        />
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={(_, edge) => remarkEdge(edge.id, selectedMark)}
        nodeTypes={nodeTypes}
        onInit={(inst) => { rfRef.current = inst }}
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

      <BuildablePanel />
    </div>
  )
}
