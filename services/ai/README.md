# Seerah — AI service

FastAPI service that wraps OpenAI for resume enhancement, generation, analysis, smart-fill from PDF/image, skill suggestions, job tailoring, and streaming chat.

## Endpoints

| Method | Path                   | Purpose                                                 |
| ------ | ---------------------- | ------------------------------------------------------- |
| GET    | `/health`              | Liveness + config probe                                 |
| POST   | `/ai/enhance-text`     | Rewrite a single field bilingually (AR + EN)            |
| POST   | `/ai/generate-section` | Convert casual prose into structured section items      |
| POST   | `/ai/analyze-resume`   | Score a resume + actionable improvements + ATS score    |
| POST   | `/ai/smart-fill`       | Extract structured data from a PDF or image (vision)    |
| POST   | `/ai/suggest-skills`   | Recommend skills based on job title + experience        |
| POST   | `/ai/improve-for-job`  | Tailor bio + surface keyword gaps for a job description |
| POST   | `/ai/chat`             | Streaming SSE chat with resume context                  |

All `/ai/*` endpoints require an `Authorization: Bearer <AI_SERVICE_INTERNAL_TOKEN>` header. The frontend (Next.js server actions) is the sole intended caller; user auth happens there before requests reach this service.

## Rate limiting

Per-user sliding window backed by Upstash Redis (REST). Limits:

- Free plan: **10 requests / 24h**
- Prime / enterprise: **100 requests / 24h**

When the quota is exhausted, endpoints return `429` with a bilingual message and `upgrade_required: true` for free users. All 2xx responses include `X-RateLimit-{Limit,Remaining,Reset}` headers.

If `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are unset, the limiter is permissive (development mode).

## Configuration

Copy the root `.env.example` to `services/ai/.env` and fill in:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
AI_SERVICE_INTERNAL_TOKEN=<long-random-string>
SENTRY_DSN=
```

`AI_SERVICE_INTERNAL_TOKEN` should match the token configured in `apps/web` so server actions can authenticate to this service.

## Running locally

```bash
cd services/ai
python3.12 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn seerah_ai.main:app --reload --port 8001
```

OpenAPI docs: http://localhost:8001/docs

## Tests

```bash
pytest -q          # 18 tests, no network calls
ruff check .       # lint
```

The test suite stubs OpenAI and Upstash entirely; no API keys are needed.

## Smart-fill and LinkedIn

We accept `pdf` and `image` file types. `linkedin_url` is rejected with a `400` and a bilingual message asking the user to export their LinkedIn profile via "More → Save to PDF" and upload the file. Direct LinkedIn scraping is forbidden by their ToS and aggressively rate-limited; we do not attempt it.
