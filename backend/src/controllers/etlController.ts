import { Request, Response } from 'express';
import { runEtl, getTableColumns, getTableRelations, type EtlSourceConfig, type EtlTargetConfig, type EtlOptions } from '../services/etlService.js';

function parseEngine(type: string): 'mysql' | 'mssql' {
  const t = (type || 'mysql').toLowerCase();
  return t === 'mssql' ? 'mssql' : 'mysql';
}

export class EtlController {
  async runEtl(req: Request, res: Response): Promise<void> {
    try {
      const { source, target, options } = req.body;

      if (!source || !target) {
        res.status(400).json({
          success: false,
          error: 'Missing source or target configuration',
        });
        return;
      }

      const sourceConfig: EtlSourceConfig = {
        host: source.host,
        port: Number(source.port) || (parseEngine(source.type) === 'mssql' ? 1433 : 3306),
        user: source.user,
        password: source.password,
        type: parseEngine(source.type),
        database: source.database,
        table: source.table || 'unknown',
        customQuery: source.customQuery,
      };

      const targetConfig: EtlTargetConfig = {
        host: target.host,
        port: Number(target.port) || (parseEngine(target.type) === 'mssql' ? 1433 : 3306),
        user: target.user,
        password: target.password,
        type: parseEngine(target.type),
        database: target.database,
        table: target.table || 'unknown',
      };

      if (!sourceConfig.database || !targetConfig.database || !sourceConfig.table || !targetConfig.table) {
        res.status(400).json({
          success: false,
          error: 'Source and target must have database and table',
        });
        return;
      }

      const rawColumnMap = options?.transform?.columnMap;
      const columnMap: Record<string, string> | undefined =
        rawColumnMap &&
        typeof rawColumnMap === 'object' &&
        !Array.isArray(rawColumnMap)
          ? Object.fromEntries(
              Object.entries(rawColumnMap)
                .filter(
                  (entry): entry is [string, string] =>
                    typeof entry[0] === 'string' &&
                    typeof entry[1] === 'string' &&
                    entry[0].trim() !== '' &&
                    entry[1].trim() !== ''
                )
                .map(([k, v]) => [k.trim(), v.trim()])
            )
          : undefined;

      const etlOptions: EtlOptions = {
        mode: (options?.mode === 'elt' ? 'elt' : 'etl') as 'etl' | 'elt',
        transform:
          options?.mode === 'elt'
            ? options?.transform
              ? {
                  postLoadSql: typeof options.transform.postLoadSql === 'string' ? options.transform.postLoadSql.trim() || undefined : undefined,
                }
              : undefined
            : {
                columnMap: columnMap && Object.keys(columnMap).length > 0 ? columnMap : undefined,
                filter: typeof options?.transform?.filter === 'string' ? options.transform.filter.trim() || undefined : undefined,
                postLoadSql: undefined,
              },
        batchSize: Math.min(Math.max(Number(options?.batchSize) || 1000, 1), 10000),
        truncateFirst: Boolean(options?.truncateFirst),
      };

      const result = await runEtl(sourceConfig, targetConfig, etlOptions);

      res.json({
        success: result.success,
        rowsExtracted: result.rowsExtracted,
        rowsLoaded: result.rowsLoaded,
        batches: result.batches,
        error: result.error,
        logs: result.logs,
      });
    } catch (error: any) {
      console.error('ETL request failed:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'ETL failed',
        rowsExtracted: 0,
        rowsLoaded: 0,
        batches: 0,
        logs: [],
      });
    }
  }

  /** Get table column names for Map Columns / Auto-map UI. */
  async getTableColumns(req: Request, res: Response): Promise<void> {
    try {
      const { connection, database, table } = req.body;
      if (!connection || !database || !table) {
        res.status(400).json({ success: false, error: 'Missing connection, database, or table' });
        return;
      }
      const port = Number(connection.port) || (parseEngine(connection.type) === 'mssql' ? 1433 : 3306);
      const result = await getTableColumns(
        {
          host: connection.host,
          port,
          user: connection.user,
          password: connection.password,
          type: connection.type,
        },
        database,
        table
      );
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error, columns: [] });
        return;
      }
      res.json({ success: true, columns: result.columns ?? [] });
    } catch (error: any) {
      console.error('getTableColumns failed:', error);
      res.status(500).json({ success: false, error: error?.message || 'Failed to get columns', columns: [] });
    }
  }

  /** Get table FK relations for load-order guidance (parent/child). */
  async getTableRelations(req: Request, res: Response): Promise<void> {
    try {
      const { connection, database, table } = req.body;
      if (!connection || !database || !table) {
        res.status(400).json({ success: false, error: 'Missing connection, database, or table' });
        return;
      }
      const port = Number(connection.port) || (parseEngine(connection.type) === 'mssql' ? 1433 : 3306);
      const result = await getTableRelations(
        {
          host: connection.host,
          port,
          user: connection.user,
          password: connection.password,
          type: connection.type,
        },
        database,
        table
      );
      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
          referencedBy: [],
          references: [],
        });
        return;
      }
      res.json({
        success: true,
        referencedBy: result.referencedBy ?? [],
        references: result.references ?? [],
      });
    } catch (error: any) {
      console.error('getTableRelations failed:', error);
      res.status(500).json({
        success: false,
        error: error?.message || 'Failed to get table relations',
        referencedBy: [],
        references: [],
      });
    }
  }
}

export const etlController = new EtlController();
