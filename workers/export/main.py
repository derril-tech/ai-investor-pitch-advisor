from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import structlog
import asyncio
from typing import List, Dict, Any

from config import Settings
from services.database import DatabaseService
from services.storage import StorageService
from services.export_generator import ExportGeneratorService

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
    title="Export Worker",
    description="Generates exports in various formats (PDF, PPTX, etc.)",
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
storage_service = StorageService(config.s3_endpoint_url, config.s3_access_key, config.s3_secret_key, config.s3_bucket)
export_generator = ExportGeneratorService(storage_service)

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    await database_service.connect()
    await storage_service.ensure_bucket_exists()
    logger.info("Export Worker started successfully")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await database_service.disconnect()
    logger.info("Export Worker shutdown complete")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "export-worker"}

@app.post("/export/generate")
async def generate_export(
    deck_id: str,
    export_type: str = "analysis_report",
    format: str = "pdf",
    include_analysis: bool = True,
    include_qa: bool = False,
    qa_session_id: str = None
):
    """Generate an export for a deck"""
    try:
        logger.info("Generating export", deck_id=deck_id, export_type=export_type, format=format)
        
        # Get deck data
        deck_data = await database_service.get_deck_with_slides(deck_id)
        if not deck_data:
            raise HTTPException(status_code=404, detail="Deck not found")
        
        # Get analysis data if requested
        analysis_data = None
        if include_analysis:
            analysis_data = await database_service.get_latest_analysis(deck_id)
        
        # Get Q&A data if requested
        qa_data = None
        if include_qa and qa_session_id:
            qa_data = await database_service.get_qa_session(qa_session_id)
        
        # Create export record
        export = await database_service.create_export_record(
            deck_id=deck_id,
            export_type=export_type,
            format=format,
            status="processing"
        )
        
        # Generate export
        export_file = await export_generator.generate_export(
            deck_data=deck_data,
            analysis_data=analysis_data,
            qa_data=qa_data,
            export_type=export_type,
            format=format
        )
        
        # Upload to storage
        s3_key = f"exports/{deck_id}/{export['id']}.{format}"
        await storage_service.upload_file(export_file, s3_key)
        
        # Generate signed URL
        signed_url = await storage_service.generate_signed_url(s3_key, expires_in=3600)
        
        # Update export record
        await database_service.update_export(export["id"], {
            "status": "completed",
            "s3_key": s3_key,
            "signed_url": signed_url,
            "signed_url_expires_at": "2024-01-01T00:00:00Z"  # Would calculate actual expiry
        })
        
        logger.info("Export generated successfully", export_id=export["id"])
        return {
            "export_id": export["id"],
            "status": "completed",
            "download_url": signed_url
        }
        
    except Exception as e:
        logger.error("Error generating export", error=str(e), deck_id=deck_id)
        raise HTTPException(status_code=500, detail=f"Failed to generate export: {str(e)}")

@app.post("/export/generate/async")
async def generate_export_async(
    deck_id: str,
    export_type: str = "analysis_report",
    format: str = "pdf",
    include_analysis: bool = True,
    include_qa: bool = False,
    qa_session_id: str = None
):
    """Generate an export asynchronously"""
    try:
        logger.info("Starting async export generation", deck_id=deck_id)
        
        # Create export record first
        export = await database_service.create_export_record(
            deck_id=deck_id,
            export_type=export_type,
            format=format,
            status="processing"
        )
        
        # Start background task
        asyncio.create_task(
            export_generator.generate_export_background(
                export_id=export["id"],
                deck_id=deck_id,
                export_type=export_type,
                format=format,
                include_analysis=include_analysis,
                include_qa=include_qa,
                qa_session_id=qa_session_id
            )
        )
        
        return {
            "export_id": export["id"],
            "status": "processing",
            "message": "Export generation started"
        }
        
    except Exception as e:
        logger.error("Error starting async export generation", error=str(e), deck_id=deck_id)
        raise HTTPException(status_code=500, detail=f"Failed to start export generation: {str(e)}")

@app.get("/export/{export_id}")
async def get_export(export_id: str):
    """Get export details"""
    try:
        export = await database_service.get_export(export_id)
        if not export:
            raise HTTPException(status_code=404, detail="Export not found")
        
        return export
        
    except Exception as e:
        logger.error("Error retrieving export", error=str(e), export_id=export_id)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve export: {str(e)}")

@app.get("/export/deck/{deck_id}")
async def get_deck_exports(deck_id: str):
    """Get all exports for a deck"""
    try:
        exports = await database_service.get_exports_by_deck(deck_id)
        return {"exports": exports}
        
    except Exception as e:
        logger.error("Error retrieving deck exports", error=str(e), deck_id=deck_id)
        raise HTTPException(status_code=500, detail=f"Failed to retrieve exports: {str(e)}")

@app.delete("/export/{export_id}")
async def delete_export(export_id: str):
    """Delete an export"""
    try:
        # Get export details
        export = await database_service.get_export(export_id)
        if not export:
            raise HTTPException(status_code=404, detail="Export not found")
        
        # Delete from storage if exists
        if export.get("s3_key"):
            await storage_service.delete_file(export["s3_key"])
        
        # Delete from database
        result = await database_service.delete_export(export_id)
        
        return {"success": result}
        
    except Exception as e:
        logger.error("Error deleting export", error=str(e), export_id=export_id)
        raise HTTPException(status_code=500, detail=f"Failed to delete export: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
