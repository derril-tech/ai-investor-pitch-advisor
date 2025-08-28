import asyncio
import io
import tempfile
from typing import List, Optional
from dataclasses import dataclass

import structlog
from pptx import Presentation
from PyPDF2 import PdfReader
import pytesseract
from PIL import Image
import cv2
import numpy as np

from .storage import StorageService
from .database import DatabaseService
from .parsers.pptx_parser import PPTXParser
from .parsers.pdf_parser import PDFParser
from .parsers.google_slides_parser import GoogleSlidesParser

logger = structlog.get_logger()

@dataclass
class ParseResult:
    slides_count: int
    slides: List[dict]
    metadata: dict

class ParserService:
    def __init__(self, storage_service: StorageService, database_service: DatabaseService):
        self.storage = storage_service
        self.database = database_service
        self.pptx_parser = PPTXParser(storage_service)
        self.pdf_parser = PDFParser(storage_service)
        self.google_slides_parser = GoogleSlidesParser(storage_service)
    
    async def parse_deck(self, deck_id: str, file_url: str, file_type: str) -> ParseResult:
        """Parse a deck file and extract slides"""
        logger.info("Starting deck parsing", deck_id=deck_id, file_type=file_type)
        
        try:
            # Download file from S3
            file_data = await self.storage.download_file(file_url)
            
            # Parse based on file type
            if file_type.lower() == "pptx":
                result = await self.pptx_parser.parse(file_data, deck_id)
            elif file_type.lower() == "pdf":
                result = await self.pdf_parser.parse(file_data, deck_id)
            elif file_type.lower() == "google_slides":
                result = await self.google_slides_parser.parse(file_url, deck_id)
            else:
                raise ValueError(f"Unsupported file type: {file_type}")
            
            # Save slides to database
            await self._save_slides_to_db(deck_id, result.slides)
            
            # Update deck metadata
            await self.database.update_deck_metadata(deck_id, result.metadata)
            
            logger.info("Deck parsing completed", deck_id=deck_id, slides_count=result.slides_count)
            return result
            
        except Exception as e:
            logger.error("Deck parsing failed", deck_id=deck_id, error=str(e))
            raise
    
    async def _save_slides_to_db(self, deck_id: str, slides: List[dict]):
        """Save parsed slides to database"""
        for slide_data in slides:
            await self.database.create_slide(
                deck_id=deck_id,
                slide_number=slide_data["slide_number"],
                title=slide_data["title"],
                content=slide_data.get("content"),
                notes=slide_data.get("notes"),
                image_s3_key=slide_data.get("image_s3_key"),
                metadata=slide_data.get("metadata", {})
            )
    
    async def extract_text_from_image(self, image_data: bytes) -> str:
        """Extract text from image using OCR"""
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to OpenCV format for preprocessing
            cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Preprocess image for better OCR
            gray = cv2.cvtColor(cv_image, cv2.COLOR_BGR2GRAY)
            thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
            
            # Convert back to PIL for tesseract
            pil_image = Image.fromarray(thresh)
            
            # Extract text
            text = pytesseract.image_to_string(pil_image)
            
            return text.strip()
            
        except Exception as e:
            logger.error("OCR failed", error=str(e))
            return ""
