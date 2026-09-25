import Link from "next/link";
import { ArrowRight, Bot, Clock, Layers, Sparkles, Workflow } from "lucide-react";
import { listProcesses, listWorkflows } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { ProcessSummary, WorkflowSummary } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function WorkflowDesignerPage() {
  let workflows: WorkflowSummary[] = [];
  let processes: ProcessSummary[] = [];
  let offline = false;
  try {
    [workflows, processes] = await Promise.all([listWorkflows(true), listProcesses()]);
  } catch {
    offline = true;
  }
  const processById = new Map(processes.map((p) => [p.id, p]));
  const withoutFuture = processes.filter((p) => !p.future_workflow_id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow Designer"
        description="AI-generated future-state workflows: who does what (AI agent, automation, human, human + AI), where humans approve, and where AI escalates."
      />

      {offline ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Backend is offline. Start the API on port 8000.</div>
      ) : null}

      {!offline && workflows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border bg-white p-10 text-center">
          <Workflow className="mx-auto h-6 w-6 text-slate-400" />
          <p className="mt-3 text-sm font-medium text-slate-900">No future-state workflows yet</p>
          <p className="mt-1 text-sm text-slate-500">Open a process and run the AI redesign to generate one.</p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {workflows.map((w) => {
          const p = w.process_id ? processById.get(w.process_id) : undefined;
          return (
            <Link
              key={w.id}
              href={`/workflow-designer/${w.id}`}
              className="group rounded-xl border border-surface-border bg-white p-5 shadow-card transition-colors hover:border-brand-500"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Future state{p ? ` · ${p.name}` : ""}</p>
                  <h2 className="mt-0.5 text-base font-semibold text-slate-900">{w.name}</h2>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-slate-600">{w.description}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-slate-50 p-2">
                  <dt className="flex items-center gap-1 text-slate-500">
                    <Layers className="h-3 w-3" /> Nodes
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-900">{w.node_count}</dd>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <dt className="flex items-center gap-1 text-slate-500">
                    <Bot className="h-3 w-3" /> Agents
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-900">{w.agent_count}</dd>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <dt className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-3 w-3" /> Cycle
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                    {p?.total_cycle_time_days != null ? <span className="mr-1 text-xs font-normal text-slate-400 line-through">{p.total_cycle_time_days}d</span> : null}
                    {w.estimated_cycle_time_days != null ? `${w.estimated_cycle_time_days}d` : "—"}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <Badge tone={w.generation_source === "demo-cache" ? "brand" : "success"}>
                  <Sparkles className="h-3 w-3" /> {w.generation_source === "demo-cache" ? "demo · cached AI design" : w.generation_source ?? "AI generated"}
                </Badge>
                <span suppressHydrationWarning>· {formatDateTime(w.created_at)}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {withoutFuture.length ? (
        <div className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
          <p className="text-sm font-semibold text-slate-900">Processes without a future-state design</p>
          <ul className="mt-2 divide-y divide-surface-border">
            {withoutFuture.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-slate-700">{p.name}</span>
                <Link href={`/processes/${p.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                  Run AI redesign <ArrowRight className="h-3 w-3" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
