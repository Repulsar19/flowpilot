"""Startup seeding: load the demo SOP and its cached redesign so the app is demonstrable immediately."""

from __future__ import annotations

import logging

from sqlalchemy.orm import Session

from models.orm import ProcessORM, WorkflowORM
from services.demo import load_demo
from services.redesign_service import run_redesign_sync

logger = logging.getLogger(__name__)


def seed_if_empty(db: Session) -> None:
    if db.query(ProcessORM).count() > 0:
        return

    try:
        document = load_demo(db)
    except Exception:  # noqa: BLE001
        logger.exception("Demo SOP could not be loaded at startup")
        return

    process = db.get(ProcessORM, document.process_id) if document.process_id else None
    if process is None:
        return

    db.add(
        WorkflowORM(
            name=f"Current State — {process.name}",
            process_id=process.id,
            is_future_state=False,
            description="As-is workflow mapped from the demo SOP.",
        )
    )
    db.commit()

    try:
        run_redesign_sync(db, process)
    except Exception:  # noqa: BLE001
        logger.exception("Cached demo redesign could not be applied at startup")
