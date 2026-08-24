import cron from 'node-cron';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_SCRIPT = path.resolve(__dirname, '../../scripts/backup-db.sh');

/**
 * Runs the pg_dump backup shell script.
 * Credentials are read from the environment — never hardcoded here.
 */
function runBackup(): void {
  logger.info('[backup] Monthly backup job triggered');

  // Pass PGPASSWORD extracted from DATABASE_URL so pg_dump doesn't prompt
  // DATABASE_URL format: postgresql://user:password@host:port/db
  const url = new URL(env.DATABASE_URL);
  const pgPassword = url.password ?? '';

  exec(
    `bash "${BACKUP_SCRIPT}"`,
    {
      env: {
        ...process.env,
        PGPASSWORD: pgPassword, // used by pg_dump, never logged
      },
    },
    (error, stdout, stderr) => {
      if (error) {
        logger.error({ err: error, stderr }, '[backup] Backup script failed');
        return;
      }
      if (stderr) {
        logger.warn({ stderr }, '[backup] Backup script stderr output');
      }
      logger.info({ stdout }, '[backup] Backup completed successfully');
    },
  );
}

/**
 * Registers the monthly backup cron job.
 * Schedule: 0 2 1 * *  →  2:00 AM on the 1st of every month.
 *
 * Only registers if BACKUP_ENABLED=true in the environment.
 * Set BACKUP_ENABLED=false (default) in development to avoid accidental runs.
 */
export function registerBackupJob(): void {
  if (!env.BACKUP_ENABLED) {
    logger.info(
      '[backup] Backup job is disabled (BACKUP_ENABLED=false). Skipping registration.',
    );
    return;
  }

  // '0 2 1 * *' = 2:00 AM on the 1st of every month
  cron.schedule('0 2 1 * *', runBackup, {
    timezone: 'Africa/Addis_Ababa',
  });

  logger.info(
    '[backup] Monthly backup job registered (runs 02:00 on the 1st of every month, EAT)',
  );
}
