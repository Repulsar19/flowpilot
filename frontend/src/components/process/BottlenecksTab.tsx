"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, BookOpen, Clock, Lightbulb, Repeat } from "lucide-react";
import { OPPORTUNITY_META, SEVERITY_META } from "@/lib/classification";
import { formatPercent } from "@/lib/format";
import type { BottleneckRead } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export function BottlenecksTab({
  bottlenecks,
  summary,
  onSelectStep,
}: {
  bottlenecks: BottleneckRead[];
  summary?: string | null;
  onSelectStep: (stepId: string) => void;
}) {
  const totalHours = useMemo(() => bottlenecks.reduce((a, b) => a + b.estimated_delay_hours, 0), [bottlenecks]);
  const chart = useMemo(
    () =>
      [...bottlenecks]
        .sort((a, b) => b.estimated_delay_hours - a.estimated_delay_hours)
        .map((b) => ({
          name: b.step_sequence != null ? `${b.step_sequence + 1}. ${b.step_name}` : b.step_name,
          hours: b.estimated_delay_hours,
          severity: b.severity,
          id: b.id,
        })),
    [bottlenecks],
  );

  if (!bottlenecks.length) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border bg-white p-10 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-slate-400" />
        <p className="mt-3 text-sm font-medium text-slate-900">No bottleneck analysis yet</p>
        <p className="mt-1 text-sm text-slate-500">Run the AI redesign to detect delays, their root causes and the improvement opportunity for each.</p>
      </div>
    );
  }

  const severityCounts = { high: 0, medium: 0, low: 0 };
  for (const b of bottlenecks) severityCounts[b.severity] += 1;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Where the time goes" subtitle="Estimated elapsed delay per step (hours, 8h business day) — Simulated / Estimated">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} unit="h" />
                <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 11, fill: "#334155" }} />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  formatter={(value) => [`${value} h`, "Estimated delay"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }}
                />
                <Bar dataKey="hours" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                  {chart.map((entry) => (
                    <Cell key={entry.id} fill={entry.severity === "high" ? "#f43f5e" : entry.severity === "medium" ? "#f59e0b" : "#94a3b8"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Summary" subtitle="Bottleneck Detection Agent">
          <p className="text-sm leading-relaxed text-slate-700">{summary}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-[11px] text-slate-500">Addressable delay</dt>
              <dd className="mt-0.5 text-lg font-semibold text-slate-900">{Math.round(totalHours)} h</dd>
              <dd className="text-[11px] text-slate-500">≈ {(totalHours / 8).toFixed(0)} business days</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="text-[11px] text-slate-500">Severity mix</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {(["high", "medium", "low"] as const).map((s) =>
                  severityCounts[s] ? (
                    <span key={s} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${SEVERITY_META[s].badge}`}>
                      {severityCounts[s]} {s}
                    </span>
                  ) : null,
                )}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <ol className="space-y-3">
        {bottlenecks.map((b) => {
          const sev = SEVERITY_META[b.severity];
          const opp = OPPORTUNITY_META[b.opportunity];
          const OppIcon = opp.icon;
          const share = totalHours ? b.estimated_delay_hours / totalHours : 0;
          return (
            <li key={b.id} className="rounded-xl border border-surface-border bg-white p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-semibold text-white">
                    {b.rank + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{b.problem}</p>
                    <button
                      onClick={() => b.process_step_id && onSelectStep(b.process_step_id)}
                      className="mt-0.5 text-xs text-brand-700 hover:underline"
                    >
                      {b.step_sequence != null ? `Step ${b.step_sequence + 1} · ` : ""}
                      {b.step_name}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${sev.badge}`}>{sev.label} severity</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${opp.badge}`}>
                    <OppIcon className="h-3 w-3" /> {opp.label}
                  </span>
                  <Badge tone="neutral">Confidence {formatPercent(b.confidence)}</Badge>
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_220px]">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Root cause</p>
                  <p className="mt-1 text-sm text-slate-700">{b.cause}</p>
                </div>
                <div>
                  <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    <Lightbulb className="h-3 w-3" /> Suggested improvement
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{b.suggested_improvement}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> <span className="font-semibold text-slate-900">{b.estimated_delay_hours} h</span> est. delay
                  </p>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div className={`h-full ${sev.bar}`} style={{ width: `${Math.max(3, share * 100)}%` }} />
                  </div>
                  <p className="mt-2 flex items-start gap-1">
                    <Repeat className="mt-0.5 h-3 w-3 shrink-0" /> {b.frequency}
                  </p>
                </div>
              </div>

              {b.evidence.length ? (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <BookOpen className="h-3 w-3 text-slate-400" />
                  {b.evidence.map((e) => (
                    <Badge key={e} tone="info">
                      {e}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
