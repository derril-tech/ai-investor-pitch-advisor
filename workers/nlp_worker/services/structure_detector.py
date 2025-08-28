import re
import structlog
from typing import List, Dict, Any
from dataclasses import dataclass

logger = structlog.get_logger()

@dataclass
class SlideRole:
    role: str
    confidence: float
    keywords: List[str]

class StructureDetectorService:
    def __init__(self):
        self.role_patterns = {
            'problem': {
                'keywords': ['problem', 'challenge', 'issue', 'pain point', 'gap', 'need'],
                'patterns': [
                    r'\b(problem|challenge|issue|pain)\b',
                    r'\b(why|what|how)\s+(is|are)\s+(wrong|broken|missing)\b',
                    r'\b(current|existing)\s+(state|situation|problem)\b'
                ]
            },
            'solution': {
                'keywords': ['solution', 'product', 'service', 'platform', 'technology', 'innovation'],
                'patterns': [
                    r'\b(solution|product|service|platform)\b',
                    r'\b(how|what)\s+(we|our)\s+(solve|provide|offer)\b',
                    r'\b(technology|innovation|approach|method)\b'
                ]
            },
            'traction': {
                'keywords': ['traction', 'growth', 'revenue', 'customers', 'users', 'metrics'],
                'patterns': [
                    r'\b(traction|growth|revenue|customers|users)\b',
                    r'\b(metrics|kpis|results|achievements)\b',
                    r'\b(sales|revenue|growth|increase)\b'
                ]
            },
            'market': {
                'keywords': ['market', 'opportunity', 'size', 'target', 'audience', 'demand'],
                'patterns': [
                    r'\b(market|opportunity|size|target|audience)\b',
                    r'\b(tam|sam|som)\b',
                    r'\b(demand|need|potential)\b'
                ]
            },
            'team': {
                'keywords': ['team', 'founder', 'experience', 'background', 'expertise'],
                'patterns': [
                    r'\b(team|founder|experience|background)\b',
                    r'\b(we|our|us)\s+(are|have|bring)\b',
                    r'\b(expertise|skills|knowledge)\b'
                ]
            },
            'financials': {
                'keywords': ['financial', 'revenue', 'profit', 'funding', 'investment', 'model'],
                'patterns': [
                    r'\b(financial|revenue|profit|funding|investment)\b',
                    r'\b(business\s+model|pricing|cost)\b',
                    r'\b(break\s+even|roi|margin)\b'
                ]
            },
            'ask': {
                'keywords': ['ask', 'funding', 'investment', 'raise', 'money', 'capital'],
                'patterns': [
                    r'\b(ask|funding|investment|raise|money|capital)\b',
                    r'\b(we\s+are\s+raising|seeking|looking\s+for)\b',
                    r'\b(use\s+of\s+funds|allocation)\b'
                ]
            }
        }
    
    async def detect_slide_roles(self, slides: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Detect roles for all slides in a deck"""
        logger.info("Starting slide role detection", slide_count=len(slides))
        
        slide_roles = {}
        
        for slide in slides:
            slide_id = slide.get('id')
            title = slide.get('title', '')
            content = slide.get('content', '')
            notes = slide.get('notes', '')
            
            # Combine all text for analysis
            full_text = f"{title} {content} {notes}".lower()
            
            # Detect role for this slide
            role = self._detect_slide_role(full_text)
            slide_roles[slide_id] = role.__dict__
        
        # Analyze overall deck structure
        deck_structure = self._analyze_deck_structure(slide_roles)
        
        return {
            'slide_roles': slide_roles,
            'deck_structure': deck_structure
        }
    
    def _detect_slide_role(self, text: str) -> SlideRole:
        """Detect the role of a single slide"""
        best_role = 'unknown'
        best_confidence = 0.0
        best_keywords = []
        
        for role, config in self.role_patterns.items():
            confidence = 0.0
            matched_keywords = []
            
            # Check keyword matches
            for keyword in config['keywords']:
                if keyword in text:
                    confidence += 0.3
                    matched_keywords.append(keyword)
            
            # Check pattern matches
            for pattern in config['patterns']:
                matches = re.findall(pattern, text, re.IGNORECASE)
                if matches:
                    confidence += 0.2 * len(matches)
                    matched_keywords.extend(matches)
            
            # Normalize confidence
            confidence = min(confidence, 1.0)
            
            if confidence > best_confidence:
                best_confidence = confidence
                best_role = role
                best_keywords = list(set(matched_keywords))
        
        return SlideRole(
            role=best_role,
            confidence=best_confidence,
            keywords=best_keywords
        )
    
    def _analyze_deck_structure(self, slide_roles: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze the overall structure of the deck"""
        role_counts = {}
        total_slides = len(slide_roles)
        
        # Count roles
        for slide_id, role_data in slide_roles.items():
            role = role_data['role']
            role_counts[role] = role_counts.get(role, 0) + 1
        
        # Calculate percentages
        role_percentages = {}
        for role, count in role_counts.items():
            role_percentages[role] = (count / total_slides) * 100
        
        # Check for missing critical sections
        missing_sections = []
        critical_sections = ['problem', 'solution', 'market', 'team', 'financials', 'ask']
        for section in critical_sections:
            if section not in role_counts or role_counts[section] == 0:
                missing_sections.append(section)
        
        # Determine deck type/stage
        deck_type = self._determine_deck_type(role_counts)
        
        return {
            'role_counts': role_counts,
            'role_percentages': role_percentages,
            'missing_sections': missing_sections,
            'deck_type': deck_type,
            'total_slides': total_slides
        }
    
    def _determine_deck_type(self, role_counts: Dict[str, int]) -> str:
        """Determine the type/stage of the deck based on content"""
        if role_counts.get('ask', 0) > 0:
            return 'fundraising'
        elif role_counts.get('financials', 0) > 0:
            return 'business_plan'
        elif role_counts.get('traction', 0) > 0:
            return 'growth'
        elif role_counts.get('solution', 0) > 0:
            return 'product_pitch'
        else:
            return 'concept'
