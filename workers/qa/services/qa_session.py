import structlog
from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime

logger = structlog.get_logger()

class QASessionService:
    def __init__(self, database_service, qa_generator):
        self.db = database_service
        self.qa_generator = qa_generator

    async def create_qa_session(self, deck_id: str, name: str, sector: str, stage: str, num_questions: int = 20) -> Dict[str, Any]:
        """Create a complete Q&A session with questions"""
        try:
            logger.info("Creating Q&A session", deck_id=deck_id, name=name)
            
            # Get deck data
            deck_data = await self.db.get_deck_with_slides(deck_id)
            if not deck_data:
                raise ValueError("Deck not found")
            
            # Create session record
            session = await self.create_session_record(deck_id, name, sector, stage)
            
            # Generate questions
            questions = await self.qa_generator.generate_questions_for_deck(deck_data, num_questions)
            
            # Save questions to database
            saved_questions = []
            for question_data in questions:
                question = await self.db.create_qa_pair(
                    session_id=session["id"],
                    question=question_data["question"],
                    category=question_data["category"],
                    confidence=question_data["confidence"],
                    slide_refs=question_data["slideRefs"],
                    needs_extra_info=question_data["needsExtraInfo"],
                    metadata=question_data.get("metadata", {})
                )
                saved_questions.append(question)
            
            # Update session with question count
            await self.db.update_qa_session(session["id"], {
                "question_count": len(saved_questions),
                "status": "completed"
            })
            
            # Return complete session
            result = await self.get_session(session["id"])
            logger.info("Q&A session created successfully", session_id=session["id"])
            return result
            
        except Exception as e:
            logger.error("Error creating Q&A session", error=str(e))
            raise

    async def create_session_record(self, deck_id: str, name: str, sector: str, stage: str) -> Dict[str, Any]:
        """Create a Q&A session record"""
        session_data = {
            "id": str(uuid.uuid4()),
            "name": name,
            "deck_id": deck_id,
            "sector": sector,
            "stage": stage,
            "status": "processing",
            "created_at": datetime.utcnow(),
            "metadata": {
                "created_by": "qa-worker",
                "version": "1.0"
            }
        }
        
        session = await self.db.create_qa_session(session_data)
        return session

    async def generate_qa_session_background(self, session_id: str, deck_id: str, num_questions: int):
        """Generate Q&A session in background"""
        try:
            logger.info("Starting background Q&A generation", session_id=session_id)
            
            # Get deck data
            deck_data = await self.db.get_deck_with_slides(deck_id)
            if not deck_data:
                await self.db.update_qa_session(session_id, {"status": "failed", "error": "Deck not found"})
                return
            
            # Generate questions
            questions = await self.qa_generator.generate_questions_for_deck(deck_data, num_questions)
            
            # Save questions
            for question_data in questions:
                await self.db.create_qa_pair(
                    session_id=session_id,
                    question=question_data["question"],
                    category=question_data["category"],
                    confidence=question_data["confidence"],
                    slide_refs=question_data["slideRefs"],
                    needs_extra_info=question_data["needsExtraInfo"],
                    metadata=question_data.get("metadata", {})
                )
            
            # Update session status
            await self.db.update_qa_session(session_id, {
                "status": "completed",
                "question_count": len(questions),
                "completed_at": datetime.utcnow()
            })
            
            logger.info("Background Q&A generation completed", session_id=session_id)
            
        except Exception as e:
            logger.error("Error in background Q&A generation", error=str(e), session_id=session_id)
            await self.db.update_qa_session(session_id, {
                "status": "failed",
                "error": str(e)
            })

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get Q&A session details"""
        try:
            session = await self.db.get_qa_session(session_id)
            if not session:
                return None
            
            # Get questions for this session
            questions = await self.db.get_qa_pairs_by_session(session_id)
            
            # Add questions to session
            session["questions"] = questions
            
            return session
            
        except Exception as e:
            logger.error("Error getting Q&A session", error=str(e), session_id=session_id)
            raise

    async def get_session_questions(self, session_id: str) -> List[Dict[str, Any]]:
        """Get questions for a Q&A session"""
        try:
            questions = await self.db.get_qa_pairs_by_session(session_id)
            return questions
            
        except Exception as e:
            logger.error("Error getting session questions", error=str(e), session_id=session_id)
            raise

    async def add_answer(self, question_id: str, answer: str) -> Dict[str, Any]:
        """Add an answer to a question"""
        try:
            result = await self.db.update_qa_pair(question_id, {
                "answer": answer,
                "answered_at": datetime.utcnow()
            })
            
            logger.info("Answer added successfully", question_id=question_id)
            return result
            
        except Exception as e:
            logger.error("Error adding answer", error=str(e), question_id=question_id)
            raise

    async def get_sessions_by_deck(self, deck_id: str) -> List[Dict[str, Any]]:
        """Get all Q&A sessions for a deck"""
        try:
            sessions = await self.db.get_qa_sessions_by_deck(deck_id)
            return sessions
            
        except Exception as e:
            logger.error("Error getting sessions by deck", error=str(e), deck_id=deck_id)
            raise

    async def delete_session(self, session_id: str) -> bool:
        """Delete a Q&A session"""
        try:
            # Delete all questions first
            await self.db.delete_qa_pairs_by_session(session_id)
            
            # Delete session
            result = await self.db.delete_qa_session(session_id)
            
            logger.info("Q&A session deleted", session_id=session_id)
            return result
            
        except Exception as e:
            logger.error("Error deleting Q&A session", error=str(e), session_id=session_id)
            raise

    async def create_enhanced_qa_session(
        self,
        deck_id: str,
        name: str = "Enhanced Investor Q&A Session",
        sector: str = "Technology",
        stage: str = "Series A",
        include_draft_answers: bool = True,
        num_questions: int = 20
    ) -> Dict[str, Any]:
        """Create an enhanced Q&A session with draft answers and follow-ups"""
        try:
            logger.info("Creating enhanced Q&A session", deck_id=deck_id)

            # Get deck data
            deck_data = await self.db.get_deck_with_slides(deck_id)
            if not deck_data:
                raise ValueError("Deck not found")

            # Generate enhanced questions with draft answers
            enhanced_questions = await self.qa_generator.generate_stage_sector_questions(
                deck_data=deck_data,
                sector=sector,
                stage=stage,
                num_questions=num_questions
            )

            # Create session record
            session_id = await self._create_session_record(
                deck_id=deck_id,
                name=name,
                sector=sector,
                stage=stage,
                session_type="enhanced"
            )

            # Save enhanced questions
            saved_questions = []
            for question_data in enhanced_questions:
                question_record = await self._create_question_record(
                    session_id=session_id,
                    question_data=question_data
                )
                saved_questions.append(question_record)

            session = {
                "id": session_id,
                "name": name,
                "deck_id": deck_id,
                "sector": sector,
                "stage": stage,
                "session_type": "enhanced",
                "question_count": len(saved_questions),
                "questions": saved_questions,
                "created_at": datetime.utcnow()
            }

            logger.info("Enhanced Q&A session created", session_id=session_id)
            return session

        except Exception as e:
            logger.error("Error creating enhanced Q&A session", error=str(e))
            raise

    async def _create_session_record(
        self,
        deck_id: str,
        name: str,
        sector: str,
        stage: str,
        session_type: str = "standard"
    ) -> str:
        """Create a Q&A session record"""
        session_id = str(uuid.uuid4())

        # Create session record in database
        await self.db.create_qa_session({
            "id": session_id,
            "deck_id": deck_id,
            "name": name,
            "sector": sector,
            "stage": stage,
            "session_type": session_type,
            "status": "completed",  # Enhanced sessions are created synchronously
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })

        return session_id

    async def _create_question_record(
        self,
        session_id: str,
        question_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a question record with enhanced data"""
        question_id = str(uuid.uuid4())

        # Create question record with enhanced fields
        await self.db.create_qa_pair({
            "id": question_id,
            "session_id": session_id,
            "question": question_data["question"],
            "category": question_data.get("category", "general"),
            "confidence": question_data.get("confidence", 0.5),
            "slide_refs": question_data.get("slide_references", []),
            "draft_answer": question_data.get("draft_answer", ""),
            "answer_confidence": question_data.get("answer_confidence", 0.5),
            "follow_up_questions": question_data.get("follow_up_questions", []),
            "needs_extra_info": question_data.get("answer_confidence", 0.5) < 0.6,
            "created_at": question_data.get("generated_at", datetime.utcnow()),
            "updated_at": datetime.utcnow()
        })

        return {
            "id": question_id,
            "question": question_data["question"],
            "category": question_data.get("category", "general"),
            "confidence": question_data.get("confidence", 0.5),
            "slide_refs": question_data.get("slide_references", []),
            "draft_answer": question_data.get("draft_answer", ""),
            "answer_confidence": question_data.get("answer_confidence", 0.5),
            "follow_up_questions": question_data.get("follow_up_questions", []),
            "created_at": question_data.get("generated_at", datetime.utcnow())
        }
