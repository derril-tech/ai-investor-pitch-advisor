from pydantic import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/pitch_advisor"

    # Storage
    s3_bucket: str = "pitch-advisor-suggestions"
    aws_region: str = "us-east-1"

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4-turbo-preview"
    openai_temperature: float = 0.7
    openai_max_tokens: int = 2000

    # Suggestion settings
    supported_suggestion_types: List[str] = [
        "headline_rewrite",
        "structure_fix",
        "design_tip",
        "content_enhancement",
        "clarity_improvement"
    ]

    max_suggestions_per_slide: int = 3
    min_confidence_threshold: float = 0.6
    enable_content_analysis: bool = True

    class Config:
        env_file = ".env"
        case_sensitive = False
