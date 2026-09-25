"use client";

import { useMemo } from "react";
import { ShieldCheck, Sparkles } from "lucide-react";
import { CLASS_META, CLASSIFICATION_ORDER } from "@/lib/classification";
import type { ProcessRead, StepClassification } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { RecommendationCard } from "./RecommendationCard";

export function ClassificationTab({ process, onSelectStep }: { process: ProcessRead; onSelectStep: (stepId: string) => void }) {
  const classified = process.steps.filter((s) => s.ai_recommendation);
  const counts = useMemo(() => {
    const c: Record<StepClassification, number> = { AI_AGENT: 0, AUTOMATION: 0, HUMAN: 0, HUMAN_AI: 0, UNCLASSIFIED: 0 };
    for (const s of process.steps) c[s.classification] += 1;
    return c;
  }, [process.steps]);
  const approvals = classified.filter((s) => s.ai_recommendation?.human_approval_required).length;

  if (!classified.length) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border bg-white p-10 text-center">
        <Sparkles className="mx-auto h-6 w-6 text-slate-400" />
        <p className="mt-3 text-sm font-medium text-slate-900">Steps are not classified yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Run the AI redesign to decide, for every step, whether an AI agent, automation, a human, or a human + AI pairing should own it.
        </p>
      </div>
    );
  }

  const total = process.steps.length || 1;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Who should do the work" subtitle="Work Classification Agent — every decision carries reasoning, confidence, evidence, approval requirement and escalation condition">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
            {CLASSIFICATION_ORDER.map((k) =>
              counts[k] ? <div key={k} style={{ width: `${(counts[k] / total) * 100}%`, backgroundColor: CLASS_META[k].hex }} title={CLASS_META[k].label} /> : null,
            )}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {CLASSIFICATION_ORDER.map((k) => {
              const meta = CLASS_META[k];
              const Icon = meta.icon;
              return (
                <div key={k} className={`rounded-lg border border-l-4 border-surface-border p-3 ${meta.accent}`}>
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <Icon className="h-3.5 w-3.5" style={{ color: meta.hex }} /> {meta.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{counts[k]}</p>
                  <p className="mt-1 text-[11px] leading-snug text-slate-500">{meta.description}</p>
                </div>
              );
            })}
          </div>
          {process.classification_summary ? <p className="mt-4 text-sm leading-relaxed text-slate-700">{process.classification_summary}</p> : null}
        </Card>

        <Card title="Governance guardrails" subtitle={`${approvals} of ${classified.length} steps keep a human approval gate`}>
          <ul className="space-y-2">
            {process.governance_notes.map((n) => (
              <li key={n} className="flex gap-2 text-sm text-slate-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {n}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="space-y-3">
        {process.steps.map((s) =>
          s.ai_recommendation ? (
            <div key={s.id} className="grid gap-3 lg:grid-cols-[220px_1fr]">
              <button
                onClick={() => onSelectStep(s.id)}
                className="group flex flex-col items-start rounded-xl border border-surface-border bg-white p-4 text-left shadow-card hover:border-brand-500"
              >
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Step {s.sequence + 1}</span>
                <span className="mt-0.5 text-sm font-semibold text-slate-900 group-hover:text-brand-700">{s.name}</span>
                <span className="mt-1 text-xs text-slate-500">{s.actor}</span>
                <span className="mt-3 text-[11px] text-slate-500">
                  Today: {s.duration_minutes ?? 0} min effort · {s.elapsed_days ?? 0}d elapsed
                </span>
              </button>
              <RecommendationCard classification={s.classification} rec={s.ai_recommendation} />
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
