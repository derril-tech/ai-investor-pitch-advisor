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
from .services.parser import ParserService
from .services.storage import StorageService
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

class ParseRequest(BaseModel):
    deck_id: str
    file_url: str
    file_type: str

class ParseResponse(BaseModel):
    deck_id: str
    status: str
    slides_count: int
    message: str

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    logger.info("Starting parse worker")
    
    # Initialize services
    app.state.redis = redis.from_url(settings.REDIS_URL)
    app.state.nats = await nats.connect(settings.NATS_URL)
    app.state.database = DatabaseService(settings.DATABASE_URL)
    app.state.storage = StorageService(
        endpoint_url=settings.S3_ENDPOINT,
        access_key=settings.S3_ACCESS_KEY,
        secret_key=settings.S3_SECRET_KEY,
        bucket_name=settings.S3_BUCKET
    )
    app.state.parser = ParserService(
        storage_service=app.state.storage,
        database_service=app.state.database
    )
    
    logger.info("Parse worker started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down parse worker")
    await app.state.redis.close()
    await app.state.nats.close()

app = FastAPI(
    title="Parse Worker",
    description="PPTX/PDF/Slides ingestion and parsing service",
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
    return {"status": "healthy", "service": "parse-worker"}

@app.post("/parse", response_model=ParseResponse)
async def parse_deck(request: ParseRequest):
    """Parse a deck file and extract slides"""
    try:
        logger.info("Starting deck parsing", deck_id=request.deck_id, file_type=request.file_type)
        
        # Update deck status to parsing
        await app.state.database.update_deck_status(request.deck_id, "parsing")
        
        # Parse the deck
        result = await app.state.parser.parse_deck(
            deck_id=request.deck_id,
            file_url=request.file_url,
            file_type=request.file_type
        )
        
        # Update deck status to parsed
        await app.state.database.update_deck_status(request.deck_id, "parsed")
        
        logger.info("Deck parsing completed", deck_id=request.deck_id, slides_count=result.slides_count)
        
        return ParseResponse(
            deck_id=request.deck_id,
            status="completed",
            slides_count=result.slides_count,
            message="Deck parsed successfully"
        )
        
    except Exception as e:
        logger.error("Deck parsing failed", deck_id=request.deck_id, error=str(e))
        
        # Update deck status to error
        await app.state.database.update_deck_status(request.deck_id, "error")
        
        raise HTTPException(status_code=500, detail=f"Parsing failed: {str(e)}")

@app.post("/parse/async")
async def parse_deck_async(request: ParseRequest):
    """Start async parsing of a deck file"""
    try:
        logger.info("Starting async deck parsing", deck_id=request.deck_id)
        
        # Publish to NATS for async processing
        await app.state.nats.publish(
            "deck.parse",
            payload=request.model_dump_json().encode()
        )
        
        return {"status": "accepted", "deck_id": request.deck_id}
        
    except Exception as e:
        logger.error("Failed to start async parsing", deck_id=request.deck_id, error=str(e))
        raise HTTPException(status_code=500, detail=f"Failed to start parsing: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_config=None
    )
