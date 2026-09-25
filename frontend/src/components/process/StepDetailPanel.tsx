"use client";

import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, BookOpen, GitBranch, Monitor, Sparkles, X } from "lucide-react";
import { CLASS_META } from "@/lib/classification";
import { formatDays, formatMinutes } from "@/lib/format";
import type { ProcessStepRead } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { ScoreBar } from "@/components/ui/ScoreBar";
import { RecommendationCard } from "./RecommendationCard";

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      <div className="mt-1.5 text-sm text-slate-700">{children}</div>
    </div>
  );
}

export function StepDetailPanel({
  step,
  index,
  onClose,
}: {
  step: ProcessStepRead;
  index: number;
  onClose: () => void;
}) {
  return (
    <aside className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-surface-border bg-white shadow-card">
      <div className="flex items-start justify-between gap-3 border-b border-surface-border px-5 py-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Step {index + 1}</p>
          <h2 className="mt-0.5 text-base font-semibold text-slate-900">{step.name}</h2>
          <p className="mt-1 text-xs text-slate-500">{step.actor}</p>
        </div>
        <button onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close panel">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {step.ai_recommendation ? (
          <Section icon={Sparkles} title="AI recommendation">
            <RecommendationCard classification={step.classification} rec={step.ai_recommendation} compact />
          </Section>
        ) : null}

        {step.description ? <p className="text-sm leading-relaxed text-slate-700">{step.description}</p> : null}

        <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm">
          <div>
            <p className="text-[11px] text-slate-500">Hands-on effort</p>
            <p className="font-medium text-slate-900">{formatMinutes(step.duration_minutes)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500">Elapsed time</p>
            <p className="font-medium text-slate-900">{formatDays(step.elapsed_days)}</p>
          </div>
          <div className="col-span-2 space-y-2 pt-1">
            <ScoreBar label="Automation potential" value={step.automation_potential} tone="emerald" />
            <ScoreBar label="AI suitability" value={step.ai_suitability} tone="violet" />
          </div>
        </div>

        {step.decision_required ? (
          <Section icon={GitBranch} title="Decision">
            <Badge tone="warning" className="mb-1.5">Decision required</Badge>
            <p>{step.decision_description || "A formal decision or approval is made in this step."}</p>
          </Section>
        ) : null}

        <Section icon={ArrowDownToLine} title="Input">
          {step.input || "—"}
        </Section>
        <Section icon={ArrowUpFromLine} title="Output">
          {step.output || "—"}
        </Section>

        {step.systems.length ? (
          <Section icon={Monitor} title="Systems">
            <div className="flex flex-wrap gap-1.5">
              {step.systems.map((s) => (
                <Badge key={s} tone="neutral">{s}</Badge>
              ))}
            </div>
          </Section>
        ) : null}

        {step.handoff_to ? (
          <Section icon={GitBranch} title="Hands off to">
            {step.handoff_to}
          </Section>
        ) : null}

        {step.pain_points.length ? (
          <Section icon={AlertTriangle} title="Pain points">
            <ul className="space-y-1.5">
              {step.pain_points.map((p) => (
                <li key={p} className="flex gap-2 rounded-md border border-amber-100 bg-amber-50/60 px-2.5 py-1.5 text-xs text-amber-900">
                  <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                  {p}
                </li>
              ))}
            </ul>
          </Section>
        ) : null}

        <Section icon={BookOpen} title="Evidence from SOP">
          {step.evidence.length ? (
            <div className="flex flex-wrap gap-1.5">
              {step.evidence.map((e) => (
                <Badge key={e} tone="info">{e}</Badge>
              ))}
            </div>
          ) : (
            <span className="text-slate-500">No citations recorded</span>
          )}
        </Section>

        {!step.ai_recommendation ? (
          <div className="rounded-lg border border-dashed border-surface-border p-3 text-xs text-slate-500">
            Classification: <span className="font-medium text-slate-700">{CLASS_META[step.classification].label}</span>
            {step.classification === "UNCLASSIFIED" ? " — run the AI redesign to classify this step." : ""}
          </div>
        ) : null}
      </div>
    </aside>
  );
}
