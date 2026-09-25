import type {
  AIStatus,
  AgentRead,
  BottleneckRead,
  DashboardSummary,
  DocumentRead,
  DocumentText,
  HealthResponse,
  ProcessRead,
  ProcessSummary,
  WorkflowRead,
  WorkflowSummary,
} from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let detail = `${res.status} ${res.statusText}`;
  try {
    const body = (await res.json()) as { detail?: unknown };
    if (typeof body.detail === "string") detail = body.detail;
    else if (body.detail) detail = JSON.stringify(body.detail);
  } catch {
    /* non-JSON error body */
  }
  return new ApiError(res.status, detail);
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...init,
    headers: { Accept: "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ---- Health & dashboard -------------------------------------------------

export const getHealth = () => fetchJson<HealthResponse>("/api/health");
export const getDashboardSummary = () => fetchJson<DashboardSummary>("/api/analytics/dashboard");

// ---- Documents ----------------------------------------------------------

export const getAIStatus = () => fetchJson<AIStatus>("/api/documents/ai-status");
export const listDocuments = () => fetchJson<DocumentRead[]>("/api/documents");
export const getDocument = (id: string) => fetchJson<DocumentRead>(`/api/documents/${id}`);
export const getDocumentText = (id: string) => fetchJson<DocumentText>(`/api/documents/${id}/text`);
export const loadDemoDocument = (reset = false) =>
  fetchJson<DocumentRead>(`/api/documents/demo${reset ? "?reset=true" : ""}`, { method: "POST" });
export const analyzeDocument = (id: string) =>
  fetchJson<DocumentRead>(`/api/documents/${id}/analyze`, { method: "POST" });

export function uploadDocument(file: File): Promise<DocumentRead> {
  const form = new FormData();
  form.append("file", file);
  return fetchJson<DocumentRead>("/api/documents/upload", { method: "POST", body: form });
}

// ---- Processes ----------------------------------------------------------

export const listProcesses = () => fetchJson<ProcessSummary[]>("/api/processes");
export const getProcess = (id: string) => fetchJson<ProcessRead>(`/api/processes/${id}`);
export const deleteProcess = (id: string) => fetchJson<void>(`/api/processes/${id}`, { method: "DELETE" });
export const listBottlenecks = (id: string) => fetchJson<BottleneckRead[]>(`/api/processes/${id}/bottlenecks`);
export const getFutureState = (id: string) => fetchJson<WorkflowRead>(`/api/processes/${id}/future-state`);
export const redesignProcess = (id: string, forceLive = false) =>
  fetchJson<ProcessRead>(`/api/processes/${id}/redesign${forceLive ? "?force_live=true" : ""}`, {
    method: "POST",
  });

// ---- Workflows ----------------------------------------------------------

export const listWorkflows = (futureOnly = false) =>
  fetchJson<WorkflowSummary[]>(`/api/workflows${futureOnly ? "?future_state_only=true" : ""}`);
export const getWorkflow = (id: string) => fetchJson<WorkflowRead>(`/api/workflows/${id}`);

// ---- Agents -------------------------------------------------------------

export const listAgents = () => fetchJson<AgentRead[]>("/api/agents");
export const getAgent = (id: string) => fetchJson<AgentRead>(`/api/agents/${id}`);

// ---- Fallbacks ----------------------------------------------------------

export const FALLBACK_DASHBOARD: DashboardSummary = {
  active_workflows: 2,
  processes_analyzed: 1,
  ai_agents: 2,
  pending_approvals: 0,
  estimated_time_saved_hours: 12.3,
  estimated_cost_saved_usd: 922.5,
  recent_activity: [
    {
      id: "local-1",
      timestamp: new Date().toISOString(),
      actor_type: "system",
      actor_name: "FlowPilot",
      action: "Backend offline — showing local preview data",
      details: {},
    },
  ],
};
