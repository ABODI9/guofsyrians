from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class JobBase(BaseModel):
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None
    description: str
    requirements: Optional[str] = None
    is_active: bool = True

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    is_active: Optional[bool] = None

class JobOut(JobBase):
    id: str
    owner_id: str
    created_at: datetime
