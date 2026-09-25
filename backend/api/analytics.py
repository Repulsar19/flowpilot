from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from models.schemas import BusinessImpactRead, DashboardSummary
from models.orm import AgentORM, ApprovalORM, AuditEventORM, ProcessORM, WorkflowORM
from models.enums import ApprovalStatus
from models.mappers import audit_to_read
from services.database import get_db
from services.metrics_service import default_impact

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)) -> DashboardSummary:
    impact = default_impact()
    recent = db.query(AuditEventORM).order_by(AuditEventORM.timestamp.desc()).limit(8).all()
    return DashboardSummary(
        active_workflows=db.query(WorkflowORM).count(),
        processes_analyzed=db.query(ProcessORM).count(),
        ai_agents=db.query(AgentORM).count(),
        pending_approvals=db.query(ApprovalORM).filter(ApprovalORM.status == ApprovalStatus.PENDING).count(),
        estimated_time_saved_hours=impact.time_saved_hours,
        estimated_cost_saved_usd=impact.cost_saved_usd,
        recent_activity=[audit_to_read(e) for e in recent],
    )


@router.get("/impact", response_model=BusinessImpactRead)
def business_impact(
    process_id: str | None = Query(default=None),
) -> BusinessImpactRead:
    return default_impact(process_id)
