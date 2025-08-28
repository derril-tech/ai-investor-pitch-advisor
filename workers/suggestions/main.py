import structlog
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime
import asyncio

from config import Settings
from services.suggestion_generator import SuggestionGeneratorService
from services.database import DatabaseService
from services.storage import StorageService

logger = structlog.get_logger()
settings = Settings()

app = FastAPI(title="Suggestion Worker", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Services
db_service = None
suggestion_service = None
storage_service = None

@app.on_event("startup")
async def startup_event():
    global db_service, suggestion_service, storage_service
    db_service = DatabaseService(settings.database_url)
    await db_service.connect()

    suggestion_service = SuggestionGeneratorService()
    storage_service = StorageService(settings.s3_bucket, settings.aws_region)

    logger.info("Suggestion worker started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    global db_service
    if db_service:
        await db_service.disconnect()
    logger.info("Suggestion worker shut down")

class SuggestionRequest(BaseModel):
    deck_id: str
    slide_ids: Optional[List[str]] = None
    suggestion_types: Optional[List[str]] = None

class SuggestionResponse(BaseModel):
    id: str
    deck_id: str
    slide_id: str
    suggestion_type: str
    title: str
    description: str
    rationale: str
    before_text: str
    after_text: str
    confidence: float
    category: str
    created_at: datetime

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "suggestion-worker"}

@app.post("/suggestions/generate", response_model=List[SuggestionResponse])
async def generate_suggestions(request: SuggestionRequest):
    """Generate suggestions for deck/slides"""
    try:
        logger.info("Generating suggestions", deck_id=request.deck_id)

        # Get deck data
        deck_data = await db_service.get_deck_with_slides(request.deck_id)
        if not deck_data:
            raise HTTPException(status_code=404, detail="Deck not found")

        # Generate suggestions
        suggestions = await suggestion_service.generate_suggestions(
            deck_data=deck_data,
            slide_ids=request.slide_ids,
            suggestion_types=request.suggestion_types
        )

        # Save suggestions to database
        saved_suggestions = []
        for suggestion in suggestions:
            saved = await db_service.create_suggestion(suggestion)
            saved_suggestions.append(saved)

        return saved_suggestions

    except Exception as e:
        logger.error("Error generating suggestions", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/suggestions/generate/async")
async def generate_suggestions_async(request: SuggestionRequest, background_tasks: BackgroundTasks):
    """Generate suggestions asynchronously"""
    try:
        suggestion_run_id = str(uuid.uuid4())

        # Create suggestion run record
        await db_service.create_suggestion_run({
            "id": suggestion_run_id,
            "deck_id": request.deck_id,
            "status": "processing",
            "slide_ids": request.slide_ids,
            "suggestion_types": request.suggestion_types
        })

        # Start background task
        background_tasks.add_task(
            generate_suggestions_background,
            suggestion_run_id,
            request
        )

        return {"suggestion_run_id": suggestion_run_id}

    except Exception as e:
        logger.error("Error starting async suggestion generation", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/suggestions/{suggestion_run_id}")
async def get_suggestion_run(suggestion_run_id: str):
    """Get suggestion run status and results"""
    try:
        run_data = await db_service.get_suggestion_run(suggestion_run_id)
        if not run_data:
            raise HTTPException(status_code=404, detail="Suggestion run not found")

        # Get suggestions for this run
        suggestions = await db_service.get_suggestions_by_run(suggestion_run_id)

        return {
            "id": suggestion_run_id,
            "status": run_data["status"],
            "deck_id": run_data["deck_id"],
            "created_at": run_data["created_at"],
            "completed_at": run_data.get("completed_at"),
            "suggestions": suggestions
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error getting suggestion run", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

async def generate_suggestions_background(run_id: str, request: SuggestionRequest):
    """Background task to generate suggestions"""
    try:
        logger.info("Starting background suggestion generation", run_id=run_id)

        # Update status to processing
        await db_service.update_suggestion_run_status(run_id, "processing")

        # Get deck data
        deck_data = await db_service.get_deck_with_slides(request.deck_id)
        if not deck_data:
            await db_service.update_suggestion_run_status(run_id, "failed", "Deck not found")
            return

        # Generate suggestions
        suggestions = await suggestion_service.generate_suggestions(
            deck_data=deck_data,
            slide_ids=request.slide_ids,
            suggestion_types=request.suggestion_types
        )

        # Save suggestions with run_id
        for suggestion in suggestions:
            suggestion["run_id"] = run_id
            await db_service.create_suggestion(suggestion)

        # Update run status to completed
        await db_service.update_suggestion_run_status(run_id, "completed")

        logger.info("Background suggestion generation completed", run_id=run_id, count=len(suggestions))

    except Exception as e:
        logger.error("Error in background suggestion generation", run_id=run_id, error=str(e))
        await db_service.update_suggestion_run_status(run_id, "failed", str(e))
