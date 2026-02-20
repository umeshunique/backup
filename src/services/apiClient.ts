import { DatabaseSchema } from '../types/backup.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_USERNAME = import.meta.env.VITE_API_USERNAME || 'admin';
const API_PASSWORD = import.meta.env.VITE_API_PASSWORD || 'admin';

// Create Basic Auth header
const getAuthHeader = () => {
  const credentials = btoa(`${API_USERNAME}:${API_PASSWORD}`);
  return `Basic ${credentials}`;
};

// Generic API request handler
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': getAuthHeader(),
      ...options.headers,
    },
  });

  const text = await response.text();
  let data: T;
  try {
    data = (text ? JSON.parse(text) : {}) as T;
  } catch {
    // Non-JSON response (e.g. HTML error pages, plain text)
    if (!response.ok) {
      throw new Error(text || `API request failed: ${response.statusText}`);
    }
    throw new Error(`Invalid response: expected JSON`);
  }

  if (!response.ok) {
    const message = (data as { message?: string }).message || text || `API request failed: ${response.statusText}`;
    throw new Error(message);
  }

  return data;
}

export interface ServerConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database?: string;
  type: 'mysql' | 'mssql' | 'postgresql';
}

export interface BackupExecutionOptions {
  host: string;
  port: number;
  user: string;
  password: string;
  type: string;
  database: string;
  includeData: boolean;
  includeStructure: boolean;
  includeProcedures: boolean;
  includeViews: boolean;
  includeTriggers: boolean;
  includeFunctions: boolean;
  tables?: string[];
  fileName?: string;
  destinationPath?: string;
}

export const apiClient = {
  // ==================== Server Management ====================

  /**
   * Get all servers
   */
  async getAllServers(): Promise<{ success: boolean; servers: any[] }> {
    return apiRequest('/api/servers', {
      method: 'GET',
    });
  },

  /**
   * Get server by ID
   */
  async getServerById(id: string): Promise<{ success: boolean; server: any }> {
    return apiRequest(`/api/servers/${id}`, {
      method: 'GET',
    });
  },

  /**
   * Create new server
   */
  async createServer(serverData: any): Promise<{ success: boolean; message: string; server: any }> {
    return apiRequest('/api/servers', {
      method: 'POST',
      body: JSON.stringify(serverData),
    });
  },

  /**
   * Update server
   */
  async updateServer(id: string, updates: any): Promise<{ success: boolean; message: string; server: any }> {
    return apiRequest(`/api/servers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Delete server
   */
  async deleteServer(id: string): Promise<{ success: boolean; message: string }> {
    return apiRequest(`/api/servers/${id}`, {
      method: 'DELETE',
    });
  },

  // ==================== Database Operations ====================

  /**
   * Test database connection
   */
  async testConnection(config: ServerConnectionConfig): Promise<{ success: boolean; message: string }> {
    return apiRequest('/api/backup/test-connection', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  /**
   * Get list of databases on a server
   */
  async getDatabases(config: ServerConnectionConfig): Promise<{ success: boolean; databases: string[] }> {
    return apiRequest('/api/backup/databases', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  /**
   * Get database schema information
   */
  async getDatabaseSchema(
    config: ServerConnectionConfig,
    database: string
  ): Promise<{ success: boolean; schema: DatabaseSchema }> {
    return apiRequest('/api/backup/schema', {
      method: 'POST',
      body: JSON.stringify({ ...config, database }),
    });
  },

  /**
   * Create a new database on a server
   */
  async createDatabase(
    config: ServerConnectionConfig,
    databaseName: string
  ): Promise<{ success: boolean; message: string }> {
    return apiRequest('/api/backup/create-database', {
      method: 'POST',
      body: JSON.stringify({ ...config, databaseName }),
    });
  },

  /**
   * Drop a database on a server
   */
  async dropDatabase(
    config: ServerConnectionConfig,
    databaseName: string
  ): Promise<{ success: boolean; message: string }> {
    return apiRequest('/api/backup/drop-database', {
      method: 'POST',
      body: JSON.stringify({ ...config, databaseName }),
    });
  },

  /**
   * Execute database backup
   */
  async executeBackup(options: BackupExecutionOptions): Promise<{
    success: boolean;
    message: string;
    data: {
      fileName: string;
      path: string;
      size: number;
      timestamp: string;
    };
  }> {
    return apiRequest('/api/backup/execute', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  /**
   * Get backup history
   */
  async getBackupHistory(): Promise<{ success: boolean; history: any[] }> {
    return apiRequest('/api/backup/history', {
      method: 'GET',
    });
  },

  /**
   * Browse file system directories
   */
  async browseDirectories(path?: string): Promise<{
    success: boolean;
    currentPath: string;
    parentPath: string | null;
    directories: Array<{
      name: string;
      path: string;
      isDirectory: boolean;
      modifiedDate: string;
    }>;
    separator: string;
  }> {
    const queryParam = path ? `?path=${encodeURIComponent(path)}` : '';
    return apiRequest(`/api/backup/browse-directories${queryParam}`, {
      method: 'GET',
    });
  },

  /**
   * Restore database from backup file
   */
  async restoreBackup(options: {
    host: string;
    port: number;
    user: string;
    password: string;
    type: string;
    database: string;
    backupFilePath: string;
  }): Promise<{
    success: boolean;
    message: string;
    restoreId: string;
    summary: {
      tables: number;
      procedures: number;
      views: number;
      triggers: number;
      functions: number;
      total: number;
    };
  }> {
    return apiRequest('/api/backup/restore', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  /**
   * Get restore progress
   */
  async getRestoreProgress(restoreId: string): Promise<{
    success: boolean;
    progress: {
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
    };
  }> {
    return apiRequest(`/api/backup/restore-progress/${restoreId}`, {
      method: 'GET',
    });
  },

  /**
   * Execute deployment script
   */
  async executeDeploymentScript(options: {
    host: string;
    port: number;
    user: string;
    password: string;
    type: string;
    database: string;
    script: string;
  }): Promise<{
    success: boolean;
    message: string;
    backupPath?: string;
    errors?: Array<{
      statement: string;
      error: string;
    }>;
  }> {
    return apiRequest('/api/backup/execute-deployment', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  /**
   * Rollback deployment using backup
   */
  async rollbackDeployment(options: {
    host: string;
    port: number;
    user: string;
    password: string;
    type: string;
    database: string;
    backupPath: string;
  }): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    return apiRequest('/api/backup/rollback-deployment', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  /**
   * Optional callback for Action Output log (set by app to record executed queries).
   */
  setOnQueryExecuted(cb: ((entry: { action: string; message: string; durationMs: number }) => void) | undefined) {
    (this as { _onQueryExecuted?: (entry: { action: string; message: string; durationMs: number }) => void })._onQueryExecuted = cb;
  },

  /**
   * Execute arbitrary SQL query
   */
  async executeQuery(options: {
    host: string;
    port: number;
    user: string;
    password: string;
    type: string;
    database: string;
    query: string;
  }): Promise<{
    success: boolean;
    columns?: string[];
    columnTypes?: string[];
    rows?: any[];
    affectedRows?: number;
    message?: string;
    error?: string;
  }> {
    const start = Date.now();
    const result = await apiRequest<{
      success: boolean;
      columns?: string[];
      columnTypes?: string[];
      rows?: any[];
      affectedRows?: number;
      message?: string;
      error?: string;
    }>('/api/backup/execute-query', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    const durationMs = Date.now() - start;
    const actionSnippet = options.query.trim().slice(0, 80) + (options.query.trim().length > 80 ? '…' : '');
    const message = result.rows != null
      ? `${result.rows.length} row(s) returned`
      : result.affectedRows != null
        ? `${result.affectedRows} row(s) affected`
        : result.message ?? 'OK';
    (this as { _onQueryExecuted?: (e: { action: string; message: string; durationMs: number }) => void })._onQueryExecuted?.({ action: actionSnippet, message, durationMs });
    return result;
  },

  // ==================== Schema Version Control ====================

  /**
   * Fetch branches from a GitHub repo URL (for Connect / Refresh)
   */
  async fetchRemoteBranches(
    repoUrl: string,
    githubToken?: string
  ): Promise<{
    success: boolean;
    branches: { name: string; isCurrent: boolean; lastCommit: string; lastMessage: string }[];
  }> {
    return apiRequest('/api/schema-version/fetch-remote-branches', {
      method: 'POST',
      body: JSON.stringify({ repoUrl: repoUrl.trim(), githubToken: githubToken?.trim() || undefined }),
    });
  },

  /**
   * Get repository and branches for a connection
   */
  async getSchemaVersion(serverId: string, database: string): Promise<{
    success: boolean;
    data: {
      repoPath: string;
      connected: boolean;
      branches: { name: string; isCurrent: boolean; lastCommit: string; lastMessage: string }[];
      commits: { hash: string; message: string; author: string; date: string }[];
      uncommitted: { path: string; type: string; summary: string }[];
    };
  }> {
    const params = new URLSearchParams({ serverId, database });
    return apiRequest(`/api/schema-version?${params}`, { method: 'GET' });
  },

  /**
   * Update repository and/or branches for a connection
   */
  async updateSchemaVersion(
    serverId: string,
    database: string,
    updates: {
      repoPath?: string;
      connected?: boolean;
      branches?: { name: string; isCurrent: boolean; lastCommit: string; lastMessage: string }[];
      commits?: { hash: string; message: string; author: string; date: string }[];
      uncommitted?: { path: string; type: string; summary: string }[];
    }
  ): Promise<{
    success: boolean;
    data: {
      repoPath: string;
      connected: boolean;
      branches: { name: string; isCurrent: boolean; lastCommit: string; lastMessage: string }[];
      commits: { hash: string; message: string; author: string; date: string }[];
      uncommitted: { path: string; type: string; summary: string }[];
    };
  }> {
    return apiRequest('/api/schema-version', {
      method: 'PUT',
      body: JSON.stringify({ serverId, database, ...updates }),
    });
  },

  /**
   * Get top N slow queries for a server (MySQL performance_schema).
   */
  async getSlowQueries(
    serverId: string,
    options?: { database?: string | null; topN?: number }
  ): Promise<{
    success: boolean;
    queries: Array<{
      id: string;
      normalizedQuery: string;
      sqlText: string;
      executionCount: number;
      avgTimeMs: number;
      totalTimeMs: number;
      minTimeMs: number;
      maxTimeMs: number;
      databaseName: string;
      hints: string[];
    }>;
  }> {
    const params = new URLSearchParams({ serverId });
    if (options?.database) params.set('database', options.database);
    if (options?.topN != null) params.set('topN', String(options.topN));
    return apiRequest(`/api/slow-queries?${params}`, { method: 'GET' });
  },
};
