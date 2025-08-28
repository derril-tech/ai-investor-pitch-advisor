import structlog
from typing import List, Dict, Any, Optional
import re
import random
import openai
from datetime import datetime

logger = structlog.get_logger()

class QAGeneratorService:
    def __init__(self):
        self.question_templates = {
            "market": [
                "What is your total addressable market (TAM) and how did you calculate it?",
                "What market trends are driving demand for your solution?",
                "How do you plan to capture market share from established players?",
                "What is your go-to-market strategy for reaching your target customers?",
                "How do you validate market demand for your product?",
                "What barriers to entry exist in your market?",
                "How do you differentiate your market positioning?",
                "What market research have you conducted?"
            ],
            "competition": [
                "Who are your main competitors and how do you differentiate?",
                "What competitive advantages do you have?",
                "How do you plan to compete with larger, established companies?",
                "What is your competitive moat?",
                "How do you stay ahead of emerging competitors?",
                "What competitive intelligence do you gather?",
                "How do you respond to competitive threats?",
                "What partnerships help you compete effectively?"
            ],
            "business_model": [
                "How do you generate revenue?",
                "What is your pricing strategy and how did you determine it?",
                "What are your customer acquisition costs (CAC)?",
                "What is your customer lifetime value (LTV)?",
                "How do you plan to scale your business model?",
                "What are your key revenue drivers?",
                "How do you handle customer churn?",
                "What are your unit economics?"
            ],
            "financials": [
                "What are your current revenue and growth rates?",
                "What is your burn rate and runway?",
                "What are your key financial metrics?",
                "How do you plan to achieve profitability?",
                "What are your projected financials for the next 3 years?",
                "How do you manage cash flow?",
                "What are your key cost drivers?",
                "How do you plan to use the funding?"
            ],
            "team": [
                "What is your team's background and relevant experience?",
                "How do you plan to scale your team?",
                "What key hires do you need to make?",
                "How do you attract and retain top talent?",
                "What is your team's track record?",
                "How do you handle team dynamics and culture?",
                "What advisory board or mentors do you have?",
                "How do you plan to build your leadership team?"
            ],
            "technology": [
                "What is your technology stack and why did you choose it?",
                "How do you ensure technology scalability?",
                "What are your technology risks and how do you mitigate them?",
                "How do you protect your intellectual property?",
                "What is your technology roadmap?",
                "How do you handle technical debt?",
                "What are your security measures?",
                "How do you stay current with technology trends?"
            ],
            "go_to_market": [
                "What is your customer acquisition strategy?",
                "How do you reach your target customers?",
                "What channels are most effective for your business?",
                "How do you measure marketing ROI?",
                "What is your sales process and cycle?",
                "How do you handle customer onboarding?",
                "What is your customer success strategy?",
                "How do you expand into new markets?"
            ],
            "risks": [
                "What are the biggest risks to your business?",
                "How do you mitigate key business risks?",
                "What regulatory risks do you face?",
                "How do you handle market risks?",
                "What technology risks exist?",
                "How do you manage operational risks?",
                "What are your contingency plans?",
                "How do you monitor and address risks?"
            ],
            "exit_strategy": [
                "What is your exit strategy?",
                "Who are potential acquirers?",
                "What is your timeline for exit?",
                "How do you position yourself for acquisition?",
                "What valuation do you expect at exit?",
                "How do you create shareholder value?",
                "What milestones need to be achieved before exit?",
                "How do you handle investor liquidity?"
            ],
            "funding_use": [
                "How will you use the funding?",
                "What milestones will this funding help you achieve?",
                "How long will this funding last?",
                "What is your next funding round timeline?",
                "How do you plan to raise additional capital?",
                "What metrics will you track to show progress?",
                "How do you ensure efficient use of capital?",
                "What is your path to profitability?"
            ]
        }
        
        self.sector_specific_questions = {
            "Technology": [
                "How do you handle data privacy and security?",
                "What is your technology scalability plan?",
                "How do you stay ahead of technology trends?",
                "What is your API strategy?",
                "How do you handle technical support?"
            ],
            "Healthcare": [
                "What regulatory approvals do you need?",
                "How do you ensure patient safety?",
                "What is your clinical validation strategy?",
                "How do you handle HIPAA compliance?",
                "What is your FDA approval timeline?"
            ],
            "Fintech": [
                "What regulatory compliance do you need?",
                "How do you handle financial security?",
                "What is your compliance strategy?",
                "How do you manage regulatory changes?",
                "What is your fraud prevention approach?"
            ],
            "E-commerce": [
                "How do you handle logistics and fulfillment?",
                "What is your customer service strategy?",
                "How do you manage inventory?",
                "What is your return policy?",
                "How do you handle seasonal fluctuations?"
            ]
        }
        
        self.stage_specific_questions = {
            "Seed": [
                "How do you validate your product-market fit?",
                "What early traction have you achieved?",
                "How do you plan to build your MVP?",
                "What is your customer discovery process?",
                "How do you measure early success?"
            ],
            "Series A": [
                "How do you plan to scale your business?",
                "What key hires do you need?",
                "How do you expand your market reach?",
                "What is your growth strategy?",
                "How do you build repeatable processes?"
            ],
            "Series B": [
                "How do you expand internationally?",
                "What is your market expansion strategy?",
                "How do you scale your team?",
                "What is your operational efficiency plan?",
                "How do you optimize unit economics?"
            ]
        }

    async def generate_questions_for_deck(self, deck_data: Dict[str, Any], num_questions: int = 20) -> List[Dict[str, Any]]:
        """Generate questions based on deck content"""
        try:
            logger.info("Generating questions for deck", deck_id=deck_data.get("id"), num_questions=num_questions)
            
            # Extract key information from deck
            slides = deck_data.get("slides", [])
            deck_metadata = deck_data.get("metadata", {})
            
            # Analyze deck content to identify relevant categories
            relevant_categories = self._identify_relevant_categories(slides, deck_metadata)
            
            # Generate questions for each relevant category
            questions = []
            questions_per_category = max(1, num_questions // len(relevant_categories))
            
            for category in relevant_categories:
                category_questions = self._generate_category_questions(
                    category, slides, questions_per_category
                )
                questions.extend(category_questions)
            
            # Shuffle and limit to requested number
            random.shuffle(questions)
            questions = questions[:num_questions]
            
            # Add confidence scores and slide references
            for question in questions:
                question["confidence"] = self._calculate_confidence(question, slides)
                question["slideRefs"] = self._find_relevant_slides(question, slides)
                question["needsExtraInfo"] = self._assess_extra_info_needed(question, slides)
            
            logger.info("Generated questions successfully", count=len(questions))
            return questions
            
        except Exception as e:
            logger.error("Error generating questions", error=str(e))
            raise

    def _identify_relevant_categories(self, slides: List[Dict], metadata: Dict) -> List[str]:
        """Identify which question categories are most relevant based on deck content"""
        content_text = " ".join([
            slide.get("title", "") + " " + slide.get("content", "")
            for slide in slides
        ]).lower()
        
        category_scores = {}
        for category, templates in self.question_templates.items():
            score = 0
            for template in templates:
                # Simple keyword matching
                keywords = self._extract_keywords(template.lower())
                for keyword in keywords:
                    if keyword in content_text:
                        score += 1
            category_scores[category] = score
        
        # Return top categories
        sorted_categories = sorted(category_scores.items(), key=lambda x: x[1], reverse=True)
        return [cat for cat, score in sorted_categories[:6]]  # Top 6 categories

    def _generate_category_questions(self, category: str, slides: List[Dict], count: int) -> List[Dict[str, Any]]:
        """Generate questions for a specific category"""
        questions = []
        templates = self.question_templates.get(category, [])
        
        # Use templates and customize based on deck content
        for i in range(min(count, len(templates))):
            template = templates[i]
            customized_question = self._customize_question(template, slides)
            
            questions.append({
                "question": customized_question,
                "category": category,
                "confidence": 0.8,  # Will be recalculated later
                "slideRefs": [],
                "needsExtraInfo": False,
                "metadata": {
                    "template": template,
                    "category": category
                }
            })
        
        return questions

    def _customize_question(self, template: str, slides: List[Dict]) -> str:
        """Customize a question template based on deck content"""
        # Extract company name, product name, etc.
        company_info = self._extract_company_info(slides)
        
        # Simple template customization
        customized = template
        if company_info.get("company_name"):
            customized = customized.replace("your", f"{company_info['company_name']}'s")
        
        return customized

    def _extract_company_info(self, slides: List[Dict]) -> Dict[str, str]:
        """Extract company information from slides"""
        company_info = {}
        
        for slide in slides:
            title = slide.get("title", "").lower()
            content = slide.get("content", "").lower()
            
            # Look for company name patterns
            if "about" in title or "company" in title:
                # Extract potential company name
                lines = content.split('\n')
                for line in lines:
                    if len(line.strip()) > 0 and len(line.strip()) < 50:
                        company_info["company_name"] = line.strip()
                        break
        
        return company_info

    def _extract_keywords(self, text: str) -> List[str]:
        """Extract keywords from text"""
        # Remove common words and extract meaningful terms
        common_words = {"what", "how", "why", "when", "where", "who", "is", "are", "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by"}
        words = re.findall(r'\b\w+\b', text.lower())
        return [word for word in words if word not in common_words and len(word) > 3]

    def _calculate_confidence(self, question: Dict, slides: List[Dict]) -> float:
        """Calculate confidence score for a question based on available information"""
        # Simple heuristic based on keyword matching
        question_text = question["question"].lower()
        keywords = self._extract_keywords(question_text)
        
        content_text = " ".join([
            slide.get("title", "") + " " + slide.get("content", "")
            for slide in slides
        ]).lower()
        
        matches = sum(1 for keyword in keywords if keyword in content_text)
        confidence = min(1.0, matches / len(keywords) if keywords else 0.0)
        
        return round(confidence, 2)

    def _find_relevant_slides(self, question: Dict, slides: List[Dict]) -> List[int]:
        """Find slides that are most relevant to a question"""
        question_text = question["question"].lower()
        keywords = self._extract_keywords(question_text)
        
        relevant_slides = []
        for i, slide in enumerate(slides):
            slide_text = (slide.get("title", "") + " " + slide.get("content", "")).lower()
            matches = sum(1 for keyword in keywords if keyword in slide_text)
            if matches > 0:
                relevant_slides.append(i + 1)  # 1-indexed slide numbers
        
        return relevant_slides[:3]  # Top 3 most relevant slides

    def _assess_extra_info_needed(self, question: Dict, slides: List[Dict]) -> bool:
        """Assess whether extra information is needed to answer the question"""
        # Questions with low confidence likely need extra info
        return question.get("confidence", 0) < 0.5

    async def generate_answer_suggestions(self, question: str, slides: List[Dict]) -> List[str]:
        """Generate suggested answers for a question"""
        # This would integrate with OpenAI or other LLM for answer generation
        # For now, return placeholder suggestions
        return [
            "Based on our market research and customer feedback...",
            "Our team's experience in this area shows that...",
            "We have validated this through our pilot programs..."
        ]

    async def generate_stage_sector_questions(
        self,
        deck_data: Dict[str, Any],
        sector: str = "Technology",
        stage: str = "Series A",
        num_questions: int = 20
    ) -> List[Dict[str, Any]]:
        """Generate stage and sector-specific questions with draft answers"""
        try:
            logger.info("Generating stage/sector-specific questions",
                       sector=sector, stage=stage, num_questions=num_questions)

            slides = deck_data.get("slides", [])

            # Get stage-specific and sector-specific questions
            stage_questions = self._get_stage_specific_questions(stage, slides)
            sector_questions = self._get_sector_specific_questions(sector, slides)

            # Combine and customize questions
            all_questions = stage_questions + sector_questions

            # Generate draft answers for each question
            enhanced_questions = []
            for question_data in all_questions[:num_questions]:
                # Generate draft answer
                draft_answer = await self._generate_draft_answer(
                    question_data["question"],
                    slides,
                    question_data.get("context", {})
                )

                enhanced_question = {
                    **question_data,
                    "draft_answer": draft_answer,
                    "answer_confidence": self._calculate_answer_confidence(draft_answer, slides),
                    "slide_references": self._find_relevant_slides(question_data, slides),
                    "follow_up_questions": self._generate_follow_ups(
                        question_data["question"],
                        draft_answer,
                        slides
                    ),
                    "generated_at": datetime.utcnow()
                }
                enhanced_questions.append(enhanced_question)

            logger.info("Generated stage/sector questions successfully",
                       count=len(enhanced_questions))
            return enhanced_questions

        except Exception as e:
            logger.error("Error generating stage/sector questions", error=str(e))
            raise

    def _get_stage_specific_questions(self, stage: str, slides: List[Dict]) -> List[Dict[str, Any]]:
        """Get questions specific to the company's stage"""
        stage_questions = self.stage_specific_questions.get(stage, [])

        questions = []
        for template in stage_questions:
            customized = self._customize_question(template, slides)
            questions.append({
                "question": customized,
                "category": "stage_specific",
                "stage": stage,
                "template": template,
                "context": {"stage": stage, "type": "stage_specific"}
            })

        return questions

    def _get_sector_specific_questions(self, sector: str, slides: List[Dict]) -> List[Dict[str, Any]]:
        """Get questions specific to the company's sector"""
        sector_questions = self.sector_specific_questions.get(sector, [])

        questions = []
        for template in sector_questions:
            customized = self._customize_question(template, slides)
            questions.append({
                "question": customized,
                "category": "sector_specific",
                "sector": sector,
                "template": template,
                "context": {"sector": sector, "type": "sector_specific"}
            })

        return questions

    async def _generate_draft_answer(
        self,
        question: str,
        slides: List[Dict[str, Any]],
        context: Dict[str, Any]
    ) -> str:
        """Generate a draft answer using OpenAI with slide references"""
        try:
            # Find most relevant slides for this question
            relevant_slides = self._find_relevant_slides({"question": question}, slides)

            # Extract content from relevant slides
            context_content = ""
            slide_refs = []

            for slide_idx in relevant_slides:
                if 1 <= slide_idx <= len(slides):
                    slide = slides[slide_idx - 1]  # Convert to 0-indexed
                    slide_content = f"Slide {slide_idx}: {slide.get('title', '')}\n{slide.get('content', '')}"
                    context_content += slide_content + "\n\n"
                    slide_refs.append({
                        "slide_number": slide_idx,
                        "title": slide.get('title', ''),
                        "content_preview": slide.get('content', '')[:100] + "..."
                    })

            # Use OpenAI to generate answer if available
            if hasattr(self, 'openai_api_key') and self.openai_api_key:
                return await self._generate_openai_answer(question, context_content, context, slide_refs)

            # Fallback to rule-based answer generation
            return self._generate_rule_based_answer(question, context_content, context, slide_refs)

        except Exception as e:
            logger.error("Error generating draft answer", error=str(e))
            return "Based on the information provided in the deck, we [would need to provide specific details here]."

    async def _generate_openai_answer(
        self,
        question: str,
        context_content: str,
        context: Dict[str, Any],
        slide_refs: List[Dict]
    ) -> str:
        """Generate answer using OpenAI"""
        try:
            prompt = f"""
            You are an investor evaluating a pitch deck. Generate a compelling, investor-focused answer to this question based on the slide content provided.

            Question: {question}

            Slide Content:
            {context_content}

            Context: {context}

            Instructions:
            1. Provide a specific, data-driven answer
            2. Reference specific slides where relevant
            3. Be confident but realistic
            4. Highlight competitive advantages
            5. Include quantifiable metrics when available
            6. Keep it concise but comprehensive

            Answer:
            """

            response = await openai.ChatCompletion.acreate(
                model="gpt-4-turbo-preview",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=400,
                temperature=0.7
            )

            return response.choices[0].message.content.strip()

        except Exception as e:
            logger.error("Error with OpenAI answer generation", error=str(e))
            return self._generate_rule_based_answer(question, context_content, context, slide_refs)

    def _generate_rule_based_answer(
        self,
        question: str,
        context_content: str,
        context: Dict[str, Any],
        slide_refs: List[Dict]
    ) -> str:
        """Generate answer using rule-based approach"""
        question_lower = question.lower()

        # Extract key information from slides
        company_info = self._extract_company_info(slide_refs)

        # Generate answer based on question type
        if "market" in question_lower and "tam" in question_lower:
            return f"Our Total Addressable Market (TAM) is [specific number] based on [market research methodology]. As shown in Slide {slide_refs[0]['slide_number'] if slide_refs else 'X'}, we've identified [key market segments] representing [market size]."

        elif "competition" in question_lower or "differentiate" in question_lower:
            return f"We differentiate ourselves through [key differentiators] as outlined in Slide {slide_refs[0]['slide_number'] if slide_refs else 'X'}. Unlike competitors who [competitor weaknesses], we [company strengths]."

        elif "revenue" in question_lower or "financial" in question_lower:
            return f"Our current revenue stands at [specific metrics] with [growth rate] growth, as detailed in Slide {slide_refs[0]['slide_number'] if slide_refs else 'X'}. We project [future projections] based on [assumptions]."

        elif "team" in question_lower:
            return f"Our team consists of [key team members and expertise] as shown in Slide {slide_refs[0]['slide_number'] if slide_refs else 'X'}. With [years of experience] in [relevant field], we have the expertise to execute on our vision."

        else:
            return f"Based on our analysis presented in Slide {slide_refs[0]['slide_number'] if slide_refs else 'X'}, we [provide specific answer based on deck content]. Our approach focuses on [key strengths] to address [market need]."

    def _calculate_answer_confidence(self, answer: str, slides: List[Dict]) -> float:
        """Calculate confidence score for generated answer"""
        # Simple heuristic based on specificity and slide references
        confidence = 0.5  # Base confidence

        # Increase confidence if answer contains specific numbers or metrics
        if re.search(r'\d+', answer):
            confidence += 0.2

        # Increase confidence if answer references specific slides
        if "Slide" in answer:
            confidence += 0.2

        # Increase confidence if answer contains company-specific information
        company_keywords = ["we", "our", "company"]
        if any(keyword in answer.lower() for keyword in company_keywords):
            confidence += 0.1

        return min(1.0, confidence)

    def _find_relevant_slides(self, question_data: Dict, slides: List[Dict]) -> List[int]:
        """Enhanced slide finding with better relevance scoring"""
        question_text = question_data.get("question", "").lower()
        keywords = self._extract_keywords(question_text)

        slide_scores = []
        for i, slide in enumerate(slides):
            slide_text = (slide.get("title", "") + " " + slide.get("content", "")).lower()
            score = sum(1 for keyword in keywords if keyword in slide_text)
            if score > 0:
                slide_scores.append((i + 1, score))  # 1-indexed

        # Sort by relevance score
        slide_scores.sort(key=lambda x: x[1], reverse=True)
        return [slide_num for slide_num, score in slide_scores[:3]]

    def _generate_follow_ups(
        self,
        question: str,
        answer: str,
        slides: List[Dict]
    ) -> List[str]:
        """Generate follow-up questions based on the answer"""
        follow_ups = []

        question_lower = question.lower()
        answer_lower = answer.lower()

        # Generate contextual follow-ups
        if "market" in question_lower and "tam" in question_lower:
            follow_ups.extend([
                "How do you plan to capture market share?",
                "What are your key market expansion strategies?"
            ])

        elif "competition" in question_lower:
            follow_ups.extend([
                "How sustainable is your competitive advantage?",
                "What barriers to entry protect your market position?"
            ])

        elif "revenue" in question_lower:
            follow_ups.extend([
                "What are your customer acquisition costs?",
                "How do you plan to scale revenue growth?"
            ])

        # Return top 2 most relevant follow-ups
        return follow_ups[:2]

    def _extract_company_info(self, slide_refs: List[Dict]) -> Dict[str, str]:
        """Extract company information from slide references"""
        company_info = {}

        for ref in slide_refs:
            content = ref.get("content_preview", "").lower()
            title = ref.get("title", "").lower()

            # Look for company name patterns
            if "company" in title or "about" in title:
                # Try to extract company name from content
                lines = content.split('\n')
                for line in lines:
                    if len(line.strip()) > 0 and len(line.strip()) < 50:
                        company_info["company_name"] = line.strip().title()
                        break

        return company_info
