# Deployment Guide

How to go from a fresh copy of this repo to a live dashboard on a subdomain using Supabase and Bunny Magic containers.

---

## Overview

| Layer | Technology |
|---|---|
| Source code | GitHub — `detailed-development/internal-social-dashboard` |
| CI/CD | GitHub Actions → builds and pushes two Docker images to GHCR on every push to `main` |
| Database | Supabase (PostgreSQL + connection pooler) |
| Backend container | Bunny Magic — `internal-social-dashboard-backend:latest` |
| Frontend container | Bunny Magic — `internal-social-dashboard-frontend:latest` (Nginx, proxies `/api/` to backend) |
| Subdomain | Bunny pull zone pointed at the frontend container |

---

## 1. Prerequisites

- Admin access to the GitHub repo
- A Supabase account
- A Bunny.net account with Magic Containers enabled
- Access to DNS for the target domain (e.g. `neoncactusmedia.com`)

---

## 2. Supabase — create a project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Choose a name (e.g. `ncm-social`), set a strong database password, pick the closest region.
3. Wait for the project to provision.
4. Go to **Project Settings → Database** and copy two connection strings:
   - **Connection string (Transaction pooler)** → this becomes `DATABASE_URL`
   - **Connection string (Direct connection)** → this becomes `DIRECT_URL`

   Both strings look like `postgresql://postgres.[ref]:[password]@[host]:5432/postgres`.
   Append `?pgbouncer=true` to `DATABASE_URL` (the pooled one) if not already present.

5. Go to **Project Settings → API** and note the **Project URL** — you will not need it directly but it confirms the project is live.

---

## 3. GitHub — add repository secrets

Go to **Settings → Secrets and variables → Actions** in the GitHub repo and add:

| Secret name | Value |
|---|---|
| `DATABASE_URL` | Supabase transaction pooler connection string |
| `DIRECT_URL` | Supabase direct connection string |
| `META_APP_ID` | Meta (Facebook/Instagram) app ID |
| `META_APP_SECRET` | Meta app secret |
| `META_USER_TOKEN` | Meta long-lived user token |
| `OPENAI_API_KEY` | OpenAI API key (for AI features and Whisper transcription) |
| `GOOGLE_ANALYTICS_KEY_FILE` | Path to service account JSON inside the container, e.g. `/app/google-service-account.json` |
| `GOOGLE_ANALYTICS_VIEW_ID` | GA4 view/property ID |

> **Note:** `GITHUB_TOKEN` is provided automatically by Actions — no need to add it.

---

## 4. Run database migrations

The first time you deploy (and after any migration is added) you need to apply the schema to Supabase.

You can do this from your local machine:

```bash
# Clone the repo
git clone https://github.com/detailed-development/internal-social-dashboard.git
cd internal-social-dashboard

# Install dependencies
npm install

# Create a local .env with the Supabase connection strings
cp .env.example .env
# Edit .env — set DATABASE_URL and DIRECT_URL to the Supabase values

# Apply all migrations
npx prisma migrate deploy
```

`migrate deploy` applies every file under `prisma/migrations/` in order, including the RLS migration. Run this again whenever a new migration is added to the repo.

---

## 5. Build Docker images

Push to `main` and GitHub Actions does this automatically.

The workflow (`.github/workflows/docker-push.yml`) builds and pushes two images to GHCR:

```
ghcr.io/detailed-development/internal-social-dashboard-backend:latest
ghcr.io/detailed-development/internal-social-dashboard-frontend:latest
```

Both images are built for `linux/amd64` and `linux/arm64`.

To trigger a fresh build: merge any change (or an empty commit) to `main`:

```bash
git commit --allow-empty -m "chore: trigger rebuild" && git push origin main
```

---

## 6. Bunny Magic — deploy the backend container

1. In the Bunny dashboard go to **Magic Containers → New Container**.
2. Set the image to:
   ```
   ghcr.io/detailed-development/internal-social-dashboard-backend:latest
   ```
3. Set **Port** to `3001`.
4. Add the following environment variables:

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | Supabase transaction pooler connection string |
   | `DIRECT_URL` | Supabase direct connection string |
   | `META_APP_ID` | Meta app ID |
   | `META_APP_SECRET` | Meta app secret |
   | `META_USER_TOKEN` | Meta long-lived user token |
   | `OPENAI_API_KEY` | OpenAI API key |
   | `GOOGLE_ANALYTICS_KEY_FILE` | `/app/google-service-account.json` |
   | `GOOGLE_ANALYTICS_VIEW_ID` | GA4 property ID |
   | `AUTH_CHECK_URL` | `http://neoncactusmedia.com/wp-json/ncm/v1/social-dashboard-access` |

5. Deploy the container and note the IP address/hostname Bunny assigns to it — you will need it for the frontend in the next step.
6. Confirm it's healthy: `curl http://<backend-ip>:3001/api/health` should return `{"status":"ok",...}`.

---

## 7. Bunny Magic — deploy the frontend container

1. **New Container** → image:
   ```
   ghcr.io/detailed-development/internal-social-dashboard-frontend:latest
   ```
2. Set **Port** to `80`.
3. Add one environment variable:

   | Variable | Value |
   |---|---|
   | `API_URL` | `http://<backend-ip>:3001` (the IP from step 6) |

   The Nginx config template substitutes this at container start so `/api/` requests are proxied to the correct backend address.

4. Deploy and note the frontend container's IP/hostname.

---

## 8. Subdomain — point DNS at the frontend

1. In your DNS provider, create a record for the subdomain you want (e.g. `social.neoncactusmedia.com`):
   - **Type:** `A` (or `CNAME` if Bunny gives a hostname)
   - **Value:** frontend container IP or Bunny pull zone hostname
   - **TTL:** 300 (can lower for first deploy)

2. In the Bunny dashboard, add the custom hostname to the frontend pull zone/container so Bunny serves it on that domain.

3. Once DNS propagates, `http://social.neoncactusmedia.com` should load the dashboard.
   Hitting it without a valid WordPress session will redirect to `neoncactusmedia.com/wp-login.php`.

---

## 9. Ongoing deployment workflow

| Task | How |
|---|---|
| Deploy code changes | Push to `main` — Actions rebuilds images automatically |
| Pick up new images | Restart both Bunny containers (they pull `:latest` on start) |
| Add a database migration | Add a migration file to `prisma/migrations/`, push to `main`, then run `npx prisma migrate deploy` with the Supabase `DIRECT_URL` |
| Rotate an API key | Update the env var in the Bunny container settings and restart |
| Roll back | Re-deploy the previous GHCR image tag (each push is also tagged with its git SHA) |

---

## Environment variables reference

### Backend container

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | Yes | Set to `production` |
| `DATABASE_URL` | Yes | Supabase pooled connection string |
| `DIRECT_URL` | Yes | Supabase direct connection string (for migrations) |
| `AUTH_CHECK_URL` | Yes | WordPress endpoint that returns 200/401/403 |
| `META_APP_ID` | For Meta sync | Facebook/Instagram app ID |
| `META_APP_SECRET` | For Meta sync | Facebook/Instagram app secret |
| `META_USER_TOKEN` | For Meta sync | Long-lived user token |
| `OPENAI_API_KEY` | For AI features | OpenAI key (GPT + Whisper) |
| `GOOGLE_ANALYTICS_KEY_FILE` | For GA4 | Path to service account JSON |
| `GOOGLE_ANALYTICS_VIEW_ID` | For GA4 | GA4 property ID |
| `PORT` | No | Defaults to `3001` |

### Frontend container

| Variable | Required | Description |
|---|---|---|
| `API_URL` | Yes | Full URL of the backend container, e.g. `http://<ip>:3001` |
