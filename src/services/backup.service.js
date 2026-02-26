/**
 * Backup service: 5 prior days (daily), one per month, once per year.
 * Backs up: PostgreSQL DB (pg_dump) and uploads directory (tar.gz).
 *
 * Env:
 *   BACKUP_DIR          - where to write backups (default: ./backups)
 *   BACKUP_UPLOADS_PATH - path to uploads dir (default: ./src/uploads)
 *   BACKUP_DAILY_RETENTION - number of daily backups to keep (default: 5)
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
const DAILY_RETENTION = Math.max(1, parseInt(process.env.BACKUP_DAILY_RETENTION || '5', 10));

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

function pruneDaily(keep) {
  const files = fs.readdirSync(BACKUP_DIR);
  const dailyDb = files.filter((f) => f.startsWith('backup-daily-') && f.endsWith('.dump'));
  dailyDb.sort().reverse();
  for (let i = keep; i < dailyDb.length; i++) {
    const f = path.join(BACKUP_DIR, dailyDb[i]);
    fs.unlinkSync(f);
    console.log('[backup] Pruned old daily:', dailyDb[i]);
    const up = dailyDb[i].replace('.dump', '-uploads.tar.gz');
    const upPath = path.join(BACKUP_DIR, up);
    if (fs.existsSync(upPath)) fs.unlinkSync(upPath);
  }
}

/**
 * Daily backup: dated files, keep last BACKUP_DAILY_RETENTION (default 5).
 * Files: backup-daily-YYYY-MM-DD.dump, backup-daily-YYYY-MM-DD-uploads.tar.gz
 */
export async function runDailyBackup() {
  ensureBackupDir();
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
  const stamp = `daily-${dateStr}`;
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

  pruneDaily(DAILY_RETENTION);
  console.log('[backup] Daily backup finished.');
  return { db: dbPath, uploads: uploadsPath };
}

/**
 * Monthly backup: one per month. Files: backup-monthly-YYYY-MM.dump, backup-monthly-YYYY-MM-uploads.tar.gz
 */
export async function runMonthlyBackup() {
  ensureBackupDir();
  const date = new Date();
  const monthStr = date.toISOString().slice(0, 7); // YYYY-MM
  const stamp = `monthly-${monthStr}`;
  const dbPath = path.join(BACKUP_DIR, `backup-${stamp}.dump`);
  const uploadsPath = path.join(BACKUP_DIR, `backup-${stamp}-uploads.tar.gz`);

  console.log('[backup] Starting monthly backup...');
  try {
    await backupDatabase(dbPath);
    console.log('[backup] Monthly DB backup written:', dbPath);
  } catch (e) {
    console.error('[backup] Monthly DB backup failed:', e.message);
    throw e;
  }

  try {
    await backupUploads(uploadsPath);
    console.log('[backup] Monthly uploads backup written:', uploadsPath);
  } catch (e) {
    console.error('[backup] Monthly uploads backup failed:', e.message);
    throw e;
  }

  console.log('[backup] Monthly backup finished.');
  return { db: dbPath, uploads: uploadsPath };
}

/**
 * Yearly backup: one per year. Files: backup-yearly-YYYY.dump, backup-yearly-YYYY-uploads.tar.gz
 */
export async function runYearlyBackup() {
  ensureBackupDir();
  const date = new Date();
  const yearStr = date.getFullYear().toString(); // YYYY
  const stamp = `yearly-${yearStr}`;
  const dbPath = path.join(BACKUP_DIR, `backup-${stamp}.dump`);
  const uploadsPath = path.join(BACKUP_DIR, `backup-${stamp}-uploads.tar.gz`);

  console.log('[backup] Starting yearly backup...');
  try {
    await backupDatabase(dbPath);
    console.log('[backup] Yearly DB backup written:', dbPath);
  } catch (e) {
    console.error('[backup] Yearly DB backup failed:', e.message);
    throw e;
  }

  try {
    await backupUploads(uploadsPath);
    console.log('[backup] Yearly uploads backup written:', uploadsPath);
  } catch (e) {
    console.error('[backup] Yearly uploads backup failed:', e.message);
    throw e;
  }

  console.log('[backup] Yearly backup finished.');
  return { db: dbPath, uploads: uploadsPath };
}

let cronInstalled = false;

/**
 * Start in-process scheduler: daily 02:00 (keep 5), monthly 1st at 03:00, yearly Jan 1 at 04:00.
 * Set ENABLE_BACKUP_SCHEDULER=true to enable.
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

  const dailyCron = process.env.BACKUP_DAILY_CRON || '0 2 * * *';     // 02:00 every day
  const monthlyCron = process.env.BACKUP_MONTHLY_CRON || '0 3 1 * *'; // 03:00 on 1st of month
  const yearlyCron = process.env.BACKUP_YEARLY_CRON || '0 4 1 1 *';  // 04:00 on Jan 1

  cron.schedule(dailyCron, async () => {
    try {
      await runDailyBackup();
    } catch (e) {
      console.error('[backup] Daily scheduled backup error:', e);
    }
  });
  console.log('[backup] Daily backup scheduled:', dailyCron);

  cron.schedule(monthlyCron, async () => {
    try {
      await runMonthlyBackup();
    } catch (e) {
      console.error('[backup] Monthly scheduled backup error:', e);
    }
  });
  console.log('[backup] Monthly backup scheduled:', monthlyCron);

  cron.schedule(yearlyCron, async () => {
    try {
      await runYearlyBackup();
    } catch (e) {
      console.error('[backup] Yearly scheduled backup error:', e);
    }
  });
  console.log('[backup] Yearly backup scheduled:', yearlyCron);
}
