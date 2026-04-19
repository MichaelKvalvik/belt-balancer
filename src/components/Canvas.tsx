import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  type NodeTypes,
} from 'reactflow'
import 'reactflow/dist/style.css'

import { useGameStore } from '../store/gameStore'
import InputNode from './nodes/InputNode'
import OutputNode from './nodes/OutputNode'

const nodeTypes: NodeTypes = {
  inputNode: InputNode,
  outputNode: OutputNode,
}

export default function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useGameStore()

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        snapToGrid
        snapGrid={[20, 20]}
        fitView
        fitViewOptions={{ padding: 0.4 }}
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
