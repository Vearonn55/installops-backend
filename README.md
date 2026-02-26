# InstallOps Backend

API for installation operations: orders, installations, stores, users, roles, checklists, media, and audit logs. Session-based auth; OpenAPI docs at `/docs`.

**Git root:** this directory (`backend/`).

## Stack

- **Node.js** (ESM), **Express 5**, **PostgreSQL**, **Sequelize**
- **Auth**: session cookie (bcrypt), role-based permissions (admin, manager, crew)
- **Docs**: OpenAPI 3.1 (YAML), Swagger UI at `/docs`

## Quick start

### First-time setup (single command)

On a fresh server, with **PostgreSQL** installed and running:

1. Create a database user (if you don’t use `postgres`). For example, a dedicated user with permission to create the DB:

   ```bash
   sudo -u postgres psql -c "CREATE USER installops WITH PASSWORD 'YOUR_PASSWORD' CREATEDB;"
   ```

2. Clone and run setup:

   ```bash
   git clone <your-repo-url> backend && cd backend
   ./setup.sh
   ```

`setup.sh` will:

1. Copy `.env.example` to `.env` if needed and prompt for **DB password** and **session secret** (min 16 chars).
2. Run `npm install`.
3. Create the database (if it doesn’t exist), sync tables, create `install_code_seq`, and seed **3 roles**: `admin`, `manager`, `crew`.
4. Prompt for **one admin user**: name, email, password, and password confirm.
5. Prompt for **up to 4 stores** (e.g. `girne-weltew`); leave blank to skip.

Then start the app:

```bash
npm start
```

API: `http://localhost:8000`. Docs: `http://localhost:8000/docs`. Health: `GET /api/v1/health`.

### Local (no Docker) — already set up

1. **PostgreSQL** running; database and user already created (or use `./setup.sh` once).
2. **Env** – ensure `.env` has `DB_*` and `SESSION_SECRET`.

   ```bash
   npm install
   npm run init   # only if DB/tables/roles/user not yet created
   npm run dev
   ```

   API: `http://localhost:8000` (or `PORT`). Health: `GET /api/v1/health`. Docs: `http://localhost:8000/docs`.

## Project layout

```
backend/                     # git root
├── src/
│   ├── config/             # db, session, env
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/           # audit, backup
│   ├── docs/               # OpenAPI YAML (paths/, components/)
│   ├── app.js
│   └── index.js
├── scripts/
│   ├── init.js             # DB create, sync, roles, user + stores prompt
│   ├── ensure-env.js       # prompt for DB_PASS / SESSION_SECRET
│   ├── run-backup.js       # daily | monthly | yearly
├── BACKUP.md               # Backup strategy
├── setup.sh                # First-time setup (env, install, init)
├── installops-backend.service  # systemd unit (production)
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
└── package.json
```

## API overview

| Path | Description |
|------|-------------|
| `GET /api/v1/health` | Health check (no auth). |
| `/api/v1/auth` | Login, logout, register, me. |
| `/api/v1/users` | Users (list, create, update, password). |
| `/api/v1/roles` | Roles. |
| `/api/v1/stores` | Stores. |
| `/api/v1/addresses` | Addresses. |
| `/api/v1/installations` | Installations (with optional `location`), items, crew, media. |
| `/api/v1/orders/:external_order_id/installations` | Installations for an order. |
| `/api/v1/orders/:external_order_id/timeline` | Order timeline (chronological events). |
| `/api/v1/checklist-templates`, `/checklist-responses` | Checklists. |
| `/api/v1/media` | Media assets, upload. |
| `/api/v1/audit-logs` | Audit log (read). |

All except auth and health require a session cookie. Full spec: `http://localhost:8000/docs`.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Server port. |
| `NODE_ENV` | `development` | Environment. |
| `API_PREFIX` | `/api/v1` | API path prefix. |
| `DB_HOST` | `127.0.0.1` | PostgreSQL host (use `db` in Docker). |
| `DB_PORT` | `5432` | PostgreSQL port. |
| `DB_NAME` | `installops` | Database name. |
| `DB_USER` | — | Database user (e.g. `installops` or `postgres`). |
| `DB_PASS` | — | Database password. |
| `SESSION_SECRET` | — | **Required.** Long random string for session signing (min 16 chars). |
| `CORS_ORIGIN` | `*` | Allowed origins (comma-separated). With credentials, use your frontend origin (e.g. `https://kurulum.alplerltd.com`), not `*`. |
| `CORS_CREDENTIALS` | — | **Required for session login.** Set `true` so the browser sends and stores the session cookie; otherwise login succeeds but `/auth/me` returns 401. |
| `TRUST_PROXY` | `1` | Set to `true` or a number when behind nginx/load balancer so secure cookies and `req.secure` work. |
| `ENABLE_BACKUP_SCHEDULER` | — | Set `true` to run daily/monthly/yearly backups in-process. |

See `BACKUP.md` for backup-related env.

**Behind nginx:** The app trusts one proxy by default so session cookies work. If login succeeds but `GET /auth/me` returns 401, ensure nginx forwards `X-Forwarded-Proto` and `X-Forwarded-For` and that the frontend sends requests with `credentials: 'include'`. You can set `TRUST_PROXY=true` if you have multiple proxy hops.

## Run as a systemd service (production)

So the API starts on boot and restarts automatically if it crashes:

```bash
sudo cp /opt/installops-backend/installops-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable installops-backend
sudo systemctl start installops-backend
```

- **WorkingDirectory** in the unit is `/opt/installops-backend`; edit the service file if your app lives elsewhere.
- **Restart=on-failure** restarts the process after a crash; the service also starts on reboot.
- Logs: `sudo journalctl -u installops-backend -f`
- Status: `sudo systemctl status installops-backend`

## Database and schema changes

- **Init** uses `sequelize.sync()`: it creates tables if they don’t exist. It does **not** alter existing tables to add new columns.
- If you **add new columns** to models (e.g. `location` on `installations`) after the DB was created, either:
  - **Option A:** Add the column manually, e.g.  
    `sudo -u postgres psql -d installops -c 'ALTER TABLE installations ADD COLUMN IF NOT EXISTS location VARCHAR(255);'`
  - **Option B:** Reset and re-run init (drop DB, create again, then `npm run init` — only if you can lose existing data).

## Docker

- **Dockerfile**: multi-stage; runs `node src/index.js`. Build context is this directory.
- **docker-compose**: `api` (Node) + `db` (PostgreSQL). DB is created on first start; app waits for DB healthcheck.

### Commands

```bash
# From backend/ (git root)
docker compose up -d
docker compose logs -f api
docker compose down
```

### Env for Docker

Create `.env` here or set in `docker-compose.yml`. Minimum:

- `DB_HOST=db` (set in compose for api)
- `DB_NAME`, `DB_USER`, `DB_PASS` (match `db` service `POSTGRES_*`)
- `SESSION_SECRET` (long random string)

Uncomment `env_file: .env` in `docker-compose.yml` if you use a `.env` file.

### First run with Docker

1. `docker compose up -d`
2. Run init inside the api container or against the `db` service to create schema and seed roles/user/stores; or run migrations if you use them.
3. Bootstrap first user: `POST /api/v1/auth/register` (only when there are no users).
4. Log in: `POST /api/v1/auth/login`; use the session cookie for other requests.

## Scripts

| Command | Description |
|---------|-------------|
| `./setup.sh` | First-time setup: .env, install, init DB + roles + 1 user + up to 4 stores. |
| `npm run init` | Initialize DB (create DB if missing, sync tables, seed roles, prompt for user and stores). |
| `npm run dev` | Start with nodemon. |
| `npm start` | Start production server. |
| `npm run backup:daily` | Daily backup (keep last 5 days). |
| `npm run backup:monthly` | Monthly backup. |
| `npm run backup:yearly` | Yearly backup. |

## Backups

- **Daily**: Dated files; keeps last 5 days (`backup-daily-YYYY-MM-DD.dump`, `…-uploads.tar.gz`).
- **Monthly**: One per month (`backup-monthly-YYYY-MM.dump`, …).
- **Yearly**: One per year (`backup-yearly-YYYY.dump`, …).

Run manually: `npm run backup:daily`, `npm run backup:monthly`, or `npm run backup:yearly`.  
Or set `ENABLE_BACKUP_SCHEDULER=true` for in-process schedule.  
Full details: `BACKUP.md`.

## License

Proprietary.
