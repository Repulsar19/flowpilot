"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { ProcessStepRead } from "@/lib/types";
import { NODE_HEIGHT, NODE_WIDTH, ProcessStepNode, type StepNode } from "./ProcessStepNode";

const nodeTypes = { processStep: ProcessStepNode };
const GAP_Y = 56;
const GAP_X = 120;

/** Steps flow top-to-bottom, wrapping into additional columns so long processes stay legible. */
function columnsFor(count: number): number {
  if (count <= 5) return 1;
  if (count <= 10) return 2;
  return 3;
}

function buildGraph(steps: ProcessStepRead[], selectedId: string | null): { nodes: StepNode[]; edges: Edge[] } {
  const cols = columnsFor(steps.length);
  const rows = Math.ceil(steps.length / cols);

  const nodes: StepNode[] = steps.map((step, index) => {
    const col = Math.floor(index / rows);
    const row = index % rows;
    return {
      id: step.id,
      type: "processStep",
      position: { x: col * (NODE_WIDTH + GAP_X), y: row * (NODE_HEIGHT + GAP_Y) },
      data: { step, index, selected: step.id === selectedId },
      draggable: false,
    };
  });

  const edges: Edge[] = steps.slice(0, -1).map((step, index) => {
    const next = steps[index + 1];
    const handoff = step.actor && next.actor && step.actor !== next.actor;
    const wraps = Math.floor(index / rows) !== Math.floor((index + 1) / rows);
    return {
      id: `${step.id}->${next.id}`,
      source: step.id,
      target: next.id,
      // Vertical flow inside a column; column wraps exit right and enter the next column from the left.
      sourceHandle: wraps ? "s-right" : "s-bottom",
      targetHandle: wraps ? "t-left" : "t-top",
      type: "smoothstep",
      label: handoff ? `handoff → ${next.actor}` : undefined,
      labelStyle: { fontSize: 10, fill: "#64748b" },
      labelBgStyle: { fill: "#f8fafc" },
      labelBgPadding: [4, 2] as [number, number],
      style: { stroke: handoff ? "#f59e0b" : "#cbd5e1", strokeWidth: 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: handoff ? "#f59e0b" : "#cbd5e1" },
    };
  });

  return { nodes, edges };
}

export function ProcessFlow({
  steps,
  selectedId,
  onSelect,
}: {
  steps: ProcessStepRead[];
  selectedId: string | null;
  onSelect: (stepId: string | null) => void;
}) {
  const graph = useMemo(() => buildGraph(steps, selectedId), [steps, selectedId]);
  const [nodes, setNodes, onNodesChange] = useNodesState<StepNode>(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(graph.edges);

  useEffect(() => {
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  return (
    <ReactFlow<StepNode, Edge>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => onSelect(node.id)}
      onPaneClick={() => onSelect(null)}
      fitView
      fitViewOptions={{ padding: 0.08, maxZoom: 1 }}
      minZoom={0.3}
      maxZoom={1.5}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      className="bg-surface-muted"
    >
      <Background gap={20} size={1} color="#e2e8f0" />
      <Controls showInteractive={false} />
      <MiniMap pannable zoomable nodeColor={() => "#cbd5e1"} maskColor="rgba(248,250,252,0.7)" />
    </ReactFlow>
  );
}
