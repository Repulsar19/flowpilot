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
import { NODE_TYPE_META } from "@/lib/classification";
import type { WorkflowRead } from "@/lib/types";
import { layoutGraph } from "./layout";
import { WorkflowNode, type WorkflowFlowNode } from "./WorkflowNode";

const nodeTypes = { workflowNode: WorkflowNode };

function buildGraph(workflow: WorkflowRead, selectedId: string | null): { nodes: WorkflowFlowNode[]; edges: Edge[] } {
  const positions = layoutGraph(workflow.nodes, workflow.edges);
  const agentByNode = new Map<string, string>();
  for (const a of workflow.agents) for (const nid of a.node_ids) agentByNode.set(nid, a.name);

  const nodes: WorkflowFlowNode[] = workflow.nodes.map((n) => ({
    id: n.node_id,
    type: "workflowNode",
    position: positions[n.node_id] ?? { x: 0, y: 0 },
    data: { node: n, selected: n.node_id === selectedId, agentName: agentByNode.get(n.node_id) ?? null },
    draggable: true,
  }));

  const edges: Edge[] = workflow.edges.map((e, i) => {
    const color = e.is_escalation ? "#e11d48" : "#94a3b8";
    return {
      id: `e${i}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      type: "smoothstep",
      label: e.label || undefined,
      labelStyle: { fontSize: 10, fill: e.is_escalation ? "#be123c" : "#475569", fontWeight: 500 },
      labelBgStyle: { fill: "#ffffff", fillOpacity: 0.9 },
      labelBgPadding: [4, 2] as [number, number],
      labelBgBorderRadius: 4,
      animated: e.is_escalation,
      style: { stroke: color, strokeWidth: e.is_escalation ? 1.5 : 1.75, strokeDasharray: e.is_escalation ? "6 4" : undefined },
      markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
    };
  });

  return { nodes, edges };
}

export function FutureStateFlow({
  workflow,
  selectedId,
  onSelect,
}: {
  workflow: WorkflowRead;
  selectedId: string | null;
  onSelect: (nodeId: string | null) => void;
}) {
  const graph = useMemo(() => buildGraph(workflow, selectedId), [workflow, selectedId]);
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowFlowNode>(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(graph.edges);
  // Open zoomed in on the first stretch of the flow so nodes are legible; users pan/scroll right or hit "Fit view".
  const initialFocus = useMemo(() => workflow.nodes.slice(0, 5).map((n) => ({ id: n.node_id })), [workflow.nodes]);

  useEffect(() => {
    // Preserve user-dragged positions when only selection changes.
    setNodes((prev) => {
      const prevPos = new Map(prev.map((n) => [n.id, n.position]));
      return graph.nodes.map((n) => ({ ...n, position: prevPos.get(n.id) ?? n.position }));
    });
    setEdges(graph.edges);
  }, [graph, setNodes, setEdges]);

  return (
    <ReactFlow<WorkflowFlowNode, Edge>
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => onSelect(node.id)}
      onPaneClick={() => onSelect(null)}
      fitView
      fitViewOptions={{ nodes: initialFocus, padding: 0.25, maxZoom: 0.95 }}
      minZoom={0.15}
      maxZoom={1.5}
      panOnScroll
      zoomOnScroll={false}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      className="bg-surface-muted"
    >
      <Background gap={20} size={1} color="#e2e8f0" />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => NODE_TYPE_META[(n as WorkflowFlowNode).data.node.type].hex}
        maskColor="rgba(248,250,252,0.7)"
      />
    </ReactFlow>
  );
}
