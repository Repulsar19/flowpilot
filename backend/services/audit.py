"""Append-only audit trail writer. Every AI and human action goes through here."""

from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from models.enums import AuditActorType
from models.orm import AuditEventORM


def record_event(
    db: Session,
    *,
    actor_type: AuditActorType,
    actor_name: str,
    action: str,
    details: dict[str, Any] | None = None,
    execution_id: str | None = None,
    commit: bool = False,
) -> AuditEventORM:
    event = AuditEventORM(
        actor_type=actor_type,
        actor_name=actor_name,
        action=action,
        details_json=json.dumps(details or {}, default=str),
        execution_id=execution_id,
    )
    db.add(event)
    if commit:
        db.commit()
    else:
        db.flush()
    return event
