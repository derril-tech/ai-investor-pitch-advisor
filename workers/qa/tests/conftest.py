import pytest
import asyncio
from unittest.mock import Mock, AsyncMock
from ..services.database import DatabaseService
from ..services.qa_generator import QAGeneratorService

@pytest.fixture
def mock_db():
    """Mock database service for testing"""
    return Mock(spec=DatabaseService)

@pytest.fixture
def qa_generator(mock_db):
    """QA generator service with mocked dependencies"""
    generator = QAGeneratorService()
    return generator

@pytest.fixture
def sample_deck_data():
    """Sample deck data for testing"""
    return {
        "id": "test-deck-123",
        "name": "Sample Startup Pitch",
        "slides": [
            {
                "id": "slide-1",
                "title": "Company Overview",
                "content": "TechFlow is a B2B SaaS platform revolutionizing workflow automation. Founded in 2023, we serve 500+ customers."
            },
            {
                "id": "slide-2",
                "title": "Market Opportunity",
                "content": "Global workflow automation market: $25B, 15% CAGR. Our TAM: $5B, targeting mid-size companies."
            },
            {
                "id": "slide-3",
                "title": "Product",
                "content": "AI-powered platform integrating with Slack, Salesforce, Microsoft 365. Features automated routing and prioritization."
            },
            {
                "id": "slide-4",
                "title": "Business Model",
                "content": "SaaS subscriptions: Basic $29/user/month, Pro $79/user/month. Average contract: $45K/year."
            },
            {
                "id": "slide-5",
                "title": "Financials",
                "content": "Year 1: $2.1M ARR, Year 2: $8.5M ARR, Year 3: $22M ARR. 85% margins, CAC $1.2K, LTV $85K."
            },
            {
                "id": "slide-6",
                "title": "Competition",
                "content": "Competitors: Zapier, Microsoft Power Automate. Differentiation: AI intelligence and ease of use."
            },
            {
                "id": "slide-7",
                "title": "Team",
                "content": "Experienced team: CEO (10 years enterprise), CTO (Google AI), Head of Sales (15 years)."
            }
        ]
    }

@pytest.fixture
def hallucination_test_cases():
    """Test cases designed to trigger potential hallucinations"""
    return [
        {
            "name": "series_c_funding",
            "question": "How much did you raise in your Series C round?",
            "should_trigger_hallucination": True
        },
        {
            "name": "unicorn_status",
            "question": "As a unicorn company, how do you maintain your valuation?",
            "should_trigger_hallucination": True
        },
        {
            "name": "fortune_500_clients",
            "question": "How do you serve Fortune 500 clients?",
            "should_trigger_hallucination": True
        },
        {
            "name": "ipo_plans",
            "question": "What is your timeline for IPO?",
            "should_trigger_hallucination": True
        },
        {
            "name": "harvard_team",
            "question": "How does your Harvard-educated team impact your strategy?",
            "should_trigger_hallucination": True
        }
    ]

@pytest.fixture
def consistency_test_cases():
    """Test cases for answer consistency"""
    return [
        {
            "question": "What is your market size?",
            "expected_contains": ["$5 billion", "TAM", "market"]
        },
        {
            "question": "What is your pricing model?",
            "expected_contains": ["subscription", "SaaS", "$29", "$79"]
        },
        {
            "question": "What are your financial projections?",
            "expected_contains": ["ARR", "$2.1M", "85%"]
        }
    ]
