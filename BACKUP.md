# Backup strategy

- **Daily backups**: One set per day, overwritten each run.  
  Files: `backup-daily.dump` (PostgreSQL), `backup-daily-uploads.tar.gz` (uploads dir).
- **Weekly backups**: Dated files, kept for a configurable number of weeks (default 4).  
  Files: `backup-weekly-YYYY-MM-DD.dump`, `backup-weekly-YYYY-MM-DD-uploads.tar.gz`.

## Requirements

- **PostgreSQL**: `pg_dump` on `PATH` (same host/user as app or set `PGPASSWORD`/`DB_*`).
- **Unix**: `tar` and `gzip` on `PATH` for uploads backup.

## Configuration (env)

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_DIR` | `./backups` | Directory where backup files are written. |
| `BACKUP_UPLOADS_PATH` | `./src/uploads` | Path to the uploads directory to archive. |
| `BACKUP_WEEKLY_RETENTION` | `4` | Number of weekly backups to keep (older ones are deleted). |
| `ENABLE_BACKUP_SCHEDULER` | — | Set to `true` to run daily/weekly schedules inside the app process. |
| `BACKUP_DAILY_CRON` | `0 2 * * *` | Cron expression for daily backup (02:00 every day). |
| `BACKUP_WEEKLY_CRON` | `0 3 * * 0` | Cron expression for weekly backup (03:00 on Sunday). |
| `DB_NAME`, `DB_USER`, `DB_HOST`, `DB_PORT`, `DB_PASS` | (see config) | Used for `pg_dump`; `DB_PASS` is passed as `PGPASSWORD`. |

## Running backups

### In-process scheduler

Start the server with:

```bash
ENABLE_BACKUP_SCHEDULER=true node src/index.js
```

Daily and weekly jobs run at the configured cron times.

### Manual / system cron

From the **backend** directory:

```bash
# Daily (overwrites previous daily)
npm run backup:daily

# Weekly (creates new dated file, prunes old weeklies)
npm run backup:weekly
```

Example crontab (run from backend directory):

```cron
0 2 * * * cd /path/to/backend && npm run backup:daily
0 3 * * 0 cd /path/to/backend && npm run backup:weekly
```

Or call the script directly:

```cron
0 2 * * * cd /path/to/backend && node scripts/run-backup.js daily
0 3 * * 0 cd /path/to/backend && node scripts/run-backup.js weekly
```

## Restore

- **Database**: `pg_restore -h HOST -p PORT -U USER -d DB_NAME backup-daily.dump` (or the desired `.dump` file).
- **Uploads**: `tar -xzf backup-daily-uploads.tar.gz -C /path/to/parent` (extracts the `uploads` directory).
