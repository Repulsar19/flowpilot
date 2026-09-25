"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Bot, GitBranch, Layers, ShieldCheck, Sparkles, TrendingDown, Zap } from "lucide-react";
import { CLASS_META, CLASSIFICATION_ORDER, NODE_TYPE_META } from "@/lib/classification";
import { formatMinutes, formatPercent } from "@/lib/format";
import type { ProcessRead, WorkflowNodeType, WorkflowRead } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { AgentCard } from "./AgentCard";
import { FutureStateFlow } from "./FutureStateFlow";
import { NodeDetailPanel } from "./NodeDetailPanel";

type Tab = "diagram" | "agents" | "impact" | "governance";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "diagram", label: "Future-state diagram", icon: Layers },
  { key: "agents", label: "AI agents", icon: Bot },
  { key: "impact", label: "Expected improvements", icon: TrendingDown },
  { key: "governance", label: "Governance controls", icon: ShieldCheck },
];

/** Maps `step_01` style ids from the AI output to persisted steps by sequence. */
function stepIndexFromKey(key: string): number | null {
  const m = /^step_(\d+)$/.exec(key);
  return m ? Number(m[1]) - 1 : null;
}

export function FutureStateView({ workflow, process }: { workflow: WorkflowRead; process: ProcessRead | null }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("diagram");

  const nodesById = useMemo(() => new Map(workflow.nodes.map((n) => [n.node_id, n])), [workflow.nodes]);
  const agentsById = useMemo(() => new Map(workflow.agents.map((a) => [a.id, a])), [workflow.agents]);
  const selected = selectedId ? nodesById.get(selectedId) ?? null : null;

  const stepsBySeq = useMemo(() => new Map((process?.steps ?? []).map((s) => [s.sequence, s])), [process]);
  const stepsForKeys = (keys: string[]) =>
    keys.map((k) => stepIndexFromKey(k)).map((i) => (i != null ? stepsBySeq.get(i) : undefined)).filter((s): s is NonNullable<typeof s> => Boolean(s));

  const stats = useMemo(() => {
    const counts = { AI_AGENT: 0, AUTOMATION: 0, HUMAN: 0, HUMAN_AI: 0, DECISION: 0 };
    let gates = 0;
    for (const n of workflow.nodes) {
      if (n.type in counts) counts[n.type as keyof typeof counts] += 1;
      if (n.human_approval_gate) gates += 1;
    }
    const escalations = workflow.edges.filter((e) => e.is_escalation).length + workflow.nodes.filter((n) => n.escalation_to).length;
    return { counts, gates, escalations };
  }, [workflow]);

  const currentEffort = process ? process.steps.reduce((a, s) => a + (s.duration_minutes ?? 0), 0) : null;
  const currentCycle = process?.total_cycle_time_days ?? null;
  const futureCycle = workflow.estimated_cycle_time_days ?? null;
  const futureEffort = workflow.estimated_effort_minutes ?? null;
  const cycleDelta = currentCycle && futureCycle ? 1 - futureCycle / currentCycle : null;
  const effortDelta = currentEffort && futureEffort ? 1 - futureEffort / currentEffort : null;
  const removedSteps = stepsForKeys(workflow.removed_step_ids);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/workflow-designer" className="hover:text-slate-700">
              Workflow Designer
            </Link>
            <span className="text-slate-400">/</span>
            {process ? (
              <Link href={`/processes/${process.id}`} className="hover:text-slate-700">
                {process.name}
              </Link>
            ) : null}
            <span className="text-slate-400">/</span>
            <span>Future state</span>
          </div>
        }
        title={workflow.name}
        description={workflow.description ?? undefined}
        actions={
          <>
            <Badge tone={workflow.generation_source === "demo-cache" ? "brand" : "success"}>
              <Sparkles className="h-3 w-3" /> {workflow.generation_source === "demo-cache" ? "Demo · cached AI design" : workflow.generation_source}
            </Badge>
            <Badge tone="neutral">Confidence {formatPercent(workflow.confidence)}</Badge>
          </>
        }
      />

      {/* Current vs future comparison strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Compare
          label="Cycle time"
          current={currentCycle != null ? `${currentCycle}d` : "—"}
          future={futureCycle != null ? `${futureCycle}d` : "—"}
          delta={cycleDelta}
          sub="Simulated / Estimated"
        />
        <Compare
          label="Hands-on effort"
          current={currentEffort != null ? formatMinutes(currentEffort) : "—"}
          future={futureEffort != null ? formatMinutes(futureEffort) : "—"}
          delta={effortDelta}
          sub="per change, all roles"
        />
        <Compare label="Steps → nodes" current={process ? String(process.steps.length) : "—"} future={String(workflow.nodes.filter((n) => !["START", "END"].includes(n.type)).length)} sub={`${removedSteps.length} manual step${removedSteps.length === 1 ? "" : "s"} eliminated`} />
        <Mini icon={Bot} label="AI agents" value={String(workflow.agents.filter((a) => a.is_ai).length)} hex={CLASS_META.AI_AGENT.hex} sub={`${stats.counts.AI_AGENT} AI nodes · ${stats.counts.HUMAN_AI} human + AI`} />
        <Mini icon={Zap} label="Automations" value={String(stats.counts.AUTOMATION)} hex={CLASS_META.AUTOMATION.hex} sub={`${workflow.agents.filter((a) => !a.is_ai).length} automation spec`} />
        <Mini icon={ShieldCheck} label="Human approval gates" value={String(stats.gates)} hex={CLASS_META.HUMAN.hex} sub={`${stats.escalations} escalation paths`} />
      </div>

      <div className="flex flex-wrap gap-1 border-b border-surface-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium ${
              tab === key ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
            {key === "agents" ? <span className="rounded-full bg-violet-100 px-1.5 text-[10px] text-violet-800">{workflow.agents.length}</span> : null}
          </button>
        ))}
      </div>

      {tab === "diagram" ? (
        <div className="space-y-3">
          <div className="relative h-[640px] overflow-hidden rounded-xl border border-surface-border">
            <FutureStateFlow workflow={workflow} selectedId={selectedId} onSelect={setSelectedId} />
            {selected ? (
              <div className="absolute inset-y-3 right-3 w-[420px] max-w-[calc(100%-1.5rem)]">
                <NodeDetailPanel
                  node={selected}
                  agent={selected.agent_id ? agentsById.get(selected.agent_id) ?? null : null}
                  edges={workflow.edges}
                  nodesById={nodesById}
                  replacedSteps={stepsForKeys(selected.replaces_step_ids)}
                  onClose={() => setSelectedId(null)}
                  onSelect={setSelectedId}
                />
              </div>
            ) : (
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-surface-border bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-card backdrop-blur">
                Flows left → right. Scroll to pan, click a node for ownership, replaced steps, escalation path and agent spec.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-surface-border bg-white px-4 py-3 text-xs text-slate-600 shadow-card">
            {([...CLASSIFICATION_ORDER, "DECISION"] as WorkflowNodeType[]).map((k) => {
              const meta = NODE_TYPE_META[k];
              const Icon = meta.icon;
              return (
                <span key={k} className="inline-flex items-center gap-1.5" title={meta.description}>
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded ${meta.header}`}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="font-medium text-slate-800">{meta.label}</span>
                </span>
              );
            })}
            <span className="inline-flex items-center gap-2">
              <span className="inline-block h-0.5 w-6 bg-slate-400" /> Main flow
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-block w-6 border-t-2 border-dashed border-rose-500" /> Escalation / return (always to a human)
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-800">
              <ShieldCheck className="h-3.5 w-3.5" /> Approval gates are never delegated to AI
            </span>
            {removedSteps.length ? (
              <span className="ml-auto text-slate-500">
                Eliminated as separate manual steps: {removedSteps.map((s) => `Step ${s.sequence + 1} · ${s.name}`).join("; ")}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "agents" ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-violet-100 bg-violet-50/60 px-4 py-3 text-sm text-violet-950">
            Each agent is scoped by <span className="font-semibold">purpose, inputs, outputs, tools, permissions and prohibited actions</span>. Agents draft, screen, classify and verify; they never approve, sign, release or close a change.
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {workflow.agents.map((a) => (
              <AgentCard key={a.id} agent={a} />
            ))}
          </div>
        </div>
      ) : null}

      {tab === "impact" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2" title="Expected improvements" subtitle="Simulated / Estimated — derived from SOP-stated durations and the redesign, not real operational data">
            <ul className="space-y-2">
              {workflow.expected_improvements.map((i) => (
                <li key={i} className="flex gap-3 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2.5 text-sm text-emerald-950">
                  <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {i}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="What changes structurally" subtitle="Current → future">
            <dl className="space-y-3 text-sm">
              <Delta label="Manual steps eliminated" value={removedSteps.map((s) => s.name).join(", ") || "—"} />
              <Delta label="Decision points made explicit" value={`${stats.counts.DECISION} routing nodes`} />
              <Delta label="Human approval gates retained" value={`${stats.gates}`} />
              <Delta label="Escalation paths" value={`${stats.escalations} (all to named humans)`} />
            </dl>
            {process ? (
              <Link href={`/processes/${process.id}`} className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                Compare with current state <ArrowRight className="h-3 w-3" />
              </Link>
            ) : null}
          </Card>
        </div>
      ) : null}

      {tab === "governance" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2" title="Governance controls" subtitle="Human-in-the-loop, auditability and regulatory alignment built into the design">
            <ul className="space-y-2">
              {workflow.governance_controls.map((g) => (
                <li key={g} className="flex gap-3 rounded-lg border border-surface-border bg-slate-50/60 px-3 py-2.5 text-sm text-slate-800">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {g}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Approval gates in this workflow" subtitle="Click to inspect">
            <ul className="space-y-1.5">
              {workflow.nodes
                .filter((n) => n.human_approval_gate)
                .map((n) => (
                  <li key={n.node_id}>
                    <button
                      onClick={() => {
                        setSelectedId(n.node_id);
                        setTab("diagram");
                      }}
                      className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                    >
                      <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                      <span>
                        <span className="font-medium text-slate-900">{n.name}</span>
                        <span className="text-slate-500"> — {n.actor}</span>
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function Compare({ label, current, future, delta, sub }: { label: string; current: string; future: string; delta?: number | null; sub?: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-white p-4 shadow-card">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <span className="text-sm text-slate-400 line-through">{current}</span>
        <ArrowRight className="h-3 w-3 text-slate-400" />
        <span className="text-xl font-semibold tracking-tight text-slate-900">{future}</span>
        {delta != null ? <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700">−{Math.round(delta * 100)}%</span> : null}
      </div>
      {sub ? <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p> : null}
    </div>
  );
}

function Mini({ icon: Icon, label, value, hex, sub }: { icon: React.ElementType; label: string; value: string; hex: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-white p-4 shadow-card">
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Icon className="h-3.5 w-3.5" style={{ color: hex }} /> {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900">{value}</p>
      {sub ? <p className="text-[11px] text-slate-500">{sub}</p> : null}
    </div>
  );
}

function Delta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
    </div>
  );
}
