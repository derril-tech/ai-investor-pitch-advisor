import re
import structlog
from typing import List, Dict, Any
from dataclasses import dataclass

logger = structlog.get_logger()

@dataclass
class KPI:
    name: str
    value: str
    unit: str
    confidence: float
    source_text: str

class KPIExtractorService:
    def __init__(self):
        self.kpi_patterns = {
            'revenue': {
                'patterns': [
                    r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|k|m|b)?',
                    r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|k|m|b)?\s*(?:dollars?|usd)',
                    r'revenue[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)',
                    r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|k|m|b)?\s*revenue'
                ],
                'units': ['$', 'million', 'billion', 'k', 'm', 'b']
            },
            'customers': {
                'patterns': [
                    r'(\d+(?:,\d{3})*)\s*customers?',
                    r'(\d+(?:,\d{3})*)\s*users?',
                    r'(\d+(?:,\d{3})*)\s*clients?',
                    r'customer[:\s]*(\d+(?:,\d{3})*)',
                    r'user[:\s]*(\d+(?:,\d{3})*)'
                ],
                'units': ['customers', 'users', 'clients']
            },
            'growth_rate': {
                'patterns': [
                    r'(\d+(?:\.\d+)?)\s*%\s*growth',
                    r'(\d+(?:\.\d+)?)\s*%\s*increase',
                    r'growth[:\s]*(\d+(?:\.\d+)?)\s*%',
                    r'increase[:\s]*(\d+(?:\.\d+)?)\s*%'
                ],
                'units': ['%']
            },
            'market_size': {
                'patterns': [
                    r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|k|m|b)?\s*market',
                    r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|k|m|b)?\s*(?:tam|sam|som)',
                    r'tam[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)',
                    r'sam[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)',
                    r'som[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)'
                ],
                'units': ['$', 'million', 'billion', 'tam', 'sam', 'som']
            },
            'funding': {
                'patterns': [
                    r'\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|k|m|b)?\s*funding',
                    r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion|k|m|b)?\s*raised',
                    r'funding[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)',
                    r'raised[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)'
                ],
                'units': ['$', 'million', 'billion', 'raised']
            },
            'team_size': {
                'patterns': [
                    r'(\d+)\s*employees?',
                    r'(\d+)\s*team\s*members?',
                    r'(\d+)\s*people',
                    r'team[:\s]*(\d+)',
                    r'employees?[:\s]*(\d+)'
                ],
                'units': ['employees', 'team members', 'people']
            }
        }
    
    async def extract_kpis(self, slides: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Extract KPIs from all slides"""
        logger.info("Starting KPI extraction", slide_count=len(slides))
        
        all_kpis = {}
        
        for slide in slides:
            slide_id = slide.get('id')
            title = slide.get('title', '')
            content = slide.get('content', '')
            notes = slide.get('notes', '')
            
            # Combine all text for analysis
            full_text = f"{title} {content} {notes}"
            
            # Extract KPIs from this slide
            slide_kpis = self._extract_slide_kpis(full_text)
            all_kpis[slide_id] = slide_kpis
        
        # Aggregate KPIs across all slides
        aggregated_kpis = self._aggregate_kpis(all_kpis)
        
        return {
            'slide_kpis': all_kpis,
            'aggregated_kpis': aggregated_kpis
        }
    
    def _extract_slide_kpis(self, text: str) -> List[Dict[str, Any]]:
        """Extract KPIs from a single slide"""
        kpis = []
        
        for kpi_type, config in self.kpi_patterns.items():
            for pattern in config['patterns']:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                
                for match in matches:
                    value = match.group(1)
                    source_text = match.group(0)
                    
                    # Determine unit
                    unit = self._extract_unit(source_text, config['units'])
                    
                    # Calculate confidence based on pattern match
                    confidence = self._calculate_confidence(match, source_text)
                    
                    kpi = KPI(
                        name=kpi_type,
                        value=value,
                        unit=unit,
                        confidence=confidence,
                        source_text=source_text
                    )
                    
                    kpis.append(kpi.__dict__)
        
        return kpis
    
    def _extract_unit(self, text: str, possible_units: List[str]) -> str:
        """Extract the unit from the matched text"""
        text_lower = text.lower()
        
        for unit in possible_units:
            if unit.lower() in text_lower:
                return unit
        
        return ""
    
    def _calculate_confidence(self, match, source_text: str) -> float:
        """Calculate confidence score for the KPI match"""
        confidence = 0.5  # Base confidence
        
        # Higher confidence for exact matches
        if match.group(0) == source_text:
            confidence += 0.3
        
        # Higher confidence for longer matches
        if len(source_text) > 10:
            confidence += 0.2
        
        # Higher confidence for matches with units
        if any(unit in source_text.lower() for unit in ['$', '%', 'million', 'billion']):
            confidence += 0.2
        
        return min(confidence, 1.0)
    
    def _aggregate_kpis(self, all_kpis: Dict[str, List[Dict[str, Any]]]) -> Dict[str, Any]:
        """Aggregate KPIs across all slides"""
        aggregated = {}
        
        for kpi_type in self.kpi_patterns.keys():
            kpi_values = []
            
            for slide_id, slide_kpis in all_kpis.items():
                for kpi in slide_kpis:
                    if kpi['name'] == kpi_type:
                        kpi_values.append(kpi)
            
            if kpi_values:
                # Sort by confidence
                kpi_values.sort(key=lambda x: x['confidence'], reverse=True)
                
                # Take the highest confidence value
                best_kpi = kpi_values[0]
                
                aggregated[kpi_type] = {
                    'value': best_kpi['value'],
                    'unit': best_kpi['unit'],
                    'confidence': best_kpi['confidence'],
                    'source_text': best_kpi['source_text'],
                    'total_matches': len(kpi_values)
                }
        
        return aggregated
