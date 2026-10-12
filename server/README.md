# productSense server

Minimal Express API on port **1337** with SQLite (`sqlite3`).

## Setup

```bash
cd server
npm install
cp .env.example .env
```

## Run

```bash
npm run dev
# or
npm start
```

## Endpoints

| Method | Path     | Description                          |
|--------|----------|--------------------------------------|
| GET    | `/health` | `{ ok: true, db: "connected" }` when SQLite is reachable |

## Configuration

| Variable         | Default          |
|------------------|------------------|
| `PORT`           | `1337`           |
| `DATABASE_PATH`  | `./data/app.db`  |

The database file and parent directory are created on startup if they do not exist.
