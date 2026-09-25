from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.mappers import agent_to_read
from models.orm import AgentORM
from models.schemas import AgentRead
from services.database import get_db

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("", response_model=list[AgentRead])
def list_agents(db: Session = Depends(get_db)) -> list[AgentRead]:
    rows = db.query(AgentORM).order_by(AgentORM.created_at.desc()).all()
    return [agent_to_read(r) for r in rows]


@router.get("/{agent_id}", response_model=AgentRead)
def get_agent(agent_id: str, db: Session = Depends(get_db)) -> AgentRead:
    row = db.get(AgentORM, agent_id)
    if not row:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent_to_read(row)
