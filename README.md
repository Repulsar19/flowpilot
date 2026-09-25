# FlowPilot — Intelligent AI Workflow Designer

Hackathon prototype for redesigning Standard Operating Procedures (SOPs) into AI-augmented, auditable enterprise workflows.

## Repository status

- **Phase 1 complete:** monorepo structure, FastAPI backend with SQLite models and API contracts, Next.js enterprise shell with sidebar navigation and a live dashboard.
- **Phase 2 complete:** SOP upload (PDF/DOCX/TXT) with section-aware text extraction, Process Analyzer Agent using OpenAI structured outputs, demo mode with a bundled fictional SOP and cached analysis, Processes list, and the Process Analysis page (React Flow map, step detail panel, roles, systems, pain points).
- **Phase 3 complete:** three-stage **AI redesign pipeline** (Bottleneck Detection Agent → Work Classification Agent → Future-State Designer Agent) run as a background task with live progress. Every step gets an explainable recommendation (recommendation, reasoning, confidence, SOP evidence, human-approval requirement, escalation condition, risk level, AI vs. human tasks). The **Workflow Designer** renders the generated future-state graph with typed nodes (AI agent / automation / human / human + AI / decision), dashed escalation edges, approval-gate badges, a current-vs-future comparison strip, and full agent specifications including **prohibited actions**.

Next phases add workflow simulation with approval gates, the AI Agents registry page, audit analytics, business impact with editable assumptions, roles & skills redesign, and a deliverables summary/export page.

## Demo mode

The app ships with a fictional SOP (`backend/demo/regulatory_change_management_sop.txt`) for **Meridian Biopharma**, a made-up company. It is modelled on public frameworks — ICH Q10 §3.2.3, ICH Q9, 21 CFR 211 / Part 11, EU GMP Chapter 1 and Annex 15 — but every figure is illustrative. **It is not Pfizer data.**

On first start the backend seeds this SOP with a cached, pre-validated analysis (`backend/demo/demo_process_extraction.json`) **and** a cached redesign (`demo_bottlenecks.json`, `demo_classification.json`, `demo_future_state.json`) so the full pipeline — current-state map → bottlenecks → classification → future-state workflow with agents — is demonstrable with no API key and no network. Click **Load Demo SOP** on the SOP Analyzer page, or open **Processes** / **Workflow Designer**.

Uploading your own SOP requires `OPENAI_API_KEY`; without it the upload is parsed and stored, and the analysis fails with a clear message. With a key configured, **Run AI redesign** on any process calls the live agents; for the demo process it replays the cache unless you pass `?force_live=true`.

## Structure

```
flowpilot/
  frontend/                 Next.js 15, React 19, TypeScript, Tailwind, React Flow
    src/app/                routes (dashboard, processes/[id], sop-analyzer, ...)
    src/components/         layout, dashboard, sop, process, workflow, ui
    src/lib/                api client, types, formatters, classification metadata
  backend/                  FastAPI, Pydantic, SQLAlchemy (SQLite → PostgreSQL via DATABASE_URL)
    api/                    routers: documents, processes, workflows, agents, approvals, analytics, audit
    agents/                 process_analyzer, bottleneck_agent, classification_agent, future_state_agent
    models/                 enums, ORM, API schemas, AI output schemas, mappers
    services/               database, document_parser, ai_service, analysis_service, redesign_service, demo, audit, metrics
    workflow/               engine / state / transitions (Phase 4)
    demo/                   fictional SOP + cached analysis + cached redesign
  README.md
```

## Development approach

Every AI call goes through `services/ai_service.py` and returns a Pydantic model from `models/ai_outputs.py` via OpenAI structured outputs. No free-text parsing. Each extracted step carries `evidence` (SOP section references) so recommendations stay explainable, and every pipeline stage writes to the audit trail (`services/audit.py`).

## Prerequisites

- Node.js 20+ and npm (frontend)
- Python 3.12+ (backend)
- OpenAI API key — optional; only needed to analyze your own uploaded SOPs

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

API docs: http://127.0.0.1:8000/docs

### Key endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/analytics/dashboard` | Dashboard KPIs + recent audit events |
| GET | `/api/documents/ai-status` | Which AI provider is configured; demo mode flag |
| POST | `/api/documents/upload` | Multipart upload → parse → background analysis |
| POST | `/api/documents/demo` | Load the bundled demo SOP (idempotent; `?reset=true` to rebuild) |
| POST | `/api/documents/{id}/analyze` | Re-run the Process Analyzer on a document |
| GET | `/api/documents/{id}` | Document status for progress polling |
| GET | `/api/documents/{id}/text` | Extracted text + detected sections |
| GET | `/api/processes` | Process summaries |
| GET | `/api/processes/{id}` | Full process: steps (with classification + AI recommendation), roles, systems, pain points, redesign status |
| POST | `/api/processes/{id}/redesign` | Start the 3-stage redesign in the background (`?force_live=true` bypasses the demo cache) |
| GET | `/api/processes/{id}/bottlenecks` | Ranked bottlenecks with delay estimates, severity, opportunity, evidence |
| GET | `/api/processes/{id}/future-state` | Generated future-state workflow (nodes, edges, agents, improvements, governance) |
| GET | `/api/workflows` | Workflow summaries (`?future_state_only=true`) |
| GET | `/api/workflows/{id}` | Full workflow graph + agent specifications |
| GET | `/api/agents` | AI agent registry |
| GET | `/api/approvals` | Approval records |
| GET | `/api/audit` | Audit trail |
| GET | `/api/analytics/impact` | Simulated business impact |

The workflow-run endpoint returns a `501` stub until the simulation engine lands in Phase 4.

## Frontend

```powershell
cd frontend
npm install
$env:NEXT_PUBLIC_API_URL="http://127.0.0.1:8000"
npm run dev
```

Open http://localhost:3000

## Environment variables

Create `backend/.env` when using AI features:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Optional PostgreSQL migration path: set `DATABASE_URL` in `backend/.env` (SQLAlchemy URL).

## License

Prototype for hackathon demonstration — not production software.
