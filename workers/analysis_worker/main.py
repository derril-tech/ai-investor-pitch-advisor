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
from .services.scorer import ScorerService
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

class AnalysisRequest(BaseModel):
    deck_id: str
    slides: list
    structure_analysis: dict

class AnalysisResponse(BaseModel):
    deck_id: str
    status: str
    scores: dict
    explanations: dict
    message: str

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    logger.info("Starting analysis worker")
    
    # Initialize services
    app.state.redis = redis.from_url(settings.REDIS_URL)
    app.state.nats = await nats.connect(settings.NATS_URL)
    app.state.database = DatabaseService(settings.DATABASE_URL)
    app.state.scorer = ScorerService()
    
    logger.info("Analysis worker started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down analysis worker")
    await app.state.redis.close()
    await app.state.nats.close()

app = FastAPI(
    title="Analysis Worker",
    description="Scoring and analysis service",
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
    return {"status": "healthy", "service": "analysis-worker"}

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_deck(request: AnalysisRequest):
    """Analyze and score a deck"""
    try:
        logger.info("Starting deck analysis", deck_id=request.deck_id)
        
        # Score the deck
        scores = await app.state.scorer.score_deck(
            request.slides,
            request.structure_analysis
        )
        
        # Generate explanations
        explanations = await app.state.scorer.generate_explanations(
            request.slides,
            scores
        )
        
        # Save analysis results
        await app.state.database.save_analysis_results(
            request.deck_id,
            scores,
            explanations
        )
        
        logger.info("Deck analysis completed", deck_id=request.deck_id)
        
        return AnalysisResponse(
            deck_id=request.deck_id,
            status="completed",
            scores=scores,
            explanations=explanations,
            message="Analysis completed successfully"
        )
        
    except Exception as e:
        logger.error("Deck analysis failed", deck_id=request.deck_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/analyze/async")
async def analyze_deck_async(request: AnalysisRequest):
    """Start async deck analysis"""
    try:
        logger.info("Starting async deck analysis", deck_id=request.deck_id)
        
        # Publish to NATS for async processing
        await app.state.nats.publish(
            "deck.analyze",
            payload=request.model_dump_json().encode()
        )
        
        return {"status": "accepted", "deck_id": request.deck_id}
        
    except Exception as e:
        logger.error("Failed to start async analysis", deck_id=request.deck_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to start analysis: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_config=None
    )
