"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, RefreshCw, Sparkles, XCircle } from "lucide-react";
import { ApiError, getProcess, redesignProcess } from "@/lib/api";
import type { ProcessRead, RedesignStage } from "@/lib/types";

const STAGES: { key: RedesignStage; label: string; agent: string }[] = [
  { key: "bottlenecks", label: "Detect bottlenecks", agent: "Bottleneck Detection Agent" },
  { key: "classification", label: "Classify AI / Automation / Human", agent: "Work Classification Agent" },
  { key: "future_state", label: "Design future-state workflow", agent: "Future-State Designer Agent" },
];

const STAGE_INDEX: Record<RedesignStage, number> = { bottlenecks: 0, classification: 1, future_state: 2, done: 3 };

/**
 * Kicks off the redesign pipeline and polls the process until it settles.
 * `onUpdate` receives each refreshed process so the parent view can re-render.
 */
export function RedesignControl({ process, onUpdate }: { process: ProcessRead; onUpdate: (p: ProcessRead) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const running = process.redesign_status === "running";

  const poll = useCallback(async () => {
    try {
      const fresh = await getProcess(process.id);
      onUpdate(fresh);
      if (fresh.redesign_status === "running") timer.current = setTimeout(poll, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lost connection while polling");
    }
  }, [process.id, onUpdate]);

  useEffect(() => {
    if (running && !timer.current) timer.current = setTimeout(poll, 1200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [running, poll]);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const p = await redesignProcess(process.id);
      onUpdate(p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start redesign");
    } finally {
      setBusy(false);
    }
  };

  const completed = process.redesign_status === "completed";
  const failed = process.redesign_status === "failed";
  const currentIdx = process.redesign_stage ? STAGE_INDEX[process.redesign_stage] : -1;

  return (
    <div className="rounded-xl border border-surface-border bg-white p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {running ? "AI redesign in progress" : completed ? "AI redesign complete" : failed ? "AI redesign failed" : "AI redesign not run yet"}
            </p>
            <p className="text-xs text-slate-500">
              {running
                ? "Three agents run in sequence; each result is written to the audit log."
                : completed
                  ? `Source: ${process.redesign_source === "demo-cache" ? "demo · cached AI output" : process.redesign_source}. Re-run to regenerate.`
                  : failed
                    ? process.redesign_error
                    : "Detect bottlenecks, classify each step and generate a future-state workflow with AI agents and human gates."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {completed && process.future_workflow_id ? (
            <Link
              href={`/workflow-designer/${process.future_workflow_id}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Open future-state workflow <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
          <button
            onClick={start}
            disabled={running || busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {completed || failed ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {completed || failed ? "Re-run redesign" : "Run AI redesign"}
          </button>
        </div>
      </div>

      {running || completed ? (
        <ol className="mt-4 grid gap-2 sm:grid-cols-3">
          {STAGES.map((s, i) => {
            const done = completed || currentIdx > i;
            const active = running && currentIdx === i;
            return (
              <li
                key={s.key}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 text-xs ${
                  done ? "border-emerald-200 bg-emerald-50/60" : active ? "border-brand-200 bg-brand-50/60" : "border-surface-border bg-slate-50/60"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                    done ? "bg-emerald-500 text-white" : active ? "bg-brand-600 text-white" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" /> : active ? <Loader2 className="h-3 w-3 animate-spin" /> : i + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{s.label}</p>
                  <p className="truncate text-[11px] text-slate-500">{s.agent}</p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}

      {error ? (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-rose-700">
          <XCircle className="h-3.5 w-3.5" /> {error}
        </p>
      ) : null}
    </div>
  );
}
