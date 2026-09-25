import {
  Bot,
  Clock,
  DollarSign,
  ShieldAlert,
  Workflow,
  FileStack,
} from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { FALLBACK_DASHBOARD, getDashboardSummary, getHealth } from "@/lib/api";
import { formatUsd } from "@/lib/format";

export default async function DashboardPage() {
  let summary = FALLBACK_DASHBOARD;
  let apiOnline = false;

  try {
    await getHealth();
    summary = await getDashboardSummary();
    apiOnline = true;
  } catch {
    apiOnline = false;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            Monitor workflow redesign progress, agent activity, and simulated business impact.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            apiOnline ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
          }`}
        >
          API {apiOnline ? "connected" : "offline — preview mode"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard title="Active workflows" value={String(summary.active_workflows)} icon={Workflow} />
        <KpiCard title="Processes analyzed" value={String(summary.processes_analyzed)} icon={FileStack} />
        <KpiCard title="AI agents" value={String(summary.ai_agents)} icon={Bot} />
        <KpiCard
          title="Human approvals pending"
          value={String(summary.pending_approvals)}
          icon={ShieldAlert}
          subtitle="Human-in-the-loop gates"
        />
        <KpiCard
          title="Estimated time saved"
          value={`${summary.estimated_time_saved_hours.toFixed(1)} hrs`}
          icon={Clock}
          subtitle="Simulated / estimated"
          trend="Future-state vs current-state model"
        />
        <KpiCard
          title="Estimated cost savings"
          value={formatUsd(summary.estimated_cost_saved_usd)}
          icon={DollarSign}
          subtitle="Simulated / estimated"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-surface-border bg-white p-5 shadow-card lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Transformation pipeline</h2>
          <p className="mt-1 text-xs text-slate-500">
            Current SOP → analysis → classification → future workflow → execution → audit → impact
          </p>
          <ol className="mt-4 flex flex-wrap gap-2 text-xs text-slate-700">
            {[
              "Current SOP",
              "Process analysis",
              "Bottleneck detection",
              "AI / Human classification",
              "Future-state workflow",
              "Agent execution",
              "Human approval",
              "Audit trail",
              "Business impact",
            ].map((step, index) => (
              <li key={step} className="flex items-center gap-2">
                <span className="rounded-md border border-surface-border bg-slate-50 px-2 py-1">{step}</span>
                {index < 8 ? <span className="text-slate-400">→</span> : null}
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-xl border border-surface-border bg-white p-5 shadow-card">
          <h2 className="text-sm font-semibold text-slate-900">Recent activity</h2>
          <div className="mt-4">
            <ActivityFeed events={summary.recent_activity} />
          </div>
        </section>
      </div>
    </div>
  );
}
