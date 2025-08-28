import structlog
from typing import Dict, Any, List, Optional
import openai
import re
from datetime import datetime
import asyncio

logger = structlog.get_logger()

class SuggestionGeneratorService:
    def __init__(self, openai_api_key: str = "", openai_model: str = "gpt-4-turbo-preview"):
        self.openai_api_key = openai_api_key
        self.openai_model = openai_model
        if openai_api_key:
            openai.api_key = openai_api_key

        # Suggestion templates and patterns
        self.headline_templates = [
            "Transform vague titles into compelling hooks",
            "Make headlines more specific and benefit-focused",
            "Add emotional resonance to technical titles",
            "Create urgency or exclusivity in headlines"
        ]

        self.structure_patterns = [
            "Merge related slides to reduce redundancy",
            "Reorder slides for better logical flow",
            "Split complex slides into digestible chunks",
            "Add missing transitions between sections"
        ]

        self.design_tips = [
            "Improve visual hierarchy with better typography",
            "Use consistent color scheme throughout",
            "Add more white space for better readability",
            "Incorporate relevant icons or illustrations"
        ]

    async def generate_suggestions(
        self,
        deck_data: Dict[str, Any],
        slide_ids: Optional[List[str]] = None,
        suggestion_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Generate suggestions for deck/slides"""
        try:
            logger.info("Generating suggestions", deck_id=deck_data.get('id'))

            suggestions = []

            # Filter slides if specified
            slides_to_analyze = deck_data.get('slides', [])
            if slide_ids:
                slides_to_analyze = [s for s in slides_to_analyze if s['id'] in slide_ids]

            # Generate suggestions for each slide
            for slide in slides_to_analyze:
                slide_suggestions = await self._generate_slide_suggestions(
                    slide,
                    deck_data,
                    suggestion_types
                )
                suggestions.extend(slide_suggestions)

            logger.info("Suggestions generated", count=len(suggestions))
            return suggestions

        except Exception as e:
            logger.error("Error generating suggestions", error=str(e))
            raise

    async def _generate_slide_suggestions(
        self,
        slide: Dict[str, Any],
        deck_data: Dict[str, Any],
        suggestion_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Generate suggestions for a single slide"""
        suggestions = []

        # Determine which types to generate
        types_to_generate = suggestion_types or [
            "headline_rewrite",
            "structure_fix",
            "design_tip",
            "content_enhancement"
        ]

        # Generate headline rewrite suggestions
        if "headline_rewrite" in types_to_generate:
            headline_suggestions = await self._generate_headline_suggestions(slide, deck_data)
            suggestions.extend(headline_suggestions)

        # Generate structure fix suggestions
        if "structure_fix" in types_to_generate:
            structure_suggestions = await self._generate_structure_suggestions(slide, deck_data)
            suggestions.extend(structure_suggestions)

        # Generate design tip suggestions
        if "design_tip" in types_to_generate:
            design_suggestions = await self._generate_design_suggestions(slide, deck_data)
            suggestions.extend(design_suggestions)

        # Generate content enhancement suggestions
        if "content_enhancement" in types_to_generate:
            content_suggestions = await self._generate_content_suggestions(slide, deck_data)
            suggestions.extend(content_suggestions)

        return suggestions

    async def _generate_headline_suggestions(
        self,
        slide: Dict[str, Any],
        deck_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate headline rewrite suggestions"""
        suggestions = []

        title = slide.get('title', '')
        if not title:
            return suggestions

        # Use OpenAI for headline improvements
        if self.openai_api_key:
            improved_headlines = await self._get_openai_headline_suggestions(title, slide, deck_data)

            for i, improved in enumerate(improved_headlines[:2]):  # Limit to 2 suggestions
                suggestions.append({
                    "id": f"headline_{slide['id']}_{i}",
                    "deck_id": deck_data['id'],
                    "slide_id": slide['id'],
                    "suggestion_type": "headline_rewrite",
                    "title": "Improve Slide Headline",
                    "description": f"Consider using: '{improved}'",
                    "rationale": self._get_headline_rationale(title, improved),
                    "before_text": title,
                    "after_text": improved,
                    "confidence": 0.8,
                    "category": "content",
                    "created_at": datetime.utcnow()
                })

        return suggestions

    async def _generate_structure_suggestions(
        self,
        slide: Dict[str, Any],
        deck_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate structure fix suggestions"""
        suggestions = []

        # Analyze slide content for structure issues
        content = slide.get('content', '')
        bullet_points = self._extract_bullet_points(content)

        # Check for too many bullet points
        if len(bullet_points) > 8:
            suggestions.append({
                "id": f"structure_{slide['id']}_bullets",
                "deck_id": deck_data['id'],
                "slide_id": slide['id'],
                "suggestion_type": "structure_fix",
                "title": "Simplify Complex Slide",
                "description": f"This slide has {len(bullet_points)} bullet points. Consider splitting into multiple slides or consolidating key points.",
                "rationale": "Slides with too many bullet points can overwhelm viewers. The 6x6 rule suggests maximum 6 bullets with 6 words each.",
                "before_text": content,
                "after_text": self._consolidate_bullets(bullet_points),
                "confidence": 0.9,
                "category": "structure",
                "created_at": datetime.utcnow()
            })

        # Check for missing transitions
        if self._needs_transition(slide, deck_data):
            suggestions.append({
                "id": f"structure_{slide['id']}_transition",
                "deck_id": deck_data['id'],
                "slide_id": slide['id'],
                "suggestion_type": "structure_fix",
                "title": "Add Transition Slide",
                "description": "Consider adding a transition slide before this section to improve flow.",
                "rationale": "Clear transitions help viewers follow your narrative and understand the logical flow of your presentation.",
                "before_text": "",
                "after_text": "Add transition slide here",
                "confidence": 0.7,
                "category": "structure",
                "created_at": datetime.utcnow()
            })

        return suggestions

    async def _generate_design_suggestions(
        self,
        slide: Dict[str, Any],
        deck_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate design tip suggestions"""
        suggestions = []

        # Check for common design issues
        title = slide.get('title', '')
        content = slide.get('content', '')

        # Title length check
        if len(title.split()) > 12:
            suggestions.append({
                "id": f"design_{slide['id']}_title_length",
                "deck_id": deck_data['id'],
                "slide_id": slide['id'],
                "suggestion_type": "design_tip",
                "title": "Shorten Title Length",
                "description": "Your title is quite long. Consider shortening it to 8-10 words for better visual impact.",
                "rationale": "Long titles can be hard to read quickly and may not fit well in smaller screens or print formats.",
                "before_text": title,
                "after_text": self._shorten_title(title),
                "confidence": 0.8,
                "category": "design",
                "created_at": datetime.utcnow()
            })

        # Content density check
        word_count = len(content.split())
        if word_count > 150:
            suggestions.append({
                "id": f"design_{slide['id']}_content_density",
                "deck_id": deck_data['id'],
                "slide_id": slide['id'],
                "suggestion_type": "design_tip",
                "title": "Reduce Content Density",
                "description": f"This slide has approximately {word_count} words. Consider using more visuals and fewer words.",
                "rationale": "Dense text slides are harder to process. Use visuals, icons, and concise bullet points to improve engagement.",
                "before_text": content,
                "after_text": "Consider using visuals and reducing text density",
                "confidence": 0.8,
                "category": "design",
                "created_at": datetime.utcnow()
            })

        return suggestions

    async def _generate_content_suggestions(
        self,
        slide: Dict[str, Any],
        deck_data: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate content enhancement suggestions"""
        suggestions = []

        content = slide.get('content', '')
        title = slide.get('title', '')

        # Check for vague language
        vague_words = ['very', 'really', 'quite', 'somewhat', 'basically', 'actually']
        vague_found = [word for word in vague_words if word in content.lower()]

        if vague_found:
            suggestions.append({
                "id": f"content_{slide['id']}_vague_language",
                "deck_id": deck_data['id'],
                "slide_id": slide['id'],
                "suggestion_type": "content_enhancement",
                "title": "Remove Vague Language",
                "description": f"Found vague words: {', '.join(vague_found)}. Consider using more specific, confident language.",
                "rationale": "Vague language weakens your message. Specific, confident language builds credibility and clarity.",
                "before_text": content,
                "after_text": self._remove_vague_language(content, vague_found),
                "confidence": 0.7,
                "category": "content",
                "created_at": datetime.utcnow()
            })

        return suggestions

    async def _get_openai_headline_suggestions(
        self,
        title: str,
        slide: Dict[str, Any],
        deck_data: Dict[str, Any]
    ) -> List[str]:
        """Get headline suggestions from OpenAI"""
        try:
            prompt = f"""
            Improve this slide title to be more compelling and investor-focused:

            Original title: "{title}"
            Slide content: "{slide.get('content', '')[:200]}..."

            Provide 3 improved versions that are:
            1. More specific and benefit-focused
            2. Create curiosity or urgency
            3. Use stronger, more confident language

            Return only the 3 improved titles, one per line.
            """

            response = await openai.ChatCompletion.acreate(
                model=self.openai_model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.7
            )

            suggestions_text = response.choices[0].message.content.strip()
            suggestions = [line.strip() for line in suggestions_text.split('\n') if line.strip()]

            return suggestions[:3]

        except Exception as e:
            logger.error("Error getting OpenAI suggestions", error=str(e))
            return []

    def _get_headline_rationale(self, original: str, improved: str) -> str:
        """Generate rationale for headline improvement"""
        if len(improved.split()) < len(original.split()):
            return "Shorter, more impactful headlines grab attention better and are easier to remember."
        elif any(word in improved.lower() for word in ['proven', 'unique', 'first', 'best']):
            return "Adding specific benefits and unique value propositions makes your headline more compelling."
        else:
            return "Clearer, more specific language helps investors quickly understand your value proposition."

    def _extract_bullet_points(self, content: str) -> List[str]:
        """Extract bullet points from slide content"""
        lines = content.split('\n')
        bullets = []

        for line in lines:
            line = line.strip()
            if line.startswith('•') or line.startswith('-') or line.startswith('*'):
                bullets.append(line[1:].strip())
            elif re.match(r'^\d+\.', line):
                bullets.append(re.sub(r'^\d+\.\s*', '', line))

        return bullets

    def _consolidate_bullets(self, bullets: List[str]) -> str:
        """Consolidate bullet points into fewer, stronger points"""
        if len(bullets) <= 6:
            return '\n'.join(f"• {bullet}" for bullet in bullets)

        # Keep top 6 most important bullets (simple heuristic)
        consolidated = bullets[:6]
        return '\n'.join(f"• {bullet}" for bullet in consolidated)

    def _needs_transition(self, slide: Dict[str, Any], deck_data: Dict[str, Any]) -> bool:
        """Check if slide needs a transition"""
        # Simple heuristic: check if this starts a new major section
        title = slide.get('title', '').lower()
        transition_indicators = [
            'our solution', 'the problem', 'market opportunity', 'business model',
            'financials', 'the team', 'next steps', 'contact'
        ]

        return any(indicator in title for indicator in transition_indicators)

    def _shorten_title(self, title: str) -> str:
        """Create a shortened version of the title"""
        words = title.split()
        if len(words) <= 8:
            return title

        # Keep first few words and last few words
        first_part = ' '.join(words[:4])
        last_part = ' '.join(words[-3:])

        return f"{first_part}...{last_part}"

    def _remove_vague_language(self, content: str, vague_words: List[str]) -> str:
        """Remove vague language from content"""
        result = content
        for word in vague_words:
            # Simple replacement - in practice, this would be more sophisticated
            result = re.sub(rf'\b{word}\s+', '', result, flags=re.IGNORECASE)

        return result.strip()
