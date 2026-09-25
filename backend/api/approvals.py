from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from models.enums import ApprovalStatus
from models.mappers import approval_to_read
from models.orm import ApprovalORM
from models.schemas import ApprovalRead
from services.database import get_db

router = APIRouter(prefix="/approvals", tags=["approvals"])


@router.get("", response_model=list[ApprovalRead])
def list_approvals(db: Session = Depends(get_db)) -> list[ApprovalRead]:
    rows = db.query(ApprovalORM).order_by(ApprovalORM.created_at.desc()).all()
    return [approval_to_read(r) for r in rows]


@router.get("/pending", response_model=list[ApprovalRead])
def list_pending_approvals(db: Session = Depends(get_db)) -> list[ApprovalRead]:
    rows = (
        db.query(ApprovalORM)
        .filter(ApprovalORM.status == ApprovalStatus.PENDING)
        .order_by(ApprovalORM.created_at.desc())
        .all()
    )
    return [approval_to_read(r) for r in rows]
