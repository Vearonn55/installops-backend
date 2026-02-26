# InstallOps Backend

API for installation operations: orders, installations, stores, users, roles, checklists, media, and audit logs. Session-based auth; OpenAPI docs at `/docs`.

**Git root:** this directory (`backend/`).

## Stack

- **Node.js** (ESM), **Express 5**, **PostgreSQL**, **Sequelize**
- **Auth**: session cookie (bcrypt), role-based permissions
- **Docs**: OpenAPI 3.1 (YAML), Swagger UI at `/docs`

## Quick start

### Local (no Docker)

1. **PostgreSQL** running (e.g. `brew install postgresql`, create DB `installops`).
2. **Env** – copy and edit:

   ```bash
   cp .env.example .env
   # Set at least: DB_*, SESSION_SECRET (long random string)
   ```

3. **Install & run**:

   ```bash
   npm install
   npm run dev
   ```

   API: `http://localhost:8000` (or `PORT`). Health: `GET /api/v1/health`. Docs: `http://localhost:8000/docs`.

### Docker

From this directory (git root):

```bash
docker compose up -d
```

- API: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- DB: PostgreSQL in `db` service; app uses it via `DB_HOST=db`.

See [Docker](#docker) below for env and first-run.

## Project layout

```
backend/                 # git root
├── src/
│   ├── config/         # db, session, env
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/       # audit, backup
│   ├── docs/           # OpenAPI YAML
│   ├── app.js
│   └── index.js
├── scripts/            # run-backup.js (daily/weekly)
├── BACKUP.md           # Backup strategy
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
└── package.json
```

## API overview

| Base path        | Description                    |
|------------------|--------------------------------|
| `/api/v1/auth`   | Login, logout, register, me     |
| `/api/v1/users`  | Users (list, create, update)    |
| `/api/v1/roles`  | Roles                          |
| `/api/v1/stores` | Stores                         |
| `/api/v1/addresses` | Addresses                   |
| `/api/v1/installations` | Installations, items, crew, media |
| `/api/v1/orders/:id/installations` | Installations for order |
| `/api/v1/orders/:id/timeline` | Order timeline (chronological) |
| `/api/v1/checklist-templates`, `/checklist-responses` | Checklists |
| `/api/v1/media`   | Media assets, upload           |
| `/api/v1/audit-logs` | Audit log (read)            |

All except auth require a session cookie. See `/docs` for full OpenAPI spec.

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Server port |
| `NODE_ENV` | `development` | Environment |
| `API_PREFIX` | `/api/v1` | API path prefix |
| `DB_HOST` | `127.0.0.1` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `installops` | Database name |
| `DB_USER` | — | Database user |
| `DB_PASS` | — | Database password |
| `SESSION_SECRET` | — | **Required.** Long random string for session signing |
| `CORS_ORIGIN` | `*` | Allowed origins (comma-separated) |
| `CORS_CREDENTIALS` | — | Set `true` if frontend sends cookies |
| `ENABLE_BACKUP_SCHEDULER` | — | Set `true` to run daily/weekly backups in-process |

See `BACKUP.md` for backup-related env.

## Docker

- **Dockerfile**: multi-stage; runs `node src/index.js`. Build context is this directory.
- **docker-compose**: `api` (Node) + `db` (PostgreSQL). DB is created on first start; app waits for DB to be ready.

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

### First run

1. `docker compose up -d`
2. Ensure the database schema exists (tables for users, roles, installations, etc.). Run migrations against the `db` service if you use them; otherwise create the schema manually.
3. Create first user (bootstrap): `POST /api/v1/auth/register` with `name`, `email`, `password`. Only works when there are no users.
4. Log in: `POST /api/v1/auth/login` with `email`, `password`; use returned cookie for other requests.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon |
| `npm start` | Start production server |
| `npm run backup:daily` | Run daily backup (overwrites previous) |
| `npm run backup:weekly` | Run weekly backup (retains last N) |

## Backups

- **Daily**: overwrites one set (`backup-daily.dump`, `backup-daily-uploads.tar.gz`).
- **Weekly**: dated files; keeps last N (default 4).

Run manually: `npm run backup:daily` or `npm run backup:weekly`.  
Or set `ENABLE_BACKUP_SCHEDULER=true` for in-process schedule.  
Full details: `BACKUP.md`.

## License

Proprietary.
