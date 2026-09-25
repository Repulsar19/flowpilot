"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { AlertOctagon, Clock, ShieldCheck } from "lucide-react";
import { NODE_TYPE_META } from "@/lib/classification";
import type { WorkflowNodeRead } from "@/lib/types";
import { WF_DECISION_SIZE, WF_NODE_WIDTH, WF_TERMINAL_SIZE } from "./layout";

export type WorkflowNodeData = { node: WorkflowNodeRead; selected: boolean; agentName?: string | null };
export type WorkflowFlowNode = Node<WorkflowNodeData, "workflowNode">;

const HANDLE = "!h-2 !w-2 !border-0 !bg-transparent";

function Handles() {
  return (
    <>
      <Handle type="target" position={Position.Left} className={HANDLE} />
      <Handle type="source" position={Position.Right} className={HANDLE} />
    </>
  );
}

function WorkflowNodeComponent({ data }: NodeProps<WorkflowFlowNode>) {
  const { node, selected, agentName } = data;
  const meta = NODE_TYPE_META[node.type];
  const Icon = meta.icon;

  if (node.type === "START" || node.type === "END") {
    return (
      <div
        style={{ width: WF_TERMINAL_SIZE, height: WF_TERMINAL_SIZE }}
        className={`flex items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white shadow-card ${selected ? "ring-2 ring-brand-300" : ""}`}
        title={node.name}
      >
        <Handles />
        {node.type === "START" ? "Start" : "End"}
      </div>
    );
  }

  if (node.type === "DECISION") {
    return (
      <div style={{ width: WF_DECISION_SIZE }} className="relative flex h-[84px] items-center justify-center">
        <Handles />
        <div
          className={`absolute inset-x-[33px] inset-y-[9px] rotate-45 rounded-md border-2 bg-rose-50 ${
            selected ? "border-brand-500" : "border-rose-300"
          }`}
        />
        <div className="relative px-3 text-center">
          <p className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
            <Icon className="h-3 w-3" /> Decision
          </p>
          <p className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-tight text-rose-950">{node.name}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ width: WF_NODE_WIDTH }}
      className={`overflow-hidden rounded-xl border bg-white shadow-card ${selected ? "border-brand-500 ring-2 ring-brand-100" : "border-surface-border hover:border-slate-300"}`}
    >
      <Handles />
      <div className={`flex items-center justify-between gap-2 px-3 py-1.5 ${meta.header}`}>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide">
          <Icon className="h-3 w-3" /> {meta.label}
        </span>
        <span className="text-[10px] font-medium opacity-70">{node.node_id}</span>
      </div>
      <div className="px-3 py-2">
        <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-slate-900">{node.name}</p>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">{agentName ?? node.actor}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
          <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
            <Clock className="h-3 w-3" /> {node.estimated_minutes} min
            {node.estimated_elapsed_days ? ` · ${node.estimated_elapsed_days}d` : ""}
          </span>
          {node.human_approval_gate ? (
            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
              <ShieldCheck className="h-3 w-3" /> Approval gate
            </span>
          ) : null}
          {node.escalation_to ? (
            <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-rose-700" title={`Escalates to ${node.escalation_to}`}>
              <AlertOctagon className="h-3 w-3" /> Escalates
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const WorkflowNode = memo(WorkflowNodeComponent);
