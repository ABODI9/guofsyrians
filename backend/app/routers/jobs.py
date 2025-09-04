# app/routers/jobs.py
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
import logging

from app.models.job import Job
from app.schemas.job import JobCreate, JobOut, JobUpdate
from app.services.auth_services import get_admin_user

logger = logging.getLogger("guof-backend")

router = APIRouter(prefix="/jobs", tags=["jobs"])

def _to_list(v):
    if v is None:
        return []
    if isinstance(v, list):
        return [str(i).strip() for i in v if str(i).strip()]
    return [line.strip() for line in str(v).splitlines() if line.strip()]

def dump_job(doc: Job) -> dict:
    try:
        data = doc.model_dump()
    except Exception:
        data = doc.dict()
    try:
        data["id"] = str(doc.id)
    except Exception:
        pass
    data.pop("revision_id", None)

    # تطبيع الحقول التي سببت 500 لو كانت نصوص قديمة
    data["responsibilities"] = _to_list(data.get("responsibilities"))
    data["requirements"]     = _to_list(data.get("requirements"))
    data["benefits"]         = _to_list(data.get("benefits"))
    return data

@router.post("/", response_model=JobOut)
async def create_job(payload: JobCreate, admin=Depends(get_admin_user)):
    try:
        body = payload.model_dump()
        job = Job(**body, owner_id=str(admin.id))
        await job.insert()
        return dump_job(job)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("create_job failed")
        raise HTTPException(status_code=500, detail=f"create_job error: {e}")

@router.get("/", response_model=List[JobOut])
async def list_jobs(
    q: str = "",
    is_active: bool = True,
    limit: Optional[int] = Query(None, ge=1, le=100)
):
    query = {}
    if is_active:
        query["is_active"] = True
    if q:
        query["title"] = {"$regex": q, "$options": "i"}

    cur = Job.find(query).sort(-Job.created_at)
    if limit:
        cur = cur.limit(limit)

    jobs = await cur.to_list()
    return [dump_job(j) for j in jobs]

@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str):
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return dump_job(job)

@router.patch("/{job_id}", response_model=JobOut)
async def update_job(job_id: str, payload: JobUpdate, admin=Depends(get_admin_user)):
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(job, k, v)
    await job.save()
    return dump_job(job)

@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: str, admin=Depends(get_admin_user)):
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await job.delete()
