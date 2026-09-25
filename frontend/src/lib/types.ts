/** API contracts aligned with backend/models/schemas.py */

export type DocumentStatus =
  | "uploaded"
  | "extracting"
  | "extracted"
  | "analyzing"
  | "mapping"
  | "ready"
  | "failed";

export type StepClassification =
  | "AI_AGENT"
  | "AUTOMATION"
  | "HUMAN"
  | "HUMAN_AI"
  | "UNCLASSIFIED";

export interface AIRecommendation {
  recommendation: string;
  reasoning: string;
  confidence: number;
  evidence: string[];
  human_approval_required: boolean;
  escalation_condition?: string | null;
}

export interface AuditEventRead {
  id: string;
  timestamp: string;
  actor_type: string;
  actor_name: string;
  action: string;
  details: Record<string, unknown>;
  execution_id?: string | null;
}

export interface DashboardSummary {
  active_workflows: number;
  processes_analyzed: number;
  ai_agents: number;
  pending_approvals: number;
  estimated_time_saved_hours: number;
  estimated_cost_saved_usd: number;
  recent_activity: AuditEventRead[];
}

export interface HealthResponse {
  status: string;
  app: string;
  version: string;
}

export interface AIStatus {
  provider: string;
  available: boolean;
  model?: string | null;
  demo_mode: boolean;
}

export interface DocumentSection {
  label: string;
  title: string;
  page?: number | null;
}

export interface DocumentRead {
  id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  status: DocumentStatus;
  uploaded_at: string;
  page_count?: number | null;
  extract_preview?: string | null;
  sections: DocumentSection[];
  is_demo: boolean;
  error_message?: string | null;
  process_id?: string | null;
  text_length?: number | null;
}

export interface DocumentText {
  id: string;
  filename: string;
  text: string;
  sections: DocumentSection[];
}

export interface ProcessRole {
  name: string;
  responsibilities: string[];
}

export interface ProcessSystem {
  name: string;
  purpose: string;
}

export interface ProcessSummary {
  id: string;
  name: string;
  description?: string | null;
  source_document_id?: string | null;
  created_at: string;
  updated_at: string;
  step_count: number;
  role_count: number;
  total_cycle_time_days?: number | null;
  extraction_confidence?: number | null;
  analysis_source?: string | null;
}

export interface ProcessRead {
  id: string;
  name: string;
  description?: string | null;
  source_document_id?: string | null;
  created_at: string;
  updated_at: string;
  steps: ProcessStepRead[];
  roles: ProcessRole[];
  systems: ProcessSystem[];
  pain_points: string[];
  regulatory_references: string[];
  total_cycle_time_days?: number | null;
  extraction_confidence?: number | null;
  analysis_source?: string | null;
}

export interface ProcessStepRead {
  id: string;
  process_id: string;
  sequence: number;
  name: string;
  description?: string | null;
  actor?: string | null;
  input?: string | null;
  output?: string | null;
  duration_minutes?: number | null;
  elapsed_days?: number | null;
  decision_required: boolean;
  decision_description?: string | null;
  automation_potential?: number | null;
  ai_suitability?: number | null;
  classification: StepClassification;
  evidence: string[];
  systems: string[];
  pain_points: string[];
  handoff_to?: string | null;
  ai_recommendation?: AIRecommendation | null;
}

export interface AgentRead {
  id: string;
  workflow_id?: string | null;
  name: string;
  purpose: string;
  input_description: string;
  output_description: string;
  tools: string[];
  permissions: string[];
  confidence_threshold: number;
  escalation_conditions?: string | null;
  human_approval_required: boolean;
  status: string;
  created_at: string;
}
