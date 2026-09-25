import dagre from "@dagrejs/dagre";
import type { WorkflowEdgeRead, WorkflowNodeRead } from "@/lib/types";

export const WF_NODE_WIDTH = 260;
export const WF_NODE_HEIGHT = 112;
export const WF_TERMINAL_SIZE = 56;
export const WF_DECISION_SIZE = 150;

export function nodeSize(type: WorkflowNodeRead["type"]): { width: number; height: number } {
  if (type === "START" || type === "END") return { width: WF_TERMINAL_SIZE, height: WF_TERMINAL_SIZE };
  if (type === "DECISION") return { width: WF_DECISION_SIZE, height: 84 };
  return { width: WF_NODE_WIDTH, height: WF_NODE_HEIGHT };
}

/** Left-to-right layered layout via dagre; returns absolute positions keyed by node_id. */
export function layoutGraph(nodes: WorkflowNodeRead[], edges: WorkflowEdgeRead[]): Record<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "LR", nodesep: 40, ranksep: 72, marginx: 24, marginy: 24 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) g.setNode(n.node_id, nodeSize(n.type));
  for (const e of edges) {
    // Escalation / return edges point "backwards"; give them low weight so the main path stays straight.
    g.setEdge(e.source, e.target, { weight: e.is_escalation ? 1 : 4, minlen: 1 });
  }
  dagre.layout(g);

  const positions: Record<string, { x: number; y: number }> = {};
  for (const n of nodes) {
    const p = g.node(n.node_id);
    const size = nodeSize(n.type);
    positions[n.node_id] = { x: p.x - size.width / 2, y: p.y - size.height / 2 };
  }
  return positions;
}
