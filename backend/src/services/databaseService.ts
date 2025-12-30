import mysql from 'mysql2/promise';

export interface DatabaseConfig {
  id: string;
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  type: 'mysql' | 'mssql' | 'postgresql';
}

export interface DatabaseSchema {
  name: string;
  tables: TableInfo[];
  views: ViewInfo[];
  procedures: ProcedureInfo[];
  functions: FunctionInfo[];
  triggers: TriggerInfo[];
}

export interface TableInfo {
  name: string;
  rowCount: number;
  size: number;
  engine?: string;
}

export interface ViewInfo {
  name: string;
}

export interface ProcedureInfo {
  name: string;
}

export interface FunctionInfo {
  name: string;
}

export interface TriggerInfo {
  name: string;
  table: string;
}

class DatabaseService {
  /**
   * Test database connection
   */
  async testConnection(config: DatabaseConfig): Promise<{ success: boolean; message: string }> {
    try {
      if (config.type !== 'mysql') {
        throw new Error(`Database type ${config.type} is not yet supported. Currently only MySQL is supported.`);
      }

      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: config.database,
        connectTimeout: 10000
      });

      await connection.ping();
      await connection.end();

      return {
        success: true,
        message: 'Connection successful'
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Connection failed'
      };
    }
  }

  /**
   * Get list of databases on a server
   */
  async getDatabases(config: DatabaseConfig): Promise<string[]> {
    try {
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password
      });

      const [rows] = await connection.query('SHOW DATABASES');
      await connection.end();

      return (rows as any[])
        .map(row => row.Database)
        .filter(db => !['information_schema', 'mysql', 'performance_schema', 'sys'].includes(db));
    } catch (error: any) {
      throw new Error(`Failed to get databases: ${error.message}`);
    }
  }

  /**
   * Get database schema information
   */
  async getDatabaseSchema(config: DatabaseConfig, databaseName: string): Promise<any> {
    try {
      console.log(`🔍 getDatabaseSchema called for database: ${databaseName}`);

      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: databaseName
      });

      console.log(`✅ Connected to database: ${databaseName}`);

      // Get tables
      const [tablesResult] = await connection.query(`
        SELECT
          TABLE_NAME as name,
          TABLE_ROWS as rowCount,
          DATA_LENGTH + INDEX_LENGTH as size,
          ENGINE as engine,
          TABLE_COLLATION as collation,
          TABLE_COMMENT as comment
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
        AND TABLE_TYPE = 'BASE TABLE'
      `, [databaseName]);

      console.log(`📊 Found ${(tablesResult as any[]).length} tables in ${databaseName}`);

      // Get views
      const [viewsResult] = await connection.query(`
        SELECT TABLE_NAME as name
        FROM information_schema.VIEWS
        WHERE TABLE_SCHEMA = ?
      `, [databaseName]);

      // Get stored procedures
      const [proceduresResult] = await connection.query(`
        SELECT ROUTINE_NAME as name
        FROM information_schema.ROUTINES
        WHERE ROUTINE_SCHEMA = ?
        AND ROUTINE_TYPE = 'PROCEDURE'
      `, [databaseName]);

      // Get functions
      const [functionsResult] = await connection.query(`
        SELECT ROUTINE_NAME as name
        FROM information_schema.ROUTINES
        WHERE ROUTINE_SCHEMA = ?
        AND ROUTINE_TYPE = 'FUNCTION'
      `, [databaseName]);

      // Get triggers
      const [triggersResult] = await connection.query(`
        SELECT
          TRIGGER_NAME as name,
          EVENT_OBJECT_TABLE as \`table\`
        FROM information_schema.TRIGGERS
        WHERE TRIGGER_SCHEMA = ?
      `, [databaseName]);

      console.log(`📋 Processing ${(tablesResult as any[]).length} tables for detailed information...`);

      // Get ALL columns for ALL tables in ONE query (much faster!)
      const [allColumnsResult] = await connection.query(`
        SELECT
          TABLE_NAME as tableName,
          COLUMN_NAME as name,
          COLUMN_TYPE as dataType,
          IS_NULLABLE as nullable,
          COLUMN_DEFAULT as defaultValue,
          COLUMN_KEY as \`key\`,
          EXTRA as extra,
          COLUMN_COMMENT as comment,
          CHARACTER_MAXIMUM_LENGTH as maxLength,
          NUMERIC_PRECISION as \`precision\`,
          NUMERIC_SCALE as scale
        FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME, ORDINAL_POSITION
      `, [databaseName]);

      // Get ALL foreign key constraints in ONE query
      const [allFkConstraints] = await connection.query(`
        SELECT
          TABLE_NAME as tableName,
          CONSTRAINT_NAME as name,
          COLUMN_NAME as columnName,
          REFERENCED_TABLE_NAME as referencedTable,
          REFERENCED_COLUMN_NAME as referencedColumn
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = ?
          AND REFERENCED_TABLE_NAME IS NOT NULL
        ORDER BY TABLE_NAME, ORDINAL_POSITION
      `, [databaseName]);

      // Group columns by table
      const columnsByTable = new Map();
      (allColumnsResult as any[]).forEach(col => {
        if (!columnsByTable.has(col.tableName)) {
          columnsByTable.set(col.tableName, []);
        }
        columnsByTable.get(col.tableName).push(col);
      });

      // Group constraints by table
      const constraintsByTable = new Map();
      (allFkConstraints as any[]).forEach(fk => {
        if (!constraintsByTable.has(fk.tableName)) {
          constraintsByTable.set(fk.tableName, new Map());
        }
        const tableConstraints = constraintsByTable.get(fk.tableName);
        if (!tableConstraints.has(fk.name)) {
          tableConstraints.set(fk.name, {
            name: fk.name,
            type: 'FOREIGN KEY',
            columns: [],
            referencedTable: fk.referencedTable,
            referencedColumns: []
          });
        }
        const constraint = tableConstraints.get(fk.name);
        constraint.columns.push(fk.columnName);
        constraint.referencedColumns.push(fk.referencedColumn);
      });

      // Process table data (no CREATE TABLE statements for performance)
      const tables = tablesResult as any[];
      const enhancedTables = tables.map((table) => {
        const columns = columnsByTable.get(table.name) || [];
        const tableConstraints = constraintsByTable.get(table.name);

        return {
          name: table.name,
          rowCount: table.rowCount || 0,
          sizeInMB: parseFloat(((table.size || 0) / (1024 * 1024)).toFixed(2)),
          lastModified: new Date(),
          hasTriggers: false,
          engine: table.engine,
          collation: table.collation,
          comment: table.comment,
          columns: columns.map((col: any) => ({
            name: col.name,
            dataType: col.dataType,
            nullable: col.nullable === 'YES',
            defaultValue: col.defaultValue,
            isPrimaryKey: col.key === 'PRI',
            isForeignKey: col.key === 'MUL',
            isUnique: col.key === 'UNI',
            autoIncrement: col.extra?.includes('auto_increment') || false,
            maxLength: col.maxLength,
            precision: col.precision,
            scale: col.scale,
            comment: col.comment
          })),
          constraints: tableConstraints ? Array.from(tableConstraints.values()) : []
        };
      });

      // Process database objects (no definitions for performance - fetch on demand)
      const proceduresWithDef = (proceduresResult as any[]).map(proc => ({
        name: proc.name,
        parameterCount: 0,
        lastModified: new Date()
      }));

      const viewsWithDef = (viewsResult as any[]).map(view => ({
        name: view.name,
        dependencies: [],
        hasTriggers: false
      }));

      const functionsWithDef = (functionsResult as any[]).map(func => ({
        name: func.name,
        type: 'scalar' as const,
        parameterCount: 0
      }));

      const triggersWithDef = (triggersResult as any[]).map(trigger => ({
        name: trigger.name,
        type: 'insert' as const,
        associatedTable: trigger.table
      }));

      await connection.end();

      console.log(`✅ Successfully processed schema for ${databaseName}`);
      console.log(`   Tables: ${enhancedTables.length}`);
      console.log(`   Procedures: ${proceduresWithDef.length}`);
      console.log(`   Views: ${viewsWithDef.length}`);
      console.log(`   Functions: ${functionsWithDef.length}`);
      console.log(`   Triggers: ${triggersWithDef.length}`);

      // Calculate totals
      const totalSizeInBytes = enhancedTables.reduce((sum, table) => sum + ((table.sizeInMB || 0) * 1024 * 1024), 0);
      const sizeInMB = totalSizeInBytes / (1024 * 1024);

      const result = {
        name: databaseName,
        tableCount: enhancedTables.length,
        sizeInMB: parseFloat(sizeInMB.toFixed(2)),
        tables: enhancedTables,
        procedures: proceduresWithDef,
        views: viewsWithDef,
        functions: functionsWithDef,
        triggers: triggersWithDef,
        events: []
      };

      console.log(`📤 Returning schema for ${databaseName}`);
      return result;
    } catch (error: any) {
      console.error(`❌ Error in getDatabaseSchema for ${databaseName}:`, error);
      throw new Error(`Failed to get database schema: ${error.message}`);
    }
  }

  /**
   * Execute backup for a database
   */
  async executeBackup(
    config: DatabaseConfig,
    databaseName: string,
    options: {
      includeData: boolean;
      includeStructure: boolean;
      includeProcedures: boolean;
      includeViews: boolean;
      includeTriggers: boolean;
      includeFunctions: boolean;
      tables?: string[];
    }
  ): Promise<string> {
    try {
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: databaseName
      });

      let sqlDump = '';
      sqlDump += `-- Database Backup\n`;
      sqlDump += `-- Database: ${databaseName}\n`;
      sqlDump += `-- Date: ${new Date().toISOString()}\n\n`;
      sqlDump += `CREATE DATABASE IF NOT EXISTS \`${databaseName}\`;\n`;
      sqlDump += `USE \`${databaseName}\`;\n\n`;

      // Get tables
      const [tables] = await connection.query(`
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
        AND TABLE_TYPE = 'BASE TABLE'
      `, [databaseName]);

      for (const table of tables as any[]) {
        const tableName = table.TABLE_NAME;

        // Skip if specific tables selected and this isn't one
        if (options.tables && options.tables.length > 0 && !options.tables.includes(tableName)) {
          continue;
        }

        if (options.includeStructure) {
          sqlDump += `-- Table structure for \`${tableName}\`\n`;
          sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;

          const [createTableResult] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
          const createTable = (createTableResult as any)[0]['Create Table'];
          sqlDump += createTable + ';\n\n';
        }

        if (options.includeData) {
          const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);

          if ((rows as any[]).length > 0) {
            sqlDump += `-- Data for table \`${tableName}\`\n`;

            // Use batch inserts for much better performance (100 rows per INSERT)
            const batchSize = 100;
            for (let i = 0; i < (rows as any[]).length; i += batchSize) {
              const batch = (rows as any[]).slice(i, i + batchSize);
              const columns = Object.keys(batch[0]);

              sqlDump += `INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) VALUES\n`;

              const valueRows = batch.map(row => {
                const values = columns.map(col => {
                  const val = row[col];
                  if (val === null || val === undefined) return 'NULL';
                  if (typeof val === 'string') return `'${val.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
                  if (val instanceof Date) {
                    // Handle invalid dates (like MySQL's 0000-00-00 00:00:00)
                    if (isNaN(val.getTime())) {
                      return "'0000-00-00 00:00:00'";
                    }
                    return `'${val.toISOString()}'`;
                  }
                  if (val instanceof Buffer) return `0x${val.toString('hex')}`;
                  if (typeof val === 'boolean') return val ? '1' : '0';
                  if (typeof val === 'number') return val.toString();
                  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
                  return val;
                });
                return `(${values.join(', ')})`;
              });

              sqlDump += valueRows.join(',\n') + ';\n';
            }
            sqlDump += '\n';
          }
        }
      }

      // Include views
      if (options.includeViews) {
        const [views] = await connection.query(`
          SELECT TABLE_NAME
          FROM information_schema.VIEWS
          WHERE TABLE_SCHEMA = ?
        `, [databaseName]);

        for (const view of views as any[]) {
          const viewName = view.TABLE_NAME;
          sqlDump += `-- View structure for \`${viewName}\`\n`;
          const [createViewResult] = await connection.query(`SHOW CREATE VIEW \`${viewName}\``);
          const createView = (createViewResult as any)[0]['Create View'];
          sqlDump += `DROP VIEW IF EXISTS \`${viewName}\`;\n`;
          sqlDump += createView + ';\n\n';
        }
      }

      // Include procedures
      if (options.includeProcedures) {
        const [procedures] = await connection.query(`
          SELECT ROUTINE_NAME
          FROM information_schema.ROUTINES
          WHERE ROUTINE_SCHEMA = ?
          AND ROUTINE_TYPE = 'PROCEDURE'
        `, [databaseName]);

        for (const proc of procedures as any[]) {
          const procName = proc.ROUTINE_NAME;
          sqlDump += `-- Stored procedure \`${procName}\`\n`;
          const [createProcResult] = await connection.query(`SHOW CREATE PROCEDURE \`${procName}\``);
          const createProc = (createProcResult as any)[0]['Create Procedure'];
          sqlDump += `DROP PROCEDURE IF EXISTS \`${procName}\`;\n`;
          sqlDump += `DELIMITER $$\n${createProc}$$\nDELIMITER ;\n\n`;
        }
      }

      // Include functions
      if (options.includeFunctions) {
        const [functions] = await connection.query(`
          SELECT ROUTINE_NAME
          FROM information_schema.ROUTINES
          WHERE ROUTINE_SCHEMA = ?
          AND ROUTINE_TYPE = 'FUNCTION'
        `, [databaseName]);

        for (const func of functions as any[]) {
          const funcName = func.ROUTINE_NAME;
          sqlDump += `-- Function \`${funcName}\`\n`;
          const [createFuncResult] = await connection.query(`SHOW CREATE FUNCTION \`${funcName}\``);
          const createFunc = (createFuncResult as any)[0]['Create Function'];
          sqlDump += `DROP FUNCTION IF EXISTS \`${funcName}\`;\n`;
          sqlDump += `DELIMITER $$\n${createFunc}$$\nDELIMITER ;\n\n`;
        }
      }

      // Include triggers
      if (options.includeTriggers) {
        const [triggers] = await connection.query(`
          SELECT TRIGGER_NAME
          FROM information_schema.TRIGGERS
          WHERE TRIGGER_SCHEMA = ?
        `, [databaseName]);

        for (const trigger of triggers as any[]) {
          const triggerName = trigger.TRIGGER_NAME;
          sqlDump += `-- Trigger \`${triggerName}\`\n`;
          const [createTriggerResult] = await connection.query(`SHOW CREATE TRIGGER \`${triggerName}\``);
          const createTrigger = (createTriggerResult as any)[0]['SQL Original Statement'];
          sqlDump += `DROP TRIGGER IF EXISTS \`${triggerName}\`;\n`;
          sqlDump += `DELIMITER $$\n${createTrigger}$$\nDELIMITER ;\n\n`;
        }
      }

      await connection.end();
      return sqlDump;
    } catch (error: any) {
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  /**
   * Restore database from SQL backup
   */
  async restoreBackup(
    config: DatabaseConfig,
    databaseName: string,
    sqlContent: string,
    _restoreId?: string,
    progressCallback?: (progress: any) => void,
    restoreMode: 'replace' | 'upsert' = 'replace'
  ): Promise<void> {
    try {
      const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.user,
        password: config.password,
        database: databaseName,
        multipleStatements: true // Enable batch execution for speed
      });

      // Disable foreign key checks and optimize for restore
      await connection.query('SET FOREIGN_KEY_CHECKS = 0;');
      await connection.query('SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";');
      await connection.query('SET AUTOCOMMIT = 0;'); // Use transactions for speed

      // Clean and prepare SQL
      const lines = sqlContent.split('\n');
      const cleanedLines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed &&
               !trimmed.startsWith('--') &&
               !trimmed.startsWith('/*') &&
               !trimmed.startsWith('*/');
      });

      let sql = cleanedLines.join('\n');

      // Remove problematic statements but preserve procedure/function/trigger delimiters
      sql = sql
        .replace(/CREATE\s+DATABASE\s+IF\s+NOT\s+EXISTS\s+`[^`]+`;?/gi, '')
        .replace(/USE\s+`[^`]+`;?/gi, '');

      // Split into individual statements
      const statements: string[] = [];
      let currentStmt = '';
      let inProc = false;
      let bracketCount = 0;
      let currentDelimiter = ';';

      for (const line of sql.split('\n')) {
        const trimmed = line.trim();

        // Check for DELIMITER changes
        if (trimmed.match(/^DELIMITER\s+(.+)$/i)) {
          const match = trimmed.match(/^DELIMITER\s+(.+)$/i);
          if (match) {
            currentDelimiter = match[1].trim();
          }
          continue; // Skip DELIMITER lines themselves
        }

        // Detect procedure/function/trigger start
        if (trimmed.match(/^(CREATE|ALTER)\s+(DEFINER.*\s+)?(PROCEDURE|FUNCTION|TRIGGER)/i)) {
          inProc = true;
          bracketCount = 0;
        }

        currentStmt += line + '\n';

        // Count BEGIN/END blocks
        if (inProc) {
          if (trimmed.match(/\bBEGIN\b/i)) bracketCount++;
          if (trimmed.match(/\bEND\b/i)) bracketCount--;
        }

        // Check for statement end based on current delimiter
        const endsWithDelimiter = currentDelimiter === '$$'
          ? trimmed.endsWith('$$')
          : trimmed.endsWith(';');

        if (endsWithDelimiter) {
          if (inProc && bracketCount <= 0) {
            // Remove the $$ delimiter and add back semicolon for MySQL execution
            const cleanStmt = currentStmt.trim().replace(/\$\$$/, ';');
            statements.push(cleanStmt);
            currentStmt = '';
            inProc = false;
            currentDelimiter = ';'; // Reset delimiter
          } else if (!inProc) {
            const cleanStmt = currentStmt.trim().replace(/\$\$$/, ';');
            statements.push(cleanStmt);
            currentStmt = '';
          }
        }
      }

      if (currentStmt.trim()) {
        const cleanStmt = currentStmt.trim().replace(/\$\$$/, ';');
        statements.push(cleanStmt);
      }

      // Group statements by type for optimized execution order
      const dropTableStatements: string[] = [];
      const createTableStatements: string[] = [];
      const dataStatements: string[] = [];
      const dropFunctionStatements: string[] = [];
      const createFunctionStatements: string[] = [];
      const dropProcedureStatements: string[] = [];
      const createProcedureStatements: string[] = [];
      const dropViewStatements: string[] = [];
      const createViewStatements: string[] = [];
      const dropTriggerStatements: string[] = [];
      const createTriggerStatements: string[] = [];
      const otherStatements: string[] = [];

      // Categorize all statements
      for (const stmt of statements) {
        if (stmt.match(/^DROP\s+TABLE/i)) {
          dropTableStatements.push(stmt);
        } else if (stmt.match(/^CREATE\s+TABLE/i)) {
          createTableStatements.push(stmt);
        } else if (stmt.match(/^INSERT\s+INTO/i)) {
          dataStatements.push(stmt);
        } else if (stmt.match(/^DROP\s+FUNCTION/i)) {
          dropFunctionStatements.push(stmt);
        } else if (stmt.match(/^CREATE\s+(DEFINER.*\s+)?FUNCTION/i)) {
          createFunctionStatements.push(stmt);
        } else if (stmt.match(/^DROP\s+PROCEDURE/i)) {
          dropProcedureStatements.push(stmt);
        } else if (stmt.match(/^CREATE\s+(DEFINER.*\s+)?PROCEDURE/i)) {
          createProcedureStatements.push(stmt);
        } else if (stmt.match(/^DROP\s+VIEW/i)) {
          dropViewStatements.push(stmt);
        } else if (stmt.match(/^CREATE\s+(DEFINER.*\s+)?VIEW/i)) {
          createViewStatements.push(stmt);
        } else if (stmt.match(/^DROP\s+TRIGGER/i)) {
          dropTriggerStatements.push(stmt);
        } else if (stmt.match(/^CREATE\s+(DEFINER.*\s+)?TRIGGER/i)) {
          createTriggerStatements.push(stmt);
        } else {
          otherStatements.push(stmt);
        }
      }

      // Combine DROP and CREATE statements based on restore mode
      let tableStatements: string[] = [];
      let functionStatements: string[] = [];
      let procedureStatements: string[] = [];
      let viewStatements: string[] = [];
      let triggerStatements: string[] = [];
      let processedDataStatements: string[] = [];

      if (restoreMode === 'upsert') {
        // UPSERT MODE: CREATE IF NOT EXISTS, skip DROP statements

        // Convert CREATE TABLE to CREATE TABLE IF NOT EXISTS
        tableStatements = createTableStatements.map(stmt => {
          if (!stmt.match(/IF\s+NOT\s+EXISTS/i)) {
            return stmt.replace(/CREATE\s+TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS ');
          }
          return stmt;
        });

        // Convert INSERT INTO to INSERT IGNORE INTO
        processedDataStatements = dataStatements.map(stmt => {
          if (!stmt.match(/INSERT\s+IGNORE/i)) {
            return stmt.replace(/INSERT\s+INTO\s+/i, 'INSERT IGNORE INTO ');
          }
          return stmt;
        });

        // For procedures, views, triggers, functions: use DROP IF EXISTS + CREATE
        // MySQL doesn't have CREATE OR REPLACE for all object types reliably
        functionStatements = [
          ...dropFunctionStatements.map(stmt => stmt.replace(/DROP\s+FUNCTION\s+/i, 'DROP FUNCTION IF EXISTS ')),
          ...createFunctionStatements
        ];

        procedureStatements = [
          ...dropProcedureStatements.map(stmt => stmt.replace(/DROP\s+PROCEDURE\s+/i, 'DROP PROCEDURE IF EXISTS ')),
          ...createProcedureStatements
        ];

        viewStatements = [
          ...dropViewStatements.map(stmt => stmt.replace(/DROP\s+VIEW\s+/i, 'DROP VIEW IF EXISTS ')),
          ...createViewStatements
        ];

        triggerStatements = [
          ...dropTriggerStatements.map(stmt => stmt.replace(/DROP\s+TRIGGER\s+/i, 'DROP TRIGGER IF EXISTS ')),
          ...createTriggerStatements
        ];
      } else {
        // REPLACE MODE: Original behavior - DROP then CREATE
        tableStatements = [...dropTableStatements, ...createTableStatements];
        functionStatements = [...dropFunctionStatements, ...createFunctionStatements];
        procedureStatements = [...dropProcedureStatements, ...createProcedureStatements];
        viewStatements = [...dropViewStatements, ...createViewStatements];
        triggerStatements = [...dropTriggerStatements, ...createTriggerStatements];
        processedDataStatements = dataStatements;
      }

      // Count only CREATE statements for reporting (not DROP)
      const tablesCreated = createTableStatements.length;
      const proceduresCreated = createProcedureStatements.length;
      const viewsCreated = createViewStatements.length;
      const triggersCreated = createTriggerStatements.length;
      const functionsCreated = createFunctionStatements.length;
      const dataInserted = dataStatements.length;

      console.log(`\n╔════════════════════════════════════════╗`);
      console.log(`║      OPTIMIZED RESTORE STARTED         ║`);
      console.log(`╠════════════════════════════════════════╣`);
      console.log(`║  Tables:      ${tablesCreated.toString().padEnd(24)}║`);
      console.log(`║  Data Inserts: ${dataInserted.toString().padEnd(23)}║`);
      console.log(`║  Functions:   ${functionsCreated.toString().padEnd(24)}║`);
      console.log(`║  Procedures:  ${proceduresCreated.toString().padEnd(24)}║`);
      console.log(`║  Views:       ${viewsCreated.toString().padEnd(24)}║`);
      console.log(`║  Triggers:    ${triggersCreated.toString().padEnd(24)}║`);
      console.log(`║  Other:       ${otherStatements.length.toString().padEnd(24)}║`);
      console.log(`║  Total:       ${statements.length.toString().padEnd(24)}║`);
      console.log(`╚════════════════════════════════════════╝\n`);

      console.log(`⚡ Executing in optimized order: Tables → Data → Functions → Procedures → Views → Triggers\n`);

      // Track progress during execution
      let currentTablesRestored = 0;
      let currentProceduresRestored = 0;
      let currentViewsRestored = 0;
      let currentTriggersRestored = 0;
      let currentFunctionsRestored = 0;
      let totalProcessed = 0;

      // Helper function to execute a batch of statements
      const executeBatch = async (stmts: string[], type: string, batchSize: number = 50, executeIndividually: boolean = false) => {
        if (stmts.length === 0) return;

        console.log(`\n📦 Processing ${stmts.length} ${type}...`);

        // Procedures, Functions, and Triggers must be executed individually
        if (executeIndividually) {
          for (let i = 0; i < stmts.length; i++) {
            try {
              await connection.query(stmts[i]);
              console.log(`  ✓ ${type} ${i + 1}/${stmts.length}`);
            } catch (stmtError: any) {
              console.error(`    ❌ Error in ${type} ${i + 1}: ${stmtError.message.substring(0, 100)}`);
            }

            // Update counters based on type
            if (type === 'Procedures') currentProceduresRestored++;
            else if (type === 'Views') currentViewsRestored++;
            else if (type === 'Triggers') currentTriggersRestored++;
            else if (type === 'Functions') currentFunctionsRestored++;

            totalProcessed++;
            const progress = Math.round((totalProcessed / statements.length) * 100);

            // Update progress callback
            if (progressCallback) {
              progressCallback({
                status: 'running',
                progress,
                currentCount: totalProcessed,
                totalCount: statements.length,
                objectsRestored: {
                  tables: currentTablesRestored,
                  procedures: currentProceduresRestored,
                  views: currentViewsRestored,
                  triggers: currentTriggersRestored,
                  functions: currentFunctionsRestored
                }
              });
            }
          }
        } else {
          // Execute in batches for tables and data
          const totalBatches = Math.ceil(stmts.length / batchSize);

          for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
            const start = batchNum * batchSize;
            const end = Math.min(start + batchSize, stmts.length);
            const batch = stmts.slice(start, end);

            try {
              // Execute all statements in batch together for speed
              const batchSql = batch.join(';\n') + ';';
              await connection.query(batchSql);

              console.log(`  ✓ ${type} batch ${batchNum + 1}/${totalBatches} (${end}/${stmts.length})`);
            } catch (error: any) {
              // If batch fails, execute individually
              console.warn(`  ⚠ ${type} batch ${batchNum + 1} failed, executing individually...`);
              for (let i = 0; i < batch.length; i++) {
                try {
                  await connection.query(batch[i]);
                } catch (stmtError: any) {
                  console.error(`    ❌ Error in ${type} statement ${start + i + 1}: ${stmtError.message.substring(0, 100)}`);
                }
              }
            }

            // Update counters based on type
            // For tables, only count CREATE statements, not DROP
            if (type === 'Tables') {
              for (const stmt of batch) {
                if (stmt.match(/^CREATE\s+TABLE/i)) {
                  currentTablesRestored++;
                }
              }
            }

            totalProcessed += batch.length;
            const progress = Math.round((totalProcessed / statements.length) * 100);

            // Update progress callback
            if (progressCallback) {
              progressCallback({
                status: 'running',
                progress,
                currentCount: totalProcessed,
                totalCount: statements.length,
                objectsRestored: {
                  tables: currentTablesRestored,
                  procedures: currentProceduresRestored,
                  views: currentViewsRestored,
                  triggers: currentTriggersRestored,
                  functions: currentFunctionsRestored
                }
              });
            }
          }
        }
      };

      // Execute in dependency order for maximum speed and correctness
      // 1. Tables first (schema structure)
      await executeBatch(tableStatements, 'Tables', 100, false);

      // 2. Data inserts (large batches for speed)
      await executeBatch(processedDataStatements, 'Data Inserts', 200, false);

      // 3. Functions (can be used by procedures) - execute individually
      await executeBatch(functionStatements, 'Functions', 50, true);

      // 4. Procedures - execute individually
      await executeBatch(procedureStatements, 'Procedures', 50, true);

      // 5. Views (may depend on tables and procedures) - execute individually
      await executeBatch(viewStatements, 'Views', 50, true);

      // 6. Triggers last (depend on tables) - execute individually
      await executeBatch(triggerStatements, 'Triggers', 50, true);

      // 7. Other statements
      await executeBatch(otherStatements, 'Other Statements', 100, false);

      // Commit transaction
      await connection.query('COMMIT;');

      // Re-enable foreign key checks
      await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
      await connection.query('SET AUTOCOMMIT = 1;');

      await connection.end();

      // Final summary
      console.log(`\n╔════════════════════════════════════════╗`);
      console.log(`║      RESTORE COMPLETED ✓               ║`);
      console.log(`╠════════════════════════════════════════╣`);
      console.log(`║  ✓ Tables:      ${tablesCreated.toString().padEnd(24)}║`);
      console.log(`║  ✓ Procedures:  ${proceduresCreated.toString().padEnd(24)}║`);
      console.log(`║  ✓ Views:       ${viewsCreated.toString().padEnd(24)}║`);
      console.log(`║  ✓ Triggers:    ${triggersCreated.toString().padEnd(24)}║`);
      console.log(`║  ✓ Functions:   ${functionsCreated.toString().padEnd(24)}║`);
      console.log(`║  ✓ Data Inserts: ${dataInserted.toString().padEnd(23)}║`);
      console.log(`╚════════════════════════════════════════╝\n`);
    } catch (error: any) {
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  async executeDeploymentScript(
    credentials: { host: string; port: number; user: string; password: string; type: string },
    database: string,
    script: string
  ): Promise<{
    success: boolean;
    errors?: Array<{ statement: string; error: string }>;
  }> {
    const connection = await mysql.createConnection({
      host: credentials.host,
      port: credentials.port,
      user: credentials.user,
      password: credentials.password,
      database,
      multipleStatements: true,
    });

    const errors: Array<{ statement: string; error: string }> = [];

    try {
      // Split script into individual statements
      const statements = script
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`Executing ${statements.length} deployment statements...`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];

        // Skip comments
        if (statement.startsWith('--') || statement.length === 0) {
          continue;
        }

        try {
          await connection.query(statement + ';');
          console.log(`✓ Statement ${i + 1}/${statements.length} executed successfully`);
        } catch (error: any) {
          console.error(`✗ Statement ${i + 1}/${statements.length} failed: ${error.message}`);
          errors.push({
            statement: statement.substring(0, 100) + '...',
            error: error.message
          });
        }
      }

      await connection.end();

      return {
        success: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error: any) {
      await connection.end();
      throw new Error(`Deployment script execution failed: ${error.message}`);
    }
  }

  /**
   * Execute arbitrary SQL query
   */
  async executeQuery(
    credentials: { host: string; port: number; user: string; password: string; type: string },
    database: string,
    query: string
  ): Promise<{
    success: boolean;
    columns?: string[];
    rows?: any[];
    affectedRows?: number;
    message?: string;
    error?: string;
  }> {
    let connection;

    try {
      connection = await mysql.createConnection({
        host: credentials.host,
        port: credentials.port,
        user: credentials.user,
        password: credentials.password,
        database,
      });

      const [results, fields]: any = await connection.query(query);

      // Check if this is a SELECT query (returns rows)
      if (Array.isArray(results) && fields) {
        const columns = fields.map((field: any) => field.name);
        return {
          success: true,
          columns,
          rows: results
        };
      }

      // For INSERT, UPDATE, DELETE queries
      if (results.affectedRows !== undefined) {
        return {
          success: true,
          affectedRows: results.affectedRows,
          message: `Query executed successfully. ${results.affectedRows} row(s) affected.`
        };
      }

      // For other queries (CREATE, DROP, etc.)
      return {
        success: true,
        message: 'Query executed successfully.'
      };
    } catch (error: any) {
      console.error('Query execution error:', error);
      return {
        success: false,
        error: error.message || 'Query execution failed'
      };
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
}

export const databaseService = new DatabaseService();
