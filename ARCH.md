# AI Investor Pitch Advisor — Architecture (V1)

## 1) System Overview
**Frontend/BFF:** Next.js 14 (Vercel) — SSR for deck viewer; ISR for shared reports; Server Actions for signed uploads.  
**API Gateway:** NestJS (Node 20) — REST **/v1** with OpenAPI 3.1, Zod validation, Problem+JSON, RBAC (Casbin), RLS, Idempotency‑Key + Request‑ID.  
**Workers (Python 3.11 + FastAPI):**
- **parse-worker** (PPTX/PDF/Slides ingestion; images + text; OCR fallback)
- **nlp-worker** (structure detection: roles, KPI extraction; notes handling)
- **analysis-worker** (clarity/design/storytelling/investor-fit scoring; explanations)
- **suggestion-worker** (headline rewrites, structure/visual tips; per‑slide citations)
- **qa-worker** (stage/sector Q&A generation; slide‑linked answers + confidence)
- **export-worker** (annotated PDFs/DOCX, Q&A handbooks, JSON bundles)

**Event Bus/Queues:** NATS subjects (`deck.ingest`, `deck.analyze`, `suggest.make`, `qa.generate`, `export.make`) + Redis Streams DLQ; Celery/RQ orchestration.  
**Datastores:** Postgres 16 (projects/decks/slides/analysis/suggestions/qa/exports), S3/R2 (deck files, rendered reports), Redis (cache/session).  
**Observability:** OpenTelemetry (traces/metrics/logs) + Prometheus/Grafana; Sentry errors.  
**Security:** TLS/HSTS/CSP; KMS‑wrapped secrets; per‑deck encryption keys; signed URLs; Postgres RLS; audit logs.

## 2) Data Model (summary)
- **Projects/Decks:** projects (org‑scoped), decks (filetype, s3_key, status).  
- **Slides:** slides (slide_num, title, content, notes, image_s3).  
- **Analysis:** analysis (per‑slide scores + comments, meta features).  
- **Suggestions:** suggestions (slide_id, suggestion text, category, priority).  
- **Q&A:** qa_sessions (per deck), qa_pairs (question, answer, confidence, category, slide_refs[]).  
- **Exports:** exports (kind, s3_key, created_at).  
- **Audit:** audit_log.

**Invariants**
- RLS by project_id.  
- Every suggestion links to a slide.  
- Every Q&A answer must cite ≥1 slide or be flagged “needs extra info”.  
- Exports embed slide IDs and analysis version for traceability.

## 3) Key Flows

### 3.1 Ingest & Parse
1. Upload deck (PPTX/PDF/Slides) → **parse-worker** extracts slide images, text, speaker notes; OCR for image-only slides.  
2. Persist slides; compute basic features (word counts, density, contrast heuristics).

### 3.2 Analyze & Score
1. **nlp-worker** classifies slide roles (problem/solution/traction/market/team/financials/ask) and extracts KPIs (TAM/SAM/SOM, revenue, traction).  
2. **analysis-worker** computes per‑dimension scores (clarity, design, storytelling, investor‑fit) with why‑picked signals; store results.

### 3.3 Suggest & Prepare Q&A
1. **suggestion-worker** generates actionable rewrites & structure/visual guidance; ties each to slide_id with rationale and priority.  
2. **qa-worker** produces investor Q&A by stage/sector; each answer cites slide_refs and carries a confidence band; flag gaps.

### 3.4 Export & Share
1. **export-worker** composes annotated PDFs/DOCX (callouts over slide images), Q&A handbook, and JSON bundle; returns signed URLs.  
2. Versioned exports logged; annotations preserve slide coordinates and references.

## 4) API Surface (/v1)
- **Projects/Decks:** `POST /projects`, `POST /decks/upload`, `GET /decks/:id/slides`.  
- **Analysis & Suggestions:** `POST /analysis/run {deck_id}`, `GET /analysis/:deck_id`, `POST /suggestions/run {deck_id}`.  
- **Q&A:** `POST /qa/generate {deck_id, stage}`, `GET /qa/:session_id`.  
- **Exports:** `POST /exports/report {deck_id, format}`, `POST /exports/annotated {deck_id}`.

**Conventions:** Idempotency‑Key; cursor pagination; Problem+JSON; SSE for long-running analyses/Q&A generation.

## 5) Observability & SLOs
- **Spans:** deck.parse, slide.analyze, suggest.make, qa.generate, export.make.  
- **Targets:** Deck parse (20 slides) < 10 s p95; slide analysis < 3 s p95; report export < 30 s p95.  
- **Metrics:** parser accuracy, suggestion acceptance %, Q&A relevance/citation rate, export p95; alerting via Sentry.

## 6) Security & Governance
- Tenant isolation with RLS; RBAC via Casbin.  
- Per-deck encryption keys; signed URLs (short TTL); KMS‑wrapped secrets.  
- Audit trail of access/exports; DSR/export/delete endpoints.  
- Confidentiality banner and opt‑out for model retention; no sharing outside workspace.

## 7) Performance & Scaling
- Cache OCR & embeddings; reuse across suggestions and Q&A.  
- Incremental exports (only changed slides re-rendered).  
- Worker autoscaling based on queue depth; DLQ with retries/backoff.  
- CDN for exported artifacts; chunked uploads.

## 8) Accessibility & i18n
- Keyboard navigation in DeckViewer; SR labels for annotation callouts and Q&A cards.  
- Multi-language OCR/analysis where available; localized reports (EN first, i18n-ready).