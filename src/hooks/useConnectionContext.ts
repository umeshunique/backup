/**
 * Central hook for multi-server + multi-database context.
 * Use in database screens (SQL Editor, Data Editor, ER Diagram, etc.) to get
 * the current connection and build API configs.
 *
 * Flow: ServerDatabaseBar / CompactContextBar update the store; database screens
 * read from store via this hook. When a screen changes selection, it calls
 * selectServer/selectDatabase to keep global context and bar in sync.
 */

import { useBackupStore } from '@/store/backupStore';
import type { ServerConfig } from '@/types/backup.types';
import type { ServerConnectionConfig } from '@/services/apiClient';

export interface ConnectionContext {
  /** Current server ID from global context */
  serverId: string | null;
  /** Current database name from global context */
  databaseName: string | null;
  /** Resolved server config, or undefined if none selected */
  server: ServerConfig | undefined;
  /** List of databases for the selected server */
  databases: { name: string; tableCount?: number }[];
  /** Whether a server and database are selected */
  hasConnection: boolean;
  /** Update global server selection (clears database) */
  selectServer: (id: string | null) => void;
  /** Update global database selection */
  selectDatabase: (name: string | null) => void;
  /** Build connection config for API calls (executeQuery, getSchema, etc.) */
  getConnectionConfig: (database?: string) => ServerConnectionConfig | null;
  /** Build execute-query style options (includes database) */
  getExecuteOptions: (overrides?: Partial<{ database: string }>) => {
    host: string;
    port: number;
    user: string;
    password: string;
    type: string;
    database: string;
  } | null;
  loadServers: () => Promise<void>;
  loadDatabasesForServer: (serverId: string) => Promise<void>;
  loadDatabaseSchema: (serverId: string, databaseName: string) => Promise<void>;
  servers: ServerConfig[];
  setActiveTab: (tab: string) => void;
}

export function useConnectionContext(): ConnectionContext {
  const {
    servers,
    selectedServerId,
    selectedDatabaseName,
    selectServer,
    selectDatabase,
    loadServers,
    loadDatabasesForServer,
    loadDatabaseSchema,
    getDatabasesForServer,
    getServerById,
    setActiveTab,
  } = useBackupStore();

  const server = selectedServerId ? getServerById(selectedServerId) : undefined;
  const databases = selectedServerId ? getDatabasesForServer(selectedServerId) : [];
  const hasConnection = Boolean(selectedServerId && selectedDatabaseName);

  const getConnectionConfig = (database?: string): ServerConnectionConfig | null => {
    const s = server;
    const db = database ?? selectedDatabaseName;
    if (!s || !db) return null;
    return {
      host: s.host,
      port: s.port,
      user: s.username,
      password: s.password,
      database: db,
      type: s.databaseType,
    };
  };

  const getExecuteOptions = (
    overrides?: Partial<{ database: string }>
  ): { host: string; port: number; user: string; password: string; type: string; database: string } | null => {
    const config = getConnectionConfig(overrides?.database ?? undefined);
    if (!config || !config.database) return null;
    return {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      type: config.type,
      database: config.database,
    };
  };

  return {
    serverId: selectedServerId,
    databaseName: selectedDatabaseName,
    server,
    databases,
    hasConnection,
    selectServer,
    selectDatabase,
    getConnectionConfig,
    getExecuteOptions,
    loadServers,
    loadDatabasesForServer,
    loadDatabaseSchema,
    servers,
    setActiveTab,
  };
}

