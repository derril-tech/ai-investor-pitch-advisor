import io
import tempfile
from typing import List, Dict, Any
from dataclasses import dataclass

import structlog
from PyPDF2 import PdfReader
from PIL import Image
import fitz  # PyMuPDF

from ..storage import StorageService
from ..parser import ParseResult

logger = structlog.get_logger()

@dataclass
class SlideData:
    slide_number: int
    title: str
    content: str
    notes: str
    image_s3_key: str
    metadata: Dict[str, Any]

class PDFParser:
    def __init__(self, storage_service: StorageService):
        self.storage = storage_service
    
    async def parse(self, file_data: bytes, deck_id: str) -> ParseResult:
        """Parse PDF file and extract slides"""
        logger.info("Parsing PDF file", deck_id=deck_id)
        
        try:
            # Use PyMuPDF for better text extraction
            pdf_document = fitz.open(stream=file_data, filetype="pdf")
            
            slides = []
            metadata = {
                "total_slides": len(pdf_document),
                "has_images": False,
                "pdf_version": pdf_document.metadata.get("format", "unknown")
            }
            
            for page_num in range(len(pdf_document)):
                slide_data = await self._extract_page_data(pdf_document, page_num, deck_id)
                slides.append(slide_data)
                
                if slide_data.image_s3_key:
                    metadata["has_images"] = True
            
            pdf_document.close()
            
            return ParseResult(
                slides_count=len(slides),
                slides=[slide.__dict__ for slide in slides],
                metadata=metadata
            )
            
        except Exception as e:
            logger.error("PDF parsing failed", deck_id=deck_id, error=str(e))
            raise
    
    async def _extract_page_data(self, pdf_document, page_num: int, deck_id: str) -> SlideData:
        """Extract data from a single page"""
        page = pdf_document[page_num]
        
        # Extract text
        text = page.get_text()
        
        # Split text into title and content
        lines = text.strip().split('\n')
        title = lines[0] if lines else f"Page {page_num + 1}"
        content = '\n'.join(lines[1:]) if len(lines) > 1 else ""
        
        # Extract images
        image_s3_key = await self._extract_images(page, deck_id, page_num + 1)
        
        # Generate slide image
        slide_image_key = await self._generate_slide_image(page, deck_id, page_num + 1)
        
        metadata = {
            "page_width": page.rect.width,
            "page_height": page.rect.height,
            "has_images": bool(image_s3_key),
            "text_blocks": len(page.get_text("dict")["blocks"])
        }
        
        return SlideData(
            slide_number=page_num + 1,
            title=title,
            content=content,
            notes="",  # PDFs don't have speaker notes
            image_s3_key=slide_image_key,
            metadata=metadata
        )
    
    async def _extract_images(self, page, deck_id: str, slide_number: int) -> str:
        """Extract images from page and upload to S3"""
        images = []
        
        # Get image list
        image_list = page.get_images()
        
        for img_index, img in enumerate(image_list):
            try:
                # Get image data
                xref = img[0]
                pix = fitz.Pixmap(page.parent, xref)
                
                if pix.n - pix.alpha < 4:  # GRAY or RGB
                    img_data = pix.tobytes("png")
                else:  # CMYK: convert to RGB first
                    pix1 = fitz.Pixmap(fitz.csRGB, pix)
                    img_data = pix1.tobytes("png")
                    pix1 = None
                
                # Save image to S3
                image_key = f"decks/{deck_id}/slides/{slide_number}/images/{img_index}.png"
                await self.storage.upload_file(image_key, img_data, "image/png")
                
                images.append(image_key)
                pix = None
                
            except Exception as e:
                logger.warning("Failed to extract image", error=str(e))
        
        return images[0] if images else ""
    
    async def _generate_slide_image(self, page, deck_id: str, slide_number: int) -> str:
        """Generate slide image and upload to S3"""
        try:
            # Set zoom factor for better quality
            mat = fitz.Matrix(2.0, 2.0)
            
            # Render page to image
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            
            # Save to S3
            image_key = f"decks/{deck_id}/slides/{slide_number}/slide.png"
            await self.storage.upload_file(image_key, img_data, "image/png")
            
            return image_key
            
        except Exception as e:
            logger.warning("Failed to generate slide image", error=str(e))
            return ""
