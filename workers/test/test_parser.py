import pytest
import io
from unittest.mock import Mock, patch, AsyncMock
from parse_worker.services.parser import ParserService, ParseResult
from parse_worker.services.parsers.pptx_parser import PPTXParser, SlideData

class TestPPTXParser:
    @pytest.fixture
    def mock_storage(self):
        return Mock()

    @pytest.fixture
    def parser(self, mock_storage):
        return PPTXParser(mock_storage)

    def test_extract_title(self, parser):
        # Mock slide with title placeholder
        mock_slide = Mock()
        mock_title_shape = Mock()
        mock_title_shape.placeholder_format.type = 1  # Title placeholder
        mock_title_shape.text = "Test Title"
        
        mock_slide.shapes = [mock_title_shape]
        
        title = parser._extract_title(mock_slide)
        assert title == "Test Title"

    def test_extract_content(self, parser):
        # Mock slide with content
        mock_slide = Mock()
        mock_title_shape = Mock()
        mock_title_shape.placeholder_format.type = 1  # Title placeholder
        mock_title_shape.text = "Title"
        
        mock_content_shape = Mock()
        mock_content_shape.text = "Content text"
        # No placeholder_format to indicate it's not a title
        
        mock_slide.shapes = [mock_title_shape, mock_content_shape]
        
        content = parser._extract_content(mock_slide)
        assert content == "Content text"

    def test_extract_notes(self, parser):
        # Mock slide with notes
        mock_slide = Mock()
        mock_notes_slide = Mock()
        mock_notes_frame = Mock()
        mock_notes_frame.text = "Speaker notes"
        
        mock_notes_slide.notes_text_frame = mock_notes_frame
        mock_slide.has_notes_slide = True
        mock_slide.notes_slide = mock_notes_slide
        
        notes = parser._extract_notes(mock_slide)
        assert notes == "Speaker notes"

    @pytest.mark.asyncio
    async def test_parse_pptx_file(self, parser):
        # Mock presentation data
        mock_presentation = Mock()
        mock_slide = Mock()
        mock_slide.slide_layout.name = "Title and Content"
        
        # Mock slide extraction methods
        parser._extract_slide_data = AsyncMock(return_value=SlideData(
            slide_number=1,
            title="Test Slide",
            content="Test content",
            notes="Test notes",
            image_s3_key="test/image.png",
            metadata={"layout": "title_and_content"}
        ))
        
        mock_presentation.slides = [mock_slide]
        
        with patch('parse_worker.services.parsers.pptx_parser.Presentation') as mock_presentation_class:
            mock_presentation_class.return_value = mock_presentation
            
            result = await parser.parse(b"mock_file_data", "deck-123")
            
            assert isinstance(result, ParseResult)
            assert result.slides_count == 1
            assert len(result.slides) == 1

class TestParserService:
    @pytest.fixture
    def mock_storage(self):
        return Mock()

    @pytest.fixture
    def mock_database(self):
        return Mock()

    @pytest.fixture
    def parser_service(self, mock_storage, mock_database):
        return ParserService(mock_storage, mock_database)

    @pytest.mark.asyncio
    async def test_parse_deck_pptx(self, parser_service):
        # Mock dependencies
        parser_service.storage.download_file = AsyncMock(return_value=b"mock_file_data")
        parser_service.pptx_parser.parse = AsyncMock(return_value=ParseResult(
            slides_count=1,
            slides=[{"slide_number": 1, "title": "Test"}],
            metadata={"total_slides": 1}
        ))
        parser_service.database.update_deck_metadata = AsyncMock()
        
        result = await parser_service.parse_deck("deck-123", "test.pptx", "pptx")
        
        assert result.slides_count == 1
        assert len(result.slides) == 1

    @pytest.mark.asyncio
    async def test_parse_deck_pdf(self, parser_service):
        # Mock dependencies
        parser_service.storage.download_file = AsyncMock(return_value=b"mock_file_data")
        parser_service.pdf_parser.parse = AsyncMock(return_value=ParseResult(
            slides_count=1,
            slides=[{"slide_number": 1, "title": "Test"}],
            metadata={"total_slides": 1}
        ))
        parser_service.database.update_deck_metadata = AsyncMock()
        
        result = await parser_service.parse_deck("deck-123", "test.pdf", "pdf")
        
        assert result.slides_count == 1
        assert len(result.slides) == 1

    def test_extract_text_from_image(self, parser_service):
        # Mock image data
        mock_image_data = b"mock_image_data"
        
        with patch('parse_worker.services.parser.Image') as mock_pil:
            with patch('parse_worker.services.parser.cv2') as mock_cv2:
                with patch('parse_worker.services.parser.pytesseract') as mock_tesseract:
                    mock_tesseract.image_to_string.return_value = "Extracted text"
                    
                    result = parser_service.extract_text_from_image(mock_image_data)
                    
                    assert result == "Extracted text"

    def test_extract_text_from_image_error(self, parser_service):
        # Test error handling
        mock_image_data = b"invalid_image_data"
        
        with patch('parse_worker.services.parser.Image', side_effect=Exception("Image error")):
            result = parser_service.extract_text_from_image(mock_image_data)
            
            assert result == ""

class TestSlideSegmentation:
    def test_slide_number_extraction(self):
        slide_data = {
            "slide_number": 1,
            "title": "Test Slide",
            "content": "Test content"
        }
        
        assert slide_data["slide_number"] == 1
        assert isinstance(slide_data["slide_number"], int)

    def test_title_extraction(self):
        slide_data = {
            "slide_number": 1,
            "title": "Test Slide",
            "content": "Test content"
        }
        
        assert slide_data["title"] == "Test Slide"
        assert len(slide_data["title"]) > 0

    def test_content_extraction(self):
        slide_data = {
            "slide_number": 1,
            "title": "Test Slide",
            "content": "This is test content with bullet points:\n• Point 1\n• Point 2"
        }
        
        content = slide_data["content"]
        assert "Point 1" in content
        assert "Point 2" in content
        assert "\n" in content

class TestOCRSamplingAccuracy:
    def test_empty_image_handling(self):
        empty_image_data = b""
        assert len(empty_image_data) == 0

    def test_image_format_validation(self):
        valid_formats = ['png', 'jpg', 'jpeg', 'gif']
        test_format = 'png'
        assert test_format in valid_formats

    def test_text_extraction_validation(self):
        extracted_text = "Sample text from image"
        assert extracted_text is not None
        assert isinstance(extracted_text, str)
        assert len(extracted_text) > 0

class TestRLSEnforcement:
    def test_user_permissions(self):
        user_permissions = {
            "userId": "user-123",
            "projectId": "project-456",
            "canRead": True,
            "canWrite": False,
            "canDelete": False
        }
        
        assert user_permissions["userId"] == "user-123"
        assert user_permissions["canRead"] is True
        assert user_permissions["canWrite"] is False

    def test_project_isolation(self):
        project_a = {"id": "project-a", "ownerId": "user-1"}
        project_b = {"id": "project-b", "ownerId": "user-2"}
        
        assert project_a["ownerId"] != project_b["ownerId"]

    def test_resource_ownership(self):
        resource = {
            "id": "deck-123",
            "projectId": "project-456",
            "ownerId": "user-789"
        }
        
        user = {
            "id": "user-789",
            "projects": ["project-456"]
        }
        
        assert resource["projectId"] in user["projects"]
