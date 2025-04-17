"use client";
import { useCallback } from 'react';
import { 
  ReactFlow, 
  MiniMap, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Start: Cheque Bounce Case' },
    position: { x: 250, y: 0 },
    style: { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', width: 200 }
  },
  {
    id: '2',
    data: { label: 'Send Legal Notice within 30 days' },
    position: { x: 250, y: 100 },
    style: { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', width: 200 }
  },
  {
    id: '3',
    data: { label: 'Wait for 15 days for response' },
    position: { x: 250, y: 200 },
    style: { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', width: 200 }
  },
  {
    id: '4',
    data: { label: 'File complaint u/s 138 NI Act' },
    position: { x: 250, y: 300 },
    style: { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', width: 200 }
  },
  {
    id: '5',
    data: { label: 'Court issues summons' },
    position: { x: 250, y: 400 },
    style: { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', width: 200 }
  },
  {
    id: '6',
    type: 'output',
    data: { label: 'Trial process begins' },
    position: { x: 250, y: 500 },
    style: { backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', width: 200 }
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#3b82f6' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#3b82f6' } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#3b82f6' } },
  { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#3b82f6' } },
  { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: '#3b82f6' } },
];

export default function FlowchartDemo() {
  const [nodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  return (
    <section className="py-20 bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">See Our Legal Flowcharts in Action</h2>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Visualize complex legal processes step-by-step, making it easier to understand procedural requirements and deadlines.
          </p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 mb-10">
          <div className="text-xl font-semibold mb-4 text-slate-900">
            Sample: How to file a cheque bounce complaint?
          </div>
          <div style={{ height: 600 }} className="border rounded-lg">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onEdgesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              attributionPosition="bottom-right"
            >
              <Controls />
              <MiniMap />
              <Background color="#f1f5f9" gap={16} />
            </ReactFlow>
          </div>
        </div>
      </div>
    </section>
  );
}