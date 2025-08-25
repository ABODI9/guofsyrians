from beanie import Document, Indexed
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class Job(Document):
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    type: Optional[str] = None           # full-time, part-time, internship ...
    description: str
    requirements: Optional[str] = None
    is_active: bool = True
    owner_id: str                         # admin id صاحب الإعلان
    created_at: datetime = datetime.utcnow()

    class Settings:
        name = "jobs"
        use_state_management = True
        indexes = [
            # بحث سريع بالعنوان + حالة الوظيفة
            [("title", 1)],
            [("is_active", 1), ("created_at", -1)],
        ]
