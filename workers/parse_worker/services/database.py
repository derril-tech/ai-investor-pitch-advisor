import structlog
from typing import Dict, Any, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

logger = structlog.get_logger()

class DatabaseService:
    def __init__(self, database_url: str):
        self.database_url = database_url
        # Convert sync URL to async
        async_url = database_url.replace('postgresql://', 'postgresql+asyncpg://')
        self.engine = create_async_engine(async_url)
        self.SessionLocal = sessionmaker(
            self.engine, class_=AsyncSession, expire_on_commit=False
        )
    
    async def update_deck_status(self, deck_id: str, status: str):
        """Update deck status"""
        try:
            async with self.SessionLocal() as session:
                await session.execute(
                    text("UPDATE decks SET status = :status WHERE id = :deck_id"),
                    {"status": status, "deck_id": deck_id}
                )
                await session.commit()
                
            logger.info("Updated deck status", deck_id=deck_id, status=status)
            
        except Exception as e:
            logger.error("Failed to update deck status", deck_id=deck_id, error=str(e))
            raise
    
    async def update_deck_metadata(self, deck_id: str, metadata: Dict[str, Any]):
        """Update deck metadata"""
        try:
            async with self.SessionLocal() as session:
                await session.execute(
                    text("UPDATE decks SET metadata = :metadata WHERE id = :deck_id"),
                    {"metadata": metadata, "deck_id": deck_id}
                )
                await session.commit()
                
            logger.info("Updated deck metadata", deck_id=deck_id)
            
        except Exception as e:
            logger.error("Failed to update deck metadata", deck_id=deck_id, error=str(e))
            raise
    
    async def create_slide(
        self,
        deck_id: str,
        slide_number: int,
        title: str,
        content: Optional[str] = None,
        notes: Optional[str] = None,
        image_s3_key: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Create a new slide"""
        try:
            async with self.SessionLocal() as session:
                await session.execute(
                    text("""
                        INSERT INTO slides (deck_id, slide_number, title, content, notes, image_s3_key, metadata)
                        VALUES (:deck_id, :slide_number, :title, :content, :notes, :image_s3_key, :metadata)
                    """),
                    {
                        "deck_id": deck_id,
                        "slide_number": slide_number,
                        "title": title,
                        "content": content,
                        "notes": notes,
                        "image_s3_key": image_s3_key,
                        "metadata": metadata or {}
                    }
                )
                await session.commit()
                
            logger.info("Created slide", deck_id=deck_id, slide_number=slide_number)
            
        except Exception as e:
            logger.error("Failed to create slide", deck_id=deck_id, slide_number=slide_number, error=str(e))
            raise
