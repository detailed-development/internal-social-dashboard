# NCM Social Dashboard

Internal social analytics dashboard for Neon Cactus Media.

## Quick start

```bash
# 1. Copy environment file and fill in your API keys
cp .env.example .env

# 2. Start everything with Docker
docker compose up -d

# 3. Run database migrations
docker compose exec api npx prisma migrate dev

# 4. Seed with test data (optional)
docker compose exec api npm run db:seed

# 5. Open the dashboard
open http://localhost:5173
```

## Architecture

- **API**: Express.js on port 3001
- **Client**: React + Vite on port 5173
- **Database**: PostgreSQL on port 5433
- **Worker**: node-cron process syncing every 4 hours

## Services

| Container | Purpose                  | Port  |
|-----------|--------------------------|-------|
| db        | PostgreSQL 16            | 5433  |
| api       | Express REST API         | 3001  |
| client    | React dashboard          | 5173  |
| worker    | Background sync + transcription | — |
