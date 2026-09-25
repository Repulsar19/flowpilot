from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.mappers import process_to_read, process_to_summary
from models.orm import ProcessORM
from models.schemas import BottleneckRead, MessageResponse, ProcessRead, ProcessSummary
from services.database import get_db

router = APIRouter(prefix="/processes", tags=["processes"])


@router.get("", response_model=list[ProcessSummary])
def list_processes(db: Session = Depends(get_db)) -> list[ProcessSummary]:
    rows = db.query(ProcessORM).order_by(ProcessORM.created_at.desc()).all()
    return [process_to_summary(r) for r in rows]


@router.get("/{process_id}", response_model=ProcessRead)
def get_process(process_id: str, db: Session = Depends(get_db)) -> ProcessRead:
    row = db.get(ProcessORM, process_id)
    if not row:
        raise HTTPException(status_code=404, detail="Process not found")
    return process_to_read(row)


@router.get("/{process_id}/bottlenecks", response_model=list[BottleneckRead])
def list_bottlenecks(process_id: str, db: Session = Depends(get_db)) -> list[BottleneckRead]:
    process = db.get(ProcessORM, process_id)
    if not process:
        raise HTTPException(status_code=404, detail="Process not found")
    return []


@router.post("/{process_id}/classify", response_model=MessageResponse, status_code=501)
def classify_process(process_id: str, db: Session = Depends(get_db)) -> MessageResponse:
    if not db.get(ProcessORM, process_id):
        raise HTTPException(status_code=404, detail="Process not found")
    return MessageResponse(
        message="Classification stub",
        detail="Bottleneck detection and AI/Human classification ship in Phase 3.",
    )


@router.delete("/{process_id}", status_code=204)
def delete_process(process_id: str, db: Session = Depends(get_db)) -> None:
    row = db.get(ProcessORM, process_id)
    if not row:
        raise HTTPException(status_code=404, detail="Process not found")
    db.delete(row)
    db.commit()
