import { create } from 'zustand';
import {
  ServerConfig,
  BackupHistory,
  DatabaseSchema,
  BackupExecutionState,
  StorageInfo,
  ScheduledBackup,
  ExecutionLog,
  SchemaComparisonResult,
  ReleaseDeployment,
  ServerBuild,
  BuildArtifact,
  BuildVersion,
} from '@/types/backup.types';
import { apiClient } from '@/services/apiClient';
import { isScreenId, type ScreenId } from '@/config/navigationConfig';

// Deduplicate in-flight API calls so multiple components mounting don't each trigger loadServers/loadBackupHistory
let loadServersPromise: Promise<void> | null = null;
let loadBackupHistoryPromise: Promise<void> | null = null;

// Data comparison helpers (for table row diff + sync script)
const DATA_ROW_LIMIT = 500;

function getRowKey(row: Record<string, unknown>, keyColumns: string[]): string {
  if (keyColumns.length > 0) {
    return keyColumns.map((c) => String(row[c] ?? '')).join('|');
  }
  return Object.values(row).map((v) => String(v ?? '')).join('|');
}

function buildDataDiff(
  sourceRows: Record<string, unknown>[],
  targetRows: Record<string, unknown>[],
  keyColumns: string[]
): { status: 'removed' | 'modified' | 'added' | 'unchanged'; sourceRow: Record<string, unknown> | null; targetRow: Record<string, unknown> | null }[] {
  const byKey = (rows: Record<string, unknown>[]) => {
    const map = new Map<string, Record<string, unknown>>();
    for (const row of rows) map.set(getRowKey(row, keyColumns), row);
    return map;
  };
  const sourceMap = byKey(sourceRows);
  const targetMap = byKey(targetRows);
  const allKeys = new Set([...sourceMap.keys(), ...targetMap.keys()]);
  const result: { status: 'removed' | 'modified' | 'added' | 'unchanged'; sourceRow: Record<string, unknown> | null; targetRow: Record<string, unknown> | null }[] = [];
  for (const key of allKeys) {
    const src = sourceMap.get(key) ?? null;
    const tgt = targetMap.get(key) ?? null;
    let status: 'removed' | 'modified' | 'added' | 'unchanged' = 'unchanged';
    if (!src) status = 'added';
    else if (!tgt) status = 'removed';
    else if (JSON.stringify(src) !== JSON.stringify(tgt)) status = 'modified';
    result.push({ status, sourceRow: src, targetRow: tgt });
  }
  return result;
}

function escapeSql(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  return "'" + String(val).replace(/'/g, "''").replace(/\\/g, '\\\\') + "'";
}

function generateDataSyncScript(
  diffRows: { status: string; sourceRow: Record<string, unknown> | null; targetRow: Record<string, unknown> | null }[],
  tableName: string,
  allColumns: string[],
  keyColumns: string[]
): string {
  const lines: string[] = [];
  const quotedTable = '`' + tableName.replace(/`/g, '``') + '`';
  const pkCols = keyColumns.length > 0 ? keyColumns : allColumns.slice(0, 1);
  for (const dr of diffRows) {
    if (dr.status === 'removed' && dr.sourceRow) {
      const row = dr.sourceRow;
      const cols = allColumns.filter((c) => row[c] !== undefined);
      if (cols.length === 0) continue;
      const colList = cols.map((c) => '`' + c + '`').join(', ');
      const valList = cols.map((c) => escapeSql(row[c])).join(', ');
      lines.push(`INSERT INTO ${quotedTable} (${colList}) VALUES (${valList});`);
    } else if (dr.status === 'modified' && dr.sourceRow && dr.targetRow) {
      const row = dr.sourceRow;
      const sets = allColumns.filter((c) => row[c] !== undefined).map((c) => '`' + c + '` = ' + escapeSql(row[c]));
      if (sets.length === 0) continue;
      const whereClause = pkCols.map((c) => '`' + c + '` = ' + escapeSql(dr.sourceRow![c])).join(' AND ');
      lines.push(`UPDATE ${quotedTable} SET ${sets.join(', ')} WHERE ${whereClause};`);
    }
  }
  return lines.join('\n');
}

interface BackupStore {
  // Data
  servers: ServerConfig[];
  backupHistory: BackupHistory[];
  storageInfo: StorageInfo;
  scheduledBackups: ScheduledBackup[];
  databaseSchemas: Record<string, DatabaseSchema[]>;

  // UI State
  selectedServerId: string | null;
  selectedDatabaseName: string | null;
  /** Selected table name in explorer (for Object Info panel). */
  selectedTableName: string | null;
  activeTab: ScreenId;
  /** Navigation history for Back/Forward */
  screenHistory: ScreenId[];
  historyIndex: number;
  /** SQL to prefill in SQL Editor when navigating from e.g. Code Snippets Library */
  sqlEditorInitialSql: string | null;
  /** When true, Database Explorer is minimized so Query Editor can use full width (expand horizontal). */
  databaseExplorerMinimized: boolean;

  // Schema Comparison State
  comparisonResult: SchemaComparisonResult | null;
  isComparing: boolean;

  // Release Management State
  releaseDeployments: ReleaseDeployment[];
  currentRelease: ReleaseDeployment | null;
  isDeploying: boolean;

  // Build Management State
  serverBuilds: ServerBuild[];
  currentBuild: ServerBuild | null;

  // Execution State
  currentExecution: BackupExecutionState | null;
  isExecuting: boolean;

  // Action Output (query/execution log for bottom panel)
  actionLogEntries: Array<{ id: string; time: string; action: string; message: string; duration: string }>;
  addActionLogEntry: (entry: { action: string; message: string; durationMs: number }) => void;
  clearActionLog: () => void;

  // Actions
  setActiveTab: (tab: ScreenId) => void;
  goBack: () => void;
  goForward: () => void;
  setSqlEditorInitialSql: (sql: string | null) => void;
  setDatabaseExplorerMinimized: (minimized: boolean) => void;
  selectServer: (serverId: string | null) => void;
  selectDatabase: (databaseName: string | null) => void;
  setSelectedTableName: (tableName: string | null) => void;

  // Data Loading Actions
  loadServers: () => Promise<void>;
  loadBackupHistory: () => Promise<void>;
  loadDatabasesForServer: (serverId: string) => Promise<void>;
  loadDatabaseSchema: (serverId: string, databaseName: string, forceReload?: boolean) => Promise<void>;

  // Server Actions
  addServer: (server: Omit<ServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateServer: (id: string, updates: Partial<ServerConfig>) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  testConnection: (id: string) => Promise<boolean>;
  createDatabase: (serverId: string, databaseName: string) => Promise<void>;
  dropDatabase: (serverId: string, databaseName: string) => Promise<void>;

  // Backup Actions
  startBackup: (configId: string) => void;
  pauseBackup: () => void;
  cancelBackup: () => void;
  updateExecutionProgress: (progress: Partial<BackupExecutionState>) => void;
  addExecutionLog: (log: Omit<ExecutionLog, 'id'>) => void;

  // History Actions
  deleteBackup: (id: string) => void;
  deleteMultipleBackups: (ids: string[]) => void;

  // Schema Comparison Actions
  compareSchemas: (
    sourceServerId: string,
    sourceDatabase: string,
    targetServerId: string,
    targetDatabase: string,
    comparisonType?: string
  ) => Promise<void>;
  performComparison: (
    sourceServer: ServerConfig,
    targetServer: ServerConfig,
    sourceSchema: DatabaseSchema,
    targetSchema: DatabaseSchema,
    comparisonType?: string
  ) => SchemaComparisonResult;
  clearComparisonResult: () => void;

  // Release Management Actions
  createReleaseFromComparison: (comparisonResult: SchemaComparisonResult, notes?: string) => string;
  deployRelease: (releaseId: string) => Promise<void>;
  rollbackRelease: (releaseId: string) => Promise<void>;
  updateReleaseProgress: (releaseId: string, progress: Partial<ReleaseDeployment['deploymentProgress']>) => void;
  getReleaseById: (releaseId: string) => ReleaseDeployment | undefined;

  // Build Management Actions
  createBuildFromRelease: (release: ReleaseDeployment) => ServerBuild;
  addBuild: (build: ServerBuild) => void;
  updateBuildStatus: (buildId: string, status: ServerBuild['status']) => void;
  getBuildById: (buildId: string) => ServerBuild | undefined;
  getBuildsForRelease: (releaseId: string) => ServerBuild[];

  // Helpers
  getServerById: (id: string) => ServerConfig | undefined;
  getDatabasesForServer: (serverId: string) => DatabaseSchema[];
  getRecentBackups: (count?: number) => BackupHistory[];
}

export const useBackupStore = create<BackupStore>((set, get) => ({
  // Initial Data - All empty, will be loaded from API
  servers: [],
  backupHistory: [],
  storageInfo: {
    localPath: '',
    totalBackups: 0,
    totalStorageUsedGB: 0,
    availableSpaceGB: 0,
  },
  scheduledBackups: [],
  databaseSchemas: {},

  // Initial UI State - always start on SQL Editor (redirect on load handled in Index)
  selectedServerId: null,
  selectedDatabaseName: null,
  selectedTableName: null,
  activeTab: 'sql-editor',
  screenHistory: ['sql-editor'],
  historyIndex: 0,
  sqlEditorInitialSql: null,
  databaseExplorerMinimized: (() => {
    try {
      return localStorage.getItem('database-explorer-minimized') === 'true';
    } catch {
      return false;
    }
  })(),

  // Initial Comparison State
  comparisonResult: null,
  isComparing: false,

  // Initial Release Management State
  releaseDeployments: [],
  currentRelease: null,
  isDeploying: false,

  // Initial Build Management State
  serverBuilds: [],
  currentBuild: null,

  // Initial Execution State
  currentExecution: null,
  isExecuting: false,

  actionLogEntries: [],
  addActionLogEntry: (entry) => {
    const id = `al-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const time = new Date().toLocaleTimeString();
    const duration = entry.durationMs >= 1000 ? `${(entry.durationMs / 1000).toFixed(2)} sec` : `${entry.durationMs} ms`;
    set((s) => ({
      actionLogEntries: [...s.actionLogEntries, { id, time, action: entry.action, message: entry.message, duration }].slice(-500),
    }));
  },
  clearActionLog: () => set({ actionLogEntries: [] }),

  // Tab Actions (setActiveTab pushes to history for Back/Forward)
  setActiveTab: (tab) => {
    const { activeTab, screenHistory, historyIndex } = get();
    if (tab === activeTab) return;
    const newHistory = [...screenHistory.slice(0, historyIndex + 1), tab];
    set({ activeTab: tab, screenHistory: newHistory, historyIndex: newHistory.length - 1 });
  },
  goBack: () => {
    const { screenHistory, historyIndex } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    set({ activeTab: screenHistory[newIndex], historyIndex: newIndex });
  },
  goForward: () => {
    const { screenHistory, historyIndex } = get();
    if (historyIndex >= screenHistory.length - 1) return;
    const newIndex = historyIndex + 1;
    set({ activeTab: screenHistory[newIndex], historyIndex: newIndex });
  },
  setSqlEditorInitialSql: (sql) => set({ sqlEditorInitialSql: sql }),
  setDatabaseExplorerMinimized: (minimized) => {
    set({ databaseExplorerMinimized: minimized });
    try {
      localStorage.setItem('database-explorer-minimized', String(minimized));
    } catch {
      // ignore
    }
  },

  // Selection Actions (persist for multi-session; restore in ServerDatabaseBar after loadServers)
  selectServer: (serverId) => {
    set({ selectedServerId: serverId, selectedDatabaseName: null, selectedTableName: null });
    try {
      localStorage.setItem('backup-app-connection', JSON.stringify({
        lastServerId: serverId ?? undefined,
        lastDatabaseName: undefined,
      }));
    } catch {
      // ignore
    }
  },
  selectDatabase: (databaseName) => {
    const state = get();
    set({ selectedDatabaseName: databaseName, selectedTableName: null });
    try {
      localStorage.setItem('backup-app-connection', JSON.stringify({
        lastServerId: state.selectedServerId ?? undefined,
        lastDatabaseName: databaseName ?? undefined,
      }));
    } catch {
      // ignore
    }
  },
  setSelectedTableName: (tableName) => set({ selectedTableName: tableName }),

  // Data Loading Actions (deduplicated: concurrent callers share the same request)
  loadServers: async () => {
    if (loadServersPromise) return loadServersPromise;
    loadServersPromise = (async () => {
      try {
        const result = await apiClient.getAllServers();
        if (result.success) {
          set({ servers: result.servers });
        }
      } catch (error) {
        console.error('Failed to load servers:', error);
      } finally {
        loadServersPromise = null;
      }
    })();
    return loadServersPromise;
  },

  loadBackupHistory: async () => {
    if (loadBackupHistoryPromise) return loadBackupHistoryPromise;
    loadBackupHistoryPromise = (async () => {
      try {
        const result = await apiClient.getBackupHistory();
      if (result.success) {
        // Convert createdAt string to Date object with validation
        const history = result.history.map((backup: any) => {
          let createdAtDate: Date;

          // Handle different formats
          if (backup.createdAt instanceof Date) {
            createdAtDate = backup.createdAt;
          } else if (typeof backup.createdAt === 'string') {
            createdAtDate = new Date(backup.createdAt);
          } else if (typeof backup.createdAt === 'number') {
            createdAtDate = new Date(backup.createdAt);
          } else {
            // Fallback to current date if invalid
            console.warn('Invalid createdAt format for backup:', backup.id, backup.createdAt);
            createdAtDate = new Date();
          }

          // Validate the date
          if (isNaN(createdAtDate.getTime())) {
            console.warn('Invalid date for backup:', backup.id, backup.createdAt);
            createdAtDate = new Date();
          }

          return {
            ...backup,
            createdAt: createdAtDate
          };
        });
        set({ backupHistory: history });
      }
    } catch (error) {
      console.error('Failed to load backup history:', error);
    } finally {
        loadBackupHistoryPromise = null;
      }
    })();
    return loadBackupHistoryPromise;
  },

  loadDatabasesForServer: async (serverId: string) => {
    try {
      const server = get().servers.find(s => s.id === serverId);
      if (!server) {
        console.error('Server not found:', serverId);
        return;
      }

      // Get list of databases
      const dbListResult = await apiClient.getDatabases({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        type: server.databaseType
      });

      if (!dbListResult.success) {
        console.error('Failed to get databases:', dbListResult);
        return;
      }

      // Preserve existing loaded schemas so we don't overwrite table count/tables with placeholders
      const existingSchemas = get().databaseSchemas[serverId] || [];

      const hasSchemaObjects = (s: DatabaseSchema) =>
        (s.tables?.length ?? 0) > 0 || (s.procedures?.length ?? 0) > 0 || (s.views?.length ?? 0) > 0 ||
        (s.functions?.length ?? 0) > 0 || (s.triggers?.length ?? 0) > 0 || (s.events?.length ?? 0) > 0;
      const schemas: DatabaseSchema[] = dbListResult.databases.map(dbName => {
        const existing = existingSchemas.find(s => s.name === dbName);
        if (existing && hasSchemaObjects(existing)) {
          return existing;
        }
        return {
          name: dbName,
          sizeInMB: 0,
          tableCount: 0,
          tables: [],
          procedures: [],
          views: [],
          functions: [],
          triggers: [],
          events: []
        } as DatabaseSchema;
      });

      set((state) => ({
        databaseSchemas: {
          ...state.databaseSchemas,
          [serverId]: schemas
        }
      }));

      console.log(`Loaded ${schemas.length} database names for server ${server.name}`);
    } catch (error) {
      console.error('Failed to load databases for server:', error);
    }
  },

  loadDatabaseSchema: async (serverId: string, databaseName: string, forceReload?: boolean) => {
    try {
      const server = get().servers.find(s => s.id === serverId);
      if (!server) {
        console.error('Server not found:', serverId);
        return;
      }

      // Skip API call if we already have full schema (tables, procedures, views, etc.). Use forceReload to refetch.
      if (!forceReload) {
        const existingSchemas = get().databaseSchemas[serverId] || [];
        const existing = existingSchemas.find(s => s.name === databaseName);
        const hasObjects =
          (existing?.tables?.length ?? 0) > 0 ||
          (existing?.procedures?.length ?? 0) > 0 ||
          (existing?.views?.length ?? 0) > 0 ||
          (existing?.functions?.length ?? 0) > 0 ||
          (existing?.triggers?.length ?? 0) > 0 ||
          (existing?.events?.length ?? 0) > 0;
        if (existing && hasObjects) {
          return;
        }
      }

      console.log(`📥 Loading schema for database: ${databaseName}...`);

      // Get full schema details for this specific database
      const schemaResult = await apiClient.getDatabaseSchema(
        {
          host: server.host,
          port: server.port,
          user: server.username,
          password: server.password,
          type: server.databaseType
        },
        databaseName
      );

      if (!schemaResult.success) {
        console.error('❌ Failed to get database schema:', schemaResult);
        return;
      }

      console.log(`✅ Received schema from API for ${databaseName}:`, {
        tables: schemaResult.schema.tables?.length || 0,
        procedures: schemaResult.schema.procedures?.length || 0,
        views: schemaResult.schema.views?.length || 0,
        functions: schemaResult.schema.functions?.length || 0,
        triggers: schemaResult.schema.triggers?.length || 0,
        events: schemaResult.schema.events?.length || 0,
      });

      // Update the specific database schema in the store
      set((state) => {
        const currentSchemas = state.databaseSchemas[serverId] || [];
        const existingIndex = currentSchemas.findIndex(s => s.name === databaseName);

        let updatedSchemas;
        if (existingIndex >= 0) {
          // Update existing schema
          updatedSchemas = currentSchemas.map(schema =>
            schema.name === databaseName ? schemaResult.schema : schema
          );
          console.log(`🔄 Updated existing schema for ${databaseName}`);
        } else {
          // Add new schema
          updatedSchemas = [...currentSchemas, schemaResult.schema];
          console.log(`➕ Added new schema for ${databaseName}`);
        }

        return {
          databaseSchemas: {
            ...state.databaseSchemas,
            [serverId]: updatedSchemas
          }
        };
      });

      console.log(`✅ Successfully stored schema for ${databaseName} in store`);
    } catch (error) {
      console.error('❌ Failed to load database schema:', error);
    }
  },

  // Server Actions
  addServer: async (serverData) => {
    try {
      const result = await apiClient.createServer(serverData);
      if (result.success) {
        set((state) => ({ servers: [...state.servers, result.server] }));
      }
    } catch (error) {
      console.error('Failed to add server:', error);
      throw error;
    }
  },

  updateServer: async (id, updates) => {
    try {
      const result = await apiClient.updateServer(id, updates);
      if (result.success) {
        set((state) => ({
          servers: state.servers.map((server) =>
            server.id === id ? result.server : server
          ),
        }));
      }
    } catch (error) {
      console.error('Failed to update server:', error);
      throw error;
    }
  },

  deleteServer: async (id) => {
    try {
      const result = await apiClient.deleteServer(id);
      if (result.success) {
        set((state) => ({
          servers: state.servers.filter((server) => server.id !== id),
        }));
      }
    } catch (error) {
      console.error('Failed to delete server:', error);
      throw error;
    }
  },

  testConnection: async (id) => {
    const server = get().servers.find((s) => s.id === id);
    if (!server) return false;

    set((state) => ({
      servers: state.servers.map((s) =>
        s.id === id ? { ...s, connectionStatus: 'testing' } : s
      ),
    }));

    try {
      // Real API connection test
      const result = await apiClient.testConnection({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        type: server.databaseType
      });

      const success = result.success;
      set((state) => ({
        servers: state.servers.map((s) =>
          s.id === id
            ? {
                ...s,
                connectionStatus: success ? 'connected' : 'disconnected',
                lastConnected: success ? new Date() : s.lastConnected,
              }
            : s
        ),
      }));

      return success;
    } catch (error) {
      console.error('Connection test failed:', error);
      set((state) => ({
        servers: state.servers.map((s) =>
          s.id === id
            ? {
                ...s,
                connectionStatus: 'disconnected',
                lastConnected: s.lastConnected,
              }
            : s
        ),
      }));
      return false;
    }
  },

  createDatabase: async (serverId, databaseName) => {
    const server = get().servers.find((s) => s.id === serverId);
    if (!server) {
      throw new Error('Server not found');
    }
    await apiClient.createDatabase(
      {
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        type: server.databaseType,
      },
      databaseName
    );
    await get().loadDatabasesForServer(serverId);
  },

  dropDatabase: async (serverId, databaseName) => {
    const server = get().servers.find((s) => s.id === serverId);
    if (!server) {
      throw new Error('Server not found');
    }
    await apiClient.dropDatabase(
      {
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        type: server.databaseType,
      },
      databaseName
    );
    if (get().selectedServerId === serverId && get().selectedDatabaseName === databaseName) {
      set({ selectedDatabaseName: null });
    }
    await get().loadDatabasesForServer(serverId);
  },

  // Backup Actions
  startBackup: (configId) => {
    const execution: BackupExecutionState = {
      id: `exec-${Date.now()}`,
      configId,
      status: 'initializing',
      progress: 0,
      currentOperation: 'Initializing backup...',
      currentObject: '',
      statistics: {
        startTime: new Date(),
        totalObjects: 0,
        processedObjects: 0,
        totalRows: 0,
        processedRows: 0,
        totalSize: 0,
        currentSize: 0,
        rowsPerSecond: 0,
        bytesPerSecond: 0,
      },
      logs: [],
      errors: [],
    };
    set({ currentExecution: execution, isExecuting: true });
  },

  pauseBackup: () => {
    set((state) => ({
      currentExecution: state.currentExecution
        ? { ...state.currentExecution, status: 'paused' }
        : null,
    }));
  },

  cancelBackup: () => {
    set((state) => ({
      currentExecution: state.currentExecution
        ? { ...state.currentExecution, status: 'cancelled' }
        : null,
      isExecuting: false,
    }));
  },

  updateExecutionProgress: (progress) => {
    set((state) => ({
      currentExecution: state.currentExecution
        ? { ...state.currentExecution, ...progress }
        : null,
    }));
  },

  addExecutionLog: (log) => {
    set((state) => ({
      currentExecution: state.currentExecution
        ? {
            ...state.currentExecution,
            logs: [
              ...state.currentExecution.logs,
              { ...log, id: `log-${Date.now()}-${Math.random()}` },
            ],
          }
        : null,
    }));
  },

  // History Actions
  deleteBackup: (id) => {
    set((state) => ({
      backupHistory: state.backupHistory.filter((backup) => backup.id !== id),
    }));
  },

  deleteMultipleBackups: (ids) => {
    set((state) => ({
      backupHistory: state.backupHistory.filter((backup) => !ids.includes(backup.id)),
    }));
  },

  // Schema Comparison Actions
  compareSchemas: async (sourceServerId, sourceDatabase, targetServerId, targetDatabase, comparisonType = 'all') => {
    set({ isComparing: true });
    try {
      const sourceServer = get().getServerById(sourceServerId);
      const targetServer = get().getServerById(targetServerId);

      if (!sourceServer || !targetServer) {
        const err = new Error('Source or target server not found');
        set({ isComparing: false });
        throw err;
      }

      console.log('🔍 Starting schema comparison...');
      console.log('Source:', sourceServer.name, '/', sourceDatabase);
      console.log('Target:', targetServer.name, '/', targetDatabase);
      console.log('Comparison Type:', comparisonType);

      // Load schemas if not already loaded
      const sourceSchemas = get().databaseSchemas[sourceServerId];
      const targetSchemas = get().databaseSchemas[targetServerId];

      if (!sourceSchemas || !targetSchemas) {
        console.log('📥 Loading database lists...');
        await Promise.all([
          get().loadDatabasesForServer(sourceServerId),
          get().loadDatabasesForServer(targetServerId),
        ]);
      }

      // Load detailed schemas
      console.log('📥 Loading detailed schemas...');
      await Promise.all([
        get().loadDatabaseSchema(sourceServerId, sourceDatabase),
        get().loadDatabaseSchema(targetServerId, targetDatabase),
      ]);

      const allSourceSchemas = get().databaseSchemas[sourceServerId];
      const allTargetSchemas = get().databaseSchemas[targetServerId];

      console.log('📦 All schemas in store for source server:', allSourceSchemas?.map(s => s.name));
      console.log('📦 All schemas in store for target server:', allTargetSchemas?.map(s => s.name));

      const sourceSchema = allSourceSchemas?.find(s => s.name === sourceDatabase);
      const targetSchema = allTargetSchemas?.find(s => s.name === targetDatabase);

      if (!sourceSchema || !targetSchema) {
        const err = new Error('Failed to load schemas. Ensure both databases exist and are accessible.');
        set({ isComparing: false });
        throw err;
      }

      console.log('📊 Source schema for', sourceDatabase, ':', {
        tables: sourceSchema.tables?.length || 0,
        procedures: sourceSchema.procedures?.length || 0,
        views: sourceSchema.views?.length || 0,
        functions: sourceSchema.functions?.length || 0,
        triggers: sourceSchema.triggers?.length || 0,
        sampleTableNames: sourceSchema.tables?.slice(0, 3).map(t => t.name),
        sampleProcedureNames: sourceSchema.procedures?.slice(0, 3).map(p => p.name),
      });

      console.log('📊 Target schema for', targetDatabase, ':', {
        tables: targetSchema.tables?.length || 0,
        procedures: targetSchema.procedures?.length || 0,
        views: targetSchema.views?.length || 0,
        functions: targetSchema.functions?.length || 0,
        triggers: targetSchema.triggers?.length || 0,
        sampleTableNames: targetSchema.tables?.slice(0, 3).map(t => t.name),
        sampleProcedureNames: targetSchema.procedures?.slice(0, 3).map(p => p.name),
      });

      // Perform comparison
      let result = get().performComparison(sourceServer, targetServer, sourceSchema, targetSchema, comparisonType);

      // Data comparison for tables when mode is 'data' or 'both'
      let config: { tables?: boolean; comparisonMode?: string } | null = null;
      if (typeof comparisonType === 'string' && comparisonType.startsWith('{')) {
        try {
          config = JSON.parse(comparisonType);
        } catch {
          config = null;
        }
      }
      const runData = config?.comparisonMode === 'data' || config?.comparisonMode === 'both';
      if (runData && sourceSchema.tables && targetSchema.tables) {
        const targetTableNames = new Set(targetSchema.tables.map((t) => t.name));
        const commonTables = config?.tables
          ? sourceSchema.tables.filter((t) => targetTableNames.has(t.name))
          : [];
        let dataScript = '\n-- ========================================\n-- TABLE / VIEW DATA SYNC\n-- ========================================\n\n';
        let dataDiffCount = 0;
        for (const table of commonTables) {
          const targetTable = targetSchema.tables.find((t) => t.name === table.name);
          if (!targetTable?.columns?.length) continue;
          const allColumns = table.columns?.map((c) => c.name) ?? targetTable.columns.map((c) => c.name);
          const keyColumns = (table.columns ?? targetTable.columns).filter((c) => c.isPrimaryKey).map((c) => c.name);
          const cols = keyColumns.length > 0 ? keyColumns : allColumns.slice(0, 1);
          try {
            const [srcRes, tgtRes] = await Promise.all([
              apiClient.executeQuery({
                host: sourceServer.host,
                port: sourceServer.port,
                user: sourceServer.username,
                password: sourceServer.password,
                type: sourceServer.databaseType,
                database: sourceDatabase,
                query: `SELECT * FROM \`${table.name.replace(/`/g, '``')}\` LIMIT ${DATA_ROW_LIMIT}`,
              }),
              apiClient.executeQuery({
                host: targetServer.host,
                port: targetServer.port,
                user: targetServer.username,
                password: targetServer.password,
                type: targetServer.databaseType,
                database: targetDatabase,
                query: `SELECT * FROM \`${table.name.replace(/`/g, '``')}\` LIMIT ${DATA_ROW_LIMIT}`,
              }),
            ]);
            if (!srcRes.success || !tgtRes.success || !srcRes.rows || !tgtRes.rows) continue;
            const srcRows = srcRes.rows as Record<string, unknown>[];
            const tgtRows = tgtRes.rows as Record<string, unknown>[];
            const diffRows = buildDataDiff(srcRows, tgtRows, cols);
            const hasChanges = diffRows.some((r) => r.status !== 'unchanged');
            if (hasChanges) {
              const tableScript = generateDataSyncScript(diffRows, table.name, allColumns, keyColumns);
              if (tableScript) {
                dataScript += `-- Table: ${table.name}\n${tableScript}\n\n`;
                dataDiffCount += diffRows.filter((r) => r.status !== 'unchanged').length;
              }
            }
          } catch (err) {
            console.warn(`Data compare skipped for table ${table.name}:`, err);
          }
        }
        // Data comparison for views (result sets) when views selected
        if (config?.views && sourceSchema.views && targetSchema.views) {
          const targetViewNames = new Set(targetSchema.views.map((v) => v.name));
          const commonViews = sourceSchema.views.filter((v) => targetViewNames.has(v.name));
          for (const view of commonViews) {
            try {
              const [srcRes, tgtRes] = await Promise.all([
                apiClient.executeQuery({
                  host: sourceServer.host,
                  port: sourceServer.port,
                  user: sourceServer.username,
                  password: sourceServer.password,
                  type: sourceServer.databaseType,
                  database: sourceDatabase,
                  query: `SELECT * FROM \`${view.name.replace(/`/g, '``')}\` LIMIT ${DATA_ROW_LIMIT}`,
                }),
                apiClient.executeQuery({
                  host: targetServer.host,
                  port: targetServer.port,
                  user: targetServer.username,
                  password: targetServer.password,
                  type: targetServer.databaseType,
                  database: targetDatabase,
                  query: `SELECT * FROM \`${view.name.replace(/`/g, '``')}\` LIMIT ${DATA_ROW_LIMIT}`,
                }),
              ]);
              if (!srcRes.success || !tgtRes.success || !srcRes.rows || !tgtRes.rows) continue;
              const srcCols = srcRes.columns ?? Object.keys((srcRes.rows[0] as object) || {});
              const tgtCols = tgtRes.columns ?? Object.keys((tgtRes.rows[0] as object) || {});
              const allColumns = srcCols.length >= tgtCols.length ? srcCols : tgtCols;
              const keyColumns = allColumns.slice(0, 1);
              const srcRows = srcRes.rows as Record<string, unknown>[];
              const tgtRows = tgtRes.rows as Record<string, unknown>[];
              const diffRows = buildDataDiff(srcRows, tgtRows, keyColumns);
              const hasChanges = diffRows.some((r) => r.status !== 'unchanged');
              if (hasChanges) {
                const viewScript = generateDataSyncScript(diffRows, view.name, allColumns, keyColumns);
                if (viewScript) {
                  dataScript += `-- View result: ${view.name}\n${viewScript}\n\n`;
                  dataDiffCount += diffRows.filter((r) => r.status !== 'unchanged').length;
                }
              }
            } catch (err) {
              console.warn(`Data compare skipped for view ${view.name}:`, err);
            }
          }
        }
        if (dataDiffCount > 0) {
          result = {
            ...result,
            deploymentScript: result.deploymentScript + dataScript,
            summary: {
              ...result.summary,
              totalDifferences: result.summary.totalDifferences + dataDiffCount,
            },
          };
        }
      }

      console.log('✅ Comparison complete:', {
        totalDifferences: result.summary.totalDifferences,
        missing: result.summary.missingInTarget,
        extra: result.summary.extraInTarget,
        modified: result.summary.modified,
        identical: result.summary.identical,
      });

      set({ comparisonResult: result, isComparing: false });
    } catch (error) {
      console.error('Schema comparison failed:', error);
      set({ isComparing: false });
      throw error;
    }
  },

  performComparison: (sourceServer, targetServer, sourceSchema, targetSchema, comparisonType = 'all') => {
    // Helper: Build complete column definition for ALTER TABLE statements
    const buildColumnDefinition = (column: any): string => {
      let def = column.dataType;

      // Add length/precision for types that need it
      if (column.maxLength && !column.dataType.includes('(')) {
        def += `(${column.maxLength})`;
      } else if (column.precision && column.scale !== undefined) {
        def += `(${column.precision},${column.scale})`;
      } else if (column.precision) {
        def += `(${column.precision})`;
      }

      // NULL / NOT NULL
      if (column.nullable === false || column.nullable === 'NO') {
        def += ' NOT NULL';
      } else {
        def += ' NULL';
      }

      // DEFAULT value
      if (column.defaultValue !== null && column.defaultValue !== undefined) {
        const defaultVal = column.defaultValue;
        if (defaultVal === 'CURRENT_TIMESTAMP' || defaultVal === 'NULL' || defaultVal.startsWith('CURRENT_')) {
          def += ` DEFAULT ${defaultVal}`;
        } else if (typeof defaultVal === 'string') {
          def += ` DEFAULT '${defaultVal}'`;
        } else {
          def += ` DEFAULT ${defaultVal}`;
        }
      }

      // AUTO_INCREMENT
      if (column.autoIncrement) {
        def += ' AUTO_INCREMENT';
      }

      // COMMENT
      if (column.comment) {
        def += ` COMMENT '${column.comment.replace(/'/g, "''")}'`;
      }

      return def;
    };

    // Helper: Generate SQL script for creating/altering objects
    const generateDeploymentScript = (diff: any, type: string): string => {
      const dbType = sourceServer.databaseType;
      let script = `-- ========================================\n`;
      script += `-- ${type.toUpperCase()}: ${diff.name}\n`;
      script += `-- ========================================\n`;

      if (diff.differenceType === 'missing') {
        script += `-- Action: CREATE ${type.toUpperCase()} (missing in target)\n\n`;
        if (diff.sourceMetadata?.definition) {
          // Use actual CREATE statement from SHOW CREATE TABLE/VIEW/PROCEDURE/FUNCTION/TRIGGER
          script += `${diff.sourceMetadata.definition};\n`;
        } else if (type === 'table') {
          // Build CREATE TABLE from column metadata
          if (diff.sourceMetadata?.columns && diff.sourceMetadata.columns.length > 0) {
            script += `CREATE TABLE \`${diff.name}\` (\n`;

            // Generate column definitions
            const columnDefs = diff.sourceMetadata.columns.map((col: any) => {
              const colDef = buildColumnDefinition(col);
              return `  \`${col.name}\` ${colDef}`;
            });

            // Add PRIMARY KEY constraint if exists
            const primaryKeys = diff.sourceMetadata.columns
              .filter((col: any) => col.isPrimaryKey)
              .map((col: any) => `\`${col.name}\``);

            if (primaryKeys.length > 0) {
              columnDefs.push(`  PRIMARY KEY (${primaryKeys.join(', ')})`);
            }

            // Add UNIQUE constraints if exists
            const uniqueColumns = diff.sourceMetadata.columns
              .filter((col: any) => col.isUnique && !col.isPrimaryKey)
              .map((col: any) => `\`${col.name}\``);

            uniqueColumns.forEach(colName => {
              columnDefs.push(`  UNIQUE KEY (${colName})`);
            });

            script += columnDefs.join(',\n');
            script += `\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n`;
          } else {
            script += `-- CREATE TABLE ${diff.name}\n`;
            script += `-- Warning: Schema definition not available from source\n`;
          }
        } else {
          script += `-- CREATE ${type.toUpperCase()} ${diff.name}\n`;
          script += `-- Warning: Definition not available from source\n`;
        }
      } else if (diff.differenceType === 'extra') {
        script += `-- Action: DROP ${type.toUpperCase()} (extra in target, not in source)\n`;
        script += `-- Warning: Uncomment the following line to remove this object from target\n\n`;
        script += `-- DROP ${type.toUpperCase()} IF EXISTS ${diff.name};\n`;
      } else if (diff.differenceType === 'modified') {
        script += `-- Action: ALTER ${type.toUpperCase()} (differences detected)\n`;
        script += `-- Details: ${diff.details || 'Modifications detected'}\n\n`;

        if (type === 'table' && diff.columnDifferences && diff.columnDifferences.length > 0) {
          // Group column differences by change type
          const added = diff.columnDifferences.filter((cd: any) => cd.changeType === 'added');
          const removed = diff.columnDifferences.filter((cd: any) => cd.changeType === 'removed');
          const modified = diff.columnDifferences.filter((cd: any) => cd.changeType === 'modified');

          // Handle added columns
          if (added.length > 0) {
            script += `-- Add new columns:\n`;
            added.forEach((colDiff: any) => {
              const sourceCol = diff.sourceMetadata?.columns?.find((c: any) => c.name === colDiff.columnName);
              if (sourceCol) {
                const colDef = buildColumnDefinition(sourceCol);
                script += `ALTER TABLE ${diff.name} ADD COLUMN \`${colDiff.columnName}\` ${colDef};\n`;
              } else {
                script += `-- ALTER TABLE ${diff.name} ADD COLUMN \`${colDiff.columnName}\` -- Definition not available\n`;
              }
            });
            script += '\n';
          }

          // Handle modified columns
          if (modified.length > 0) {
            script += `-- Modify existing columns:\n`;

            // Group by column name to handle multiple field changes
            const columnGroups = new Map<string, any[]>();
            modified.forEach((colDiff: any) => {
              if (!columnGroups.has(colDiff.columnName)) {
                columnGroups.set(colDiff.columnName, []);
              }
              columnGroups.get(colDiff.columnName)!.push(colDiff);
            });

            columnGroups.forEach((diffs, columnName) => {
              const sourceCol = diff.sourceMetadata?.columns?.find((c: any) => c.name === columnName);
              if (sourceCol) {
                const colDef = buildColumnDefinition(sourceCol);
                script += `ALTER TABLE ${diff.name} MODIFY COLUMN \`${columnName}\` ${colDef};\n`;
                script += `  -- Changes: ${diffs.map((d: any) => `${d.field} (${d.targetValue} → ${d.sourceValue})`).join(', ')}\n`;
              } else {
                script += `-- ALTER TABLE ${diff.name} MODIFY COLUMN \`${columnName}\` -- Definition not available\n`;
              }
            });
            script += '\n';
          }

          // Handle removed columns (commented out for safety)
          if (removed.length > 0) {
            script += `-- Remove columns (uncomment to drop):\n`;
            removed.forEach((colDiff: any) => {
              script += `-- ALTER TABLE ${diff.name} DROP COLUMN \`${colDiff.columnName}\`;\n`;
            });
            script += '\n';
          }

          // Handle Foreign Key differences
          const sourceFKs = diff.sourceMetadata?.constraints || [];
          const targetFKs = diff.targetMetadata?.constraints || [];
          const sourceFKMap = new Map(sourceFKs.map((fk: any) => [fk.name, fk]));
          const targetFKMap = new Map(targetFKs.map((fk: any) => [fk.name, fk]));

          // FKs to add (in source but not in target)
          const fksToAdd = sourceFKs.filter((fk: any) => !targetFKMap.has(fk.name));
          if (fksToAdd.length > 0) {
            script += `-- Add Foreign Keys:\n`;
            fksToAdd.forEach((fk: any) => {
              const columns = fk.columns.join('`, `');
              const refColumns = fk.referencedColumns.join('`, `');
              script += `ALTER TABLE \`${diff.name}\` ADD CONSTRAINT \`${fk.name}\` FOREIGN KEY (\`${columns}\`) REFERENCES \`${fk.referencedTable}\` (\`${refColumns}\`);\n`;
            });
            script += '\n';
          }

          // FKs to drop (in target but not in source - commented for safety)
          const fksToDrop = targetFKs.filter((fk: any) => !sourceFKMap.has(fk.name));
          if (fksToDrop.length > 0) {
            script += `-- Drop Foreign Keys (uncomment to drop):\n`;
            fksToDrop.forEach((fk: any) => {
              script += `-- ALTER TABLE \`${diff.name}\` DROP FOREIGN KEY \`${fk.name}\`;\n`;
            });
            script += '\n';
          }

          // Handle Index differences
          const sourceIndexes = diff.sourceMetadata?.indexes || [];
          const targetIndexes = diff.targetMetadata?.indexes || [];
          const sourceIdxMap = new Map(sourceIndexes.map((idx: any) => [idx.name, idx]));
          const targetIdxMap = new Map(targetIndexes.map((idx: any) => [idx.name, idx]));

          // Indexes to add (in source but not in target)
          const indexesToAdd = sourceIndexes.filter((idx: any) => !targetIdxMap.has(idx.name) && idx.name !== 'PRIMARY');
          if (indexesToAdd.length > 0) {
            script += `-- Add Indexes:\n`;
            indexesToAdd.forEach((idx: any) => {
              const columns = idx.columns.map((c: string) => `\`${c}\``).join(', ');
              if (idx.unique) {
                script += `ALTER TABLE \`${diff.name}\` ADD UNIQUE INDEX \`${idx.name}\` (${columns});\n`;
              } else {
                script += `ALTER TABLE \`${diff.name}\` ADD INDEX \`${idx.name}\` (${columns});\n`;
              }
            });
            script += '\n';
          }

          // Indexes to drop (in target but not in source - commented for safety)
          const indexesToDrop = targetIndexes.filter((idx: any) => !sourceIdxMap.has(idx.name) && idx.name !== 'PRIMARY');
          if (indexesToDrop.length > 0) {
            script += `-- Drop Indexes (uncomment to drop):\n`;
            indexesToDrop.forEach((idx: any) => {
              script += `-- ALTER TABLE \`${diff.name}\` DROP INDEX \`${idx.name}\`;\n`;
            });
            script += '\n';
          }
        } else {
          // For non-table objects (procedures, views, functions, triggers), drop and recreate
          script += `DROP ${type.toUpperCase()} IF EXISTS ${diff.name};\n\n`;
          if (diff.sourceMetadata?.definition) {
            script += `${diff.sourceMetadata.definition};\n`;
          } else {
            script += `-- CREATE ${type.toUpperCase()} ${diff.name}\n`;
            script += `-- Warning: Definition not available from source\n`;
          }
        }
      }

      return script + '\n';
    };

    // Normalize values for comparison (avoids false "modified" after restore)
    const normalizeNullable = (v: any) => v === true || v === 'YES' || v === 1 || v === '1';
    const normalizeDefault = (v: any) => {
      if (v == null || v === '') return null;
      if (typeof v === 'string' && v.toUpperCase() === 'NULL') return null;
      const s = typeof v === 'string' ? v.trim() : String(v);
      // Treat CURRENT_TIMESTAMP and CURRENT_TIMESTAMP() as same
      if (/^CURRENT_TIMESTAMP\s*\(\s*\)\s*$/i.test(s)) return 'CURRENT_TIMESTAMP()';
      if (/^CURRENT_TIMESTAMP\s*$/i.test(s)) return 'CURRENT_TIMESTAMP';
      return s;
    };
    const normalizeDataType = (v: any) => (v == null ? '' : String(v).trim());

    // Helper: Compare table columns
    const compareTableColumns = (sourceTable: any, targetTable: any) => {
      if (!sourceTable.columns || !targetTable.columns) return [];

      const sourceCols = sourceTable.columns as any[];
      const targetCols = targetTable.columns as any[];
      const sourceColMap = new Map(sourceCols.map((c: any) => [c.name, c]));
      const targetColMap = new Map(targetCols.map((c: any) => [c.name, c]));
      const columnDiffs: any[] = [];

      // Check columns in source
      sourceCols.forEach((sourceCol: any) => {
        const targetCol = targetColMap.get(sourceCol.name);
        if (!targetCol) {
          columnDiffs.push({
            columnName: sourceCol.name,
            field: 'column',
            sourceValue: sourceCol.dataType,
            targetValue: null,
            changeType: 'added',
          });
        } else {
          // Compare column properties (normalized to avoid false diffs after restore)
          const srcType = normalizeDataType(sourceCol.dataType);
          const tgtType = normalizeDataType(targetCol.dataType);
          if (srcType !== tgtType) {
            columnDiffs.push({
              columnName: sourceCol.name,
              field: 'dataType',
              sourceValue: sourceCol.dataType,
              targetValue: targetCol.dataType,
              changeType: 'modified',
            });
          }
          if (normalizeNullable(sourceCol.nullable) !== normalizeNullable(targetCol.nullable)) {
            columnDiffs.push({
              columnName: sourceCol.name,
              field: 'nullable',
              sourceValue: sourceCol.nullable,
              targetValue: targetCol.nullable,
              changeType: 'modified',
            });
          }
          if (normalizeDefault(sourceCol.defaultValue) !== normalizeDefault(targetCol.defaultValue)) {
            columnDiffs.push({
              columnName: sourceCol.name,
              field: 'defaultValue',
              sourceValue: sourceCol.defaultValue,
              targetValue: targetCol.defaultValue,
              changeType: 'modified',
            });
          }
        }
      });

      // Check columns in target that are not in source
      targetCols.forEach((targetCol: any) => {
        if (!sourceColMap.has(targetCol.name)) {
          columnDiffs.push({
            columnName: targetCol.name,
            field: 'column',
            sourceValue: null,
            targetValue: targetCol.dataType,
            changeType: 'removed',
          });
        }
      });

      return columnDiffs;
    };

    // Normalize object name for comparison (case-insensitive; MySQL/restore can differ in casing)
    const normalizeObjName = (n: string) => (n ?? '').toLowerCase();

    const compareObjects = (sourceObjs: any[], targetObjs: any[], type: any) => {
      const sourceList = sourceObjs ?? [];
      const targetList = targetObjs ?? [];
      const sourcenames = new Set(sourceList.map(o => normalizeObjName(o.name)));
      const targetNames = new Set(targetList.map(o => normalizeObjName(o.name)));
      const differences: any[] = [];

      console.log(`Comparing ${type}s:`, {
        sourceCount: sourceList.length,
        targetCount: targetList.length,
        sourceNames: sourceList.slice(0, 5).map(o => o.name),
        targetNames: targetList.slice(0, 5).map(o => o.name),
      });

      // Missing in target (case-insensitive match so restored DB isn't reported missing)
      sourceList.forEach(obj => {
        if (!targetNames.has(normalizeObjName(obj.name))) {
          console.log(`${type} "${obj.name}" is MISSING in target`);
          const diff = {
            name: obj.name,
            type,
            differenceType: 'missing',
            details: 'Object exists in source but not in target',
            sourceMetadata: obj,
          };
          differences.push({
            ...diff,
            deploymentScript: generateDeploymentScript(diff, type),
          });
        }
      });

      // Extra in target
      targetList.forEach(obj => {
        if (!sourcenames.has(normalizeObjName(obj.name))) {
          console.log(`${type} "${obj.name}" is EXTRA in target`);
          const diff = {
            name: obj.name,
            type,
            differenceType: 'extra',
            details: 'Object exists in target but not in source',
            targetMetadata: obj,
          };
          differences.push({
            ...diff,
            deploymentScript: generateDeploymentScript(diff, type),
          });
        }
      });

      // Common objects (compare for modifications; match by normalized name)
      sourceList.forEach(sourceObj => {
        const targetObj = targetList.find(o => normalizeObjName(o.name) === normalizeObjName(sourceObj.name));
        if (targetObj) {
          let columnDifferences: any[] = [];
          let differenceType: any = 'identical';
          let details = 'Schemas match';

          if (type === 'table') {
            columnDifferences = compareTableColumns(sourceObj, targetObj);
            if (columnDifferences.length > 0) {
              differenceType = 'modified';
              details = `${columnDifferences.length} column difference(s) detected`;
              console.log(`${type} "${sourceObj.name}" is MODIFIED (${columnDifferences.length} column differences)`);
            }
          } else {
            // For procedures, views, functions, triggers - compare definitions
            const sourceDef = sourceObj.definition || '';
            const targetDef = targetObj.definition || '';

            console.log(`Comparing ${type} "${sourceObj.name}":`, {
              hasSourceDef: !!sourceDef,
              hasTargetDef: !!targetDef,
              sourceDefLength: sourceDef.length,
              targetDefLength: targetDef.length,
              sourceDefPreview: sourceDef.substring(0, 100),
              targetDefPreview: targetDef.substring(0, 100),
            });

            // Normalize definitions for comparison: strip DEFINER (changes after restore), whitespace
            const normalizeDef = (def: string) => {
              let s = def
                .replace(/\s*DEFINER\s*=\s*`[^`]*`@`[^`]*`/gi, '')
                .replace(/\s+/g, ' ')
                .trim();
              return s;
            };
            const normalizedSource = normalizeDef(sourceDef);
            const normalizedTarget = normalizeDef(targetDef);

            if (normalizedSource !== normalizedTarget) {
              differenceType = 'modified';
              details = 'Definition has been modified';
              console.log(`${type} "${sourceObj.name}" is MODIFIED (definition differs)`);
            } else {
              console.log(`${type} "${sourceObj.name}" is IDENTICAL`);
            }
          }

          const diff = {
            name: sourceObj.name,
            type,
            differenceType,
            sourceMetadata: sourceObj,
            targetMetadata: targetObj,
            columnDifferences: columnDifferences.length > 0 ? columnDifferences : undefined,
            details,
          };

          differences.push({
            ...diff,
            deploymentScript: differenceType === 'modified' ? generateDeploymentScript(diff, type) : undefined,
          });
        }
      });

      return differences;
    };

    // Perform comparisons based on selected comparison type
    let tableDiffs: any[] = [];
    let procedureDiffs: any[] = [];
    let viewDiffs: any[] = [];
    let functionDiffs: any[] = [];
    let triggerDiffs: any[] = [];
    let eventDiffs: any[] = [];

    // Guard schema arrays (avoid crashes and false diffs when undefined)
    const sourceTables = sourceSchema.tables ?? [];
    const sourceProcedures = sourceSchema.procedures ?? [];
    const sourceViews = sourceSchema.views ?? [];
    const sourceFunctions = sourceSchema.functions ?? [];
    const sourceTriggers = sourceSchema.triggers ?? [];
    const sourceEvents = sourceSchema.events ?? [];
    const targetTables = targetSchema.tables ?? [];
    const targetProcedures = targetSchema.procedures ?? [];
    const targetViews = targetSchema.views ?? [];
    const targetFunctions = targetSchema.functions ?? [];
    const targetTriggers = targetSchema.triggers ?? [];
    const targetEvents = targetSchema.events ?? [];

    // Filter comparisons based on comparisonType (legacy string or JSON config)
    let config: {
      tables?: boolean;
      procedures?: boolean;
      views?: boolean;
      functions?: boolean;
      triggers?: boolean;
      events?: boolean;
      structureOnly?: boolean;
      comparisonMode?: 'structure' | 'data' | 'both';
    } | null = null;
    if (typeof comparisonType === 'string' && comparisonType.startsWith('{')) {
      try {
        config = JSON.parse(comparisonType);
      } catch {
        config = null;
      }
    }

    const mode = config?.comparisonMode ?? (config?.structureOnly === false ? 'both' : 'structure');
    const runStructure = mode === 'structure' || mode === 'both';
    const runData = mode === 'data' || mode === 'both';

    if (config && typeof config === 'object') {
      // New config format: object type checkboxes + comparisonMode
      // Tables: structure when runStructure, data when runData (data done in compareSchemas)
      if (config.tables && runStructure) tableDiffs = compareObjects(sourceTables, targetTables, 'table');
      if (config.procedures) procedureDiffs = compareObjects(sourceProcedures, targetProcedures, 'procedure');
      if (config.views) viewDiffs = compareObjects(sourceViews, targetViews, 'view');
      if (config.functions) functionDiffs = compareObjects(sourceFunctions, targetFunctions, 'function');
      if (config.triggers) triggerDiffs = compareObjects(sourceTriggers, targetTriggers, 'trigger');
      if (config.events) eventDiffs = compareObjects(sourceEvents, targetEvents, 'event');
    } else {
      // Legacy string format
      switch (comparisonType) {
        case 'structure':
          tableDiffs = compareObjects(sourceTables, targetTables, 'table');
          procedureDiffs = compareObjects(sourceProcedures, targetProcedures, 'procedure');
          viewDiffs = compareObjects(sourceViews, targetViews, 'view');
          functionDiffs = compareObjects(sourceFunctions, targetFunctions, 'function');
          triggerDiffs = compareObjects(sourceTriggers, targetTriggers, 'trigger');
          eventDiffs = compareObjects(sourceEvents, targetEvents, 'event');
          break;
        case 'data':
          console.log('Data comparison - will generate INSERT statements for data differences');
          break;
        case 'tables':
          tableDiffs = compareObjects(sourceTables, targetTables, 'table');
          break;
        case 'procedures':
          procedureDiffs = compareObjects(sourceProcedures, targetProcedures, 'procedure');
          break;
        case 'views':
          viewDiffs = compareObjects(sourceViews, targetViews, 'view');
          break;
        case 'functions':
          functionDiffs = compareObjects(sourceFunctions, targetFunctions, 'function');
          break;
        case 'triggers':
          triggerDiffs = compareObjects(sourceTriggers, targetTriggers, 'trigger');
          break;
        case 'all':
        default:
          tableDiffs = compareObjects(sourceTables, targetTables, 'table');
          procedureDiffs = compareObjects(sourceProcedures, targetProcedures, 'procedure');
          viewDiffs = compareObjects(sourceViews, targetViews, 'view');
          functionDiffs = compareObjects(sourceFunctions, targetFunctions, 'function');
          triggerDiffs = compareObjects(sourceTriggers, targetTriggers, 'trigger');
          eventDiffs = compareObjects(sourceEvents, targetEvents, 'event');
          break;
      }
    }

    const allDiffs = [...tableDiffs, ...procedureDiffs, ...viewDiffs, ...functionDiffs, ...triggerDiffs, ...eventDiffs];

    // Generate complete deployment script
    let completeScript = `-- ========================================\n`;
    completeScript += `-- Schema Deployment Script\n`;
    completeScript += `-- Source: ${sourceServer.name} / ${sourceSchema.name}\n`;
    completeScript += `-- Target: ${targetServer.name} / ${targetSchema.name}\n`;
    completeScript += `-- Generated: ${new Date().toISOString()}\n`;
    completeScript += `-- ========================================\n\n`;

    completeScript += `USE ${targetSchema.name};\n\n`;

    // Add tables first
    completeScript += `-- ========================================\n`;
    completeScript += `-- TABLES\n`;
    completeScript += `-- ========================================\n\n`;
    tableDiffs.filter(d => d.deploymentScript).forEach(d => {
      completeScript += d.deploymentScript;
    });

    // Add procedures
    completeScript += `\n-- ========================================\n`;
    completeScript += `-- STORED PROCEDURES\n`;
    completeScript += `-- ========================================\n\n`;
    procedureDiffs.filter(d => d.deploymentScript).forEach(d => {
      completeScript += d.deploymentScript;
    });

    // Add views
    completeScript += `\n-- ========================================\n`;
    completeScript += `-- VIEWS\n`;
    completeScript += `-- ========================================\n\n`;
    viewDiffs.filter(d => d.deploymentScript).forEach(d => {
      completeScript += d.deploymentScript;
    });

    // Add functions
    completeScript += `\n-- ========================================\n`;
    completeScript += `-- FUNCTIONS\n`;
    completeScript += `-- ========================================\n\n`;
    functionDiffs.filter(d => d.deploymentScript).forEach(d => {
      completeScript += d.deploymentScript;
    });

    // Add triggers
    completeScript += `\n-- ========================================\n`;
    completeScript += `-- TRIGGERS\n`;
    completeScript += `-- ========================================\n\n`;
    triggerDiffs.filter(d => d.deploymentScript).forEach(d => {
      completeScript += d.deploymentScript;
    });

    // Add events
    completeScript += `\n-- ========================================\n`;
    completeScript += `-- EVENTS\n`;
    completeScript += `-- ========================================\n\n`;
    eventDiffs.filter(d => d.deploymentScript).forEach(d => {
      completeScript += d.deploymentScript;
    });

    completeScript += `\n-- ========================================\n`;
    completeScript += `-- END OF DEPLOYMENT SCRIPT\n`;
    completeScript += `-- ========================================\n`;

    return {
      sourceServer,
      targetServer,
      sourceDatabase: sourceSchema.name,
      targetDatabase: targetSchema.name,
      comparisonDate: new Date(),
      summary: {
        totalDifferences: allDiffs.filter(d => d.differenceType !== 'identical').length,
        missingInTarget: allDiffs.filter(d => d.differenceType === 'missing').length,
        extraInTarget: allDiffs.filter(d => d.differenceType === 'extra').length,
        modified: allDiffs.filter(d => d.differenceType === 'modified').length,
        identical: allDiffs.filter(d => d.differenceType === 'identical').length,
      },
      differences: {
        tables: tableDiffs,
        procedures: procedureDiffs,
        views: viewDiffs,
        functions: functionDiffs,
        triggers: triggerDiffs,
        events: eventDiffs,
      },
      deploymentScript: completeScript,
    };
  },

  clearComparisonResult: () => {
    set({ comparisonResult: null });
  },

  // Release Management Actions
  createReleaseFromComparison: (comparisonResult, notes) => {
    const state = get();
    const releaseId = `release-${Date.now()}`;

    // Generate version number
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const releaseNumber = state.releaseDeployments.length + 1;
    const version = `R${dateStr}.${String(releaseNumber).padStart(3, '0')}`;

    const newRelease: ReleaseDeployment = {
      id: releaseId,
      version,
      releaseNumber,
      comparisonResult,
      status: 'pending',
      createdAt: new Date(),

      // Source and Target Details
      sourceDetails: {
        serverName: comparisonResult.sourceServer.name,
        databaseName: comparisonResult.sourceDatabase,
        host: `${comparisonResult.sourceServer.host}:${comparisonResult.sourceServer.port}`,
        environment: comparisonResult.sourceServer.environment,
      },
      targetDetails: {
        serverName: comparisonResult.targetServer.name,
        databaseName: comparisonResult.targetDatabase,
        host: `${comparisonResult.targetServer.host}:${comparisonResult.targetServer.port}`,
        environment: comparisonResult.targetServer.environment,
      },

      // Comparison Type (for now, assuming structure + procedures/views/functions/triggers)
      comparisonType: {
        structure: true,
        data: false, // TODO: Add data comparison in future
        procedures: true,
        views: true,
        functions: true,
        triggers: true,
      },

      deploymentProgress: {
        totalSteps: 2, // Backup + Deploy
        completedSteps: 0,
        currentStep: '',
        errors: [],
        warnings: [],
      },
      notes,
    };

    set((state) => ({
      releaseDeployments: [...state.releaseDeployments, newRelease],
      currentRelease: newRelease,
    }));

    return releaseId;
  },

  deployRelease: async (releaseId) => {
    const release = get().getReleaseById(releaseId);
    if (!release) return;

    set({ isDeploying: true, currentRelease: release });

    try {
      const targetServer = release.comparisonResult.targetServer;

      // Step 1: Deploying (backend will automatically create backup first)
      set((state) => ({
        releaseDeployments: state.releaseDeployments.map((r) =>
          r.id === releaseId
            ? {
                ...r,
                status: 'deploying' as const,
                startedAt: new Date(),
                deploymentProgress: {
                  ...r.deploymentProgress,
                  currentStep: 'Creating backup and deploying changes...',
                  completedSteps: 0,
                },
              }
            : r
        ),
        currentRelease: state.currentRelease ? {
          ...state.currentRelease,
          status: 'deploying',
          startedAt: new Date(),
          deploymentProgress: {
            ...state.currentRelease.deploymentProgress,
            currentStep: 'Creating backup and deploying changes...',
          },
        } : null,
      }));

      // Execute deployment script (backend creates backup automatically)
      const deployResult = await apiClient.executeDeploymentScript({
        host: targetServer.host,
        port: targetServer.port,
        user: targetServer.username,
        password: targetServer.password,
        database: release.comparisonResult.targetDatabase,
        type: targetServer.databaseType,
        script: release.comparisonResult.deploymentScript,
      });

      if (!deployResult.success) {
        // Save backup path for potential rollback
        set((state) => ({
          releaseDeployments: state.releaseDeployments.map((r) =>
            r.id === releaseId
              ? {
                  ...r,
                  preDeploymentBackup: deployResult.backupPath ? {
                    backupId: deployResult.backupPath,
                    backupPath: deployResult.backupPath,
                    createdAt: new Date(),
                  } : undefined,
                  deploymentProgress: {
                    ...r.deploymentProgress,
                    errors: deployResult.errors?.map((err: any) => ({
                      step: 'deployment',
                      objectName: err.statement,
                      error: err.error,
                      timestamp: new Date(),
                    })) || [],
                  },
                }
              : r
          ),
        }));

        // Rollback on failure
        await get().rollbackRelease(releaseId);
        return;
      }

      // Step 2: Mark as completed with backup info
      set((state) => ({
        releaseDeployments: state.releaseDeployments.map((r) =>
          r.id === releaseId
            ? {
                ...r,
                status: 'completed',
                completedAt: new Date(),
                deploymentProgress: {
                  ...r.deploymentProgress,
                  currentStep: 'Deployment completed successfully',
                  completedSteps: r.deploymentProgress.totalSteps,
                },
              }
            : r
        ),
        currentRelease: null,
        isDeploying: false,
      }));

      // Step 4: Automatically create build from successful release
      const completedRelease = get().getReleaseById(releaseId);
      if (completedRelease) {
        const build = get().createBuildFromRelease(completedRelease);
        get().addBuild(build);
      }

    } catch (error) {
      console.error('Deployment failed:', error);
      await get().rollbackRelease(releaseId);
    }
  },

  rollbackRelease: async (releaseId) => {
    const release = get().getReleaseById(releaseId);
    if (!release || !release.preDeploymentBackup) {
      set((state) => ({
        releaseDeployments: state.releaseDeployments.map((r) =>
          r.id === releaseId
            ? {
                ...r,
                status: 'failed',
                completedAt: new Date(),
                rollbackInfo: {
                  reason: 'Deployment failed - no backup available for rollback',
                  rolledBackAt: new Date(),
                  restoredFromBackup: false,
                },
              }
            : r
        ),
        currentRelease: null,
        isDeploying: false,
      }));
      return;
    }

    try {
      const targetServer = release.comparisonResult.targetServer;

      console.log('🔄 Rolling back deployment...');

      // Restore from backup using new rollback API
      await apiClient.rollbackDeployment({
        host: targetServer.host,
        port: targetServer.port,
        user: targetServer.username,
        password: targetServer.password,
        type: targetServer.databaseType,
        database: release.comparisonResult.targetDatabase,
        backupPath: release.preDeploymentBackup.backupPath,
      });

      set((state) => ({
        releaseDeployments: state.releaseDeployments.map((r) =>
          r.id === releaseId
            ? {
                ...r,
                status: 'rolled_back',
                completedAt: new Date(),
                rollbackInfo: {
                  reason: 'Deployment failed - restored from pre-deployment backup',
                  rolledBackAt: new Date(),
                  restoredFromBackup: true,
                },
              }
            : r
        ),
        currentRelease: null,
        isDeploying: false,
      }));
    } catch (error) {
      console.error('Rollback failed:', error);
      set((state) => ({
        releaseDeployments: state.releaseDeployments.map((r) =>
          r.id === releaseId
            ? {
                ...r,
                status: 'failed',
                completedAt: new Date(),
                rollbackInfo: {
                  reason: 'Deployment and rollback both failed',
                  rolledBackAt: new Date(),
                  restoredFromBackup: false,
                },
              }
            : r
        ),
        currentRelease: null,
        isDeploying: false,
      }));
    }
  },

  updateReleaseProgress: (releaseId, progress) => {
    set((state) => ({
      releaseDeployments: state.releaseDeployments.map((r) =>
        r.id === releaseId
          ? {
              ...r,
              deploymentProgress: {
                ...r.deploymentProgress,
                ...progress,
              },
            }
          : r
      ),
    }));
  },

  getReleaseById: (releaseId) => {
    return get().releaseDeployments.find((r) => r.id === releaseId);
  },

  // Build Management Actions
  createBuildFromRelease: (release) => {
    const sourceServer = get().getServerById(release.comparisonResult.sourceServer.id);
    const targetServer = get().getServerById(release.comparisonResult.targetServer.id);

    if (!sourceServer || !targetServer) {
      throw new Error('Source or target server not found');
    }

    // Extract artifacts from comparison result
    const artifacts: BuildArtifact[] = [];
    const comparison = release.comparisonResult;

    // Add table differences as artifacts
    comparison.differences.tables.forEach((tableDiff) => {
      const action =
        tableDiff.differenceType === 'missing' ? 'create' :
        tableDiff.differenceType === 'extra' ? 'drop' :
        'alter';

      artifacts.push({
        id: `artifact-table-${tableDiff.tableName}-${Date.now()}`,
        objectName: tableDiff.tableName,
        objectType: 'table',
        action,
        sqlScript: `-- ${action.toUpperCase()} TABLE ${tableDiff.tableName}\n-- Generated from comparison`,
        createdDate: new Date(),
        modifiedDate: new Date(),
        dependencies: [],
      });
    });

    // Add procedure differences as artifacts
    comparison.differences.procedures.forEach((procDiff) => {
      const action =
        procDiff.differenceType === 'missing' ? 'create' :
        procDiff.differenceType === 'extra' ? 'drop' :
        'alter';

      artifacts.push({
        id: `artifact-procedure-${procDiff.name}-${Date.now()}`,
        objectName: procDiff.name,
        objectType: 'procedure',
        action,
        sqlScript: `-- ${action.toUpperCase()} PROCEDURE ${procDiff.name}\n-- Generated from comparison`,
        dependencies: [],
      });
    });

    // Add view differences as artifacts
    comparison.differences.views.forEach((viewDiff) => {
      const action =
        viewDiff.differenceType === 'missing' ? 'create' :
        viewDiff.differenceType === 'extra' ? 'drop' :
        'alter';

      artifacts.push({
        id: `artifact-view-${viewDiff.name}-${Date.now()}`,
        objectName: viewDiff.name,
        objectType: 'view',
        action,
        sqlScript: `-- ${action.toUpperCase()} VIEW ${viewDiff.name}\n-- Generated from comparison`,
        dependencies: [],
      });
    });

    // Add function differences as artifacts
    comparison.differences.functions.forEach((funcDiff) => {
      const action =
        funcDiff.differenceType === 'missing' ? 'create' :
        funcDiff.differenceType === 'extra' ? 'drop' :
        'alter';

      artifacts.push({
        id: `artifact-function-${funcDiff.name}-${Date.now()}`,
        objectName: funcDiff.name,
        objectType: 'function',
        action,
        sqlScript: `-- ${action.toUpperCase()} FUNCTION ${funcDiff.name}\n-- Generated from comparison`,
        dependencies: [],
      });
    });

    // Add trigger differences as artifacts
    comparison.differences.triggers.forEach((triggerDiff) => {
      const action =
        triggerDiff.differenceType === 'missing' ? 'create' :
        triggerDiff.differenceType === 'extra' ? 'drop' :
        'alter';

      artifacts.push({
        id: `artifact-trigger-${triggerDiff.name}-${Date.now()}`,
        objectName: triggerDiff.name,
        objectType: 'trigger',
        action,
        sqlScript: `-- ${action.toUpperCase()} TRIGGER ${triggerDiff.name}\n-- Generated from comparison`,
        dependencies: [],
      });
    });

    // Create build version from release
    const buildVersion: BuildVersion = {
      id: `version-${Date.now()}`,
      version: release.version,
      buildNumber: `B${Date.now()}`,
      description: release.notes || `Build from release ${release.version}`,
      createdAt: new Date(),
      createdBy: release.deployedBy || 'admin',
    };

    // Create the build
    const build: ServerBuild = {
      id: `build-${Date.now()}`,
      buildVersion,
      sourceServer: {
        id: sourceServer.id,
        name: sourceServer.name,
        host: sourceServer.host,
        environment: sourceServer.environment,
      },
      targetServer: {
        id: targetServer.id,
        name: targetServer.name,
        host: targetServer.host,
        environment: targetServer.environment,
      },
      artifacts,
      status: 'completed',
      deploymentDate: release.completedAt || new Date(),
      deployedBy: release.deployedBy || 'admin',
      preDeploymentBackup: release.preDeploymentBackup,
      deploymentLog: [
        {
          timestamp: new Date(),
          level: 'info',
          message: `Build automatically created from release ${release.version}`,
        },
        {
          timestamp: new Date(),
          level: 'success',
          message: `Deployment completed successfully`,
        },
      ],
      deploymentStats: {
        totalArtifacts: artifacts.length,
        successfulArtifacts: artifacts.length,
        failedArtifacts: 0,
        duration: release.completedAt && release.startedAt
          ? Math.floor((release.completedAt.getTime() - release.startedAt.getTime()) / 1000)
          : undefined,
      },
      notes: release.notes,
      tags: ['auto-generated', release.comparisonResult.sourceDatabase, release.comparisonResult.targetDatabase],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return build;
  },

  addBuild: (build) => {
    set((state) => ({
      serverBuilds: [build, ...state.serverBuilds],
    }));
  },

  updateBuildStatus: (buildId, status) => {
    set((state) => ({
      serverBuilds: state.serverBuilds.map((b) =>
        b.id === buildId ? { ...b, status, updatedAt: new Date() } : b
      ),
    }));
  },

  getBuildById: (buildId) => {
    return get().serverBuilds.find((b) => b.id === buildId);
  },

  getBuildsForRelease: (releaseId) => {
    return get().serverBuilds.filter((b) =>
      b.notes?.includes(releaseId) || b.tags?.includes(releaseId)
    );
  },

  // Helpers
  getServerById: (id) => {
    return get().servers.find((server) => server.id === id);
  },

  getDatabasesForServer: (serverId) => {
    return get().databaseSchemas[serverId] || [];
  },

  getRecentBackups: (count = 10) => {
    return get().backupHistory.slice(0, count);
  },
}));
