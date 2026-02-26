#!/usr/bin/env node
/**
 * CLI for backups. Use with system cron, e.g.:
 *   0 2 * * * cd /path/to/backend && node scripts/run-backup.js daily
 *   0 3 1 * * cd /path/to/backend && node scripts/run-backup.js monthly
 *   0 4 1 1 * cd /path/to/backend && node scripts/run-backup.js yearly
 *
 * Requires: dotenv, pg_dump and tar on PATH.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, '.env') });
process.chdir(root);

const { runDailyBackup, runMonthlyBackup, runYearlyBackup } = await import('../src/services/backup.service.js');

const mode = process.argv[2] || 'daily';
const runners = { daily: runDailyBackup, monthly: runMonthlyBackup, yearly: runYearlyBackup };
if (!runners[mode]) {
  console.error('Usage: node scripts/run-backup.js [daily|monthly|yearly]');
  process.exit(1);
}

(async () => {
  try {
    await runners[mode]();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
