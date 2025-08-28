# AI Investor Pitch Advisor — Delivery Plan (v0.1)
_Date: 2025-08-28 • Owner: PM/Tech Lead • Status: Draft_

## 0) One-liner
**“Upload your pitch deck and get instant AI-driven feedback on clarity, design, investor focus—plus tailored Q&A prep for meetings.”**

## 1) Goals & Non-Goals (V1)
**Goals**
- End-to-end pipeline from deck ingest → parse (slides, notes, OCR) → analysis scores → suggestions → Q&A prep → exports (annotated PDF/DOCX & JSON).
- Slide-by-slide scoring across clarity, design, storytelling, investor-fit; deck-level radar and trend views.
- Actionable suggestions (headline rewrites, structure fixes, visual guidance) tied to slide references.
- Q&A generator with model answers linked to slide content and confidence flags.
- Secure tenancy (RLS), per-deck encryption, and complete audit/traceability.

**Non-Goals**
- Replacing professional advisors, legal/financial due diligence.
- Live presentation tooling or meeting scheduling.
- Automatic sending/sharing outside signed links.

## 2) Scope
**In-scope**
- Upload PPTX/PDF/Google Slides (link import); OCR fallback; image & text extraction; speaker notes.
- Storyline validation vs startup norms (problem/solution/traction/market/team/financials/ask).
- Readability/design checks (density, contrast, font/color consistency).
- Score model (1–10 per dimension) + investor-fit by stage (seed–B).
- Suggestions: headline rewrites, reorder/merge recommendations, evidence gaps, visual improvements.
- Q&A prep kit by stage/sector with confidence and slide citations.
- Exports: annotated PDF/DOCX, Q&A handbook, JSON bundle.

**Out-of-scope**
- Full-blown design editor; we provide content rewrites and guidance, not slide layouting.
- Fundraising CRM or investor matchmaking.

## 3) Workstreams & Success Criteria
1. **Ingest & Parsing** — ✅ Robust deck intake incl. OCR; accurate slide text/notes/images.
2. **Analysis & Scoring** — ✅ Reliable storyline/clarity/design/investor-fit scores; explainability (“why”).
3. **Suggestions & Q&A** — ✅ High-utility rewrites and Q&A with citations + confidence flags.
4. **Exports & Viewer** — ✅ Side-by-side annotated viewer; polished annotated PDFs & Q&A handbooks.
5. **Security & SRE** — ✅ RLS, encryption, audit logs; OTel traces/dashboards; SLOs met.

## 4) Milestones (~8–10 weeks)
- **Weeks 1–2**: Infra & schema; upload pipeline; PPTX/PDF parse + OCR fallback.
- **Weeks 3–4**: NLP structure detection; scoring models; analysis dashboard.
- **Weeks 5–6**: Suggestions generator; Q&A generator; viewer with annotations.
- **Weeks 7–8**: Exporters (PDF/DOCX/JSON); governance (versioning, comments); security hardening.
- **Weeks 9–10**: Performance tuning; E2E tests; beta pilot and polish.

## 5) Deliverables
- OpenAPI 3.1 spec + TypeScript SDK; Postman collection.
- Sample decks + golden expectations for parser & scorer.
- Annotated report & Q&A handbook templates.
- Playwright E2E + integration tests; SRE dashboards & runbooks.

## 6) Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| OCR quality on image-only slides | Medium | Use high-accuracy OCR; language hints; manual edit mode in viewer |
| False positives in design critique | Medium | Calibrate checks; allow overrides; confidence display |
| Hallucinated suggestions or Q&A | High | Evidence-first prompts; require slide refs or flag “needs info”; red-team tests |
| Sensitive data exposure | High | Per-deck encryption keys; strict RLS; signed URLs; audit logs |
| Export font/brand issues | Medium | Deterministic fonts; brand-safe templates; preflight validation |

## 7) Acceptance Criteria (V1)
- Deck parse (20-slide PDF) **< 10 s p95**; slide analysis **< 3 s p95** each.
- Full deck annotated report export **< 30 s p95**.
- Q&A coverage: **≥ 85%** of benchmark investor questions anticipated for stage.
- Post-suggestion clarity score improvement on test set **≥ 20%**.
- All answers/suggestions include slide references or are flagged as “needs extra info”.

## 8) Rollout
- Private pilot with 2 accelerators and 1 venture studio.
- Beta feature flags for Google Slides import and multi-language OCR.
- GA with SOC-style security summary, export templates, and documentation.