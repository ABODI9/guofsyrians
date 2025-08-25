from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional
from app.models.job import Job
from app.schemas.job import JobCreate, JobOut, JobUpdate
from app.services.auth_services import get_admin_user, get_current_active_user

router = APIRouter(prefix="/jobs", tags=["jobs"])

@router.post("/", response_model=JobOut)
async def create_job(payload: JobCreate, admin=Depends(get_admin_user)):
    job = Job(**payload.dict(), owner_id=str(admin.id))
    await job.insert()
    return job

@router.get("/", response_model=List[JobOut])
async def list_jobs(q: str = "", is_active: bool = True):
    query = {}
    if is_active:
        query["is_active"] = True
    if q:
        query["title"] = {"$regex": q, "$options": "i"}
    jobs = await Job.find(query).sort(-Job.created_at).to_list()
    return jobs

@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str):
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.patch("/{job_id}", response_model=JobOut)
async def update_job(job_id: str, payload: JobUpdate, admin=Depends(get_admin_user)):
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    update_data = payload.dict(exclude_unset=True)
    for k, v in update_data.items():
        setattr(job, k, v)
    await job.save()
    return job

@router.delete("/{job_id}", status_code=204)
async def delete_job(job_id: str, admin=Depends(get_admin_user)):
    job = await Job.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    await job.delete()
