"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  FileText,
  FlaskConical,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  ApiError,
  analyzeDocument,
  getAIStatus,
  getDocument,
  listDocuments,
  loadDemoDocument,
  uploadDocument,
} from "@/lib/api";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { AIStatus, DocumentRead, DocumentStatus } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { AnalysisProgress } from "./AnalysisProgress";

const ACCEPT = ".pdf,.docx,.txt,.md";
const TERMINAL: DocumentStatus[] = ["ready", "failed"];

function statusTone(status: DocumentStatus) {
  if (status === "ready") return "success" as const;
  if (status === "failed") return "danger" as const;
  return "info" as const;
}

export function SopAnalyzer({ initialDocuments }: { initialDocuments: DocumentRead[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [active, setActive] = useState<DocumentRead | null>(null);
  const [documents, setDocuments] = useState<DocumentRead[]>(initialDocuments);
  const [ai, setAi] = useState<AIStatus | null>(null);
  const [busy, setBusy] = useState<"upload" | "demo" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAIStatus().then(setAi).catch(() => setAi(null));
  }, []);

  const refreshDocuments = useCallback(async () => {
    try {
      setDocuments(await listDocuments());
    } catch {
      /* backend offline; keep current list */
    }
  }, []);

  // Poll the active document until it reaches a terminal state.
  useEffect(() => {
    if (!active || TERMINAL.includes(active.status)) return;
    const timer = setInterval(async () => {
      try {
        const next = await getDocument(active.id);
        setActive(next);
        if (TERMINAL.includes(next.status)) void refreshDocuments();
      } catch {
        /* transient */
      }
    }, 1200);
    return () => clearInterval(timer);
  }, [active, refreshDocuments]);

  const onPick = (picked: File | null) => {
    setError(null);
    setFile(picked);
  };

  const handleUpload = async () => {
    if (!file) return;
    setBusy("upload");
    setError(null);
    try {
      const doc = await uploadDocument(file);
      setActive(doc);
      setFile(null);
      void refreshDocuments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed. Is the backend running?");
    } finally {
      setBusy(null);
    }
  };

  const handleDemo = async () => {
    setBusy("demo");
    setError(null);
    try {
      const doc = await loadDemoDocument();
      setActive(doc);
      void refreshDocuments();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load demo SOP. Is the backend running?");
    } finally {
      setBusy(null);
    }
  };

  const handleRetry = async (doc: DocumentRead) => {
    setError(null);
    try {
      setActive(await analyzeDocument(doc.id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not restart analysis.");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SOP Analyzer"
        description="Upload a Standard Operating Procedure to extract the current-state process: steps, roles, systems, decisions, handoffs and pain points."
        actions={
          ai ? (
            ai.available ? (
              <Badge tone="success">
                <Sparkles className="h-3 w-3" /> AI: {ai.provider} · {ai.model}
              </Badge>
            ) : (
              <Badge tone="warning">Demo mode — no API key configured</Badge>
            )
          ) : null
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Upload SOP" subtitle="PDF, DOCX or TXT up to 15 MB">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onPick(e.dataTransfer.files?.[0] ?? null);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging ? "border-brand-500 bg-brand-50/50" : "border-surface-border hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            />
            <div className="rounded-full bg-slate-100 p-3 text-slate-600">
              <Upload className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-900">Drop your SOP here or click to browse</p>
            <p className="mt-1 text-xs text-slate-500">Text and section numbering are preserved for evidence citations</p>
          </div>

          {file ? (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-surface-border bg-slate-50 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <FileText className="h-5 w-5 shrink-0 text-slate-500" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatBytes(file.size)} · {file.type || "unknown type"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPick(null)}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={handleUpload}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-2 rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {busy === "upload" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Start analysis
                </button>
              </div>
            </div>
          ) : null}

          {ai && !ai.available ? (
            <p className="mt-3 text-xs text-amber-800">
              Uploaded SOPs need an OpenAI key (<code className="rounded bg-amber-50 px-1">OPENAI_API_KEY</code> in{" "}
              <code className="rounded bg-amber-50 px-1">backend/.env</code>). The demo SOP works offline.
            </p>
          ) : null}
        </Card>

        <Card title="Demo mode" subtitle="Works without upload or external APIs">
          <p className="text-sm text-slate-600">
            Load a fictional pharmaceutical <strong>Regulatory Change Management</strong> SOP modelled on ICH Q10,
            21 CFR Part 211 / Part 11 and EU GMP Annex 15. The analysis is pre-computed and cached.
          </p>
          <button
            onClick={handleDemo}
            disabled={busy !== null}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-brand-600 bg-white px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
          >
            {busy === "demo" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" />}
            Load Demo SOP
          </button>
          <p className="mt-3 text-[11px] text-slate-500">
            Fictional company and figures. Not real Pfizer data.
          </p>
        </Card>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}

      {active ? (
        <Card
          title="Analysis progress"
          subtitle={`${active.filename} · ${formatBytes(active.size_bytes)}`}
          actions={<Badge tone={statusTone(active.status)}>{active.status}</Badge>}
        >
          <AnalysisProgress status={active.status} failedAt={active.text_length ? 2 : 1} />

          {active.status === "failed" ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
              <p className="text-sm text-rose-800">{active.error_message ?? "Analysis failed."}</p>
              <button
                onClick={() => handleRetry(active)}
                className="inline-flex items-center gap-2 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-100"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Retry analysis
              </button>
            </div>
          ) : null}

          {active.status === "ready" && active.process_id ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <div className="text-sm text-emerald-900">
                <p className="font-medium">Process map generated</p>
                <p className="text-xs text-emerald-800">
                  {active.sections.length} sections detected · {active.text_length?.toLocaleString()} characters
                  {active.page_count ? ` · ${active.page_count} pages` : ""}
                </p>
              </div>
              <Link
                href={`/processes/${active.process_id}`}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Open process analysis <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : null}

          {active.extract_preview ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-xs font-medium text-slate-600">Extracted text preview</summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-700">
                {active.extract_preview}
              </pre>
            </details>
          ) : null}
        </Card>
      ) : null}

      <Card
        title="Documents"
        subtitle="Previously uploaded SOPs"
        actions={
          <button
            onClick={refreshDocuments}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      >
        {documents.length === 0 ? (
          <p className="text-sm text-slate-500">No documents yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-surface-border">
                  <th className="py-2 pr-4 font-medium">Document</th>
                  <th className="py-2 pr-4 font-medium">Size</th>
                  <th className="py-2 pr-4 font-medium">Uploaded</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate font-medium text-slate-900">{doc.filename}</span>
                        {doc.is_demo ? <Badge tone="brand">demo</Badge> : null}
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">{formatBytes(doc.size_bytes)}</td>
                    <td suppressHydrationWarning className="py-2.5 pr-4 text-slate-600">{formatDateTime(doc.uploaded_at)}</td>
                    <td className="py-2.5 pr-4">
                      <Badge tone={statusTone(doc.status)}>{doc.status}</Badge>
                    </td>
                    <td className="py-2.5 text-right">
                      {doc.status === "ready" && doc.process_id ? (
                        <Link href={`/processes/${doc.process_id}`} className="text-xs font-medium text-brand-700 hover:underline">
                          View process
                        </Link>
                      ) : doc.status === "failed" ? (
                        <button onClick={() => setActive(doc)} className="text-xs font-medium text-slate-600 hover:underline">
                          Details
                        </button>
                      ) : (
                        <button onClick={() => setActive(doc)} className="text-xs font-medium text-slate-600 hover:underline">
                          Track
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
