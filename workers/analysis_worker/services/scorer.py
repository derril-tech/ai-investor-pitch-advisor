import re
import structlog
from typing import List, Dict, Any
from dataclasses import dataclass

logger = structlog.get_logger()

@dataclass
class Score:
    dimension: str
    score: float
    explanation: str
    factors: List[str]

class ScorerService:
    def __init__(self):
        self.scoring_rules = {
            'clarity': {
                'factors': ['readability', 'structure', 'conciseness', 'jargon'],
                'weights': [0.3, 0.3, 0.2, 0.2]
            },
            'design': {
                'factors': ['visual_hierarchy', 'consistency', 'whitespace', 'typography'],
                'weights': [0.3, 0.3, 0.2, 0.2]
            },
            'storytelling': {
                'factors': ['narrative_flow', 'emotional_impact', 'pacing', 'engagement'],
                'weights': [0.4, 0.2, 0.2, 0.2]
            },
            'investor_fit': {
                'factors': ['market_understanding', 'competitive_advantage', 'traction', 'team'],
                'weights': [0.3, 0.3, 0.2, 0.2]
            }
        }
    
    async def score_deck(self, slides: List[Dict[str, Any]], structure_analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Score a deck across multiple dimensions"""
        logger.info("Starting deck scoring", slide_count=len(slides))
        
        scores = {}
        
        for dimension, config in self.scoring_rules.items():
            score = await self._score_dimension(slides, structure_analysis, dimension, config)
            scores[dimension] = score.__dict__
        
        # Calculate overall score
        overall_score = self._calculate_overall_score(scores)
        scores['overall'] = overall_score.__dict__
        
        return scores
    
    async def _score_dimension(self, slides: List[Dict[str, Any]], structure_analysis: Dict[str, Any], dimension: str, config: Dict[str, Any]) -> Score:
        """Score a specific dimension"""
        factors = config['factors']
        weights = config['weights']
        
        factor_scores = []
        factor_explanations = []
        
        for factor, weight in zip(factors, weights):
            factor_score, explanation = await self._evaluate_factor(slides, structure_analysis, dimension, factor)
            factor_scores.append(factor_score * weight)
            factor_explanations.append(f"{factor}: {explanation}")
        
        # Calculate weighted average
        total_score = sum(factor_scores)
        overall_explanation = "; ".join(factor_explanations)
        
        return Score(
            dimension=dimension,
            score=round(total_score, 2),
            explanation=overall_explanation,
            factors=factors
        )
    
    async def _evaluate_factor(self, slides: List[Dict[str, Any]], structure_analysis: Dict[str, Any], dimension: str, factor: str) -> tuple:
        """Evaluate a specific factor"""
        if factor == 'readability':
            return self._evaluate_readability(slides)
        elif factor == 'structure':
            return self._evaluate_structure(structure_analysis)
        elif factor == 'conciseness':
            return self._evaluate_conciseness(slides)
        elif factor == 'jargon':
            return self._evaluate_jargon(slides)
        elif factor == 'visual_hierarchy':
            return self._evaluate_visual_hierarchy(slides)
        elif factor == 'consistency':
            return self._evaluate_consistency(slides)
        elif factor == 'whitespace':
            return self._evaluate_whitespace(slides)
        elif factor == 'typography':
            return self._evaluate_typography(slides)
        elif factor == 'narrative_flow':
            return self._evaluate_narrative_flow(structure_analysis)
        elif factor == 'emotional_impact':
            return self._evaluate_emotional_impact(slides)
        elif factor == 'pacing':
            return self._evaluate_pacing(slides)
        elif factor == 'engagement':
            return self._evaluate_engagement(slides)
        elif factor == 'market_understanding':
            return self._evaluate_market_understanding(slides, structure_analysis)
        elif factor == 'competitive_advantage':
            return self._evaluate_competitive_advantage(slides)
        elif factor == 'traction':
            return self._evaluate_traction(slides, structure_analysis)
        elif factor == 'team':
            return self._evaluate_team(slides, structure_analysis)
        else:
            return 5.0, "Factor not implemented"
    
    def _evaluate_readability(self, slides: List[Dict[str, Any]]) -> tuple:
        """Evaluate readability of slides"""
        total_words = 0
        complex_sentences = 0
        
        for slide in slides:
            content = slide.get('content', '')
            total_words += len(content.split())
            
            # Count complex sentences (more than 20 words)
            sentences = content.split('.')
            for sentence in sentences:
                if len(sentence.split()) > 20:
                    complex_sentences += 1
        
        if total_words == 0:
            return 5.0, "No content to evaluate"
        
        complexity_ratio = complex_sentences / len(slides) if slides else 0
        
        if complexity_ratio < 0.2:
            score = 8.0
            explanation = "Good readability with concise sentences"
        elif complexity_ratio < 0.5:
            score = 6.0
            explanation = "Moderate readability, some complex sentences"
        else:
            score = 4.0
            explanation = "Poor readability, too many complex sentences"
        
        return score, explanation
    
    def _evaluate_structure(self, structure_analysis: Dict[str, Any]) -> tuple:
        """Evaluate deck structure"""
        missing_sections = structure_analysis.get('deck_structure', {}).get('missing_sections', [])
        
        if not missing_sections:
            score = 9.0
            explanation = "Complete deck structure with all key sections"
        elif len(missing_sections) == 1:
            score = 7.0
            explanation = f"Good structure, missing: {missing_sections[0]}"
        elif len(missing_sections) == 2:
            score = 5.0
            explanation = f"Moderate structure, missing: {', '.join(missing_sections)}"
        else:
            score = 3.0
            explanation = f"Poor structure, missing: {', '.join(missing_sections)}"
        
        return score, explanation
    
    def _evaluate_conciseness(self, slides: List[Dict[str, Any]]) -> tuple:
        """Evaluate conciseness of slides"""
        total_words = 0
        for slide in slides:
            content = slide.get('content', '')
            total_words += len(content.split())
        
        avg_words_per_slide = total_words / len(slides) if slides else 0
        
        if avg_words_per_slide < 50:
            score = 9.0
            explanation = "Excellent conciseness"
        elif avg_words_per_slide < 100:
            score = 7.0
            explanation = "Good conciseness"
        elif avg_words_per_slide < 150:
            score = 5.0
            explanation = "Moderate conciseness"
        else:
            score = 3.0
            explanation = "Poor conciseness, too wordy"
        
        return score, explanation
    
    def _evaluate_jargon(self, slides: List[Dict[str, Any]]) -> tuple:
        """Evaluate use of jargon"""
        jargon_words = [
            'synergy', 'paradigm', 'leverage', 'disrupt', 'innovate', 'scalable',
            'monetize', 'optimize', 'streamline', 'facilitate', 'methodology'
        ]
        
        jargon_count = 0
        total_words = 0
        
        for slide in slides:
            content = slide.get('content', '').lower()
            total_words += len(content.split())
            
            for jargon in jargon_words:
                jargon_count += content.count(jargon)
        
        if total_words == 0:
            return 5.0, "No content to evaluate"
        
        jargon_ratio = jargon_count / total_words
        
        if jargon_ratio < 0.01:
            score = 9.0
            explanation = "Minimal jargon use"
        elif jargon_ratio < 0.03:
            score = 7.0
            explanation = "Moderate jargon use"
        elif jargon_ratio < 0.05:
            score = 5.0
            explanation = "High jargon use"
        else:
            score = 3.0
            explanation = "Excessive jargon use"
        
        return score, explanation
    
    def _evaluate_visual_hierarchy(self, slides: List[Dict[str, Any]]) -> tuple:
        """Evaluate visual hierarchy (placeholder)"""
        return 6.0, "Visual hierarchy evaluation requires image analysis"
    
    def _evaluate_consistency(self, slides: List[Dict[str, Any]]) -> tuple:
        """Evaluate consistency (placeholder)"""
        return 6.0, "Consistency evaluation requires design analysis"
    
    def _evaluate_whitespace(self, slides: List[Dict[str, Any]]) -> tuple:
        """Evaluate whitespace usage (placeholder)"""
        return 6.0, "Whitespace evaluation requires design analysis"
    
    def _evaluate_typography(self, slides: List[Dict[str, Any]]) -> tuple:
        """Evaluate typography (placeholder)"""
        return 6.0, "Typography evaluation requires design analysis"
    
    def _evaluate_narrative_flow(self, structure_analysis: Dict[str, Any]) -> tuple:
        """Evaluate narrative flow"""
        deck_type = structure_analysis.get('deck_structure', {}).get('deck_type', 'unknown')
        
        if deck_type == 'fundraising':
            score = 8.0
            explanation = "Good narrative flow for fundraising"
        elif deck_type == 'business_plan':
            score = 7.0
            explanation = "Good narrative flow for business plan"
        else:
            score = 5.0
            explanation = "Basic narrative flow"
        
        return score, explanation
    
    def _evaluate_emotional_impact(self, slides: List[Dict[str, Any]]) -> tuple:
        """Evaluate emotional impact"""
        emotional_words = ['amazing', 'incredible', 'revolutionary', 'breakthrough', 'game-changing']
        emotional_count = 0
        
        for slide in slides:
            content = slide.get('content', '').lower()
            for word in emotional_words:
                emotional_count += content.count(word)
        
        if emotional_count == 0:
            score = 5.0
            explanation = "Neutral tone"
        elif emotional_count <= 3:
            score = 7.0
            explanation = "Good emotional impact"
        elif emotional_count <= 6:
            score = 6.0
            explanation = "Moderate emotional impact"
        else:
            score = 4.0
            explanation = "Overly emotional, may seem exaggerated"
        
        return score, explanation
    
    def _evaluate_pacing(self, slides: List[Dict[str, Any]]) -> tuple:
        """Evaluate pacing"""
        if len(slides) < 10:
            score = 8.0
            explanation = "Good pacing, concise deck"
        elif len(slides) < 15:
            score = 7.0
            explanation = "Good pacing"
        elif len(slides) < 20:
            score = 6.0
            explanation = "Moderate pacing"
        else:
            score = 4.0
            explanation = "Poor pacing, deck too long"
        
        return score, explanation
    
    def _evaluate_engagement(self, slides: List[Dict[str, Any]]) -> tuple:
        """Evaluate engagement"""
        question_count = 0
        for slide in slides:
            content = slide.get('content', '')
            question_count += content.count('?')
        
        if question_count >= 3:
            score = 8.0
            explanation = "Good engagement with questions"
        elif question_count >= 1:
            score = 6.0
            explanation = "Moderate engagement"
        else:
            score = 4.0
            explanation = "Low engagement, no questions"
        
        return score, explanation
    
    def _evaluate_market_understanding(self, slides: List[Dict[str, Any]], structure_analysis: Dict[str, Any]) -> tuple:
        """Evaluate market understanding"""
        market_slides = 0
        for slide_id, role_data in structure_analysis.get('slide_roles', {}).items():
            if role_data.get('role') == 'market':
                market_slides += 1
        
        if market_slides >= 2:
            score = 8.0
            explanation = "Strong market understanding"
        elif market_slides == 1:
            score = 6.0
            explanation = "Basic market understanding"
        else:
            score = 3.0
            explanation = "Poor market understanding"
        
        return score, explanation
    
    def _evaluate_competitive_advantage(self, slides: List[Dict[str, Any]]) -> tuple:
        """Evaluate competitive advantage"""
        competitive_words = ['unique', 'competitive', 'advantage', 'differentiation', 'moat']
        competitive_count = 0
        
        for slide in slides:
            content = slide.get('content', '').lower()
            for word in competitive_words:
                competitive_count += content.count(word)
        
        if competitive_count >= 3:
            score = 8.0
            explanation = "Strong competitive positioning"
        elif competitive_count >= 1:
            score = 6.0
            explanation = "Basic competitive positioning"
        else:
            score = 4.0
            explanation = "Weak competitive positioning"
        
        return score, explanation
    
    def _evaluate_traction(self, slides: List[Dict[str, Any]], structure_analysis: Dict[str, Any]) -> tuple:
        """Evaluate traction"""
        traction_slides = 0
        for slide_id, role_data in structure_analysis.get('slide_roles', {}).items():
            if role_data.get('role') == 'traction':
                traction_slides += 1
        
        if traction_slides >= 2:
            score = 8.0
            explanation = "Strong traction demonstrated"
        elif traction_slides == 1:
            score = 6.0
            explanation = "Basic traction demonstrated"
        else:
            score = 3.0
            explanation = "No traction demonstrated"
        
        return score, explanation
    
    def _evaluate_team(self, slides: List[Dict[str, Any]], structure_analysis: Dict[str, Any]) -> tuple:
        """Evaluate team presentation"""
        team_slides = 0
        for slide_id, role_data in structure_analysis.get('slide_roles', {}).items():
            if role_data.get('role') == 'team':
                team_slides += 1
        
        if team_slides >= 1:
            score = 7.0
            explanation = "Team well presented"
        else:
            score = 4.0
            explanation = "Team not well presented"
        
        return score, explanation
    
    def _calculate_overall_score(self, scores: Dict[str, Any]) -> Score:
        """Calculate overall score"""
        dimension_scores = []
        explanations = []
        
        for dimension, score_data in scores.items():
            if dimension != 'overall':
                dimension_scores.append(score_data['score'])
                explanations.append(f"{dimension}: {score_data['score']}")
        
        overall_score = sum(dimension_scores) / len(dimension_scores) if dimension_scores else 0
        
        return Score(
            dimension="overall",
            score=round(overall_score, 2),
            explanation="; ".join(explanations),
            factors=list(scores.keys())
        )
    
    async def generate_explanations(self, slides: List[Dict[str, Any]], scores: Dict[str, Any]) -> Dict[str, str]:
        """Generate detailed explanations for scores"""
        explanations = {}
        
        for dimension, score_data in scores.items():
            if dimension == 'overall':
                continue
            
            score = score_data['score']
            explanation = score_data['explanation']
            
            if score >= 8:
                explanations[dimension] = f"Excellent {dimension}: {explanation}"
            elif score >= 6:
                explanations[dimension] = f"Good {dimension}: {explanation}"
            elif score >= 4:
                explanations[dimension] = f"Needs improvement in {dimension}: {explanation}"
            else:
                explanations[dimension] = f"Poor {dimension}: {explanation}"
        
        return explanations
