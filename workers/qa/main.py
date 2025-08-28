from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import structlog
import asyncio
from typing import List, Dict, Any

from config import Settings
from services.database import DatabaseService
from services.qa_generator import QAGeneratorService
from services.qa_session import QASessionService

# Configure logging
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

# Initialize FastAPI app
app = FastAPI(
    title="QA Worker",
    description="Generates investor questions and prepares Q&A sessions",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load configuration
config = Settings()

# Initialize services
database_service = DatabaseService(config.database_url)
qa_generator = QAGeneratorService()
qa_session_service = QASessionService(database_service, qa_generator)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    await database_service.connect()
    logger.info("QA Worker started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await database_service.disconnect()
    logger.info("QA Worker shutdown complete")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "qa-worker"}

@app.post("/qa/generate")
async def generate_qa_session(
    deck_id: str,
    session_name: str = "Investor Q&A Session",
    sector: str = "Technology",
    stage: str = "Series A",
    num_questions: int = 20
):
    """Generate a Q&A session for a deck"""
    try:
        logger.info("Generating Q&A session", deck_id=deck_id, session_name=session_name)
        
        # Get deck and slides data
        deck_data = await database_service.get_deck_with_slides(deck_id)
        if not deck_data:
            raise HTTPException(status_code=404, detail="Deck not found")
        
        # Generate Q&A session
        session = await qa_session_service.create_qa_session(
            deck_id=deck_id,
            name=session_name,
            sector=sector,
            stage=stage,
            num_questions=num_questions
        )
        
        logger.info("Q&A session generated successfully", session_id=session["id"])
        return session
        
    except Exception as e:
        logger.error("Error generating Q&A session", error=str(e), deck_id=deck_id)
        raise HTTPException(status_code=500, detail=f"Failed to generate Q&A session: {str(e)}")

@app.post("/qa/generate/async")
async def generate_qa_session_async(
    deck_id: str,
    session_name: str = "Investor Q&A Session",
    sector: str = "Technology",
    stage: str = "Series A",
    num_questions: int = 20
):
    """Generate a Q&A session asynchronously"""
    try:
        logger.info("Starting async Q&A session generation", deck_id=deck_id)
        
        # Create session record first
        session = await qa_session_service.create_session_record(
            deck_id=deck_id,
            name=session_name,
            sector=sector,
            stage=stage
        )
        
        # Start background task
        asyncio.create_task(
            qa_session_service.generate_qa_session_background(
                session_id=session["id"],
                deck_id=deck_id,
                num_questions=num_questions
            )
        )
        
        return {
            "session_id": session["id"],
            "status": "processing",
            "message": "Q&A session generation started"
        }
        
    except Exception as e:
        logger.error("Error starting async Q&A generation", error=str(e), deck_id=deck_id)
        raise HTTPException(status_code=500, detail=f"Failed to start Q&A generation: {str(e)}")

@app.get("/qa/session/{session_id}")
async def get_qa_session(session_id: str):
    """Get Q&A session details"""
    try:
        session = await qa_session_service.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Q&A session not found")
        
        return session
        
    except Exception as e:
        logger.error("Error retrieving Q&A session", error=str(e), session_id=session_id)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve Q&A session: {str(e)}")

@app.get("/qa/session/{session_id}/questions")
async def get_qa_questions(session_id: str):
    """Get questions for a Q&A session"""
    try:
        questions = await qa_session_service.get_session_questions(session_id)
        return {"questions": questions}
        
    except Exception as e:
        logger.error("Error retrieving Q&A questions", error=str(e), session_id=session_id)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve questions: {str(e)}")

@app.post("/qa/question/{question_id}/answer")
async def add_answer(question_id: str, answer: str):
    """Add an answer to a question"""
    try:
        result = await qa_session_service.add_answer(question_id, answer)
        return result

    except Exception as e:
        logger.error("Error adding answer", error=str(e), question_id=question_id)
        raise HTTPException(status_code=500, detail=f"Failed to add answer: {str(e)}")

@app.post("/qa/generate/stage-sector")
async def generate_stage_sector_questions(
    deck_id: str,
    sector: str = "Technology",
    stage: str = "Series A",
    num_questions: int = 20
):
    """Generate stage and sector-specific questions with draft answers"""
    try:
        logger.info("Generating stage/sector-specific questions",
                   deck_id=deck_id, sector=sector, stage=stage)

        # Get deck and slides data
        deck_data = await database_service.get_deck_with_slides(deck_id)
        if not deck_data:
            raise HTTPException(status_code=404, detail="Deck not found")

        # Generate stage/sector-specific questions with draft answers
        questions = await qa_generator.generate_stage_sector_questions(
            deck_data=deck_data,
            sector=sector,
            stage=stage,
            num_questions=num_questions
        )

        logger.info("Stage/sector questions generated successfully",
                   count=len(questions))
        return {"questions": questions}

    except Exception as e:
        logger.error("Error generating stage/sector questions", error=str(e), deck_id=deck_id)
        raise HTTPException(status_code=500, detail=f"Failed to generate questions: {str(e)}")

@app.post("/qa/generate/enhanced-session")
async def generate_enhanced_qa_session(
    deck_id: str,
    session_name: str = "Enhanced Investor Q&A Session",
    sector: str = "Technology",
    stage: str = "Series A",
    include_draft_answers: bool = True,
    num_questions: int = 20
):
    """Generate an enhanced Q&A session with draft answers and follow-ups"""
    try:
        logger.info("Generating enhanced Q&A session",
                   deck_id=deck_id, include_draft_answers=include_draft_answers)

        # Get deck and slides data
        deck_data = await database_service.get_deck_with_slides(deck_id)
        if not deck_data:
            raise HTTPException(status_code=404, detail="Deck not found")

        # Create enhanced session with stage/sector questions
        session = await qa_session_service.create_enhanced_qa_session(
            deck_id=deck_id,
            name=session_name,
            sector=sector,
            stage=stage,
            include_draft_answers=include_draft_answers,
            num_questions=num_questions
        )

        logger.info("Enhanced Q&A session generated successfully", session_id=session["id"])
        return session

    except Exception as e:
        logger.error("Error generating enhanced Q&A session", error=str(e), deck_id=deck_id)
        raise HTTPException(status_code=500, detail=f"Failed to generate enhanced session: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
