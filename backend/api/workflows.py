from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.mappers import execution_to_read, workflow_to_read
from models.orm import WorkflowExecutionORM, WorkflowORM
from models.schemas import MessageResponse, WorkflowExecutionRead, WorkflowRead
from services.database import get_db

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("", response_model=list[WorkflowRead])
def list_workflows(db: Session = Depends(get_db)) -> list[WorkflowRead]:
    rows = db.query(WorkflowORM).order_by(WorkflowORM.created_at.desc()).all()
    return [workflow_to_read(r) for r in rows]


@router.get("/{workflow_id}", response_model=WorkflowRead)
def get_workflow(workflow_id: str, db: Session = Depends(get_db)) -> WorkflowRead:
    row = db.get(WorkflowORM, workflow_id)
    if not row:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return workflow_to_read(row)


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
