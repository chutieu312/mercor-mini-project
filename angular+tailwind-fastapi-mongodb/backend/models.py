from pydantic import BaseModel
from typing import Optional, Literal
from datetime import datetime


class TaskCreate(BaseModel):
    title: str
    description: str = ""
    status: Literal["todo", "in-progress", "done"] = "todo"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[Literal["todo", "in-progress", "done"]] = None


class TaskResponse(BaseModel):
    id: str
    title: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime
