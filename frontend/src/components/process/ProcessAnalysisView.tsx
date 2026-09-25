"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookMarked, Clock, Gauge, Layers, MousePointerClick, Monitor, Sparkles, Users } from "lucide-react";
import { listBottlenecks } from "@/lib/api";
import { CLASS_META, CLASSIFICATION_ORDER } from "@/lib/classification";
import { formatMinutes, formatPercent } from "@/lib/format";
import type { BottleneckRead, ProcessRead } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { BottlenecksTab } from "./BottlenecksTab";
import { ClassificationTab } from "./ClassificationTab";
import { ProcessFlow } from "./ProcessFlow";
import { RedesignControl } from "./RedesignControl";
import { StepDetailPanel } from "./StepDetailPanel";

type Tab = "map" | "bottlenecks" | "classification" | "roles" | "systems" | "pain";

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: "map", label: "Process map", icon: Layers },
  { key: "bottlenecks", label: "Bottlenecks", icon: Gauge },
  { key: "classification", label: "AI / Automation / Human", icon: Sparkles },
  { key: "roles", label: "Roles", icon: Users },
  { key: "systems", label: "Systems", icon: Monitor },
  { key: "pain", label: "Pain points", icon: AlertTriangle },
];

export function ProcessAnalysisView({ process: initial, initialBottlenecks = [] }: { process: ProcessRead; initialBottlenecks?: BottleneckRead[] }) {
  const [process, setProcess] = useState<ProcessRead>(initial);
  const [bottlenecks, setBottlenecks] = useState<BottleneckRead[]>(initialBottlenecks);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("map");

  // Refresh bottlenecks whenever a redesign completes.
  const completedAt = process.redesign_status === "completed" ? process.updated_at : null;
  useEffect(() => {
    if (!completedAt) return;
    listBottlenecks(process.id).then(setBottlenecks).catch(() => undefined);
  }, [completedAt, process.id]);

  const handleUpdate = useCallback((p: ProcessRead) => setProcess(p), []);
  const focusStep = useCallback((stepId: string) => {
    setSelectedId(stepId);
    setTab("map");
  }, []);

  const selectedIndex = process.steps.findIndex((s) => s.id === selectedId);
  const selected = selectedIndex >= 0 ? process.steps[selectedIndex] : null;
  const classifiedCount = process.steps.filter((s) => s.classification !== "UNCLASSIFIED").length;

  const totals = useMemo(() => {
    const effortMin = process.steps.reduce((acc, s) => acc + (s.duration_minutes ?? 0), 0);
    const decisions = process.steps.filter((s) => s.decision_required).length;
    const handoffs = process.steps.filter((s, i) => i > 0 && s.actor !== process.steps[i - 1].actor).length;
    return { effortMin, decisions, handoffs };
  }, [process.steps]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <div className="flex items-center gap-2">
            <Link href="/processes" className="text-xs text-slate-500 hover:text-slate-700">
              Processes
            </Link>
            <span className="text-xs text-slate-400">/</span>
            <span className="text-xs text-slate-500">Current state</span>
          </div>
        }
        title={process.name}
        description={process.description ?? undefined}
        actions={
          <>
            <Badge tone={process.analysis_source === "demo-cache" ? "brand" : "success"}>
              {process.analysis_source === "demo-cache" ? "Demo · cached analysis" : process.analysis_source}
            </Badge>
            <Badge tone="neutral">Confidence {formatPercent(process.extraction_confidence)}</Badge>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat icon={Layers} label="Process steps" value={String(process.steps.length)} />
        <Stat icon={Users} label="Roles involved" value={String(process.roles.length)} />
        <Stat icon={Clock} label="End-to-end cycle" value={process.total_cycle_time_days != null ? `${process.total_cycle_time_days} days` : "—"} sub="business days (SOP stated)" />
        <Stat icon={Clock} label="Hands-on effort" value={formatMinutes(totals.effortMin)} sub="sum of step effort" />
        <Stat icon={MousePointerClick} label="Decisions / handoffs" value={`${totals.decisions} / ${totals.handoffs}`} />
      </div>

      <RedesignControl process={process} onUpdate={handleUpdate} />

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
            {key === "pain" ? <span className="rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-800">{process.pain_points.length}</span> : null}
            {key === "bottlenecks" && bottlenecks.length ? <span className="rounded-full bg-rose-100 px-1.5 text-[10px] text-rose-800">{bottlenecks.length}</span> : null}
            {key === "classification" && classifiedCount ? <span className="rounded-full bg-violet-100 px-1.5 text-[10px] text-violet-800">{classifiedCount}</span> : null}
          </button>
        ))}
      </div>

      {tab === "map" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-[680px] overflow-hidden rounded-xl border border-surface-border lg:col-span-2">
            <ProcessFlow steps={process.steps} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          <div className="h-[680px]">
            {selected ? (
              <StepDetailPanel step={selected} index={selectedIndex} onClose={() => setSelectedId(null)} />
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-surface-border bg-white p-8 text-center">
                <MousePointerClick className="h-6 w-6 text-slate-400" />
                <p className="mt-3 text-sm font-medium text-slate-900">Select a step</p>
                <p className="mt-1 text-xs text-slate-500">
                  Click any node to see its inputs, outputs, systems, pain points and the SOP sections it was extracted from.
                </p>
                <div className="mt-6 w-full space-y-2 text-left text-xs text-slate-600">
                  <p className="font-medium text-slate-700">Legend</p>
                  <p><span className="mr-2 inline-block h-2 w-6 rounded bg-amber-400 align-middle" /> Edge = handoff between roles</p>
                  <p><span className="mr-2 inline-block h-2 w-6 rounded bg-emerald-500 align-middle" /> Automation potential</p>
                  <p><span className="mr-2 inline-block h-2 w-6 rounded bg-violet-500 align-middle" /> AI suitability</p>
                  {classifiedCount ? (
                    <>
                      <p className="pt-2 font-medium text-slate-700">Left accent = recommended owner</p>
                      {CLASSIFICATION_ORDER.map((k) => (
                        <p key={k}>
                          <span className="mr-2 inline-block h-3 w-1.5 rounded align-middle" style={{ backgroundColor: CLASS_META[k].hex }} /> {CLASS_META[k].label}
                        </p>
                      ))}
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {tab === "bottlenecks" ? <BottlenecksTab bottlenecks={bottlenecks} summary={process.bottleneck_summary} onSelectStep={focusStep} /> : null}

      {tab === "classification" ? <ClassificationTab process={process} onSelectStep={focusStep} /> : null}

      {tab === "roles" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {process.roles.map((role) => {
            const stepCount = process.steps.filter((s) => s.actor === role.name).length;
            return (
              <Card key={role.name} title={role.name} subtitle={`${stepCount} step${stepCount === 1 ? "" : "s"} owned`}>
                <ul className="space-y-1.5 text-sm text-slate-700">
                  {role.responsibilities.map((r) => (
                    <li key={r} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-400" /> {r}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      ) : null}

      {tab === "systems" ? (
        <Card title="Systems and records" subtitle="Where information lives today">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-surface-border">
                  <th className="py-2 pr-4 font-medium">System</th>
                  <th className="py-2 pr-4 font-medium">Purpose</th>
                  <th className="py-2 font-medium">Used in steps</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {process.systems.map((sys) => {
                  const used = process.steps.filter((s) => s.systems.some((n) => n.toLowerCase().startsWith(sys.name.split(" (")[0].toLowerCase())));
                  return (
                    <tr key={sys.name}>
                      <td className="py-2.5 pr-4 font-medium text-slate-900">{sys.name}</td>
                      <td className="py-2.5 pr-4 text-slate-600">{sys.purpose}</td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {used.map((s) => (
                            <button key={s.id} onClick={() => { setSelectedId(s.id); setTab("map"); }} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700 hover:bg-brand-50 hover:text-brand-700">
                              {s.sequence + 1}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {tab === "pain" ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2" title="Process-level pain points" subtitle="Stated or implied by the SOP">
            <ol className="space-y-2">
              {process.pain_points.map((p, i) => (
                <li key={p} className="flex gap-3 rounded-lg border border-amber-100 bg-amber-50/50 px-3 py-2.5 text-sm text-amber-950">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-[11px] font-semibold text-white">{i + 1}</span>
                  {p}
                </li>
              ))}
            </ol>
            <button onClick={() => setTab("bottlenecks")} className="mt-4 text-xs font-medium text-brand-700 hover:underline">
              See structured bottleneck analysis with delay estimates →
            </button>
          </Card>
          <Card title="Regulatory references" subtitle="Cited by the SOP">
            <ul className="space-y-2">
              {process.regulatory_references.map((r) => (
                <li key={r} className="flex gap-2 text-sm text-slate-700">
                  <BookMarked className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" /> {r}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-surface-border bg-white p-4 shadow-card">
      <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900">{value}</p>
      {sub ? <p className="text-[11px] text-slate-500">{sub}</p> : null}
    </div>
  );
}
