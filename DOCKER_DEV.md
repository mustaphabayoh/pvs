# Dev Docker Compose — Quick Guide

This repository includes a development docker-compose file at `docker-compose.dev.yml` that starts a MySQL server, the Node.js backend, and the frontend.

What I added
- Adminer (DB GUI) — see below (if present).
- Healthchecks for MySQL, backend and frontend to let Compose report readiness.
- Restart policies to make developer experience smoother.

Launch the full stack

1. Start Docker Desktop and make sure WSL2 integration is enabled (Windows).
2. From your repo root run:

```powershell
docker compose -f docker-compose.dev.yml up --build -d
```

3. Check the logs and service status:

```powershell
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs -f
```

Connect
- Backend health: http://localhost:4000/health
- Frontend: http://localhost:5173 (or as mapped by Compose)
- MySQL: 127.0.0.1:3306 (user: `veruser` / pass: `verpass`)
- Adminer: http://localhost:8080 (if enabled in compose)
 - Adminer: http://localhost:8080 (if enabled in compose)

New features
- `.env.dev` — a local env file included by `docker-compose.dev.yml` to centralize credentials and ports.
- `migrations` service — run one-shot migrations if you prefer to migrate DB explicitly before starting the full stack.
- Healthchecks — MySQL, backend, frontend and Adminer now include healthchecks so Compose can report readiness.

Stopping and removing

```powershell
docker compose -f docker-compose.dev.yml down --volumes --remove-orphans
```

If you run into issues paste the `docker compose -f docker-compose.dev.yml logs` output here and I'll help diagnose.

Run migrations manually

```powershell
# one-shot migrations (run once)
docker compose -f docker-compose.dev.yml run --rm migrations
```

