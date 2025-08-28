from pydantic import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql+asyncpg://user:password@localhost:5432/pitch_advisor"
    
    # Storage
    s3_bucket: str = "pitch-advisor-exports"
    aws_region: str = "us-east-1"
    
    # Export settings
    supported_formats: List[str] = ["pdf", "pptx", "docx"]
    supported_types: List[str] = ["analysis_report", "qa_summary", "comprehensive_report"]
    max_file_size: int = 50 * 1024 * 1024  # 50MB
    signed_url_expiration: int = 3600  # 1 hour
    
    # Background processing
    enable_background_processing: bool = True
    max_concurrent_exports: int = 5
    
    class Config:
        env_file = ".env"
        case_sensitive = False
