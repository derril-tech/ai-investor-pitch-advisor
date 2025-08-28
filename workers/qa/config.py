from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/pitch_advisor"
    
    # Redis
    redis_url: str = "redis://localhost:6379"
    
    # NATS
    nats_url: str = "nats://localhost:4222"
    
    # OpenAI API (for question generation)
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4"
    
    # Question generation settings
    max_questions_per_category: int = 5
    question_categories: list = [
        "market",
        "competition", 
        "business_model",
        "financials",
        "team",
        "technology",
        "go_to_market",
        "risks",
        "exit_strategy",
        "funding_use"
    ]
    
    # Answer generation settings
    enable_answer_suggestions: bool = True
    max_answer_length: int = 500
    
    class Config:
        env_file = ".env"
        case_sensitive = False
