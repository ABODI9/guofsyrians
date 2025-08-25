from fastapi import APIRouter
from .jobs import router as jobs_router
from .applications import router as applications_router

from app.routers import team_routers, member_routers, auth_routers, resume_routers, mail_router

router = APIRouter()

router.include_router(auth_routers.router, tags=["Authentication"])
router.include_router(team_routers.router, tags=["Team"])
router.include_router(member_routers.router, tags=["Member"])
router.include_router(resume_routers.router, tags=["Resume"])
router.include_router(mail_router.router, tags=["Mail"])
router.include_router(jobs_router)
router.include_router(applications_router)