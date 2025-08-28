import structlog
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from typing import Optional, Dict, Any, List
import uuid
from datetime import datetime

logger = structlog.get_logger()

class DatabaseService:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = None
        self.session_factory = None
        
    async def connect(self):
        """Connect to database"""
        try:
            self.engine = create_async_engine(self.database_url)
            self.session_factory = sessionmaker(
                self.engine, class_=AsyncSession, expire_on_commit=False
            )
            logger.info("Database connected successfully")
        except Exception as e:
            logger.error("Error connecting to database", error=str(e))
            raise
            
    async def disconnect(self):
        """Disconnect from database"""
        if self.engine:
            await self.engine.dispose()
            logger.info("Database disconnected")
            
    async def get_deck_with_analysis(self, deck_id: str) -> Optional[Dict[str, Any]]:
        """Get deck with analysis data"""
        try:
            async with self.session_factory() as session:
                # Get deck data
                deck_query = """
                    SELECT id, name, file_path, created_at, updated_at
                    FROM decks
                    WHERE id = $1 AND deleted_at IS NULL
                """
                deck_result = await session.execute(deck_query, [deck_id])
                deck_row = deck_result.fetchone()
                
                if not deck_row:
                    return None
                    
                deck_data = {
                    'id': deck_row[0],
                    'name': deck_row[1],
                    'file_path': deck_row[2],
                    'created_at': deck_row[3],
                    'updated_at': deck_row[4]
                }
                
                # Get analysis data
                analysis_query = """
                    SELECT scores, explanations, created_at
                    FROM analyses
                    WHERE deck_id = $1 AND deleted_at IS NULL
                    ORDER BY created_at DESC
                    LIMIT 1
                """
                analysis_result = await session.execute(analysis_query, [deck_id])
                analysis_row = analysis_result.fetchone()
                
                if analysis_row:
                    deck_data['analysis'] = {
                        'scores': analysis_row[0],
                        'explanations': analysis_row[1],
                        'created_at': analysis_row[2]
                    }
                
                return deck_data
                
        except Exception as e:
            logger.error("Error getting deck with analysis", error=str(e), deck_id=deck_id)
            return None
            
    async def get_qa_session_data(self, qa_session_id: str) -> Optional[Dict[str, Any]]:
        """Get Q&A session data"""
        try:
            async with self.session_factory() as session:
                # Get session data
                session_query = """
                    SELECT id, name, deck_id, sector, stage, created_at
                    FROM qa_sessions
                    WHERE id = $1 AND deleted_at IS NULL
                """
                session_result = await session.execute(session_query, [qa_session_id])
                session_row = session_result.fetchone()
                
                if not session_row:
                    return None
                    
                session_data = {
                    'id': session_row[0],
                    'name': session_row[1],
                    'deck_id': session_row[2],
                    'sector': session_row[3],
                    'stage': session_row[4],
                    'created_at': session_row[5]
                }
                
                # Get questions
                questions_query = """
                    SELECT id, question, category, confidence, slide_refs, needs_extra_info, answer, answered_at
                    FROM qa_pairs
                    WHERE session_id = $1 AND deleted_at IS NULL
                    ORDER BY category, created_at
                """
                questions_result = await session.execute(questions_query, [qa_session_id])
                questions = []
                
                for row in questions_result.fetchall():
                    questions.append({
                        'id': row[0],
                        'question': row[1],
                        'category': row[2],
                        'confidence': row[3],
                        'slide_refs': row[4],
                        'needs_extra_info': row[5],
                        'answer': row[6],
                        'answered_at': row[7]
                    })
                
                session_data['questions'] = questions
                return session_data
                
        except Exception as e:
            logger.error("Error getting Q&A session data", error=str(e), qa_session_id=qa_session_id)
            return None
            
    async def create_export_record(
        self,
        deck_id: str,
        export_type: str,
        format: str,
        file_path: str,
        file_size: int,
        include_analysis: bool = True,
        include_qa: bool = False,
        qa_session_id: str = None
    ) -> Optional[str]:
        """Create export record"""
        try:
            export_id = str(uuid.uuid4())
            
            async with self.session_factory() as session:
                query = """
                    INSERT INTO exports (
                        id, deck_id, export_type, format, file_path, file_size,
                        include_analysis, include_qa, qa_session_id, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """
                
                await session.execute(query, [
                    export_id, deck_id, export_type, format, file_path, file_size,
                    include_analysis, include_qa, qa_session_id,
                    datetime.utcnow(), datetime.utcnow()
                ])
                
                await session.commit()
                logger.info("Export record created", export_id=export_id)
                return export_id
                
        except Exception as e:
            logger.error("Error creating export record", error=str(e))
            return None
            
    async def get_export_record(self, export_id: str) -> Optional[Dict[str, Any]]:
        """Get export record"""
        try:
            async with self.session_factory() as session:
                query = """
                    SELECT id, deck_id, export_type, format, file_path, file_size,
                           include_analysis, include_qa, qa_session_id, created_at, updated_at
                    FROM exports
                    WHERE id = $1 AND deleted_at IS NULL
                """
                
                result = await session.execute(query, [export_id])
                row = result.fetchone()
                
                if not row:
                    return None
                    
                return {
                    'id': row[0],
                    'deck_id': row[1],
                    'export_type': row[2],
                    'format': row[3],
                    'file_path': row[4],
                    'file_size': row[5],
                    'include_analysis': row[6],
                    'include_qa': row[7],
                    'qa_session_id': row[8],
                    'created_at': row[9],
                    'updated_at': row[10]
                }
                
        except Exception as e:
            logger.error("Error getting export record", error=str(e), export_id=export_id)
            return None
            
    async def get_exports_by_deck(self, deck_id: str) -> List[Dict[str, Any]]:
        """Get all exports for a deck"""
        try:
            async with self.session_factory() as session:
                query = """
                    SELECT id, export_type, format, file_path, file_size, created_at
                    FROM exports
                    WHERE deck_id = $1 AND deleted_at IS NULL
                    ORDER BY created_at DESC
                """
                
                result = await session.execute(query, [deck_id])
                exports = []
                
                for row in result.fetchall():
                    exports.append({
                        'id': row[0],
                        'export_type': row[1],
                        'format': row[2],
                        'file_path': row[3],
                        'file_size': row[4],
                        'created_at': row[5]
                    })
                
                return exports
                
        except Exception as e:
            logger.error("Error getting exports by deck", error=str(e), deck_id=deck_id)
            return []
            
    async def delete_export_record(self, export_id: str) -> bool:
        """Soft delete export record"""
        try:
            async with self.session_factory() as session:
                query = """
                    UPDATE exports
                    SET deleted_at = $1, updated_at = $1
                    WHERE id = $2
                """
                
                await session.execute(query, [datetime.utcnow(), export_id])
                await session.commit()
                
                logger.info("Export record deleted", export_id=export_id)
                return True
                
        except Exception as e:
            logger.error("Error deleting export record", error=str(e), export_id=export_id)
            return False
