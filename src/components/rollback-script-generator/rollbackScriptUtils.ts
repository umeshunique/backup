import type { ReleaseDeployment } from '@/types/backup.types';
import type { BackupHistory } from '@/types/backup.types';

/**
 * Generate a rollback script for a deployment (restore from pre-deployment backup).
 */
export function generateDeploymentRollbackScript(
  release: ReleaseDeployment,
  options?: { includeInstructions?: boolean }
): string {
  const { includeInstructions = true } = options ?? {};
  const backup = release.preDeploymentBackup;
  const target = release.targetDetails;
  const lines: string[] = [];

  if (includeInstructions) {
    lines.push('-- ========================================');
    lines.push('-- ROLLBACK SCRIPT (from deployment history)');
    lines.push('-- ========================================');
    lines.push(`-- Release: ${release.version} (${release.releaseNumber})`);
    lines.push(`-- Target: ${target.serverName} / ${target.databaseName}`);
    lines.push(`-- Created: ${new Date(release.createdAt).toISOString()}`);
    lines.push('');
  }

  if (!backup) {
    lines.push('-- No pre-deployment backup available for this release.');
    lines.push('-- Rollback must be performed manually (e.g. from a backup taken before deploy).');
    return lines.join('\n');
  }

  lines.push(`-- Pre-deployment backup: ${backup.backupPath}`);
  lines.push(`-- Backup ID: ${backup.backupId}`);
  lines.push(`-- Backup created: ${new Date(backup.createdAt).toISOString()}`);
  lines.push('');

  if (target.host) {
    lines.push('-- Restore using MySQL client (run from shell):');
    lines.push(`--   mysql -h ${target.host} -u <user> -p ${target.databaseName} < "${backup.backupPath}"`);
    lines.push('');
    lines.push('-- Or use this app: Restore wizard → select the backup file above.');
  }

  return lines.join('\n');
}

/**
 * Generate a rollback/restore script from backup metadata.
 */
export function generateBackupRollbackScript(
  backup: BackupHistory,
  options?: { includeInstructions?: boolean }
): string {
  const { includeInstructions = true } = options ?? {};
  const path = backup.path ?? backup.filePath ?? '';
  const db = backup.databaseName ?? backup.database ?? '?';
  const host = backup.host ?? 'localhost';
  const port = backup.port ?? 3306;
  const dbType = (backup.type ?? 'mysql').toLowerCase();
  const lines: string[] = [];

  if (includeInstructions) {
    lines.push('-- ========================================');
    lines.push('-- ROLLBACK / RESTORE SCRIPT (from backup metadata)');
    lines.push('-- ========================================');
    lines.push(`-- Backup: ${backup.fileName}`);
    lines.push(`-- Database: ${db}`);
    lines.push(`-- Type: ${dbType}`);
    if (backup.timestamp) lines.push(`-- Timestamp: ${backup.timestamp}`);
    lines.push('');
  }

  if (!path) {
    lines.push('-- Backup path not available in metadata.');
    lines.push('-- Use the Restore wizard and select the backup from history.');
    return lines.join('\n');
  }

  if (dbType === 'mysql') {
    lines.push('-- Restore with MySQL client:');
    lines.push(`--   mysql -h ${host} -P ${port} -u <user> -p ${db} < "${path}"`);
    lines.push('');
    lines.push('-- Or use this app: Restore → choose backup and target database.');
  } else {
    lines.push(`-- Backup path: ${path}`);
    lines.push(`-- Target database: ${db} @ ${host}:${port}`);
    lines.push('-- Use your database restore tool with the path above.');
  }

  return lines.join('\n');
}
