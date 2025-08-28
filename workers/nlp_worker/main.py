import asyncio
import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import nats
import redis.asyncio as redis
import structlog
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import settings
from .services.structure_detector import StructureDetectorService
from .services.kpi_extractor import KPIExtractorService
from .services.database import DatabaseService

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

class StructureDetectionRequest(BaseModel):
    deck_id: str
    slides: list

class StructureDetectionResponse(BaseModel):
    deck_id: str
    status: str
    slide_roles: dict
    kpis: dict
    message: str

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    logger.info("Starting NLP worker")
    
    # Initialize services
    app.state.redis = redis.from_url(settings.REDIS_URL)
    app.state.nats = await nats.connect(settings.NATS_URL)
    app.state.database = DatabaseService(settings.DATABASE_URL)
    app.state.structure_detector = StructureDetectorService()
    app.state.kpi_extractor = KPIExtractorService()
    
    logger.info("NLP worker started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down NLP worker")
    await app.state.redis.close()
    await app.state.nats.close()

app = FastAPI(
    title="NLP Worker",
    description="Structure detection and KPI extraction service",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "nlp-worker"}

@app.post("/detect-structure", response_model=StructureDetectionResponse)
async def detect_structure(request: StructureDetectionRequest):
    """Detect slide roles and extract KPIs"""
    try:
        logger.info("Starting structure detection", deck_id=request.deck_id)
        
        # Detect slide roles
        slide_roles = await app.state.structure_detector.detect_slide_roles(request.slides)
        
        # Extract KPIs
        kpis = await app.state.kpi_extractor.extract_kpis(request.slides)
        
        # Update deck with structure analysis
        await app.state.database.update_deck_structure_analysis(
            request.deck_id, 
            {"slide_roles": slide_roles, "kpis": kpis}
        )
        
        logger.info("Structure detection completed", deck_id=request.deck_id)
        
        return StructureDetectionResponse(
            deck_id=request.deck_id,
            status="completed",
            slide_roles=slide_roles,
            kpis=kpis,
            message="Structure detection completed successfully"
        )
        
    except Exception as e:
        logger.error("Structure detection failed", deck_id=request.deck_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Structure detection failed: {str(e)}")

@app.post("/detect-structure/async")
async def detect_structure_async(request: StructureDetectionRequest):
    """Start async structure detection"""
    try:
        logger.info("Starting async structure detection", deck_id=request.deck_id)
        
        # Publish to NATS for async processing
        await app.state.nats.publish(
            "deck.analyze",
            payload=request.model_dump_json().encode()
        )
        
        return {"status": "accepted", "deck_id": request.deck_id}
        
    except Exception as e:
        logger.error("Failed to start async structure detection", deck_id=request.deck_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to start structure detection: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_config=None
    )
