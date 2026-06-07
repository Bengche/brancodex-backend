# BranCodeX Backend

Node.js + Express + PostgreSQL REST API powering the BranCodeX portfolio site.

---

## Features

- **Global Leaderboards** — Top-10 rankings for the Quiz and Guess & Challenge playground games, stored in PostgreSQL and served over a secure REST API.
- **Security** — Helmet headers, strict CORS, 10 kb body cap, rate limiting (read + write), input validation via `express-validator`, parameterized queries (no SQL injection).

---

## Project Structure

```
backend/
├── src/
│   ├── index.js                 # Express app entry point
│   ├── db/
│   │   ├── pool.js              # Singleton pg Pool
│   │   ├── schema.sql           # Database schema + seed data
│   │   └── migrate.js           # Migration runner (npm run migrate)
│   ├── middleware/
│   │   └── rateLimiter.js       # read + write rate limiters
│   └── routes/
│       └── leaderboard.js       # GET + POST /api/leaderboard/:game
├── .env.example
└── package.json
```

---

## Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js     | ≥ 18    |
| PostgreSQL   | ≥ 14    |

---

## Quick Start

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set DATABASE_URL and ALLOWED_ORIGINS
```

### 3. Create the database

```bash
# Using psql (adjust user/db name as needed)
psql -U postgres -c "CREATE DATABASE brancodex;"
```

### 4. Run the migration

```bash
npm run migrate
```

This applies `src/db/schema.sql` which creates the `leaderboard_entries` table and inserts some seed entries for local development.

### 5. Start the server

```bash
# Development (auto-restart on save)
npm run dev

# Production
npm start
```

The server starts on **port 4000** by default (configurable via `PORT` in `.env`).

---

## API Reference

### Health check

```
GET /api/health
```

Response:
```json
{ "status": "ok", "timestamp": "2026-06-07T12:00:00.000Z" }
```

---

### Get leaderboard

```
GET /api/leaderboard/:game
```

| Parameter | Values               |
|-----------|----------------------|
| `game`    | `quiz` \| `guess-challenge` |

**Rate limit:** 200 requests / minute per IP.

Response `200`:
```json
{
  "game": "quiz",
  "leaderboard": [
    { "rank": 1, "player": "Alex", "score": 18, "played_at": "..." },
    ...
  ]
}
```

---

### Submit score

```
POST /api/leaderboard/:game
Content-Type: application/json

{ "player": "Alex", "score": 18 }
```

**Rate limit:** 10 submissions / 5 minutes per IP.

| Field    | Type   | Constraints                      |
|----------|--------|----------------------------------|
| `player` | string | required, max 80 chars           |
| `score`  | int    | ≥ 0, ≤ game max (20 quiz / 12 gc) |

Response `201`:
```json
{
  "game": "quiz",
  "madeTopTen": true,
  "leaderboard": [ ... ]
}
```

---

## Deployment

The backend can be deployed on any Node.js host (Railway, Render, Fly.io, etc.).

Key environment variables for production:

| Variable          | Description                                      |
|-------------------|--------------------------------------------------|
| `DATABASE_URL`    | PostgreSQL connection string                     |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins |
| `NODE_ENV`        | Set to `production`                              |
| `PORT`            | Port to listen on (host may set this for you)   |

### Frontend env var

In the Next.js app (`brancodex-next/.env.local`), set:

```
NEXT_PUBLIC_BACKEND_URL=https://your-backend.railway.app
```

This is used by the playground components to reach the API.

---

## Security Notes

- All SQL queries use parameterized statements — no string concatenation.
- Player names are HTML-escaped before storage to prevent stored XSS.
- Score values are validated against per-game maximums server-side.
- CORS is restricted to an explicit allowlist — no wildcard `*`.
- Request body size is capped at 10 kb to prevent oversized-body attacks.
