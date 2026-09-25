from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from models.enums import RedesignStatus
from models.mappers import bottleneck_to_read, process_to_read, process_to_summary, workflow_to_read
from models.orm import AgentORM, BottleneckORM, ProcessORM, ProcessStepORM, WorkflowORM
from models.schemas import BottleneckRead, ProcessRead, ProcessSummary, WorkflowRead
from services.database import get_db
from services.redesign_service import run_redesign

router = APIRouter(prefix="/processes", tags=["processes"])


def _get_process_or_404(db: Session, process_id: str) -> ProcessORM:
    row = db.get(ProcessORM, process_id)
    if not row:
        raise HTTPException(status_code=404, detail="Process not found")
    return row


@router.get("", response_model=list[ProcessSummary])
def list_processes(db: Session = Depends(get_db)) -> list[ProcessSummary]:
    rows = db.query(ProcessORM).order_by(ProcessORM.created_at.desc()).all()
    return [process_to_summary(r) for r in rows]


@router.get("/{process_id}", response_model=ProcessRead)
def get_process(process_id: str, db: Session = Depends(get_db)) -> ProcessRead:
    return process_to_read(_get_process_or_404(db, process_id))


@router.get("/{process_id}/bottlenecks", response_model=list[BottleneckRead])
def list_bottlenecks(process_id: str, db: Session = Depends(get_db)) -> list[BottleneckRead]:
    process = _get_process_or_404(db, process_id)
    rows = (
        db.query(BottleneckORM)
        .filter(BottleneckORM.process_id == process.id)
        .order_by(BottleneckORM.rank.asc())
        .all()
    )
    steps = {s.id: s for s in process.steps}
    return [bottleneck_to_read(r, steps.get(r.process_step_id) if r.process_step_id else None) for r in rows]


@router.get("/{process_id}/future-state", response_model=WorkflowRead)
def get_future_state(process_id: str, db: Session = Depends(get_db)) -> WorkflowRead:
    process = _get_process_or_404(db, process_id)
    if not process.future_workflow_id:
        raise HTTPException(status_code=404, detail="No future-state workflow yet. Run the redesign first.")
    workflow = db.get(WorkflowORM, process.future_workflow_id)
    if not workflow:
        raise HTTPException(status_code=404, detail="Future-state workflow not found")
    agents = db.query(AgentORM).filter(AgentORM.workflow_id == workflow.id).all()
    return workflow_to_read(workflow, agents)


@router.post("/{process_id}/redesign", response_model=ProcessRead, status_code=202)
def redesign_process(
    process_id: str,
    background: BackgroundTasks,
    force_live: bool = Query(default=False, description="Use the live AI provider even for the demo process"),
    db: Session = Depends(get_db),
) -> ProcessRead:
    """Run bottleneck detection, classification and future-state generation in the background."""
    process = _get_process_or_404(db, process_id)
    if process.redesign_status == RedesignStatus.RUNNING:
        raise HTTPException(status_code=409, detail="Redesign already in progress")
    process.redesign_status = RedesignStatus.RUNNING
    process.redesign_stage = None
    process.redesign_error = None
    db.commit()
    background.add_task(run_redesign, process_id, force_live=force_live)
    return process_to_read(process)


@router.delete("/{process_id}", status_code=204)
def delete_process(process_id: str, db: Session = Depends(get_db)) -> None:
    row = _get_process_or_404(db, process_id)
    for wf in db.query(WorkflowORM).filter(WorkflowORM.process_id == row.id).all():
        for agent in db.query(AgentORM).filter(AgentORM.workflow_id == wf.id).all():
            db.delete(agent)
        db.delete(wf)
    db.query(ProcessStepORM).filter(ProcessStepORM.process_id == row.id).delete()
    db.delete(row)
    db.commit()
