from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import logging
import os

from app.config.database import init_db, db
from app.routers import all_routers

# ── logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("guof-backend")

# ── app ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="GuofSyrians backend",
    description="backend for managing Guof Syrians members and teams",
    version="1.0.0",
)

load_dotenv()

# ── CORS ───────────────────────────────────────────────────────────────────────
origins = os.getenv("CORS_ALLOW_ORIGINS", "*").split(",")
origins = [o.strip() for o in origins if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ── Request logging (debug) ───────────────────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url}")
    logger.info(f"Headers: {dict(request.headers)}")
    logger.info(f"Client Host: {request.client.host if request.client else 'Unknown'}")
    try:
        response = await call_next(request)
    except Exception as e:
        logger.exception("Unhandled exception while processing request")
        # أعد رسالة مفيدة بدل 500 مبهمة
        return JSONResponse(status_code=500, content={"detail": str(e)})
    logger.info(f"Response: {response.status_code}")
    return response

# ── Static uploads ────────────────────────────────────────────────────────────
uploads_dir = "uploads"
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# ── Routers (includes /api/jobs) ──────────────────────────────────────────────
app.include_router(all_routers.router, prefix="/api")

# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def on_startup():
    await init_db()

    # فهرس فريد لمنع التقديم المكرر على نفس الوظيفة
    try:
        await db["applications"].create_index([("job_id", 1), ("user_id", 1)], unique=True)
    except Exception as e:
        logger.warning(f"create_index(applications) warning: {e}")

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "message": "GuofSyrians API is running",
        "cors_origins": origins,
    }
