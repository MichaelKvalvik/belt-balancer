import ReactFlow, { Background, BackgroundVariant, type NodeTypes } from 'reactflow'
import 'reactflow/dist/style.css'

import { useGameStore } from '../../store/gameStore'
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

/** Read-only canvas that renders the chapter demo's nodes/edges. */
export default function DemoCanvas() {
  const nodes = useGameStore((s) => s.demoNodes)
  const edges = useGameStore((s) => s.demoEdges)

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        panOnDrag={false}
        panOnScroll={false}
        fitView
        fitViewOptions={{ padding: 0.35 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#1e293b" gap={20} size={1.5} />
      </ReactFlow>
    </div>
  )
}
