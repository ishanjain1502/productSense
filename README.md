# ProductSense

Validate a feature **before** you build it.

ProductSense walks a product team from context (product, feature, market, GTM, financials) through code-risk, market evidence, simulated customer demand, and financial fit — then composes one verdict: ship, iterate, or don’t.

The web app lives in `client/` (Next.js). The API lives in `server/` (Express + SQLite).

## What you get

Two ways to run a validation:

| Mode | Route | Who it’s for |
|------|--------|----------------|
| **Demo** | `/demo` | Try the full pipeline with no login. Three seeded products: LedgerLite (solo), FlowStack (squad), Fly Bundles (Shopify app). |
| **Full** | `/full` | Sign in and bring your own product. Creates project and feature rows in SQLite. |

After the intake wizard, the pipeline is:

1. **Regression prompt** — copy a coding-agent prompt. The agent inspects blast radius / regression risk and POSTs a report (or you skip this step).
2. **Market analysis (Crustdata)** — competitive and demand signals for the feature.
3. **Persona fleet** — N simulated customers (10–1000) answer research questions; the server aggregates scores and synthesizes a judgment.
4. **Financial analysis** — investment threshold, duration, resources, runway, optional workbook, and optional [cfo.ai](https://cfo.ai) insight.
5. **Final report** — one-pager with a fleet recommendation (`proceed` / `iterate` / `reconsider`) and an executive ship verdict (`ship` / `ship_with_conditions` / `iterate` / `do_not_ship`).

## Architecture

```
browser  →  Next.js :3000  →  Express :1337  →  SQLite (./server/data/app.db)
                                 │
                                 ├─ CommandCode  (LLM synthesis + persona agents)
                                 ├─ Crustdata    (company / market data)
                                 └─ cfo.ai MCP   (optional financial workspace)
```

- **Monolith (default Docker / Render):** one container. Next is public on `$PORT`; Express listens on `127.0.0.1:1337`. Same-origin `/auth`, `/regression`, `/health`, … are rewritten to the API.
- **Split (local Docker profile):** `client` on `:3000`, `server` on `:1337`. Set `NEXT_PUBLIC_API_URL=http://localhost:1337`.

| Piece | Stack |
|-------|--------|
| Client | Next.js 16, React 19, Tailwind 4, shadcn |
| Server | Express 5, SQLite (`sqlite3`), JWT auth |
| Node | 18+ locally; images use Node 20 |

## Quick start (local)

You need two terminals and Node 18+.

**1. API**

```bash
cd server
npm install
cp .env.example .env
# fill COMMANDCODE_API_KEY (and CRUSTDATA_API_KEY for market analysis)
npm run seed:demo
npm run dev
```

API: [http://localhost:1337](http://localhost:1337) — `GET /health` should return `{ "ok": true, "db": "connected" }`.

**2. Web app**

```bash
cd client
npm install
cp .env.local.example .env.local
npm run dev
```

App: [http://localhost:3000](http://localhost:3000).

Demo login after seed (also used so demo financial uploads have an owner):

- Email: `demo@productsense.app`
- Password: `DemoProduct1!`

Override with `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` in `server/.env`.

## Quick start (Docker)

```bash
cp server/.env.example server/.env
# set COMMANDCODE_API_KEY, CRUSTDATA_API_KEY, JWT_SECRET, CFO_TOKEN_ENCRYPTION_KEY
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000).

Optional:

```bash
# seed demo user + three demo projects (shares the app volume)
docker compose --profile seed run --rm seed

# two containers instead of the monolith
docker compose --profile split up --build
```

## Configuration

Copy `server/.env.example` → `server/.env`. The client only needs `NEXT_PUBLIC_API_URL` for split/local API (leave unset in the monolith image so the browser talks same-origin).

| Variable | Purpose |
|----------|---------|
| `PORT` | API port for **local** `npm run dev` (default `1337`). Do **not** set on Render — the platform assigns the public port. |
| `DATABASE_PATH` | SQLite file (default `./data/app.db`). Created on startup. |
| `CLIENT_ORIGIN` | Comma-separated CORS origins (must match the browser URL). |
| `JWT_SECRET` | Signs auth tokens. Required in production. |
| `PUBLIC_API_URL` | URL coding agents use when POSTing regression reports. Split local: `http://localhost:1337`. Monolith / Render: the public app URL. |
| `COMMANDCODE_API_KEY` | LLM calls (market synthesis, persona fleet, financials, final report). |
| `COMMANDCODE_MODEL` | Default `deepseek/deepseek-v4-flash`. |
| `CRUSTDATA_API_KEY` | Market analysis Step 1. Also `CRUSTDATA_API_BASE`, `CRUSTDATA_API_VERSION`, `CRUSTDATA_AUTH_SCHEME`. |
| `CFO_TOKEN_ENCRYPTION_KEY` | 32+ char secret to encrypt per-user cfo.ai OAuth tokens at rest. |
| `NEATLOGS_API_KEY` | Optional tracing. |

Connect cfo.ai from `/integrations/cfo` while signed in (OAuth popup).

## API (high level)

Auth uses `Authorization: Bearer <jwt>` on full-mode routes. Demo mode correlates via `demoId` / prompt and run IDs.

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/health` | SQLite ping |
| `POST` | `/auth/register`, `/auth/login` | Returns JWT |
| `GET` | `/auth/me` | Current user |
| `POST` | `/regression/agent-prompt` | Copyable agent prompt + `promptId` |
| `GET` | `/regression/reports/status` | Gate “Go ahead” until a report exists |
| `POST` | `/regression/reports` | Agent (or paste) submits the JSON report |
| `POST` | `/market-analysis/run` | Crustdata strategies B + C |
| `POST` | `/market-analysis/persona-fleet/start` | Start N persona agents |
| `GET` | `/market-analysis/persona-fleet/:id/status` | Poll fleet progress |
| `POST` | `/market-analysis/persona-fleet/:id/judgment` | Compose fleet judgment |
| `POST` | `/financial-reports` | CSV/Excel upload |
| `POST` | `/financial-analysis/run` | Financial one-pager inputs |
| `GET`/`POST` | `/integrations/cfo/*` | cfo.ai OAuth |
| `POST` | `/final-report/generate` | Persist and return the one-pager |

## Repo layout

```
client/          Next.js app (App Router)
  app/demo|full  Validation routes (wizard → prompt → market → fleet → finance → report)
server/          Express API, SQLite, LLM + Crustdata + cfo.ai clients
  data/          DB and generated report JSON (gitignored)
docs/            Design specs and plans
Dockerfile       Single-container image (Next + API)
docker-compose.yml
render.yaml      Optional Render Blueprint
```

## Tests

```bash
cd server
npm test
```

Node’s built-in test runner (`server/test/**/*.test.js`).

## Deploy

`render.yaml` defines a Docker web service with a persistent disk at `/app/server/data`. In the dashboard set `JWT_SECRET`, `COMMANDCODE_API_KEY`, `CRUSTDATA_API_KEY`, `CFO_TOKEN_ENCRYPTION_KEY`, `CLIENT_ORIGIN`, and `PUBLIC_API_URL` (your `https://….onrender.com` URL). Do not set `PORT`.
