import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, users, leads, tickets, queues, notifications, capabilities
from app.routers.admin import router as admin_router
from app.routers.attachments import router as attachments_router
from app.routers.ws_router import router as ws_router
from app.scheduler import start_scheduler, stop_scheduler
from app.ws import manager

app = FastAPI(title="Upjao Leads API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()],
    # Also accept any Vercel deployment (preview + prod) without needing to pin
    # the exact URL in ALLOWED_ORIGINS. Matches https://<anything>.vercel.app.
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(leads.router)
app.include_router(tickets.router)
app.include_router(queues.router)
app.include_router(notifications.router)
app.include_router(capabilities.router)
app.include_router(attachments_router)
app.include_router(admin_router)
app.include_router(ws_router)


@app.on_event("startup")
async def startup():
    manager.set_loop(asyncio.get_event_loop())
    start_scheduler()


@app.on_event("shutdown")
async def shutdown():
    stop_scheduler()


@app.get("/health")
def health():
    return {"status": "ok"}
