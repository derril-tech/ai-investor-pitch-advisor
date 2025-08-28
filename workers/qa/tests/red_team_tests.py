import pytest
import asyncio
from unittest.mock import Mock, AsyncMock
import structlog
from typing import Dict, Any, List

from ..services.qa_generator import QAGeneratorService
from ..services.database import DatabaseService

logger = structlog.get_logger()

class TestRedTeamSuite:
    """Red team testing suite for Q&A generation to prevent hallucinations"""

    def setup_method(self):
        """Setup test fixtures"""
        self.qa_generator = QAGeneratorService()
        self.mock_db = Mock(spec=DatabaseService)

        # Mock deck data with realistic content
        self.test_deck_data = {
            "id": "test-deck-123",
            "name": "Test Startup Pitch",
            "slides": [
                {
                    "id": "slide-1",
                    "title": "Company Overview",
                    "content": "TechFlow is a B2B SaaS platform that revolutionizes workflow automation for mid-size companies. Founded in 2023, we've grown to serve over 500 customers."
                },
                {
                    "id": "slide-2",
                    "title": "Market Opportunity",
                    "content": "The global workflow automation market is worth $25 billion, with a 15% CAGR. Our TAM is $5 billion, focusing on mid-size companies ($10M-$100M revenue)."
                },
                {
                    "id": "slide-3",
                    "title": "Product Demo",
                    "content": "Our AI-powered platform integrates seamlessly with existing tools like Slack, Salesforce, and Microsoft 365. Features include automated task routing and intelligent prioritization."
                },
                {
                    "id": "slide-4",
                    "title": "Business Model",
                    "content": "SaaS subscription model with tiered pricing: Basic ($29/user/month), Pro ($79/user/month), Enterprise (custom pricing). Average contract value: $45,000/year."
                },
                {
                    "id": "slide-5",
                    "title": "Financial Projections",
                    "content": "Year 1: $2.1M ARR, Year 2: $8.5M ARR, Year 3: $22M ARR. Gross margins: 85%. Customer acquisition cost: $1,200, LTV: $85,000."
                },
                {
                    "id": "slide-6",
                    "title": "Competition",
                    "content": "Main competitors: Zapier (workflow automation), Microsoft Power Automate (enterprise focus), custom-built solutions. Our differentiation: AI-powered intelligence and ease of use."
                },
                {
                    "id": "slide-7",
                    "title": "Team",
                    "content": "Experienced founding team: CEO with 10 years in enterprise software, CTO from Google with AI expertise, Head of Sales from Salesforce with 15 years experience."
                }
            ]
        }

    @pytest.mark.asyncio
    async def test_no_hallucinations_in_answers(self):
        """Test that generated answers don't contain information not in the deck"""
        hallucination_indicators = [
            "unicorn", "IPO", "acquisition by Google", "Series C funding",
            "1000 customers", "Fortune 500", "NASA contract", "$100M valuation",
            "Harvard MBA", "Silicon Valley", "Y Combinator"
        ]

        questions = await self.qa_generator.generate_questions_for_deck(self.test_deck_data, 10)

        for question in questions:
            if question.get("draft_answer"):
                answer_text = question["draft_answer"].lower()
                for indicator in hallucination_indicators:
                    assert indicator.lower() not in answer_text, \
                        f"Hallucination detected in answer: '{indicator}' not mentioned in deck"

    @pytest.mark.asyncio
    async def test_answers_cite_slide_references(self):
        """Test that all draft answers reference specific slides"""
        questions = await self.qa_generator.generate_questions_for_deck(self.test_deck_data, 10)

        for question in questions:
            if question.get("draft_answer"):
                answer_text = question["draft_answer"]
                slide_refs = question.get("slide_references", [])

                # Answer should reference at least one slide
                assert len(slide_refs) > 0, \
                    f"Answer for question '{question['question']}' has no slide references"

                # Answer should mention slides when citing information
                slide_mention_found = False
                for ref in slide_refs:
                    if f"Slide {ref}" in answer_text:
                        slide_mention_found = True
                        break

                assert slide_mention_found, \
                    f"Answer doesn't mention referenced slides: {answer_text}"

    @pytest.mark.asyncio
    async def test_confidence_accuracy(self):
        """Test that confidence scores accurately reflect answer quality"""
        questions = await self.qa_generator.generate_questions_for_deck(self.test_deck_data, 10)

        for question in questions:
            confidence = question.get("confidence", 0)
            slide_refs = question.get("slide_references", [])
            answer = question.get("draft_answer", "")

            # High confidence should have multiple slide references
            if confidence >= 0.8:
                assert len(slide_refs) >= 2, \
                    f"High confidence answer should have multiple slide references"

            # Low confidence should be flagged appropriately
            if confidence < 0.5:
                assert question.get("needs_extra_info", False), \
                    f"Low confidence answer should be flagged as needing extra info"

    @pytest.mark.asyncio
    async def test_stage_sector_specificity(self):
        """Test that stage and sector-specific questions are relevant"""
        # Test Series A stage questions
        series_a_questions = await self.qa_generator.generate_stage_sector_questions(
            deck_data=self.test_deck_data,
            sector="Technology",
            stage="Series A",
            num_questions=15
        )

        series_a_keywords = ["scale", "growth", "team", "product-market fit", "unit economics"]
        for question in series_a_questions:
            question_text = question["question"].lower()
            has_relevant_keyword = any(keyword in question_text for keyword in series_a_keywords)
            assert has_relevant_keyword, \
                f"Series A question not relevant: {question['question']}"

        # Test SaaS sector questions
        saas_questions = await self.qa_generator.generate_stage_sector_questions(
            deck_data=self.test_deck_data,
            sector="SaaS",
            stage="Series A",
            num_questions=10
        )

        saas_keywords = ["subscription", "churn", "CAC", "LTV", "recurring revenue"]
        for question in saas_questions:
            question_text = question["question"].lower()
            has_relevant_keyword = any(keyword in question_text for keyword in saas_keywords)
            assert has_relevant_keyword, \
                f"SaaS question not relevant: {question['question']}"

    @pytest.mark.asyncio
    async def test_answer_consistency(self):
        """Test that multiple generations of similar questions produce consistent answers"""
        question_templates = [
            "What is your market opportunity?",
            "How do you plan to scale?",
            "What is your competitive advantage?"
        ]

        # Generate answers multiple times
        all_answers = []
        for _ in range(3):
            questions = await self.qa_generator.generate_questions_for_deck(self.test_deck_data, 5)
            answers = [q.get("draft_answer", "") for q in questions if q.get("draft_answer")]
            all_answers.append(answers)

        # Check for major inconsistencies
        for i, template in enumerate(question_templates):
            if i < len(all_answers[0]):
                base_answer = all_answers[0][i]
                for other_answers in all_answers[1:]:
                    if i < len(other_answers):
                        other_answer = other_answers[i]
                        # Simple consistency check - answers should contain similar key metrics
                        base_words = set(base_answer.lower().split())
                        other_words = set(other_answer.lower().split())
                        overlap = len(base_words.intersection(other_words))
                        consistency_ratio = overlap / len(base_words.union(other_words))

                        assert consistency_ratio > 0.3, \
                            f"Inconsistent answers for '{template}': consistency ratio {consistency_ratio}"

    @pytest.mark.asyncio
    async def test_follow_up_question_relevance(self):
        """Test that follow-up questions are relevant to the main question and answer"""
        questions = await self.qa_generator.generate_questions_for_deck(self.test_deck_data, 5)

        for question in questions:
            if question.get("draft_answer") and question.get("follow_up_questions"):
                main_question = question["question"].lower()
                answer = question["draft_answer"].lower()
                follow_ups = question["follow_up_questions"]

                for follow_up in follow_ups:
                    follow_up_lower = follow_up.lower()

                    # Follow-up should be related to main question or answer
                    main_keywords = self._extract_keywords(main_question)
                    answer_keywords = self._extract_keywords(answer)
                    follow_up_keywords = self._extract_keywords(follow_up_lower)

                    main_overlap = len(set(main_keywords).intersection(set(follow_up_keywords)))
                    answer_overlap = len(set(answer_keywords).intersection(set(follow_up_keywords)))

                    assert (main_overlap > 0 or answer_overlap > 0), \
                        f"Follow-up question not relevant: '{follow_up}' for main question: '{question['question']}'"

    @pytest.mark.asyncio
    async def test_no_sensitive_data_exposure(self):
        """Test that answers don't expose sensitive or inappropriate information"""
        sensitive_keywords = [
            "password", "secret", "confidential", "internal", "proprietary",
            "classified", "restricted", "private", "sensitive"
        ]

        questions = await self.qa_generator.generate_questions_for_deck(self.test_deck_data, 10)

        for question in questions:
            if question.get("draft_answer"):
                answer_text = question["draft_answer"].lower()
                for keyword in sensitive_keywords:
                    assert keyword not in answer_text, \
                        f"Sensitive keyword '{keyword}' found in answer: {question['draft_answer']}"

    @pytest.mark.asyncio
    async def test_answer_completeness(self):
        """Test that answers provide complete information without being too vague"""
        questions = await self.qa_generator.generate_questions_for_deck(self.test_deck_data, 10)

        vague_phrases = [
            "it depends", "we'll see", "maybe", "possibly", "could be",
            "to be determined", "TBD", "we're working on it"
        ]

        for question in questions:
            if question.get("draft_answer"):
                answer_text = question["draft_answer"].lower()

                # Answer should not be too vague
                is_too_vague = any(phrase in answer_text for phrase in vague_phrases)
                assert not is_too_vague, \
                    f"Answer is too vague: {question['draft_answer']}"

                # Answer should be substantial (more than just a few words)
                word_count = len(answer_text.split())
                assert word_count >= 10, \
                    f"Answer is too brief ({word_count} words): {question['draft_answer']}"

    @pytest.mark.asyncio
    async def test_category_appropriateness(self):
        """Test that questions are categorized appropriately"""
        questions = await self.qa_generator.generate_questions_for_deck(self.test_deck_data, 15)

        category_keywords = {
            "market": ["market", "opportunity", "size", "growth", "TAM", "SAM", "SOM"],
            "competition": ["competition", "competitor", "advantage", "differentiation", "unique"],
            "financials": ["revenue", "profit", "margin", "ARR", "CAC", "LTV", "burn", "runway"],
            "team": ["team", "founder", "experience", "expertise", "background"],
            "product": ["product", "feature", "technology", "solution", "platform"]
        }

        for question in questions:
            category = question.get("category", "").lower()
            question_text = question["question"].lower()

            if category in category_keywords:
                expected_keywords = category_keywords[category]
                has_relevant_keyword = any(keyword in question_text for keyword in expected_keywords)

                assert has_relevant_keyword, \
                    f"Question category '{category}' doesn't match content: {question['question']}"

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract meaningful keywords from text"""
        common_words = {
            "what", "how", "why", "when", "where", "who", "is", "are", "the", "a", "an",
            "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"
        }

        words = text.lower().split()
        return [word.strip('.,!?;:') for word in words if len(word) > 3 and word not in common_words]

    @pytest.mark.asyncio
    async def test_error_handling(self):
        """Test that the system handles errors gracefully"""
        # Test with empty deck
        empty_deck = {"id": "empty", "slides": []}

        with pytest.raises(Exception):
            await self.qa_generator.generate_questions_for_deck(empty_deck, 5)

        # Test with malformed data
        malformed_deck = {
            "id": "malformed",
            "slides": [{"id": "slide-1", "title": None, "content": None}]
        }

        # Should not crash, should handle gracefully
        questions = await self.qa_generator.generate_questions_for_deck(malformed_deck, 3)
        assert isinstance(questions, list)

    @pytest.mark.asyncio
    async def test_performance_bounds(self):
        """Test that generation stays within performance bounds"""
        import time

        start_time = time.time()
        questions = await self.qa_generator.generate_questions_for_deck(self.test_deck_data, 10)
        end_time = time.time()

        duration = end_time - start_time

        # Should complete within reasonable time (30 seconds max)
        assert duration < 30, f"Generation took too long: {duration} seconds"

        # Should generate requested number of questions
        assert len(questions) == 10, f"Generated {len(questions)} questions instead of 10"

    @pytest.mark.asyncio
    async def test_deterministic_behavior(self):
        """Test that same input produces consistent output structure"""
        # Generate questions multiple times with same input
        results = []
        for _ in range(3):
            questions = await self.qa_generator.generate_questions_for_deck(self.test_deck_data, 8)
            results.append(questions)

        # All results should have same structure
        for questions in results:
            assert len(questions) == 8, "Inconsistent number of questions generated"

            for question in questions:
                required_fields = ["question", "category", "confidence", "slide_references"]
                for field in required_fields:
                    assert field in question, f"Missing required field: {field}"

                assert isinstance(question["confidence"], (int, float)), "Confidence should be numeric"
                assert 0 <= question["confidence"] <= 1, "Confidence should be between 0 and 1"
