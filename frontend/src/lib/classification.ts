/** Shared visual metadata for AI / Automation / Human classifications and future-state node types. */

import type { LucideIcon } from "lucide-react";
import {
  Bot,
  CircleDot,
  Flag,
  GitBranch,
  Handshake,
  Sparkles,
  User,
  Workflow,
  Zap,
} from "lucide-react";
import type { BottleneckOpportunity, RiskLevel, Severity, StepClassification, WorkflowNodeType } from "./types";

export interface ClassMeta {
  label: string;
  short: string;
  description: string;
  icon: LucideIcon;
  /** Tailwind classes for badge/pill */
  badge: string;
  /** Border/left-accent color class */
  accent: string;
  /** Solid hex used by React Flow minimap + edges */
  hex: string;
  /** Header tint for workflow nodes */
  header: string;
}

export const CLASS_META: Record<StepClassification, ClassMeta> = {
  AI_AGENT: {
    label: "AI Agent",
    short: "AI",
    description: "An AI agent performs the work end-to-end within defined limits; a human reviews outputs on exception.",
    icon: Bot,
    badge: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
    accent: "border-l-violet-500",
    hex: "#7c3aed",
    header: "bg-violet-50 text-violet-800",
  },
  AUTOMATION: {
    label: "Automation",
    short: "Auto",
    description: "Deterministic, rule-based automation — no judgement required.",
    icon: Zap,
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    accent: "border-l-emerald-500",
    hex: "#059669",
    header: "bg-emerald-50 text-emerald-800",
  },
  HUMAN: {
    label: "Human",
    short: "Human",
    description: "Stays with people — accountability, regulated approvals and judgement calls.",
    icon: User,
    badge: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
    accent: "border-l-amber-500",
    hex: "#d97706",
    header: "bg-amber-50 text-amber-900",
  },
  HUMAN_AI: {
    label: "Human + AI",
    short: "Human+AI",
    description: "AI prepares, drafts or recommends; a named human validates and decides.",
    icon: Handshake,
    badge: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200",
    accent: "border-l-sky-500",
    hex: "#0284c7",
    header: "bg-sky-50 text-sky-800",
  },
  UNCLASSIFIED: {
    label: "Unclassified",
    short: "—",
    description: "Not yet classified. Run the AI redesign to classify this step.",
    icon: CircleDot,
    badge: "bg-slate-100 text-slate-600",
    accent: "border-l-slate-300",
    hex: "#94a3b8",
    header: "bg-slate-50 text-slate-700",
  },
};

export const NODE_TYPE_META: Record<WorkflowNodeType, ClassMeta> = {
  ...CLASS_META,
  START: {
    label: "Start",
    short: "Start",
    description: "Process trigger.",
    icon: Flag,
    badge: "bg-slate-900 text-white",
    accent: "border-l-slate-900",
    hex: "#0f172a",
    header: "bg-slate-900 text-white",
  },
  END: {
    label: "End",
    short: "End",
    description: "Process closed.",
    icon: Flag,
    badge: "bg-slate-900 text-white",
    accent: "border-l-slate-900",
    hex: "#0f172a",
    header: "bg-slate-900 text-white",
  },
  DECISION: {
    label: "Decision",
    short: "Decision",
    description: "Routing point — branches on a rule or a human decision.",
    icon: GitBranch,
    badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
    accent: "border-l-rose-500",
    hex: "#e11d48",
    header: "bg-rose-50 text-rose-800",
  },
};

export const OPPORTUNITY_META: Record<BottleneckOpportunity, { label: string; badge: string; icon: LucideIcon }> = {
  AI_AGENT: { label: "AI agent", badge: CLASS_META.AI_AGENT.badge, icon: Bot },
  AUTOMATION: { label: "Automation", badge: CLASS_META.AUTOMATION.badge, icon: Zap },
  HUMAN: { label: "Human", badge: CLASS_META.HUMAN.badge, icon: User },
  HUMAN_AI: { label: "Human + AI", badge: CLASS_META.HUMAN_AI.badge, icon: Handshake },
  PROCESS_CHANGE: { label: "Process change", badge: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200", icon: Workflow },
};

export const SEVERITY_META: Record<Severity, { label: string; badge: string; bar: string }> = {
  high: { label: "High", badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200", bar: "bg-rose-500" },
  medium: { label: "Medium", badge: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200", bar: "bg-amber-500" },
  low: { label: "Low", badge: "bg-slate-100 text-slate-700", bar: "bg-slate-400" },
};

export const RISK_META: Record<RiskLevel, { label: string; badge: string }> = {
  high: { label: "High risk", badge: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200" },
  medium: { label: "Medium risk", badge: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200" },
  low: { label: "Low risk", badge: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200" },
};

export const CLASSIFICATION_ORDER: StepClassification[] = ["AI_AGENT", "AUTOMATION", "HUMAN_AI", "HUMAN"];

export function riskMeta(level?: string | null) {
  if (level === "high" || level === "medium" || level === "low") return RISK_META[level];
  return null;
}

export { Sparkles };
