# API Documentation

Comprehensive API documentation for the AI Investor Pitch Advisor platform.

## Table of Contents
- [Authentication](#authentication)
- [Deck Management](#deck-management)
- [Analysis](#analysis)
- [Q&A Sessions](#qa-sessions)
- [Suggestions](#suggestions)
- [Export](#export)
- [WebSocket/SSE](#websocket-sse)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Authentication

All API endpoints require JWT authentication.

```http
Authorization: Bearer <your-jwt-token>
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

### Refresh Token
```http
POST /api/auth/refresh
Authorization: Bearer <refresh-token>
```

## Deck Management

### Upload Deck
Upload a pitch deck file (PPTX, PDF supported).

```http
POST /api/deck/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

Form Data:
- file: <pitch_deck_file>
```

Response:
```json
{
  "id": "deck-123",
  "name": "My Startup Pitch Deck.pptx",
  "fileSize": 2048576,
  "status": "pending",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Get Deck
Retrieve deck details and metadata.

```http
GET /api/deck/:id
Authorization: Bearer <token>
```

Response:
```json
{
  "id": "deck-123",
  "name": "My Startup Pitch Deck.pptx",
  "fileSize": 2048576,
  "status": "completed",
  "slides": [
    {
      "id": "slide-1",
      "title": "Company Overview",
      "content": "TechFlow is a B2B SaaS platform...",
      "slideOrder": 1
    }
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

### List Decks
Get all decks for the authenticated user.

```http
GET /api/deck
Authorization: Bearer <token>
```

Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status (pending, processing, completed, failed)

Response:
```json
{
  "data": [
    {
      "id": "deck-123",
      "name": "My Startup Pitch Deck.pptx",
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

## Analysis

### Run Analysis
Start analysis on an uploaded deck.

```http
POST /api/analysis/run
Content-Type: application/json
Authorization: Bearer <token>

{
  "deckId": "deck-123"
}
```

Response:
```json
{
  "analysisId": "analysis-456",
  "status": "processing",
  "estimatedDuration": 45
}
```

### Get Analysis Results
Retrieve analysis results for a deck.

```http
GET /api/analysis/:deckId
Authorization: Bearer <token>
```

Response:
```json
{
  "id": "analysis-456",
  "deckId": "deck-123",
  "status": "completed",
  "scores": {
    "clarity": 8.5,
    "design": 7.2,
    "storytelling": 9.1,
    "investorFit": 8.8
  },
  "explanations": {
    "clarity": "Clear value proposition with specific metrics...",
    "design": "Professional layout with good visual hierarchy...",
    "storytelling": "Compelling narrative that builds tension...",
    "investorFit": "Addresses key investor concerns about scalability..."
  },
  "slideAnalysis": [
    {
      "slideId": "slide-1",
      "role": "problem",
      "kpis": [],
      "score": 8.7
    }
  ],
  "createdAt": "2024-01-15T10:35:00Z"
}
```

### Stream Analysis Progress
Real-time progress updates via Server-Sent Events.

```http
GET /api/analysis/:deckId/stream
Authorization: Bearer <token>
Accept: text/event-stream
```

Stream Events:
```json
{
  "event": "progress",
  "data": {
    "stage": "parsing",
    "progress": 25,
    "message": "Extracting slides..."
  }
}

{
  "event": "progress",
  "data": {
    "stage": "analysis",
    "progress": 75,
    "message": "Analyzing storytelling..."
  }
}

{
  "event": "complete",
  "data": {
    "analysisId": "analysis-456",
    "scores": { "clarity": 8.5, "design": 7.2, "storytelling": 9.1, "investorFit": 8.8 }
  }
}
```

## Q&A Sessions

### Create Q&A Session
Generate investor questions for a deck.

```http
POST /api/qa/sessions
Content-Type: application/json
Authorization: Bearer <token>

{
  "deckId": "deck-123",
  "name": "Series A Q&A Prep",
  "sector": "Technology",
  "stage": "Series A",
  "numQuestions": 20
}
```

Response:
```json
{
  "id": "qa-session-789",
  "name": "Series A Q&A Prep",
  "deckId": "deck-123",
  "sector": "Technology",
  "stage": "Series A",
  "status": "completed",
  "questionCount": 20,
  "questions": [
    {
      "id": "question-1",
      "question": "What is your total addressable market and how did you calculate it?",
      "category": "market",
      "confidence": 0.9,
      "slideRefs": [2, 3],
      "needsExtraInfo": false
    }
  ],
  "createdAt": "2024-01-15T11:00:00Z"
}
```

### Create Enhanced Q&A Session
Generate questions with AI-powered draft answers.

```http
POST /api/qa/sessions/enhanced
Content-Type: application/json
Authorization: Bearer <token>

{
  "deckId": "deck-123",
  "name": "Enhanced Q&A with Draft Answers",
  "sector": "Technology",
  "stage": "Series A",
  "numQuestions": 15
}
```

Response:
```json
{
  "id": "qa-session-790",
  "name": "Enhanced Q&A with Draft Answers",
  "questions": [
    {
      "id": "question-1",
      "question": "What is your competitive advantage?",
      "category": "competition",
      "confidence": 0.85,
      "slideRefs": [6],
      "draftAnswer": "Our competitive advantage lies in our AI-powered automation that reduces implementation time by 60% compared to traditional solutions...",
      "answerConfidence": 0.8,
      "followUpQuestions": [
        "How sustainable is this advantage?",
        "What barriers protect this advantage?"
      ]
    }
  ]
}
```

### Get Q&A Session
Retrieve Q&A session details.

```http
GET /api/qa/sessions/:sessionId
Authorization: Bearer <token>
```

### Add Answer
Add or update an answer to a question.

```http
PUT /api/qa/questions/:questionId/answer
Content-Type: application/json
Authorization: Bearer <token>

{
  "answer": "Our TAM is $25 billion based on market research from Gartner..."
}
```

Response:
```json
{
  "id": "question-1",
  "question": "What is your total addressable market?",
  "answer": "Our TAM is $25 billion based on market research from Gartner...",
  "answeredAt": "2024-01-15T11:30:00Z"
}
```

### Stream Q&A Progress
Real-time progress updates for Q&A generation.

```http
GET /api/qa/sessions/:sessionId/stream
Authorization: Bearer <token>
Accept: text/event-stream
```

## Suggestions

### Generate Suggestions
Create suggestions for improving a deck.

```http
POST /api/suggestion/run
Content-Type: application/json
Authorization: Bearer <token>

{
  "deckId": "deck-123",
  "slideIds": ["slide-1", "slide-2"],
  "suggestionTypes": ["headline_rewrite", "structure_fix", "design_tip"]
}
```

Response:
```json
{
  "runId": "suggestion-run-101",
  "status": "processing",
  "estimatedDuration": 30
}
```

### Get Suggestion Run
Check status and get results of a suggestion run.

```http
GET /api/suggestion/run/:runId
Authorization: Bearer <token>
```

Response:
```json
{
  "id": "suggestion-run-101",
  "status": "completed",
  "suggestionsGenerated": 12,
  "suggestions": [
    {
      "id": "suggestion-1",
      "suggestionType": "headline_rewrite",
      "title": "Improve Slide Headline",
      "description": "Consider using: 'Revolutionary AI-Powered Workflow Automation'",
      "rationale": "More specific and benefit-focused language improves investor engagement",
      "beforeText": "Our Solution",
      "afterText": "Revolutionary AI-Powered Workflow Automation",
      "confidence": 0.9,
      "category": "content",
      "status": "pending"
    }
  ]
}
```

### Update Suggestion
Accept, reject, or apply a suggestion.

```http
PUT /api/suggestion/:suggestionId
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "accepted",
  "feedback": "Great suggestion, will implement"
}
```

### Get Suggestions by Deck
Get all suggestions for a specific deck.

```http
GET /api/suggestion/deck/:deckId
Authorization: Bearer <token>
```

### Stream Suggestion Progress
Real-time updates for suggestion generation.

```http
GET /api/suggestion/run/:runId/stream
Authorization: Bearer <token>
Accept: text/event-stream
```

## Export

### Generate Export
Create an export in the specified format.

```http
POST /api/export/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "deckId": "deck-123",
  "format": "pdf",
  "type": "comprehensive_report",
  "includeAnalysis": true,
  "includeQA": true,
  "qaSessionId": "qa-session-789"
}
```

Response:
```json
{
  "id": "export-202",
  "status": "completed",
  "downloadUrl": "https://cdn.example.com/exports/export-202.pdf",
  "fileSize": 2048576,
  "expiresAt": "2024-01-16T10:30:00Z"
}
```

### Generate Export Async
Start asynchronous export generation.

```http
POST /api/export/generate/async
Content-Type: application/json
Authorization: Bearer <token>

{
  "deckId": "deck-123",
  "format": "pptx",
  "type": "analysis_report"
}
```

Response:
```json
{
  "exportId": "export-203",
  "status": "processing"
}
```

### Get Export Details
Check export status and get download URL.

```http
GET /api/export/:exportId
Authorization: Bearer <token>
```

### Stream Export Progress
Real-time progress updates for export generation.

```http
GET /api/export/:exportId/stream
Authorization: Bearer <token>
Accept: text/event-stream
```

## WebSocket/SSE

### Server-Sent Events (SSE)
All long-running operations support real-time progress updates via SSE:

```javascript
const eventSource = new EventSource('/api/analysis/deck-123/stream', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Progress:', data.progress, data.message);
};

eventSource.addEventListener('complete', (event) => {
  const result = JSON.parse(event.data);
  console.log('Completed:', result);
});
```

### Progress Event Structure
```json
{
  "stage": "analysis",
  "progress": 75,
  "message": "Analyzing storytelling...",
  "estimatedTimeRemaining": 15
}
```

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": {
      "field": "deckId",
      "reason": "Deck not found"
    }
  },
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req-12345"
}
```

### Common Error Codes
- `VALIDATION_ERROR`: Invalid input parameters
- `AUTHENTICATION_ERROR`: Invalid or missing authentication
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `RESOURCE_CONFLICT`: Resource already exists or conflict
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `INTERNAL_ERROR`: Unexpected server error

## Rate Limiting

### Rate Limits by Endpoint
- **Deck Upload**: 10 requests per hour per user
- **Analysis**: 20 requests per hour per user
- **Q&A Generation**: 15 requests per hour per user
- **Suggestions**: 25 requests per hour per user
- **Export**: 30 requests per hour per user

### Rate Limit Headers
```http
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1642156800
X-RateLimit-Retry-After: 3600
```

### Rate Limit Exceeded Response
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "limit": 20,
      "remaining": 0,
      "reset": 1642156800
    }
  }
}
```

## Pagination

### Standard Pagination
```http
GET /api/deck?page=2&limit=10
```

Response:
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 10,
    "total": 25,
    "pages": 3,
    "hasNext": true,
    "hasPrev": true
  }
}
```

## Data Formats

### Date/Time Format
All timestamps use ISO 8601 format:
```json
"createdAt": "2024-01-15T10:30:00.000Z"
```

### File Size Format
File sizes in bytes:
```json
"fileSize": 2048576
```

### Confidence Scores
0.0 to 1.0 scale:
```json
"confidence": 0.85
```

## SDKs and Examples

### JavaScript/TypeScript Client
```javascript
import { PitchAdvisorAPI } from '@pitch-advisor/sdk';

const client = new PitchAdvisorAPI({
  baseURL: 'https://api.pitchadvisor.com',
  apiKey: 'your-api-key'
});

// Upload deck
const deck = await client.decks.upload(file);

// Run analysis
const analysis = await client.analysis.run(deck.id);

// Generate Q&A
const qaSession = await client.qa.createSession({
  deckId: deck.id,
  sector: 'Technology',
  stage: 'Series A'
});
```

### Python Client
```python
from pitch_advisor import PitchAdvisorAPI

client = PitchAdvisorAPI(
    base_url='https://api.pitchadvisor.com',
    api_key='your-api-key'
)

# Upload and analyze deck
deck = client.decks.upload('pitch_deck.pptx')
analysis = client.analysis.run(deck['id'])

# Generate Q&A with draft answers
qa_session = client.qa.create_enhanced_session(
    deck_id=deck['id'],
    sector='Technology',
    stage='Series A'
)
```

This API documentation covers all major endpoints and features. For the latest updates, please refer to the OpenAPI/Swagger documentation available at `/api/docs` when running the application.
