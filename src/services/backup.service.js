/**
 * Backup service: daily (overwrite) + weekly (retained).
 * Backs up: PostgreSQL DB (pg_dump) and uploads directory (tar.gz).
 *
 * Env:
 *   BACKUP_DIR          - where to write backups (default: ./backups)
 *   BACKUP_UPLOADS_PATH - path to uploads dir (default: ./src/uploads)
 *   BACKUP_WEEKLY_RETENTION - number of weekly backups to keep (default: 4)
 *   DB_NAME, DB_USER, DB_HOST, DB_PORT, DB_PASS - for pg_dump (PGPASSWORD = DB_PASS)
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKUP_DIR = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
const UPLOADS_PATH = process.env.BACKUP_UPLOADS_PATH || path.join(process.cwd(), 'src', 'uploads');
const WEEKLY_RETENTION = Math.max(1, parseInt(process.env.BACKUP_WEEKLY_RETENTION || '4', 10));

const DB_NAME = process.env.DB_NAME || 'installops';
const DB_USER = process.env.DB_USER || 'vearon';
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT || '5432';

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

function runCommand(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `Exit code ${code}`));
    });
  });
}

/**
 * Run pg_dump and write to outPath.
 */
async function backupDatabase(outPath) {
  const args = [
    '-h', DB_HOST,
    '-p', String(DB_PORT),
    '-U', DB_USER,
    '-F', 'c', // custom format (compressed, restorable with pg_restore)
    '-f', outPath,
    DB_NAME,
  ];
  await runCommand('pg_dump', args, {
    PGPASSWORD: process.env.DB_PASS || process.env.PGPASSWORD || '',
  });
}

/**
 * Tar+gzip uploads dir into outPath. Skips if uploads dir does not exist.
 */
async function backupUploads(outPath) {
  if (!fs.existsSync(UPLOADS_PATH)) {
    fs.writeFileSync(outPath, '');
    return;
  }
  const dir = path.dirname(outPath);
  const base = path.basename(outPath);
  const cwd = path.dirname(UPLOADS_PATH);
  const relativeUploads = path.basename(UPLOADS_PATH);
  await runCommand('tar', ['-czf', path.join(dir, base), '-C', cwd, relativeUploads], {});
}

/**
 * Daily backup: overwrites previous daily files.
 * Files: backup-daily.sql (or .dump for custom format), backup-daily-uploads.tar.gz
 */
export async function runDailyBackup() {
  ensureBackupDir();
  const stamp = 'daily';
  const dbPath = path.join(BACKUP_DIR, `backup-${stamp}.dump`);
  const uploadsPath = path.join(BACKUP_DIR, `backup-${stamp}-uploads.tar.gz`);

  console.log('[backup] Starting daily backup...');
  try {
    await backupDatabase(dbPath);
    console.log('[backup] Daily DB backup written:', dbPath);
  } catch (e) {
    console.error('[backup] Daily DB backup failed:', e.message);
    throw e;
  }

  try {
    await backupUploads(uploadsPath);
    console.log('[backup] Daily uploads backup written:', uploadsPath);
  } catch (e) {
    console.error('[backup] Daily uploads backup failed:', e.message);
    throw e;
  }

  console.log('[backup] Daily backup finished.');
  return { db: dbPath, uploads: uploadsPath };
}

/**
 * Weekly backup: creates dated files and prunes old weeklies beyond retention.
 * Files: backup-weekly-YYYY-MM-DD.dump, backup-weekly-YYYY-MM-DD-uploads.tar.gz
 */
export async function runWeeklyBackup() {
  ensureBackupDir();
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const stamp = `weekly-${dateStr}`;
  const dbPath = path.join(BACKUP_DIR, `backup-${stamp}.dump`);
  const uploadsPath = path.join(BACKUP_DIR, `backup-${stamp}-uploads.tar.gz`);

  console.log('[backup] Starting weekly backup...');
  try {
    await backupDatabase(dbPath);
    console.log('[backup] Weekly DB backup written:', dbPath);
  } catch (e) {
    console.error('[backup] Weekly DB backup failed:', e.message);
    throw e;
  }

  try {
    await backupUploads(uploadsPath);
    console.log('[backup] Weekly uploads backup written:', uploadsPath);
  } catch (e) {
    console.error('[backup] Weekly uploads backup failed:', e.message);
    throw e;
  }

  // Prune old weekly backups (keep last WEEKLY_RETENTION)
  const files = fs.readdirSync(BACKUP_DIR);
  const weeklyDb = files.filter((f) => f.startsWith('backup-weekly-') && f.endsWith('.dump'));
  weeklyDb.sort().reverse();
  for (let i = WEEKLY_RETENTION; i < weeklyDb.length; i++) {
    const f = path.join(BACKUP_DIR, weeklyDb[i]);
    fs.unlinkSync(f);
    console.log('[backup] Pruned old weekly:', weeklyDb[i]);
    const up = weeklyDb[i].replace('.dump', '-uploads.tar.gz');
    const upPath = path.join(BACKUP_DIR, up);
    if (fs.existsSync(upPath)) fs.unlinkSync(upPath);
  }

  console.log('[backup] Weekly backup finished.');
  return { db: dbPath, uploads: uploadsPath };
}

let cronInstalled = false;

/**
 * Start in-process scheduler: daily at 02:00, weekly on Sunday at 03:00.
 * Set ENABLE_BACKUP_SCHEDULER=true to enable. Override with BACKUP_DAILY_CRON and BACKUP_WEEKLY_CRON.
 */
export async function startBackupScheduler() {
  if (cronInstalled) return;
  let cron;
  try {
    cron = (await import('node-cron')).default;
  } catch (e) {
    console.warn('[backup] node-cron not installed; scheduler disabled. Run backups via CLI or cron.');
    return;
  }
  cronInstalled = true;

  const dailyCron = process.env.BACKUP_DAILY_CRON || '0 2 * * *';   // 02:00 every day
  const weeklyCron = process.env.BACKUP_WEEKLY_CRON || '0 3 * * 0';  // 03:00 on Sunday

  cron.schedule(dailyCron, async () => {
    try {
      await runDailyBackup();
    } catch (e) {
      console.error('[backup] Daily scheduled backup error:', e);
    }
  });
  console.log('[backup] Daily backup scheduled:', dailyCron);

  cron.schedule(weeklyCron, async () => {
    try {
      await runWeeklyBackup();
    } catch (e) {
      console.error('[backup] Weekly scheduled backup error:', e);
    }
  });
  console.log('[backup] Weekly backup scheduled:', weeklyCron);
}
