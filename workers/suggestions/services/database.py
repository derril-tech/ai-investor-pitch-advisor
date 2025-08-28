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

    async def get_deck_with_slides(self, deck_id: str) -> Optional[Dict[str, Any]]:
        """Get deck with slides"""
        try:
            async with self.session_factory() as session:
                # Get deck data
                deck_query = """
                    SELECT id, name, created_at, updated_at
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
                    'created_at': deck_row[2],
                    'updated_at': deck_row[3]
                }

                # Get slides
                slides_query = """
                    SELECT id, title, content, slide_order, created_at
                    FROM slides
                    WHERE deck_id = $1 AND deleted_at IS NULL
                    ORDER BY slide_order
                """
                slides_result = await session.execute(slides_query, [deck_id])
                slides = []

                for row in slides_result.fetchall():
                    slides.append({
                        'id': row[0],
                        'title': row[1],
                        'content': row[2],
                        'slide_order': row[3],
                        'created_at': row[4]
                    })

                deck_data['slides'] = slides
                return deck_data

        except Exception as e:
            logger.error("Error getting deck with slides", error=str(e), deck_id=deck_id)
            return None

    async def create_suggestion(self, suggestion_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new suggestion"""
        try:
            suggestion_id = suggestion_data.get('id') or str(uuid.uuid4())

            async with self.session_factory() as session:
                query = """
                    INSERT INTO suggestions (
                        id, deck_id, slide_id, run_id, suggestion_type, title,
                        description, rationale, before_text, after_text, confidence,
                        category, status, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                """

                await session.execute(query, [
                    suggestion_id,
                    suggestion_data['deck_id'],
                    suggestion_data['slide_id'],
                    suggestion_data.get('run_id'),
                    suggestion_data['suggestion_type'],
                    suggestion_data['title'],
                    suggestion_data['description'],
                    suggestion_data['rationale'],
                    suggestion_data['before_text'],
                    suggestion_data['after_text'],
                    suggestion_data['confidence'],
                    suggestion_data['category'],
                    'pending',
                    suggestion_data.get('created_at', datetime.utcnow()),
                    datetime.utcnow()
                ])

                await session.commit()

                # Return the created suggestion
                return await self.get_suggestion(suggestion_id)

        except Exception as e:
            logger.error("Error creating suggestion", error=str(e))
            raise

    async def get_suggestion(self, suggestion_id: str) -> Optional[Dict[str, Any]]:
        """Get suggestion by ID"""
        try:
            async with self.session_factory() as session:
                query = """
                    SELECT id, deck_id, slide_id, run_id, suggestion_type, title,
                           description, rationale, before_text, after_text, confidence,
                           category, status, applied_at, created_at, updated_at
                    FROM suggestions
                    WHERE id = $1 AND deleted_at IS NULL
                """

                result = await session.execute(query, [suggestion_id])
                row = result.fetchone()

                if not row:
                    return None

                return {
                    'id': row[0],
                    'deck_id': row[1],
                    'slide_id': row[2],
                    'run_id': row[3],
                    'suggestion_type': row[4],
                    'title': row[5],
                    'description': row[6],
                    'rationale': row[7],
                    'before_text': row[8],
                    'after_text': row[9],
                    'confidence': row[10],
                    'category': row[11],
                    'status': row[12],
                    'applied_at': row[13],
                    'created_at': row[14],
                    'updated_at': row[15]
                }

        except Exception as e:
            logger.error("Error getting suggestion", error=str(e), suggestion_id=suggestion_id)
            return None

    async def get_suggestions_by_deck(self, deck_id: str) -> List[Dict[str, Any]]:
        """Get all suggestions for a deck"""
        try:
            async with self.session_factory() as session:
                query = """
                    SELECT id, slide_id, suggestion_type, title, description,
                           confidence, category, status, created_at
                    FROM suggestions
                    WHERE deck_id = $1 AND deleted_at IS NULL
                    ORDER BY created_at DESC
                """

                result = await session.execute(query, [deck_id])
                suggestions = []

                for row in result.fetchall():
                    suggestions.append({
                        'id': row[0],
                        'slide_id': row[1],
                        'suggestion_type': row[2],
                        'title': row[3],
                        'description': row[4],
                        'confidence': row[5],
                        'category': row[6],
                        'status': row[7],
                        'created_at': row[8]
                    })

                return suggestions

        except Exception as e:
            logger.error("Error getting suggestions by deck", error=str(e), deck_id=deck_id)
            return []

    async def get_suggestions_by_slide(self, slide_id: str) -> List[Dict[str, Any]]:
        """Get all suggestions for a slide"""
        try:
            async with self.session_factory() as session:
                query = """
                    SELECT id, deck_id, suggestion_type, title, description, rationale,
                           before_text, after_text, confidence, category, status, created_at
                    FROM suggestions
                    WHERE slide_id = $1 AND deleted_at IS NULL
                    ORDER BY confidence DESC, created_at DESC
                """

                result = await session.execute(query, [slide_id])
                suggestions = []

                for row in result.fetchall():
                    suggestions.append({
                        'id': row[0],
                        'deck_id': row[1],
                        'suggestion_type': row[2],
                        'title': row[3],
                        'description': row[4],
                        'rationale': row[5],
                        'before_text': row[6],
                        'after_text': row[7],
                        'confidence': row[8],
                        'category': row[9],
                        'status': row[10],
                        'created_at': row[11]
                    })

                return suggestions

        except Exception as e:
            logger.error("Error getting suggestions by slide", error=str(e), slide_id=slide_id)
            return []

    async def get_suggestions_by_run(self, run_id: str) -> List[Dict[str, Any]]:
        """Get all suggestions for a suggestion run"""
        try:
            async with self.session_factory() as session:
                query = """
                    SELECT id, deck_id, slide_id, suggestion_type, title, description,
                           rationale, confidence, category, status, created_at
                    FROM suggestions
                    WHERE run_id = $1 AND deleted_at IS NULL
                    ORDER BY slide_id, confidence DESC
                """

                result = await session.execute(query, [run_id])
                suggestions = []

                for row in result.fetchall():
                    suggestions.append({
                        'id': row[0],
                        'deck_id': row[1],
                        'slide_id': row[2],
                        'suggestion_type': row[3],
                        'title': row[4],
                        'description': row[5],
                        'rationale': row[6],
                        'confidence': row[7],
                        'category': row[8],
                        'status': row[9],
                        'created_at': row[10]
                    })

                return suggestions

        except Exception as e:
            logger.error("Error getting suggestions by run", error=str(e), run_id=run_id)
            return []

    async def create_suggestion_run(self, run_data: Dict[str, Any]) -> str:
        """Create a suggestion run record"""
        try:
            run_id = run_data.get('id') or str(uuid.uuid4())

            async with self.session_factory() as session:
                query = """
                    INSERT INTO suggestion_runs (
                        id, deck_id, status, slide_ids, suggestion_types,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                """

                await session.execute(query, [
                    run_id,
                    run_data['deck_id'],
                    run_data.get('status', 'pending'),
                    run_data.get('slide_ids'),
                    run_data.get('suggestion_types'),
                    run_data.get('created_at', datetime.utcnow()),
                    datetime.utcnow()
                ])

                await session.commit()
                logger.info("Suggestion run created", run_id=run_id)
                return run_id

        except Exception as e:
            logger.error("Error creating suggestion run", error=str(e))
            raise

    async def get_suggestion_run(self, run_id: str) -> Optional[Dict[str, Any]]:
        """Get suggestion run by ID"""
        try:
            async with self.session_factory() as session:
                query = """
                    SELECT id, deck_id, status, slide_ids, suggestion_types,
                           created_at, updated_at, completed_at
                    FROM suggestion_runs
                    WHERE id = $1 AND deleted_at IS NULL
                """

                result = await session.execute(query, [run_id])
                row = result.fetchone()

                if not row:
                    return None

                return {
                    'id': row[0],
                    'deck_id': row[1],
                    'status': row[2],
                    'slide_ids': row[3],
                    'suggestion_types': row[4],
                    'created_at': row[5],
                    'updated_at': row[6],
                    'completed_at': row[7]
                }

        except Exception as e:
            logger.error("Error getting suggestion run", error=str(e), run_id=run_id)
            return None

    async def update_suggestion_run_status(
        self,
        run_id: str,
        status: str,
        error_message: Optional[str] = None
    ):
        """Update suggestion run status"""
        try:
            async with self.session_factory() as session:
                if status == 'completed':
                    query = """
                        UPDATE suggestion_runs
                        SET status = $1, completed_at = $2, updated_at = $2
                        WHERE id = $3
                    """
                    await session.execute(query, [status, datetime.utcnow(), run_id])
                else:
                    query = """
                        UPDATE suggestion_runs
                        SET status = $1, updated_at = $2
                        WHERE id = $3
                    """
                    await session.execute(query, [status, datetime.utcnow(), run_id])

                await session.commit()
                logger.info("Suggestion run status updated", run_id=run_id, status=status)

        except Exception as e:
            logger.error("Error updating suggestion run status", error=str(e), run_id=run_id)

    async def update_suggestion_status(self, suggestion_id: str, status: str):
        """Update suggestion status (applied/accepted/rejected)"""
        try:
            async with self.session_factory() as session:
                if status == 'applied':
                    query = """
                        UPDATE suggestions
                        SET status = $1, applied_at = $2, updated_at = $2
                        WHERE id = $3
                    """
                    await session.execute(query, [status, datetime.utcnow(), suggestion_id])
                else:
                    query = """
                        UPDATE suggestions
                        SET status = $1, updated_at = $2
                        WHERE id = $3
                    """
                    await session.execute(query, [status, datetime.utcnow(), suggestion_id])

                await session.commit()
                logger.info("Suggestion status updated", suggestion_id=suggestion_id, status=status)

        except Exception as e:
            logger.error("Error updating suggestion status", error=str(e), suggestion_id=suggestion_id)
