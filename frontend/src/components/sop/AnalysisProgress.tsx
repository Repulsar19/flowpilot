import { Check, CircleAlert, Loader2 } from "lucide-react";
import type { DocumentStatus } from "@/lib/types";

const STAGES = [
  { key: "upload", label: "Upload SOP", hint: "File stored securely" },
  { key: "extract", label: "Extract text", hint: "Pages and sections preserved" },
  { key: "analyze", label: "Analyze process", hint: "Process Analyzer Agent" },
  { key: "map", label: "Generate process map", hint: "Steps, roles, systems, handoffs" },
] as const;

/** Index of the stage currently in progress; 4 = all complete. */
function stageIndex(status: DocumentStatus): number {
  switch (status) {
    case "uploaded":
      return 1;
    case "extracting":
      return 1;
    case "extracted":
      return 2;
    case "analyzing":
      return 2;
    case "mapping":
      return 3;
    case "ready":
      return 4;
    case "failed":
      return -1;
    default:
      return 0;
  }
}

export function AnalysisProgress({
  status,
  failedAt,
}: {
  status: DocumentStatus;
  /** Stage index at which the failure occurred; derived when omitted. */
  failedAt?: number;
}) {
  const current = stageIndex(status);
  const failed = status === "failed";
  const failIndex = failedAt ?? 2;

  return (
    <ol className="grid gap-3 sm:grid-cols-4">
      {STAGES.map((stage, idx) => {
        const done = !failed && idx < current;
        const active = !failed && idx === current;
        const isFail = failed && idx === failIndex;
        const doneBeforeFail = failed && idx < failIndex;

        return (
          <li
            key={stage.key}
            className={`rounded-lg border p-3 ${
              active
                ? "border-brand-500 bg-brand-50/40"
                : isFail
                  ? "border-rose-300 bg-rose-50/50"
                  : "border-surface-border bg-white"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  done || doneBeforeFail
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-brand-600 text-white"
                      : isFail
                        ? "bg-rose-500 text-white"
                        : "bg-slate-100 text-slate-500"
                }`}
              >
                {done || doneBeforeFail ? (
                  <Check className="h-3.5 w-3.5" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : isFail ? (
                  <CircleAlert className="h-3.5 w-3.5" />
                ) : (
                  idx + 1
                )}
              </span>
              <p className="text-sm font-medium text-slate-900">{stage.label}</p>
            </div>
            <p className="mt-1.5 pl-8 text-xs text-slate-500">{stage.hint}</p>
          </li>
        );
      })}
    </ol>
  );
}
