"use client";

import { AlertOctagon, ArrowRightLeft, Clock, Replace, ShieldCheck, X } from "lucide-react";
import { NODE_TYPE_META } from "@/lib/classification";
import type { AgentRead, ProcessStepRead, WorkflowEdgeRead, WorkflowNodeRead } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { AgentCard } from "./AgentCard";

export function NodeDetailPanel({
  node,
  agent,
  edges,
  nodesById,
  replacedSteps,
  onClose,
  onSelect,
}: {
  node: WorkflowNodeRead;
  agent: AgentRead | null;
  edges: WorkflowEdgeRead[];
  nodesById: Map<string, WorkflowNodeRead>;
  replacedSteps: ProcessStepRead[];
  onClose: () => void;
  onSelect: (nodeId: string) => void;
}) {
  const meta = NODE_TYPE_META[node.type];
  const Icon = meta.icon;
  const outgoing = edges.filter((e) => e.source === node.node_id);
  const incoming = edges.filter((e) => e.target === node.node_id);

  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
      <div className={`flex items-start justify-between gap-3 border-b border-surface-border px-5 py-4 ${meta.header}`}>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide opacity-80">
            <Icon className="h-3.5 w-3.5" /> {meta.label} · {node.node_id}
          </p>
          <h2 className="mt-0.5 text-base font-semibold">{node.name}</h2>
          {node.actor ? <p className="mt-0.5 text-xs opacity-80">{node.actor}</p> : null}
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 opacity-70 hover:bg-white/50 hover:opacity-100" aria-label="Close panel">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {node.description ? <p className="text-sm leading-relaxed text-slate-700">{node.description}</p> : null}

        <div className="flex flex-wrap gap-1.5">
          <Badge tone="neutral">
            <Clock className="h-3 w-3" /> {node.estimated_minutes} min effort
          </Badge>
          <Badge tone="neutral">{node.estimated_elapsed_days ? `${node.estimated_elapsed_days}d elapsed` : "same day"}</Badge>
          {node.human_approval_gate ? (
            <Badge tone="warning">
              <ShieldCheck className="h-3 w-3" /> Human approval gate
            </Badge>
          ) : null}
        </div>

        {node.escalation_to ? (
          <div className="flex gap-2 rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2 text-xs text-rose-900">
            <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
            <div>
              <span className="font-semibold">Escalation path: </span>
              {node.escalation_to}
            </div>
          </div>
        ) : null}

        {replacedSteps.length ? (
          <div>
            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <Replace className="h-3 w-3" /> Replaces current-state step{replacedSteps.length > 1 ? "s" : ""}
            </p>
            <ul className="mt-1.5 space-y-1">
              {replacedSteps.map((s) => (
                <li key={s.id} className="rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
                  <span className="font-medium text-slate-900">Step {s.sequence + 1} · {s.name}</span>
                  <span className="text-slate-500"> — {s.actor}, {s.duration_minutes ?? 0} min, {s.elapsed_days ?? 0}d today</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            <ArrowRightLeft className="h-3 w-3" /> Connections
          </p>
          <ul className="mt-1.5 space-y-1 text-xs">
            {incoming.map((e) => (
              <li key={`in-${e.source}`}>
                <button onClick={() => onSelect(e.source)} className="text-left text-slate-600 hover:text-brand-700">
                  ← from <span className="font-medium">{nodesById.get(e.source)?.name ?? e.source}</span>
                  {e.label ? <span className="text-slate-400"> ({e.label})</span> : null}
                </button>
              </li>
            ))}
            {outgoing.map((e) => (
              <li key={`out-${e.target}`}>
                <button onClick={() => onSelect(e.target)} className={`text-left hover:text-brand-700 ${e.is_escalation ? "text-rose-700" : "text-slate-600"}`}>
                  → to <span className="font-medium">{nodesById.get(e.target)?.name ?? e.target}</span>
                  {e.label ? <span className="opacity-70"> ({e.label})</span> : null}
                  {e.is_escalation ? " · escalation" : ""}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {agent ? (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Agent specification</p>
            <AgentCard agent={agent} compact />
          </div>
        ) : null}
      </div>
    </aside>
  );
}
