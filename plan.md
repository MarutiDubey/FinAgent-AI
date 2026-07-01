# Plan: Production-Level Feature Upgrade for FinAgentAI

## Context

FinAgentAI is a polished portfolio/demo project: a LangGraph 3-agent stock analyzer (FastAPI + React/Vite) with a beautiful animated UI. Today it is **stateless** — one `GET /api/analyze` endpoint, no accounts, no persistence, no streaming, single-stock only. The UI looks production-grade but the backend is minimal.

The goal is to make it **stronger and more impressive as a portfolio piece** with three standout AI features plus real accounts (chosen as a one-time effort):

1. **Live streaming analysis** — stream each agent's output as it runs (SSE), so visitors watch the agents "think" in real time instead of staring at a spinner.
2. **Stock comparison** — analyze 2–3 tickers side-by-side and get an AI verdict on the stronger buy.
3. **AI chat follow-up** — a chat box to ask questions about an analyzed stock ("why is RSI high?", "is it overvalued?").
4. **Full-stack accounts** — signup/login, with watchlist + saved analyses persisted server-side (replacing localStorage-only state).

Constraint: keep infra **free-tier friendly** (Render backend + Vercel frontend). So accounts use **SQLite + SQLAlchemy + JWT** — no external DB/Redis/auth service required.

This plan also folds in a few low-cost production hardening wins that naturally come along: env-based API URL (remove hardcoded backend URL), pinned Python deps, and restricted CORS.

---

## Architecture Overview

```
Frontend (React/Vite)                 Backend (FastAPI)
─────────────────────                 ─────────────────────────────
api.js (central client) ───────────►  /api/auth/*      (JWT signup/login/me)
  reads VITE_API_BASE                  /api/analyze     (existing, unchanged)
                                       /api/analyze/stream  (SSE — NEW)
AuthContext (JWT in localStorage)      /api/compare     (multi-ticker — NEW)
  ├─ Login / Signup modal              /api/chat        (follow-up Q&A — NEW)
  ├─ ComparePage (2–3 tickers)         /api/watchlist   (CRUD, auth — NEW)
  ├─ ChatPanel (per-analysis)          /api/history     (saved analyses — NEW)
  └─ streaming dashboard
                                       SQLite via SQLAlchemy
                                         User, WatchlistItem, SavedAnalysis
```

Existing `agent.py` graph and `/api/analyze` stay working as-is (backward compatible). New features are additive.

---

## Backend Changes (`backend/`)

### New file layout
- `db.py` — SQLAlchemy engine (SQLite file `finagent.db`), `SessionLocal`, `Base`, `get_db()` dependency.
- `models.py` — `User` (id, email, hashed_password, created_at), `WatchlistItem` (id, user_id, ticker), `SavedAnalysis` (id, user_id, ticker, payload JSON, created_at).
- `auth.py` — password hashing (`passlib[bcrypt]`), JWT create/decode (`python-jose`), `get_current_user` dependency reading the `Authorization: Bearer` header. Secret from `JWT_SECRET` env.
- `routers/` — split endpoints: `auth.py`, `analyze.py` (existing + streaming), `compare.py`, `chat.py`, `user_data.py` (watchlist + history). Keep it simple; routers optional if `main.py` stays readable.

### `agent.py` — reuse existing functions, add helpers
- Keep `technical_analyst`, `sentiment_analyst`, `portfolio_manager`, `build_graph` unchanged.
- Add `run_agents_streaming(ticker)` — a generator that runs the three nodes sequentially and `yield`s a dict per stage (`{stage, status, data}`) so the route can emit SSE events. Reuses the same three functions; just calls them step-by-step instead of via `graph.invoke`.
- Add `compare_stocks(tickers)` — runs `technical_analyst` (+ light info) for each ticker, then one LLM call that ranks them and picks the stronger buy. Reuses `_format_large`, `_safe_float`, the LLM-init pattern at agent.py:175-177.
- Add `answer_question(ticker, context, question, history)` — single LLM call grounded in a previously-computed analysis payload (technical + sentiment + recommendation text passed as context). Reuses the OpenRouter/Claude LLM-init pattern.

### Streaming endpoint — `GET /api/analyze/stream?ticker=`
- Returns `StreamingResponse(media_type="text/event-stream")`.
- Emits SSE `data:` JSON frames: `{stage:"technical", status:"running"}` → `{stage:"technical", status:"done", data:{info, history, technical_analysis}}` → same for sentiment → manager → final `{stage:"complete"}`.
- Frontend `EventSource` consumes and fills the dashboard progressively.

### Other endpoints
- `POST /api/auth/signup`, `POST /api/auth/login` → `{access_token}`; `GET /api/auth/me`.
- `POST /api/compare` body `{tickers: [...]}` → per-ticker metrics + AI ranking verdict.
- `POST /api/chat` body `{ticker, context, question, history}` → `{answer}`. (Stateless re: auth — works for guests too.)
- `GET/POST/DELETE /api/watchlist` and `GET/POST /api/history` → require `get_current_user`, persist to SQLite.

### Config / hardening
- `requirements.txt`: pin versions and add `sqlalchemy`, `passlib[bcrypt]`, `python-jose[cryptography]`, `pydantic[email]`. (Pin existing too via the versions Render currently resolves.)
- `main.py`: replace `allow_origins=["*"]` with env `ALLOWED_ORIGINS` (comma-split), defaulting to localhost + the Vercel domain. Call `Base.metadata.create_all()` on startup.
- `.env.example`: add `JWT_SECRET`, `ALLOWED_ORIGINS`, optional `ANTHROPIC_API_KEY` (see model note).
- `.gitignore`: add `backend/finagent.db`.

### Optional model upgrade (low-effort, flagged)
The chosen direction is "portfolio-impressive," not explicitly the Claude swap. Keep GPT-4o-mini via OpenRouter as the default to avoid touching the working LLM path. The LLM-init is centralized enough that swapping to Claude later is a one-function change — note this in the README, don't do it now unless asked.

---

## Frontend Changes (`frontend/src/`)

### New infra
- `lib/api.js` — central fetch wrapper reading `import.meta.env.VITE_API_BASE` (fallback to the current Render URL). Attaches JWT `Authorization` header when present. **Removes the hardcoded URL from `App.jsx:111`.**
- `context/AuthContext.jsx` — holds `user`, `token` (localStorage `finagent_token`), `login/signup/logout`. Wrap `<App/>` in `main.jsx`.
- `.env.example` / `.env` — `VITE_API_BASE=http://localhost:8000`.

### New components
- `components/AuthModal.jsx` (+ css) — glass-card login/signup modal matching the About panel style. Triggered from a new Navbar "Sign in" button.
- `components/ChatPanel.jsx` (+ css) — collapsible chat dock on the dashboard (right column, under the report). Sends `{ticker, context, question}` to `/api/chat`; context = the current `data.technical_analysis + sentiment_analysis + recommendation`. Streamed or plain — plain is fine for v1.
- `components/ComparePage.jsx` (+ css) — a new view (`view === 'compare'`): 2–3 ticker inputs, calls `/api/compare`, renders a side-by-side metric table + AI verdict card. Reuses `MetricCard`, `ConfidenceBar`, `renderMarkdown`.
- Streaming: extend `fetchAnalysis` (or add `fetchAnalysisStream`) to use `EventSource` against `/api/analyze/stream`, updating the agent stepper (`LOADING_STEPS`, App.jsx:407-415) and progressively setting `data` as each stage's `done` frame arrives. Keep the existing non-streaming `fetchAnalysis` as fallback.

### Wiring
- `Navbar.jsx`: add "Compare" nav link (→ `view='compare'`) and a "Sign in / account" button (opens AuthModal / shows email when logged in). Reuse existing nav-link styles.
- `SidePanel.jsx`: when logged in, sync watchlist/history with `/api/watchlist` + `/api/history` instead of localStorage; fall back to localStorage for guests. Keep existing localStorage keys for guest mode.
- `App.jsx`: add `view` value `'compare'`, render `ComparePage`; mount `ChatPanel` in the dashboard right column (App.jsx:566-587 area).

---

## Implementation Order (incremental, each step verifiable)

1. **Backend foundation**: pin/extend `requirements.txt`, add `db.py` + `models.py`, env-based CORS, `create_all` on startup. Verify server boots + `/health`.
2. **Auth**: `auth.py` + signup/login/me. Verify with curl (signup → token → /me).
3. **Frontend api client + AuthContext + AuthModal**: remove hardcoded URL, wire login. Verify login flow in browser.
4. **Streaming**: `/api/analyze/stream` + `run_agents_streaming`, frontend `EventSource`. Verify agents fill in progressively.
5. **Compare**: `/api/compare` + `compare_stocks` + `ComparePage`. Verify 2–3 tickers ranked.
6. **Chat**: `/api/chat` + `answer_question` + `ChatPanel`. Verify follow-up Q&A grounded in analysis.
7. **Persisted watchlist/history**: `/api/watchlist` + `/api/history` + SidePanel sync. Verify saved across reload when logged in.
8. **Docs**: update README with new features, env vars, and the optional Claude-swap note.

Steps 4–7 are independent and can ship one at a time. If scope needs trimming, the highest-wow / lowest-risk subset is **streaming (4) + compare (5) + chat (6)**; accounts (1–3, 7) are the larger lift but were explicitly requested.

---

## Files to Create / Modify

**Backend — create:** `db.py`, `models.py`, `auth.py` (+ optional `routers/*.py`)
**Backend — modify:** `main.py`, `agent.py`, `requirements.txt`, `.env.example`, `../.gitignore`

**Frontend — create:** `lib/api.js`, `context/AuthContext.jsx`, `components/AuthModal.jsx`, `components/ChatPanel.jsx`, `components/ComparePage.jsx` (+ matching `.css`), `.env.example`
**Frontend — modify:** `main.jsx`, `App.jsx`, `components/Navbar.jsx`, `components/SidePanel.jsx`

---

## Verification

- **Backend local**: `cd backend && pip install -r requirements.txt && python main.py`.
  - `curl localhost:8000/health`
  - `curl -X POST localhost:8000/api/auth/signup -d '{"email":"a@b.com","password":"pw123456"}' -H 'Content-Type: application/json'` → token
  - `curl "localhost:8000/api/analyze/stream?ticker=AAPL"` → see streamed SSE frames
  - `curl -X POST localhost:8000/api/compare -d '{"tickers":["AAPL","MSFT"]}' -H 'Content-Type: application/json'`
  - `curl -X POST localhost:8000/api/chat -d '{"ticker":"AAPL","context":"...","question":"is it overvalued?"}' -H 'Content-Type: application/json'`
- **Frontend local**: `cd frontend && npm run dev` with `VITE_API_BASE=http://localhost:8000`.
  - Run an analysis → agents fill in progressively (streaming).
  - Open Compare → enter AAPL + MSFT → verdict renders.
  - Ask a chat question on a result → grounded answer.
  - Sign up → add to watchlist → reload → watchlist persists.
- **Build check**: `npm run build` succeeds (no missing imports / env errors).
- **Deploy notes**: set `VITE_API_BASE` in Vercel, `JWT_SECRET` + `ALLOWED_ORIGINS` in Render. (SQLite on Render free tier resets on redeploy — acceptable for a portfolio demo; note this, and Postgres is a drop-in later via the same SQLAlchemy models.)

---

## Notes / Trade-offs

- **SQLite on Render free tier is ephemeral** (wiped on each deploy/restart). Fine for a portfolio demo and keeps infra at zero cost; the SQLAlchemy layer makes a later Postgres swap trivial. Flagged so it's a conscious choice.
- **Streaming via SSE** (not WebSockets) — simpler, one-directional, works through Render/Vercel without extra config, native `EventSource` on the client.
- **Chat & compare work for guests** (no auth gate) to keep the demo instantly usable; only watchlist/history require an account.
- Existing `/api/analyze` and the whole current UI keep working unchanged — every change is additive, so nothing that works today breaks.
