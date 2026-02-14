"""
VidAI AI Service — FastAPI Application Entry Point
Serves 3 AI endpoints (chat, recommendations, budget-plan) + health check.
Connects to local Ollama instance for LLM inference.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers.ai_router import router as ai_router
from app.services.ollama_service import ollama_service

# ── Logging ──────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("vidai")

# ── App ──────────────────────────────────────────────────────────────

app = FastAPI(
    title="VidAI AI Service",
    description="AI-powered wedding planning microservice for Pakistan — chat, recommendations, and budget planning.",
    version="1.0.0",
)

# ── CORS ─────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────────────────────

app.include_router(ai_router)


# ── Health Endpoint ──────────────────────────────────────────────────


@app.get("/health")
async def health_check():
    """
    Health check endpoint.
    Verifies that the service is running and Ollama is reachable.
    Used by: Admin SystemHealth page, backend health checks.
    """
    ollama_ok = await ollama_service.is_healthy()

    return {
        "status": "healthy" if ollama_ok else "degraded",
        "service": "vidai-ai",
        "version": "1.0.0",
        "ollama": {
            "status": "connected" if ollama_ok else "disconnected",
            "model": settings.OLLAMA_MODEL,
            "url": settings.OLLAMA_BASE_URL,
        },
    }


@app.get("/")
async def root():
    """Root endpoint — basic service info."""
    return {
        "service": "VidAI AI Service",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


# ── Startup / Shutdown Events ────────────────────────────────────────


@app.on_event("startup")
async def startup_event():
    """Log startup info and check Ollama availability."""
    logger.info("VidAI AI Service starting on %s:%s", settings.HOST, settings.PORT)
    logger.info(
        "Ollama URL: %s | Model: %s", settings.OLLAMA_BASE_URL, settings.OLLAMA_MODEL
    )

    ollama_ok = await ollama_service.is_healthy()
    if ollama_ok:
        logger.info(
            "Ollama connection verified — model '%s' is available",
            settings.OLLAMA_MODEL,
        )
    else:
        logger.warning(
            "Ollama is NOT reachable at %s — AI features will be unavailable until Ollama is started",
            settings.OLLAMA_BASE_URL,
        )


@app.on_event("shutdown")
async def shutdown_event():
    """Log shutdown."""
    logger.info("VidAI AI Service shutting down")
