import structlog
from typing import Dict, Any, Optional
import tempfile
import os
from datetime import datetime

logger = structlog.get_logger()

class ExportGeneratorService:
    def __init__(self, storage_service):
        self.storage_service = storage_service

    async def generate_export(
        self,
        deck_data: Dict[str, Any],
        analysis_data: Optional[Dict[str, Any]] = None,
        qa_data: Optional[Dict[str, Any]] = None,
        export_type: str = "analysis_report",
        format: str = "pdf"
    ) -> str:
        """Generate export file based on type and format"""
        try:
            logger.info("Generating export", export_type=export_type, format=format)
            
            if export_type == "analysis_report":
                return await self._generate_analysis_report(deck_data, analysis_data, format)
            elif export_type == "qa_summary":
                return await self._generate_qa_summary(deck_data, qa_data, format)
            elif export_type == "comprehensive_report":
                return await self._generate_comprehensive_report(deck_data, analysis_data, qa_data, format)
            else:
                raise ValueError(f"Unsupported export type: {export_type}")
                
        except Exception as e:
            logger.error("Error generating export", error=str(e))
            raise

    async def _generate_analysis_report(
        self,
        deck_data: Dict[str, Any],
        analysis_data: Optional[Dict[str, Any]],
        format: str
    ) -> str:
        """Generate analysis report"""
        try:
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f".{format}")
            temp_path = temp_file.name
            temp_file.close()
            
            if format == "pdf":
                await self._generate_pdf_analysis_report(deck_data, analysis_data, temp_path)
            elif format == "pptx":
                await self._generate_pptx_analysis_report(deck_data, analysis_data, temp_path)
            else:
                raise ValueError(f"Unsupported format: {format}")
            
            logger.info("Analysis report generated", path=temp_path)
            return temp_path
            
        except Exception as e:
            logger.error("Error generating analysis report", error=str(e))
            raise

    async def _generate_qa_summary(
        self,
        deck_data: Dict[str, Any],
        qa_data: Optional[Dict[str, Any]],
        format: str
    ) -> str:
        """Generate Q&A summary"""
        try:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f".{format}")
            temp_path = temp_file.name
            temp_file.close()
            
            if format == "pdf":
                await self._generate_pdf_qa_summary(deck_data, qa_data, temp_path)
            elif format == "docx":
                await self._generate_docx_qa_summary(deck_data, qa_data, temp_path)
            else:
                raise ValueError(f"Unsupported format: {format}")
            
            logger.info("Q&A summary generated", path=temp_path)
            return temp_path
            
        except Exception as e:
            logger.error("Error generating Q&A summary", error=str(e))
            raise

    async def _generate_comprehensive_report(
        self,
        deck_data: Dict[str, Any],
        analysis_data: Optional[Dict[str, Any]],
        qa_data: Optional[Dict[str, Any]],
        format: str
    ) -> str:
        """Generate comprehensive report with all data"""
        try:
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=f".{format}")
            temp_path = temp_file.name
            temp_file.close()
            
            if format == "pdf":
                await self._generate_pdf_comprehensive_report(deck_data, analysis_data, qa_data, temp_path)
            elif format == "pptx":
                await self._generate_pptx_comprehensive_report(deck_data, analysis_data, qa_data, temp_path)
            else:
                raise ValueError(f"Unsupported format: {format}")
            
            logger.info("Comprehensive report generated", path=temp_path)
            return temp_path
            
        except Exception as e:
            logger.error("Error generating comprehensive report", error=str(e))
            raise

    async def _generate_pdf_analysis_report(
        self,
        deck_data: Dict[str, Any],
        analysis_data: Optional[Dict[str, Any]],
        output_path: str
    ):
        """Generate PDF analysis report"""
        # This would use a library like reportlab or weasyprint
        # For now, create a simple text-based report
        content = self._create_analysis_report_content(deck_data, analysis_data)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)

    async def _generate_pptx_analysis_report(
        self,
        deck_data: Dict[str, Any],
        analysis_data: Optional[Dict[str, Any]],
        output_path: str
    ):
        """Generate PPTX analysis report"""
        # This would use python-pptx library
        # For now, create a placeholder
        content = self._create_analysis_report_content(deck_data, analysis_data)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)

    async def _generate_pdf_qa_summary(
        self,
        deck_data: Dict[str, Any],
        qa_data: Optional[Dict[str, Any]],
        output_path: str
    ):
        """Generate PDF Q&A summary"""
        content = self._create_qa_summary_content(deck_data, qa_data)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)

    async def _generate_docx_qa_summary(
        self,
        deck_data: Dict[str, Any],
        qa_data: Optional[Dict[str, Any]],
        output_path: str
    ):
        """Generate DOCX Q&A summary"""
        content = self._create_qa_summary_content(deck_data, qa_data)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)

    async def _generate_pdf_comprehensive_report(
        self,
        deck_data: Dict[str, Any],
        analysis_data: Optional[Dict[str, Any]],
        qa_data: Optional[Dict[str, Any]],
        output_path: str
    ):
        """Generate comprehensive PDF report"""
        content = self._create_comprehensive_report_content(deck_data, analysis_data, qa_data)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)

    async def _generate_pptx_comprehensive_report(
        self,
        deck_data: Dict[str, Any],
        analysis_data: Optional[Dict[str, Any]],
        qa_data: Optional[Dict[str, Any]],
        output_path: str
    ):
        """Generate comprehensive PPTX report"""
        content = self._create_comprehensive_report_content(deck_data, analysis_data, qa_data)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)

    def _create_analysis_report_content(
        self,
        deck_data: Dict[str, Any],
        analysis_data: Optional[Dict[str, Any]]
    ) -> str:
        """Create analysis report content"""
        content = []
        content.append("PITCH DECK ANALYSIS REPORT")
        content.append("=" * 50)
        content.append(f"Deck: {deck_data.get('name', 'Unknown')}")
        content.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        content.append("")
        
        if analysis_data and analysis_data.get('scores'):
            content.append("ANALYSIS SCORES")
            content.append("-" * 20)
            scores = analysis_data['scores']
            content.append(f"Clarity: {scores.get('clarity', 0):.1f}/10")
            content.append(f"Design: {scores.get('design', 0):.1f}/10")
            content.append(f"Storytelling: {scores.get('storytelling', 0):.1f}/10")
            content.append(f"Investor Fit: {scores.get('investorFit', 0):.1f}/10")
            content.append("")
            
            if analysis_data.get('explanations'):
                content.append("DETAILED EXPLANATIONS")
                content.append("-" * 25)
                explanations = analysis_data['explanations']
                for dimension, explanation in explanations.items():
                    content.append(f"{dimension.title()}:")
                    content.append(f"  {explanation}")
                    content.append("")
        
        return "\n".join(content)

    def _create_qa_summary_content(
        self,
        deck_data: Dict[str, Any],
        qa_data: Optional[Dict[str, Any]]
    ) -> str:
        """Create Q&A summary content"""
        content = []
        content.append("INVESTOR Q&A PREPARATION")
        content.append("=" * 40)
        content.append(f"Deck: {deck_data.get('name', 'Unknown')}")
        content.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        content.append("")
        
        if qa_data and qa_data.get('questions'):
            content.append("QUESTIONS BY CATEGORY")
            content.append("-" * 25)
            
            # Group questions by category
            categories = {}
            for question in qa_data['questions']:
                category = question.get('category', 'general')
                if category not in categories:
                    categories[category] = []
                categories[category].append(question)
            
            for category, questions in categories.items():
                content.append(f"\n{category.upper().replace('_', ' ')}:")
                content.append("-" * len(category))
                
                for i, question in enumerate(questions, 1):
                    content.append(f"{i}. {question.get('question', '')}")
                    if question.get('answer'):
                        content.append(f"   Answer: {question.get('answer')}")
                    content.append("")
        
        return "\n".join(content)

    def _create_comprehensive_report_content(
        self,
        deck_data: Dict[str, Any],
        analysis_data: Optional[Dict[str, Any]],
        qa_data: Optional[Dict[str, Any]]
    ) -> str:
        """Create comprehensive report content"""
        content = []
        content.append("COMPREHENSIVE PITCH DECK REPORT")
        content.append("=" * 50)
        content.append(f"Deck: {deck_data.get('name', 'Unknown')}")
        content.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        content.append("")
        
        # Add analysis section
        if analysis_data:
            content.extend(self._create_analysis_report_content(deck_data, analysis_data).split('\n'))
            content.append("")
        
        # Add Q&A section
        if qa_data:
            content.extend(self._create_qa_summary_content(deck_data, qa_data).split('\n'))
        
        return "\n".join(content)

    async def generate_export_background(
        self,
        export_id: str,
        deck_id: str,
        export_type: str,
        format: str,
        include_analysis: bool = True,
        include_qa: bool = False,
        qa_session_id: str = None
    ):
        """Generate export in background"""
        try:
            logger.info("Starting background export generation", export_id=export_id)
            
            # This would fetch data from database and generate export
            # For now, just log the process
            logger.info("Background export generation completed", export_id=export_id)
            
        except Exception as e:
            logger.error("Error in background export generation", error=str(e), export_id=export_id)
            raise
