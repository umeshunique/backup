/**
 * Universal ETL service: Extract from any supported DB (MySQL/MSSQL), Load into any.
 * Works same-server or cross-server, same engine or cross-engine.
 */

import { databaseService } from './databaseService.js';

export type DbEngine = 'mysql' | 'mssql';

export interface EtlConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  type: DbEngine;
  database: string;
}

export interface EtlSourceConfig extends EtlConnectionConfig {
  table: string;
  /** Optional custom SELECT (must return rows). If set, table is ignored for extract; paging may still use table for key. */
  customQuery?: string;
}

export interface EtlTargetConfig extends EtlConnectionConfig {
  table: string;
}

/** ETL: transform in-app (column map, filter). ELT: load raw then run SQL on target. */
export type EtlMode = 'etl' | 'elt';

/** Transform config: ETL uses columnMap + filter; ELT uses postLoadSql after load. */
export interface EtlTransformConfig {
  /** ETL: target column name -> source column name. Omit or empty = 1:1 same columns. */
  columnMap?: Record<string, string>;
  /** ETL: optional WHERE clause for extract (e.g. "status = 'active'"). Applied at source. */
  filter?: string;
  /** ELT: SQL to run on target DB after load (e.g. INSERT INTO final SELECT * FROM staging; EXEC sp_merge;). */
  postLoadSql?: string;
}

export interface EtlOptions {
  /** Pipeline mode: 'etl' (transform in app) or 'elt' (load raw, then transform in target). Default 'etl'. */
  mode?: EtlMode;
  /** Transform: column mapping + filter for ETL, postLoadSql for ELT. */
  transform?: EtlTransformConfig;
  /** Rows per batch for extract/load. Default 1000. */
  batchSize?: number;
  /** Truncate target table before load. Default false. */
  truncateFirst?: boolean;
  /** Optional progress callback: (phase, message, rowsProcessed) */
  onProgress?: (phase: string, message: string, rowsProcessed: number) => void;
}

export interface EtlResult {
  success: boolean;
  rowsExtracted: number;
  rowsLoaded: number;
  batches: number;
  error?: string;
  logs: string[];
}

function quoteIdentifier(name: string, engine: DbEngine): string {
  if (engine === 'mysql') {
    return '`' + String(name).replace(/`/g, '``') + '`';
  }
  return '[' + String(name).replace(/]/g, ']]') + ']';
}

/** Quote a table name that may be schema.table: each part quoted separately so MSSQL resolves schema.table correctly. */
function quoteTableName(table: string, engine: DbEngine): string {
  const parts = String(table).split('.').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return quoteIdentifier(table, engine);
  if (parts.length === 1) return quoteIdentifier(table, engine);
  return parts.map((p) => quoteIdentifier(p, engine)).join('.');
}

/** Get column names for a table (for Map Columns / Auto-map UI). */
export async function getTableColumns(
  connection: { host: string; port: number; user: string; password: string; type: string },
  database: string,
  table: string
): Promise<{ success: boolean; columns?: string[]; error?: string }> {
  const engine: DbEngine = (connection.type || 'mysql').toLowerCase() === 'mssql' ? 'mssql' : 'mysql';
  const creds = {
    host: connection.host,
    port: connection.port,
    user: connection.user,
    password: connection.password,
    type: connection.type,
  };
  try {
    if (engine === 'mssql') {
      // MSSQL: SELECT TOP 0 returns no rows and driver gives no column names. Use INFORMATION_SCHEMA so we get columns even for empty tables.
      const parts = String(table).split('.');
      const schemaPart = parts.length >= 2 ? `AND TABLE_SCHEMA = N'${parts[0].replace(/'/g, "''")}'` : '';
      const tablePart = parts.length >= 2 ? parts.slice(1).join('.') : table;
      const tableNameEscaped = String(tablePart).replace(/'/g, "''");
      const query = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_CATALOG = DB_NAME() ${schemaPart} AND TABLE_NAME = N'${tableNameEscaped}' ORDER BY ORDINAL_POSITION`;
      const result = await databaseService.executeQuery(creds, database, query);
      if (!result.success) {
        return { success: false, error: result.error || `Could not read table columns. Check that the server is reachable and the table "${table}" exists in database "${database}".` };
      }
      const rows = (result.rows || []) as { COLUMN_NAME?: string }[];
      const columns = rows.map((r) => r.COLUMN_NAME).filter((c): c is string => typeof c === 'string');
      if (columns.length === 0) {
        return { success: false, error: `No columns found for table "${table}" in database "${database}". Check that the table exists and you have access.` };
      }
      return { success: true, columns };
    }
    const quotedTable = quoteIdentifier(table, engine);
    const query = `SELECT * FROM ${quotedTable} LIMIT 0`;
    const result = await databaseService.executeQuery(creds, database, query);
    if (!result.success || !result.columns?.length) {
      const msg = result.error || 'Could not read table columns';
      return { success: false, error: `${msg} Check that the server is reachable and the table "${table}" exists in database "${database}".` };
    }
    return { success: true, columns: result.columns };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/** Get FK relations for load-order guidance: referencedBy = tables that reference this one (load this first); references = tables this one references (load those first). */
export async function getTableRelations(
  connection: { host: string; port: number; user: string; password: string; type: string },
  database: string,
  table: string
): Promise<{ success: boolean; referencedBy?: string[]; references?: string[]; error?: string }> {
  const engine: DbEngine = (connection.type || 'mysql').toLowerCase() === 'mssql' ? 'mssql' : 'mysql';
  const creds = {
    host: connection.host,
    port: connection.port,
    user: connection.user,
    password: connection.password,
    type: connection.type,
  };
  const tableName = String(table).split('.').pop() || table; // schema.table → table
  try {
    if (engine === 'mysql') {
      const schemaEscaped = '`' + String(database).replace(/`/g, '``') + '`';
      const query = `SELECT TABLE_NAME, REFERENCED_TABLE_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ${schemaEscaped} AND REFERENCED_TABLE_NAME IS NOT NULL`;
      const result = await databaseService.executeQuery(creds, database, query);
      if (!result.success) {
        return { success: false, error: result.error || 'Could not read table relations.' };
      }
      const rows = (result.rows || []) as { TABLE_NAME?: string; REFERENCED_TABLE_NAME?: string }[];
      const referencedBy = [...new Set(rows.filter((r) => r.REFERENCED_TABLE_NAME === tableName).map((r) => r.TABLE_NAME).filter(Boolean))] as string[];
      const references = [...new Set(rows.filter((r) => r.TABLE_NAME === tableName).map((r) => r.REFERENCED_TABLE_NAME).filter(Boolean))] as string[];
      return { success: true, referencedBy, references };
    }
    // MSSQL: could use sys.foreign_keys + sys.tables; for now return empty
    return { success: true, referencedBy: [], references: [] };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

function escapeValue(value: unknown, engine: DbEngine): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' && !Number.isNaN(value)) return String(value);
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof Date) {
    const iso = value.toISOString().replace('T', ' ').replace('Z', '');
    return engine === 'mysql' ? `'${iso}'` : `'${iso}'`;
  }
  const s = String(value);
  const escaped = s.replace(/'/g, "''");
  return `'${escaped}'`;
}

function buildSelectPage(
  engine: DbEngine,
  table: string,
  columns: string[],
  batchSize: number,
  offset: number,
  whereClause?: string | null
): string {
  const quotedTable = quoteTableName(table, engine);
  const cols = columns.map((c) => quoteIdentifier(c, engine)).join(', ');
  const where = whereClause ? ` WHERE ${whereClause}` : '';
  if (engine === 'mysql') {
    return `SELECT ${cols} FROM ${quotedTable}${where} LIMIT ${batchSize} OFFSET ${offset}`;
  }
  return `SELECT ${cols} FROM ${quotedTable}${where} ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${batchSize} ROWS ONLY`;
}

/** Get value from row by column name; match case-insensitively so DB-returned keys work. */
function getRowValue(row: Record<string, unknown>, columnName: string): unknown {
  if (row[columnName] !== undefined) return row[columnName];
  const lower = columnName.toLowerCase();
  const key = Object.keys(row).find((k) => k.toLowerCase() === lower);
  return key !== undefined ? row[key] : undefined;
}

function buildInsert(
  engine: DbEngine,
  table: string,
  columns: string[],
  rows: Record<string, unknown>[]
): string {
  if (rows.length === 0) return '';
  const quotedTable = quoteTableName(table, engine);
  const quotedCols = columns.map((c) => quoteIdentifier(c, engine)).join(', ');
  const values = rows.map((row) => {
    const vals = columns.map((col) => escapeValue(getRowValue(row, col), engine));
    return `(${vals.join(', ')})`;
  });
  if (engine === 'mysql') {
    return `INSERT INTO ${quotedTable} (${quotedCols}) VALUES ${values.join(', ')}`;
  }
  return `INSERT INTO ${quotedTable} (${quotedCols}) VALUES ${values.join(', ')}`;
}

export async function runEtl(
  source: EtlSourceConfig,
  target: EtlTargetConfig,
  options: EtlOptions = {}
): Promise<EtlResult> {
  const batchSize = Math.min(Math.max(options.batchSize ?? 1000, 1), 10000);
  const mode: EtlMode = options.mode === 'elt' ? 'elt' : 'etl';
  const transform = options.transform ?? {};
  const columnMap = transform.columnMap && Object.keys(transform.columnMap).length > 0 ? transform.columnMap : null;
  const filterClause = transform.filter?.trim() || null;
  const postLoadSql = transform.postLoadSql?.trim() || null;

  const logs: string[] = [];
  const log = (msg: string) => {
    logs.push(msg);
    options.onProgress?.('log', msg, 0);
  };

  const credentials = (config: EtlConnectionConfig) => ({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    type: config.type,
  });

  try {
    log(`${mode.toUpperCase()} started: ${source.database}.${source.table} → ${target.database}.${target.table}`);
    log(`Source: ${source.type} @ ${source.host}:${source.port}`);
    log(`Target: ${target.type} @ ${target.host}:${target.port}`);
    log(`Mode: ${mode}`);
    if (columnMap) log(`Transform: column map (${Object.keys(columnMap).length} target columns)`);
    if (filterClause) log(`Transform: filter (WHERE) applied at extract`);
    if (mode === 'elt' && postLoadSql) log(`ELT: post-load SQL will run on target after load`);
    log(`Batch size: ${batchSize}`);

    const sourceCreds = credentials(source);
    const targetCreds = credentials(target);

    // 1) Get source column list by selecting one row (or zero)
    const tableOrSubquery = source.customQuery
      ? `(${source.customQuery}) AS __etl_probe`
      : quoteTableName(source.table, source.type);
    const whereProbe = filterClause ? ` WHERE ${filterClause}` : '';
    const probeSql =
      source.type === 'mysql'
        ? `SELECT * FROM ${tableOrSubquery}${whereProbe} LIMIT 1`
        : `SELECT TOP 1 * FROM ${tableOrSubquery}${whereProbe}`;
    const probeResult = await databaseService.executeQuery(
      sourceCreds,
      source.database,
      probeSql
    );
    let sourceColumns: string[];
    if (!probeResult.success) {
      const msg = probeResult.error || 'Could not read source columns';
      return {
        success: false,
        rowsExtracted: 0,
        rowsLoaded: 0,
        batches: 0,
        error: `${msg} Check that the source server is reachable and the table "${source.table}" exists in database "${source.database}".`,
        logs,
      };
    }
    if (probeResult.columns?.length) {
      sourceColumns = probeResult.columns;
    } else {
      // Empty table or driver returned no column metadata (e.g. MSSQL with 0 rows). Fall back to schema query.
      const colsResult = await getTableColumns(
        { ...sourceCreds, type: source.type },
        source.database,
        source.table
      );
      if (!colsResult.success || !colsResult.columns?.length) {
        return {
          success: false,
          rowsExtracted: 0,
          rowsLoaded: 0,
          batches: 0,
          error: colsResult.error || 'Could not read source columns. The table may be empty or inaccessible.',
          logs,
        };
      }
      sourceColumns = colsResult.columns;
      log(`Source columns (from schema): ${sourceColumns.join(', ')}`);
    }
    let targetColumns: string[] = sourceColumns;
    if (columnMap) {
      targetColumns = Object.keys(columnMap);
      const missing = targetColumns.filter((tc) => !sourceColumns.includes(columnMap[tc]));
      if (missing.length > 0) {
        return {
          success: false,
          rowsExtracted: 0,
          rowsLoaded: 0,
          batches: 0,
          error: `Column map references missing source columns: ${missing.map((m) => columnMap[m]).join(', ')}`,
          logs,
        };
      }
      log(`Target columns (mapped): ${targetColumns.join(', ')}`);
    } else {
      log(`Source columns: ${sourceColumns.join(', ')}`);
    }

    if (options.truncateFirst) {
      log('Truncating target table...');
      let truncResult: { success: boolean; error?: string };
      if (target.type === 'mysql') {
        const quotedTable = quoteTableName(target.table, target.type);
        const truncateWithFk =
          `SET FOREIGN_KEY_CHECKS = 0;\n` +
          `TRUNCATE TABLE ${quotedTable};\n` +
          `SET FOREIGN_KEY_CHECKS = 1;`;
        truncResult = await databaseService.executeMySQLMultiStatement(
          targetCreds,
          target.database,
          truncateWithFk
        );
      } else {
        const truncateSql = `TRUNCATE TABLE ${quoteTableName(target.table, target.type)}`;
        const res = await databaseService.executeQuery(targetCreds, target.database, truncateSql);
        truncResult = res.success ? { success: true } : { success: false, error: res.error };
      }
      if (!truncResult.success) {
        return {
          success: false,
          rowsExtracted: 0,
          rowsLoaded: 0,
          batches: 0,
          error: `Truncate failed: ${truncResult.error}`,
          logs,
        };
      }
      log('Target truncated.');
    }

    let offset = 0;
    let totalExtracted = 0;
    let totalLoaded = 0;
    let batchCount = 0;

    while (true) {
      const extractSql = source.customQuery
        ? (() => {
            const sub = `(${source.customQuery}) AS __etl_sub`;
            const where = filterClause ? ` WHERE ${filterClause}` : '';
            if (source.type === 'mysql') {
              return `SELECT * FROM ${sub}${where} LIMIT ${batchSize} OFFSET ${offset}`;
            }
            return `SELECT * FROM ${sub}${where} ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${batchSize} ROWS ONLY`;
          })()
        : buildSelectPage(source.type, source.table, sourceColumns, batchSize, offset, filterClause);

      const extractResult = await databaseService.executeQuery(
        sourceCreds,
        source.database,
        extractSql
      );

      if (!extractResult.success) {
        return {
          success: false,
          rowsExtracted: totalExtracted,
          rowsLoaded: totalLoaded,
          batches: batchCount,
          error: `Extract failed: ${extractResult.error}`,
          logs,
        };
      }

      let rows = (extractResult.rows || []) as Record<string, unknown>[];
      if (columnMap && rows.length > 0) {
        rows = rows.map((row) => {
          const out: Record<string, unknown> = {};
          for (const tc of targetColumns) {
            const sourceCol = columnMap[tc];
            out[tc] = getRowValue(row, sourceCol);
          }
          return out;
        });
      }
      if (rows.length === 0) break;

      totalExtracted += (extractResult.rows || []).length;
      options.onProgress?.('extract', `Fetched ${rows.length} rows`, totalExtracted);

      const insertSql = buildInsert(target.type, target.table, targetColumns, rows);
      const insertResult = await databaseService.executeQuery(
        targetCreds,
        target.database,
        insertSql
      );

      if (!insertResult.success) {
        return {
          success: false,
          rowsExtracted: totalExtracted,
          rowsLoaded: totalLoaded,
          batches: batchCount,
          error: `Load failed at batch ${batchCount + 1}: ${insertResult.error}`,
          logs,
        };
      }

      const inserted = insertResult.affectedRows ?? rows.length;
      totalLoaded += inserted;
      batchCount++;
      options.onProgress?.('load', `Loaded batch ${batchCount} (${totalLoaded} rows)`, totalLoaded);
      log(`Batch ${batchCount}: ${rows.length} rows → ${inserted} loaded (total ${totalLoaded})`);

      if (rows.length < batchSize) break;
      offset += batchSize;
    }

    if (totalExtracted === 0) {
      log('Source table has no rows. If you expected data, check that the source table is not empty and that any WHERE filter is not excluding all rows.');
    }

    if (mode === 'elt' && postLoadSql) {
      log('Running ELT post-load SQL on target...');
      const postResult = await databaseService.executeQuery(targetCreds, target.database, postLoadSql);
      if (!postResult.success) {
        return {
          success: false,
          rowsExtracted: totalExtracted,
          rowsLoaded: totalLoaded,
          batches: batchCount,
          error: `ELT post-load SQL failed: ${postResult.error}`,
          logs,
        };
      }
      log('Post-load SQL completed.');
    }

    log(`${mode.toUpperCase()} completed. Extracted: ${totalExtracted}, Loaded: ${totalLoaded}, Batches: ${batchCount}`);
    return {
      success: true,
      rowsExtracted: totalExtracted,
      rowsLoaded: totalLoaded,
      batches: batchCount,
      logs,
    };
  } catch (err: any) {
    const message = err?.message || String(err);
    log(`ETL error: ${message}`);
    return {
      success: false,
      rowsExtracted: 0,
      rowsLoaded: 0,
      batches: 0,
      error: message,
      logs,
    };
  }
}
