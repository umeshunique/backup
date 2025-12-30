import { Request, Response } from 'express';
import { databaseService } from '../services/databaseService.js';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { config } from '../config/env.js';
import { existsSync } from 'fs';

const DATA_DIR = join(process.cwd(), 'data');
const HISTORY_FILE = join(DATA_DIR, 'backup-history.json');

// Store restore progress in memory
const restoreProgress = new Map<string, {
  status: 'running' | 'completed' | 'failed';
  progress: number;
  currentCount: number;
  totalCount: number;
  objectsRestored: {
    tables: number;
    procedures: number;
    views: number;
    triggers: number;
    functions: number;
  };
  error?: string;
}>();

export class BackupController {
  private async readHistory(): Promise<any[]> {
    try {
      if (!existsSync(HISTORY_FILE)) {
        return [];
      }
      const data = await readFile(HISTORY_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error reading backup history:', error);
      return [];
    }
  }

  private async writeHistory(history: any[]): Promise<void> {
    try {
      await mkdir(DATA_DIR, { recursive: true });
      await writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error writing backup history:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { host, port, user, password, database, type } = req.body;

      if (!host || !port || !user || !password || !type) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: host, port, user, password, type'
        });
        return;
      }

      const result = await databaseService.testConnection({
        id: '',
        host,
        port: parseInt(port),
        user,
        password,
        database,
        type
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Connection test failed'
      });
    }
  }

  /**
   * Get list of databases
   */
  async getDatabases(req: Request, res: Response): Promise<void> {
    try {
      const { host, port, user, password, type } = req.body;

      if (!host || !port || !user || !password || !type) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: host, port, user, password, type'
        });
        return;
      }

      const databases = await databaseService.getDatabases({
        id: '',
        host,
        port: parseInt(port),
        user,
        password,
        type
      });

      res.json({
        success: true,
        databases
      });
    } catch (error: any) {
      console.error('getDatabases error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get databases'
      });
    }
  }

  /**
   * Get database schema
   */
  async getDatabaseSchema(req: Request, res: Response): Promise<void> {
    try {
      const { host, port, user, password, type, database } = req.body;

      console.log(`🎯 Controller: getDatabaseSchema called for database: ${database}`);

      if (!host || !port || !user || !password || !type || !database) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: host, port, user, password, type, database'
        });
        return;
      }

      const schema = await databaseService.getDatabaseSchema(
        {
          id: '',
          host,
          port: parseInt(port),
          user,
          password,
          type
        },
        database
      );

      console.log(`✅ Controller: Successfully got schema for ${database}, sending response`);
      console.log(`   Schema has ${schema.tables?.length || 0} tables`);

      res.json({
        success: true,
        schema
      });
    } catch (error: any) {
      console.error(`❌ Controller: Error getting schema for database:`, error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get database schema'
      });
    }
  }

  /**
   * Execute backup
   */
  async executeBackup(req: Request, res: Response): Promise<void> {
    try {
      const {
        host,
        port,
        user,
        password,
        type,
        database,
        includeData,
        includeStructure,
        includeProcedures,
        includeViews,
        includeTriggers,
        includeFunctions,
        tables,
        fileName,
        destinationPath
      } = req.body;

      if (!host || !port || !user || !password || !type || !database) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: host, port, user, password, type, database'
        });
        return;
      }

      // Execute backup
      const sqlDump = await databaseService.executeBackup(
        {
          id: '',
          host,
          port: parseInt(port),
          user,
          password,
          type
        },
        database,
        {
          includeData: includeData !== false,
          includeStructure: includeStructure !== false,
          includeProcedures: includeProcedures === true,
          includeViews: includeViews === true,
          includeTriggers: includeTriggers === true,
          includeFunctions: includeFunctions === true,
          tables
        }
      );

      // Save to file
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = fileName || `backup_${database}_${timestamp}.sql`;

      // Use provided destinationPath or fallback to config
      const backupDirectory = destinationPath || config.backup.storagePath;
      const backupPath = join(backupDirectory, backupFileName);

      // Ensure backup directory exists
      await mkdir(backupDirectory, { recursive: true });

      // Write backup file
      await writeFile(backupPath, sqlDump, 'utf-8');

      // Get table count from schema if not provided
      const tableCount = tables?.length || 0;
      const currentTimestamp = new Date().toISOString();

      // Save to backup history
      const backupRecord = {
        id: `backup_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        fileName: backupFileName,
        path: backupPath,
        fileSize: Buffer.byteLength(sqlDump, 'utf-8'),
        size: Buffer.byteLength(sqlDump, 'utf-8'),
        databaseName: database,
        database,
        host,
        port,
        type,
        backupType: includeData && includeStructure ? 'both' : includeData ? 'data' : 'structure',
        environment: 'production', // You can make this dynamic based on request
        createdAt: currentTimestamp,
        timestamp: currentTimestamp,
        status: 'completed',
        includeData,
        includeStructure,
        includeProcedures,
        includeViews,
        includeTriggers,
        includeFunctions,
        tablesCount: tableCount,
        statistics: {
          duration: 0, // Will be calculated on frontend
          totalObjects: tableCount,
        },
      };

      const history = await this.readHistory();
      history.unshift(backupRecord); // Add to beginning
      await this.writeHistory(history);

      res.json({
        success: true,
        message: 'Backup completed successfully',
        data: {
          fileName: backupFileName,
          path: backupPath,
          size: Buffer.byteLength(sqlDump, 'utf-8'),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Backup execution failed'
      });
    }
  }

  /**
   * Get backup history
   */
  async getBackupHistory(_req: Request, res: Response): Promise<void> {
    try {
      const history = await this.readHistory();
      res.json({
        success: true,
        history
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get backup history'
      });
    }
  }

  /**
   * Restore database from backup file with progress tracking
   */
  async restoreBackup(req: Request, res: Response): Promise<void> {
    try {
      const { readFile: readBackupFile } = await import('fs/promises');
      const {
        host,
        port,
        user,
        password,
        type,
        database,
        backupFilePath,
        restoreMode = 'replace', // Default to 'replace' mode, can be 'upsert'
      } = req.body;

      if (!host || !port || !user || !password || !type || !database || !backupFilePath) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: host, port, user, password, type, database, backupFilePath'
        });
        return;
      }

      // Generate unique restore ID
      const restoreId = `restore_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // Read the backup file
      const sqlContent = await readBackupFile(backupFilePath, 'utf-8');

      // Count objects using the same logic as the restore function
      // We need to parse statements the same way to get accurate counts

      // Clean the SQL the same way the restore function does
      const cleanedLines = sqlContent.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed &&
               !trimmed.startsWith('--') &&
               !trimmed.startsWith('/*') &&
               !trimmed.startsWith('*/');
      });

      let sql = cleanedLines.join('\n');
      sql = sql
        .replace(/CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+`[^`]+`;?/gi, '')
        .replace(/USE\s+`[^`]+`;?/gi, '');

      // Count statements using the same regex patterns as the restore categorization
      const tables = (sql.match(/CREATE\s+TABLE/gi) || []).length;
      const procedures = (sql.match(/CREATE\s+(DEFINER.*\s+)?PROCEDURE/gi) || []).length;
      const views = (sql.match(/CREATE\s+(DEFINER.*\s+)?VIEW/gi) || []).length;
      const triggers = (sql.match(/CREATE\s+(DEFINER.*\s+)?TRIGGER/gi) || []).length;
      const functions = (sql.match(/CREATE\s+(DEFINER.*\s+)?FUNCTION/gi) || []).length;

      const summary = {
        tables,
        procedures,
        views,
        triggers,
        functions,
        total: tables + procedures + views + triggers + functions
      };

      // Initialize progress
      restoreProgress.set(restoreId, {
        status: 'running',
        progress: 0,
        currentCount: 0,
        totalCount: summary.total,
        objectsRestored: {
          tables: 0,
          procedures: 0,
          views: 0,
          triggers: 0,
          functions: 0
        }
      });

      console.log('\n========================================');
      console.log('RESTORE STARTED');
      console.log('========================================');
      console.log(`Database: ${database}`);
      console.log(`Restore ID: ${restoreId}`);
      console.log(`Total Objects: ${summary.total}`);
      console.log(`  - Tables: ${summary.tables}`);
      console.log(`  - Procedures: ${summary.procedures}`);
      console.log(`  - Views: ${summary.views}`);
      console.log(`  - Triggers: ${summary.triggers}`);
      console.log(`  - Functions: ${summary.functions}`);
      console.log('========================================\n');

      // Execute restore in background and track progress
      (async () => {
        try {
          await databaseService.restoreBackup(
            {
              id: '',
              host,
              port: parseInt(port),
              user,
              password,
              type
            },
            database,
            sqlContent,
            restoreId,
            (progress) => {
              // Update progress
              restoreProgress.set(restoreId, progress);
            },
            restoreMode as 'replace' | 'upsert'
          );

          // Mark as completed
          const currentProgress = restoreProgress.get(restoreId);
          if (currentProgress) {
            restoreProgress.set(restoreId, {
              ...currentProgress,
              status: 'completed',
              progress: 100
            });
          }

          console.log('\n========================================');
          console.log('RESTORE COMPLETED SUCCESSFULLY');
          console.log('========================================\n');

        } catch (error: any) {
          const currentProgress = restoreProgress.get(restoreId);
          if (currentProgress) {
            restoreProgress.set(restoreId, {
              ...currentProgress,
              status: 'failed',
              error: error.message
            });
          }

          console.error('\n========================================');
          console.error('RESTORE FAILED');
          console.error('========================================');
          console.error('Error:', error.message);
          console.error('========================================\n');
        }
      })();

      // Return restore ID immediately
      res.json({
        success: true,
        message: 'Restore started',
        restoreId,
        summary
      });
    } catch (error: any) {
      console.error('\n========================================');
      console.error('RESTORE FAILED');
      console.error('========================================');
      console.error('Error:', error.message);
      console.error('========================================\n');

      res.status(500).json({
        success: false,
        message: error.message || 'Restore failed'
      });
    }
  }

  /**
   * Get restore progress
   */
  async getRestoreProgress(req: Request, res: Response): Promise<void> {
    try {
      const { restoreId } = req.params;

      const progress = restoreProgress.get(restoreId);

      if (!progress) {
        res.status(404).json({
          success: false,
          message: 'Restore not found'
        });
        return;
      }

      res.json({
        success: true,
        progress
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get restore progress'
      });
    }
  }

  /**
   * Browse file system directories
   */
  async browseDirectories(req: Request, res: Response) {
    try {
      const { readdir, stat } = await import('fs/promises');
      const { join, parse, sep } = await import('path');
      const { homedir } = await import('os');

      const requestedPath = req.query.path as string || homedir();

      // Read directory contents
      const entries = await readdir(requestedPath, { withFileTypes: true });

      const directories = await Promise.all(
        entries
          .filter(entry => entry.isDirectory())
          .map(async (entry) => {
            const fullPath = join(requestedPath, entry.name);
            try {
              const stats = await stat(fullPath);
              return {
                name: entry.name,
                path: fullPath,
                isDirectory: true,
                modifiedDate: stats.mtime
              };
            } catch (err) {
              // Skip directories we can't access
              return null;
            }
          })
      );

      // Filter out null entries (inaccessible directories)
      const accessibleDirs = directories.filter(dir => dir !== null);

      // Get parent directory path
      const pathParts = parse(requestedPath);
      const parentPath = pathParts.dir || (requestedPath === '/' ? null : '/');

      res.json({
        success: true,
        currentPath: requestedPath,
        parentPath,
        directories: accessibleDirs,
        separator: sep
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to browse directories'
      });
    }
  }

  async executeDeployment(req: Request, res: Response): Promise<void> {
    try {
      const { host, port, user, password, type, database, script } = req.body;

      if (!host || !port || !user || !password || !type || !database || !script) {
        res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
        return;
      }

      console.log('\n========================================');
      console.log('DEPLOYMENT EXECUTION STARTED');
      console.log('========================================');
      console.log(`Database: ${database}`);
      console.log(`Host: ${host}:${port}`);
      console.log('========================================\n');

      // Execute the deployment script
      const result = await databaseService.executeDeploymentScript(
        { host, port, user, password, type },
        database,
        script
      );

      if (!result.success) {
        res.status(500).json({
          success: false,
          message: 'Deployment failed',
          errors: result.errors
        });
        return;
      }

      console.log('\n========================================');
      console.log('DEPLOYMENT COMPLETED SUCCESSFULLY');
      console.log('========================================\n');

      res.json({
        success: true,
        message: 'Deployment completed successfully',
        errors: result.errors || []
      });
    } catch (error: any) {
      console.error('Deployment failed:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Deployment failed'
      });
    }
  }

  /**
   * Execute arbitrary SQL query
   */
  async executeQuery(req: Request, res: Response): Promise<void> {
    try {
      const { host, port, user, password, database, type, query } = req.body;

      if (!host || !port || !user || !password || !database || !type || !query) {
        res.status(400).json({
          success: false,
          message: 'Missing required parameters'
        });
        return;
      }

      console.log(`\n📝 Executing query on ${database}:`, query.substring(0, 100));

      // Execute the query
      const result = await databaseService.executeQuery(
        { host, port, user, password, type },
        database,
        query
      );

      res.json(result);
    } catch (error: any) {
      console.error('Query execution failed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Query execution failed'
      });
    }
  }
}

export const backupController = new BackupController();
