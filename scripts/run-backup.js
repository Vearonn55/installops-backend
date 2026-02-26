#!/usr/bin/env node
/**
 * CLI for backups. Use with system cron, e.g.:
 *   0 2 * * * cd /path/to/backend && node scripts/run-backup.js daily
 *   0 3 * * 0 cd /path/to/backend && node scripts/run-backup.js weekly
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

const { runDailyBackup, runWeeklyBackup } = await import('../src/services/backup.service.js');

const mode = process.argv[2] || 'daily';
if (mode !== 'daily' && mode !== 'weekly') {
  console.error('Usage: node scripts/run-backup.js [daily|weekly]');
  process.exit(1);
}

(async () => {
  try {
    if (mode === 'daily') {
      await runDailyBackup();
    } else {
      await runWeeklyBackup();
    }
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
