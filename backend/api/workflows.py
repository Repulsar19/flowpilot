from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from models.mappers import execution_to_read, workflow_to_read, workflow_to_summary
from models.orm import AgentORM, WorkflowExecutionORM, WorkflowORM
from models.schemas import MessageResponse, WorkflowExecutionRead, WorkflowRead, WorkflowSummary
from services.database import get_db

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("", response_model=list[WorkflowSummary])
def list_workflows(
    future_state_only: bool = Query(default=False),
    db: Session = Depends(get_db),
) -> list[WorkflowSummary]:
    query = db.query(WorkflowORM)
    if future_state_only:
        query = query.filter(WorkflowORM.is_future_state.is_(True))
    rows = query.order_by(WorkflowORM.created_at.desc()).all()
    out: list[WorkflowSummary] = []
    for r in rows:
        agent_count = db.query(AgentORM).filter(AgentORM.workflow_id == r.id).count()
        out.append(workflow_to_summary(r, agent_count))
    return out


@router.get("/{workflow_id}", response_model=WorkflowRead)
def get_workflow(workflow_id: str, db: Session = Depends(get_db)) -> WorkflowRead:
    row = db.get(WorkflowORM, workflow_id)
    if not row:
        raise HTTPException(status_code=404, detail="Workflow not found")
    agents = db.query(AgentORM).filter(AgentORM.workflow_id == row.id).all()
    return workflow_to_read(row, agents)


@router.get("/{workflow_id}/executions", response_model=list[WorkflowExecutionRead])
def list_executions(workflow_id: str, db: Session = Depends(get_db)) -> list[WorkflowExecutionRead]:
    if not db.get(WorkflowORM, workflow_id):
        raise HTTPException(status_code=404, detail="Workflow not found")
    rows = (
        db.query(WorkflowExecutionORM)
        .filter(WorkflowExecutionORM.workflow_id == workflow_id)
        .order_by(WorkflowExecutionORM.started_at.desc())
        .all()
    )
    return [execution_to_read(r) for r in rows]


@router.post("/{workflow_id}/run", response_model=MessageResponse, status_code=501)
def run_workflow(workflow_id: str, db: Session = Depends(get_db)) -> MessageResponse:
    if not db.get(WorkflowORM, workflow_id):
        raise HTTPException(status_code=404, detail="Workflow not found")
    return MessageResponse(
        message="Workflow execution stub",
        detail="Simulation engine ships in Phase 4.",
    )
