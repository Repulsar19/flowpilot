from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from models.mappers import audit_to_read
from models.orm import AuditEventORM
from models.schemas import AuditEventRead
from services.database import get_db

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("", response_model=list[AuditEventRead])
def list_audit_events(
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db),
) -> list[AuditEventRead]:
    rows = db.query(AuditEventORM).order_by(AuditEventORM.timestamp.desc()).limit(limit).all()
    return [audit_to_read(r) for r in rows]
