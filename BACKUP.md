# Backup strategy

- **Daily**: Dated files, **last 5 days** kept.  
  Files: `backup-daily-YYYY-MM-DD.dump`, `backup-daily-YYYY-MM-DD-uploads.tar.gz`.
- **Monthly**: One per month.  
  Files: `backup-monthly-YYYY-MM.dump`, `backup-monthly-YYYY-MM-uploads.tar.gz`.
- **Yearly**: One per year.  
  Files: `backup-yearly-YYYY.dump`, `backup-yearly-YYYY-uploads.tar.gz`.

## Requirements

- **PostgreSQL**: `pg_dump` on `PATH` (same host/user as app or set `PGPASSWORD`/`DB_*`).
- **Unix**: `tar` and `gzip` on `PATH` for uploads backup.

## Configuration (env)

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_DIR` | `./backups` | Directory where backup files are written. |
| `BACKUP_UPLOADS_PATH` | `./src/uploads` | Path to the uploads directory to archive. |
| `BACKUP_DAILY_RETENTION` | `5` | Number of daily backups to keep (older ones are deleted). |
| `ENABLE_BACKUP_SCHEDULER` | — | Set to `true` to run daily/monthly/yearly schedules inside the app process. |
| `BACKUP_DAILY_CRON` | `0 2 * * *` | Cron expression for daily backup (02:00 every day). |
| `BACKUP_MONTHLY_CRON` | `0 3 1 * *` | Cron expression for monthly backup (03:00 on 1st of month). |
| `BACKUP_YEARLY_CRON` | `0 4 1 1 *` | Cron expression for yearly backup (04:00 on Jan 1). |
| `DB_NAME`, `DB_USER`, `DB_HOST`, `DB_PORT`, `DB_PASS` | (see config) | Used for `pg_dump`; `DB_PASS` is passed as `PGPASSWORD`. |

## Running backups

### In-process scheduler

Start the server with:

```bash
ENABLE_BACKUP_SCHEDULER=true node src/index.js
```

Daily, monthly, and yearly jobs run at the configured cron times.

### Manual / system cron

From the **backend** directory:

```bash
# Daily (creates dated file, prunes to keep last 5)
npm run backup:daily

# Monthly (one per month)
npm run backup:monthly

# Yearly (one per year)
npm run backup:yearly
```

Example crontab (run from backend directory):

```cron
0 2 * * * cd /path/to/backend && npm run backup:daily
0 3 1 * * cd /path/to/backend && npm run backup:monthly
0 4 1 1 * cd /path/to/backend && npm run backup:yearly
```

Or call the script directly:

```cron
0 2 * * * cd /path/to/backend && node scripts/run-backup.js daily
0 3 1 * * cd /path/to/backend && node scripts/run-backup.js monthly
0 4 1 1 * cd /path/to/backend && node scripts/run-backup.js yearly
```

## Restore

- **Database**: `pg_restore -h HOST -p PORT -U USER -d DB_NAME backup-daily-YYYY-MM-DD.dump` (or the desired `.dump` file).
- **Uploads**: `tar -xzf backup-daily-YYYY-MM-DD-uploads.tar.gz -C /path/to/parent` (extracts the `uploads` directory).
