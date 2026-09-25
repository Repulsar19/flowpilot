"use client";

import { AlertOctagon, BookOpen, Bot, ShieldCheck, User } from "lucide-react";
import { CLASS_META, riskMeta } from "@/lib/classification";
import { formatPercent } from "@/lib/format";
import type { AIRecommendation, StepClassification } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";

/**
 * Explainable AI recommendation block. Every recommendation exposes the six
 * mandatory fields: recommendation, reasoning, confidence, evidence, human
 * approval requirement and escalation condition.
 */
export function RecommendationCard({
  classification,
  rec,
  compact = false,
}: {
  classification: StepClassification;
  rec: AIRecommendation;
  compact?: boolean;
}) {
  const meta = CLASS_META[classification] ?? CLASS_META.UNCLASSIFIED;
  const Icon = meta.icon;
  const risk = riskMeta(rec.risk_level);

  return (
    <div className={`rounded-xl border ${meta.accent} border-l-4 border-surface-border bg-white ${compact ? "p-3" : "p-4"}`}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.badge}`}>
          <Icon className="h-3 w-3" /> {meta.label}
        </span>
        {risk ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${risk.badge}`}>{risk.label}</span> : null}
        <Badge tone="neutral">Confidence {formatPercent(rec.confidence)}</Badge>
        {rec.human_approval_required ? (
          <Badge tone="warning">
            <ShieldCheck className="h-3 w-3" /> Human approval required
          </Badge>
        ) : (
          <Badge tone="success">No approval gate</Badge>
        )}
      </div>

      <p className={`mt-2.5 font-medium text-slate-900 ${compact ? "text-sm" : "text-[15px]"}`}>{rec.recommendation}</p>

      <div className="mt-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reasoning</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-700">{rec.reasoning}</p>
      </div>

      {rec.ai_tasks.length || rec.human_tasks.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {rec.ai_tasks.length ? (
            <TaskList icon={Bot} title="AI does" items={rec.ai_tasks} tone="violet" />
          ) : null}
          {rec.human_tasks.length ? (
            <TaskList icon={User} title="Human does" items={rec.human_tasks} tone="amber" />
          ) : null}
        </div>
      ) : null}

      {rec.escalation_condition ? (
        <div className="mt-3 flex gap-2 rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2 text-xs text-rose-900">
          <AlertOctagon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-500" />
          <div>
            <span className="font-semibold">Escalates when: </span>
            {rec.escalation_condition}
          </div>
        </div>
      ) : null}

      <div className="mt-3">
        <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          <BookOpen className="h-3 w-3" /> Evidence from SOP
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {rec.evidence.length ? (
            rec.evidence.map((e) => (
              <Badge key={e} tone="info">
                {e}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-slate-500">No citations recorded</span>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskList({
  icon: Icon,
  title,
  items,
  tone,
}: {
  icon: React.ElementType;
  title: string;
  items: string[];
  tone: "violet" | "amber";
}) {
  const colors = tone === "violet" ? "border-violet-100 bg-violet-50/50 text-violet-900" : "border-amber-100 bg-amber-50/50 text-amber-950";
  const dot = tone === "violet" ? "bg-violet-500" : "bg-amber-500";
  return (
    <div className={`rounded-lg border p-2.5 ${colors}`}>
      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide">
        <Icon className="h-3 w-3" /> {title}
      </p>
      <ul className="mt-1.5 space-y-1 text-xs">
        {items.map((t) => (
          <li key={t} className="flex gap-2">
            <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${dot}`} /> {t}
          </li>
        ))}
      </ul>
    </div>
  );
}
