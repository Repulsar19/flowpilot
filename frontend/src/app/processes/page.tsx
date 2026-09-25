import Link from "next/link";
import { ArrowRight, Clock, FileSearch, Layers, Users } from "lucide-react";
import { listProcesses } from "@/lib/api";
import { formatDateTime, formatPercent } from "@/lib/format";
import type { ProcessSummary } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function ProcessesPage() {
  let processes: ProcessSummary[] = [];
  let offline = false;
  try {
    processes = await listProcesses();
  } catch {
    offline = true;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Processes"
        description="Current-state processes extracted from analyzed SOPs. Open a process to inspect its map, roles, systems and pain points."
        actions={
          <Link
            href="/sop-analyzer"
            className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            <FileSearch className="h-4 w-4" /> Analyze new SOP
          </Link>
        }
      />

      {offline ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Backend is offline. Start the API on port 8000 to see analyzed processes.
        </div>
      ) : processes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-900">No processes yet</p>
          <p className="mt-1 text-sm text-slate-500">Upload an SOP or load the demo to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {processes.map((p) => (
            <Link
              key={p.id}
              href={`/processes/${p.id}`}
              className="group rounded-xl border border-surface-border bg-white p-5 shadow-card transition-colors hover:border-brand-500"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-slate-900">{p.name}</h2>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-slate-600">{p.description}</p>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-slate-50 p-2">
                  <dt className="flex items-center gap-1 text-slate-500">
                    <Layers className="h-3 w-3" /> Steps
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-900">{p.step_count}</dd>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <dt className="flex items-center gap-1 text-slate-500">
                    <Users className="h-3 w-3" /> Roles
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-900">{p.role_count}</dd>
                </div>
                <div className="rounded-md bg-slate-50 p-2">
                  <dt className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-3 w-3" /> Cycle
                  </dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-900">
                    {p.total_cycle_time_days != null ? `${p.total_cycle_time_days}d` : "—"}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                <Badge tone={p.analysis_source === "demo-cache" ? "brand" : "success"}>
                  {p.analysis_source === "demo-cache" ? "demo · cached analysis" : p.analysis_source ?? "analyzed"}
                </Badge>
                <span>Confidence {formatPercent(p.extraction_confidence)}</span>
                <span suppressHydrationWarning>· {formatDateTime(p.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
