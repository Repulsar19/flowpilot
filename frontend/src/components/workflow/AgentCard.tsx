"use client";

import { AlertOctagon, ArrowDownToLine, ArrowUpFromLine, Ban, Bot, KeyRound, ShieldCheck, Wrench, Zap } from "lucide-react";
import { formatPercent } from "@/lib/format";
import type { AgentRead } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

function Row({ icon: Icon, title, items, tone = "neutral" }: { icon: React.ElementType; title: string; items: string[]; tone?: "neutral" | "danger" }) {
  if (!items.length) return null;
  const color = tone === "danger" ? "text-rose-700" : "text-slate-500";
  return (
    <div>
      <p className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide ${color}`}>
        <Icon className="h-3 w-3" /> {title}
      </p>
      <ul className="mt-1 space-y-1">
        {items.map((i) => (
          <li
            key={i}
            className={`flex gap-2 text-xs ${tone === "danger" ? "rounded-md border border-rose-100 bg-rose-50/60 px-2 py-1 text-rose-900" : "text-slate-700"}`}
          >
            <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${tone === "danger" ? "bg-rose-500" : "bg-slate-400"}`} /> {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Agent specification: purpose, I/O, tools, permissions, and — critically — what it is NOT allowed to do. */
export function AgentCard({ agent, compact = false }: { agent: AgentRead; compact?: boolean }) {
  const Icon = agent.is_ai ? Bot : Zap;
  return (
    <div className={`rounded-xl border border-surface-border bg-white shadow-card ${compact ? "p-4" : "p-5"}`}>
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${agent.is_ai ? "bg-violet-600" : "bg-emerald-600"} text-white`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{agent.name}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{agent.purpose}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone={agent.is_ai ? "brand" : "success"}>{agent.is_ai ? "AI agent" : "Deterministic automation"}</Badge>
        <Badge tone="neutral">Confidence threshold {formatPercent(agent.confidence_threshold)}</Badge>
        {agent.human_approval_required ? (
          <Badge tone="warning">
            <ShieldCheck className="h-3 w-3" /> Outputs need human approval
          </Badge>
        ) : (
          <Badge tone="neutral">Exception-based review</Badge>
        )}
        {agent.node_ids.length ? <Badge tone="info">Nodes {agent.node_ids.join(", ")}</Badge> : null}
      </div>

      <div className={`mt-4 grid gap-4 ${compact ? "" : "md:grid-cols-2"}`}>
        <Row icon={ArrowDownToLine} title="Inputs" items={agent.inputs} />
        <Row icon={ArrowUpFromLine} title="Outputs" items={agent.outputs} />
        <Row icon={Wrench} title="Tools" items={agent.tools} />
        <Row icon={KeyRound} title="Permissions" items={agent.permissions} />
      </div>

      <div className="mt-4">
        <Row icon={Ban} title="Prohibited actions" items={agent.prohibited_actions} tone="danger" />
      </div>

      {agent.escalation_conditions ? (
        <div className="mt-4 flex gap-2 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs text-amber-950">
          <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <div>
            <span className="font-semibold">Escalates to a human when: </span>
            {agent.escalation_conditions}
          </div>
        </div>
      ) : null}
    </div>
  );
}
