"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Clock, GitBranch, User } from "lucide-react";
import { CLASS_META } from "@/lib/classification";
import { formatMinutes } from "@/lib/format";
import type { ProcessStepRead } from "@/lib/types";
import { ScoreBar } from "@/components/ui/ScoreBar";

export type StepNodeData = {
  step: ProcessStepRead;
  index: number;
  selected: boolean;
};

export type StepNode = Node<StepNodeData, "processStep">;

export const NODE_WIDTH = 320;
export const NODE_HEIGHT = 168;

/** Invisible handles on every side so the layout can route edges cleanly. */
const HANDLE_CLASS = "!h-2 !w-2 !border-0 !bg-transparent";

function ProcessStepNodeComponent({ data }: NodeProps<StepNode>) {
  const { step, index, selected } = data;
  const meta = CLASS_META[step.classification] ?? CLASS_META.UNCLASSIFIED;
  const classified = step.classification !== "UNCLASSIFIED";
  const ClassIcon = meta.icon;
  return (
    <div
      style={{ width: NODE_WIDTH }}
      className={`rounded-xl border border-l-4 bg-white p-3 shadow-card transition-shadow ${meta.accent} ${
        selected ? "border-brand-500 ring-2 ring-brand-100" : "border-surface-border hover:border-slate-300"
      }`}
    >
      <Handle type="target" id="t-top" position={Position.Top} className={HANDLE_CLASS} />
      <Handle type="target" id="t-left" position={Position.Left} className={HANDLE_CLASS} />
      <Handle type="target" id="t-right" position={Position.Right} className={HANDLE_CLASS} />
      <Handle type="source" id="s-bottom" position={Position.Bottom} className={HANDLE_CLASS} />
      <Handle type="source" id="s-left" position={Position.Left} className={HANDLE_CLASS} />
      <Handle type="source" id="s-right" position={Position.Right} className={HANDLE_CLASS} />
      <div className="flex items-start gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-900 text-[11px] font-semibold text-white">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">{step.name}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
            <User className="h-3 w-3 shrink-0" /> {step.actor ?? "Unassigned"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {classified ? (
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.badge}`}>
              <ClassIcon className="h-3 w-3" /> {meta.label}
            </span>
          ) : null}
          {step.decision_required ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">
              <GitBranch className="h-3 w-3" /> Decision
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3 w-3" /> {formatMinutes(step.duration_minutes)} effort
        </span>
        {step.elapsed_days != null ? <span>· {step.elapsed_days}d elapsed</span> : null}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3">
        <ScoreBar label="Automation" value={step.automation_potential} tone="emerald" />
        <ScoreBar label="AI suitability" value={step.ai_suitability} tone="violet" />
      </div>
    </div>
  );
}

export const ProcessStepNode = memo(ProcessStepNodeComponent);
