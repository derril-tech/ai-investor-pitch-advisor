import structlog
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import json

logger = structlog.get_logger()

class DatabaseService:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = None
        self.session_factory = None

    async def connect(self):
        """Connect to the database"""
        try:
            self.engine = create_async_engine(self.database_url)
            self.session_factory = sessionmaker(
                self.engine, class_=AsyncSession, expire_on_commit=False
            )
            logger.info("Database connected successfully")
        except Exception as e:
            logger.error("Failed to connect to database", error=str(e))
            raise

    async def disconnect(self):
        """Disconnect from the database"""
        if self.engine:
            await self.engine.dispose()
            logger.info("Database disconnected")

    async def get_deck_with_slides(self, deck_id: str) -> Optional[Dict[str, Any]]:
        """Get deck with all slides"""
        try:
            async with self.session_factory() as session:
                # Get deck
                deck_query = text("""
                    SELECT id, name, description, file_type, file_name, file_size, 
                           s3_key, status, metadata, parse_result, project_id, 
                           created_at, updated_at
                    FROM decks 
                    WHERE id = :deck_id AND deleted_at IS NULL
                """)
                deck_result = await session.execute(deck_query, {"deck_id": deck_id})
                deck_row = deck_result.fetchone()
                
                if not deck_row:
                    return None
                
                deck = dict(deck_row._mapping)
                
                # Get slides
                slides_query = text("""
                    SELECT id, slide_number, title, content, notes, image_s3_key, 
                           metadata, deck_id, created_at, updated_at
                    FROM slides 
                    WHERE deck_id = :deck_id AND deleted_at IS NULL
                    ORDER BY slide_number
                """)
                slides_result = await session.execute(slides_query, {"deck_id": deck_id})
                slides = [dict(row._mapping) for row in slides_result.fetchall()]
                
                deck["slides"] = slides
                return deck
                
        except Exception as e:
            logger.error("Error getting deck with slides", error=str(e), deck_id=deck_id)
            raise

    async def create_qa_session(self, session_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a Q&A session"""
        try:
            async with self.session_factory() as session:
                query = text("""
                    INSERT INTO qa_sessions (id, name, deck_id, sector, stage, status, metadata, created_at, updated_at)
                    VALUES (:id, :name, :deck_id, :sector, :stage, :status, :metadata, :created_at, :updated_at)
                    RETURNING id, name, deck_id, sector, stage, status, metadata, created_at, updated_at
                """)
                
                result = await session.execute(query, {
                    **session_data,
                    "metadata": json.dumps(session_data.get("metadata", {})),
                    "updated_at": session_data["created_at"]
                })
                
                await session.commit()
                row = result.fetchone()
                return dict(row._mapping)
                
        except Exception as e:
            logger.error("Error creating Q&A session", error=str(e))
            raise

    async def update_qa_session(self, session_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a Q&A session"""
        try:
            async with self.session_factory() as session:
                # Build dynamic update query
                set_clauses = []
                params = {"session_id": session_id}
                
                for key, value in update_data.items():
                    if key == "metadata" and isinstance(value, dict):
                        set_clauses.append(f"{key} = :{key}")
                        params[key] = json.dumps(value)
                    else:
                        set_clauses.append(f"{key} = :{key}")
                        params[key] = value
                
                set_clauses.append("updated_at = NOW()")
                
                query = text(f"""
                    UPDATE qa_sessions 
                    SET {', '.join(set_clauses)}
                    WHERE id = :session_id
                """)
                
                result = await session.execute(query, params)
                await session.commit()
                
                return result.rowcount > 0
                
        except Exception as e:
            logger.error("Error updating Q&A session", error=str(e), session_id=session_id)
            raise

    async def get_qa_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a Q&A session"""
        try:
            async with self.session_factory() as session:
                query = text("""
                    SELECT id, name, deck_id, sector, stage, status, metadata, 
                           question_count, created_at, updated_at, completed_at
                    FROM qa_sessions 
                    WHERE id = :session_id AND deleted_at IS NULL
                """)
                
                result = await session.execute(query, {"session_id": session_id})
                row = result.fetchone()
                
                if not row:
                    return None
                
                session_data = dict(row._mapping)
                if session_data.get("metadata"):
                    session_data["metadata"] = json.loads(session_data["metadata"])
                
                return session_data
                
        except Exception as e:
            logger.error("Error getting Q&A session", error=str(e), session_id=session_id)
            raise

    async def get_qa_sessions_by_deck(self, deck_id: str) -> List[Dict[str, Any]]:
        """Get all Q&A sessions for a deck"""
        try:
            async with self.session_factory() as session:
                query = text("""
                    SELECT id, name, deck_id, sector, stage, status, metadata, 
                           question_count, created_at, updated_at, completed_at
                    FROM qa_sessions 
                    WHERE deck_id = :deck_id AND deleted_at IS NULL
                    ORDER BY created_at DESC
                """)
                
                result = await session.execute(query, {"deck_id": deck_id})
                rows = result.fetchall()
                
                sessions = []
                for row in rows:
                    session_data = dict(row._mapping)
                    if session_data.get("metadata"):
                        session_data["metadata"] = json.loads(session_data["metadata"])
                    sessions.append(session_data)
                
                return sessions
                
        except Exception as e:
            logger.error("Error getting Q&A sessions by deck", error=str(e), deck_id=deck_id)
            raise

    async def delete_qa_session(self, session_id: str) -> bool:
        """Delete a Q&A session (soft delete)"""
        try:
            async with self.session_factory() as session:
                query = text("""
                    UPDATE qa_sessions 
                    SET deleted_at = NOW() 
                    WHERE id = :session_id
                """)
                
                result = await session.execute(query, {"session_id": session_id})
                await session.commit()
                
                return result.rowcount > 0
                
        except Exception as e:
            logger.error("Error deleting Q&A session", error=str(e), session_id=session_id)
            raise

    async def create_qa_pair(self, pair_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a Q&A pair with enhanced fields"""
        try:
            async with self.session_factory() as session:
                query = text("""
                    INSERT INTO qa_pairs (id, session_id, question, category, confidence,
                                        slide_refs, needs_extra_info, draft_answer, answer_confidence,
                                        follow_up_questions, created_at, updated_at)
                    VALUES (:id, :session_id, :question, :category, :confidence,
                           :slide_refs, :needs_extra_info, :draft_answer, :answer_confidence,
                           :follow_up_questions, :created_at, :updated_at)
                    RETURNING id, session_id, question, category, confidence, slide_refs,
                             needs_extra_info, draft_answer, answer_confidence, follow_up_questions,
                             answer, answered_at, created_at, updated_at
                """)

                result = await session.execute(query, {
                    "id": pair_data.get("id"),
                    "session_id": pair_data["session_id"],
                    "question": pair_data["question"],
                    "category": pair_data.get("category", "general"),
                    "confidence": pair_data.get("confidence", 0.5),
                    "slide_refs": json.dumps(pair_data.get("slide_refs", [])),
                    "needs_extra_info": pair_data.get("needs_extra_info", False),
                    "draft_answer": pair_data.get("draft_answer", ""),
                    "answer_confidence": pair_data.get("answer_confidence", 0.5),
                    "follow_up_questions": json.dumps(pair_data.get("follow_up_questions", [])),
                    "created_at": pair_data.get("created_at"),
                    "updated_at": pair_data.get("updated_at")
                })

                await session.commit()
                row = result.fetchone()
                return dict(row._mapping)
                
        except Exception as e:
            logger.error("Error creating Q&A pair", error=str(e), session_id=pair_data.get("session_id"))
            raise

    async def update_qa_pair(self, pair_id: str, update_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a Q&A pair"""
        try:
            async with self.session_factory() as session:
                # Build dynamic update query
                set_clauses = []
                params = {"pair_id": pair_id}
                
                for key, value in update_data.items():
                    if key == "metadata" and isinstance(value, dict):
                        set_clauses.append(f"{key} = :{key}")
                        params[key] = json.dumps(value)
                    else:
                        set_clauses.append(f"{key} = :{key}")
                        params[key] = value
                
                set_clauses.append("updated_at = NOW()")
                
                query = text(f"""
                    UPDATE qa_pairs 
                    SET {', '.join(set_clauses)}
                    WHERE id = :pair_id
                    RETURNING id, session_id, question, category, confidence, slide_refs, 
                             needs_extra_info, metadata, answer, answered_at, created_at, updated_at
                """)
                
                result = await session.execute(query, params)
                await session.commit()
                
                row = result.fetchone()
                if not row:
                    raise ValueError("Q&A pair not found")
                
                return dict(row._mapping)
                
        except Exception as e:
            logger.error("Error updating Q&A pair", error=str(e), pair_id=pair_id)
            raise

    async def get_qa_pairs_by_session(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all Q&A pairs for a session"""
        try:
            async with self.session_factory() as session:
                query = text("""
                    SELECT id, session_id, question, category, confidence, slide_refs, 
                           needs_extra_info, metadata, answer, answered_at, created_at, updated_at
                    FROM qa_pairs 
                    WHERE session_id = :session_id AND deleted_at IS NULL
                    ORDER BY created_at
                """)
                
                result = await session.execute(query, {"session_id": session_id})
                rows = result.fetchall()
                
                pairs = []
                for row in rows:
                    pair_data = dict(row._mapping)
                    if pair_data.get("metadata"):
                        pair_data["metadata"] = json.loads(pair_data["metadata"])
                    if pair_data.get("slide_refs"):
                        pair_data["slide_refs"] = json.loads(pair_data["slide_refs"])
                    pairs.append(pair_data)
                
                return pairs
                
        except Exception as e:
            logger.error("Error getting Q&A pairs by session", error=str(e), session_id=session_id)
            raise

    async def delete_qa_pairs_by_session(self, session_id: str) -> bool:
        """Delete all Q&A pairs for a session (soft delete)"""
        try:
            async with self.session_factory() as session:
                query = text("""
                    UPDATE qa_pairs 
                    SET deleted_at = NOW() 
                    WHERE session_id = :session_id
                """)
                
                result = await session.execute(query, {"session_id": session_id})
                await session.commit()
                
                return result.rowcount > 0
                
        except Exception as e:
            logger.error("Error deleting Q&A pairs by session", error=str(e), session_id=session_id)
            raise
