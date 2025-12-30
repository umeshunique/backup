// Environment and Database Types
export type EnvironmentType = 'development' | 'staging' | 'uat' | 'production' | 'dr';
export type DatabaseType = 'mysql' | 'mssql' | 'postgresql';
export type OutputFormat = 'sql' | 'json' | 'xml' | 'csv' | 'zip';
export type BackupMode = 'structure' | 'data' | 'both';
export type BackupStatus = 'success' | 'failed' | 'partial';
export type ExecutionStatus = 'pending' | 'initializing' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

// Server Configuration
export interface ServerConfig {
  id: string;
  name: string;
  environment: EnvironmentType;
  host: string;
  port: number;
  databaseType: DatabaseType;
  username: string;
  password: string;
  isActive: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'testing';
  lastConnected?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Database Schema Objects
export interface TableColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  isUnique: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
  autoIncrement: boolean;
  comment?: string;
}

export interface TableConstraint {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'DEFAULT';
  columns: string[];
  referencedTable?: string;
  referencedColumns?: string[];
  definition?: string;
}

export interface TableIndex {
  name: string;
  columns: string[];
  isUnique: boolean;
  isPrimary: boolean;
  type: string;
}

export interface DatabaseTable {
  name: string;
  rowCount: number;
  sizeInMB: number;
  lastModified: Date;
  hasTriggers: boolean;
  columns?: TableColumn[];
  constraints?: TableConstraint[];
  indexes?: TableIndex[];
  engine?: string;
  collation?: string;
  comment?: string;
}

export interface StoredProcedure {
  name: string;
  parameterCount: number;
  lastModified: Date;
  definition?: string;
  parameters?: string;
}

export interface DatabaseView {
  name: string;
  dependencies: string[];
  hasTriggers: boolean;
  definition?: string;
}

export interface DatabaseFunction {
  name: string;
  type: 'scalar' | 'table-valued' | 'aggregate';
  parameterCount: number;
  definition?: string;
  parameters?: string;
  returnType?: string;
}

export interface DatabaseTrigger {
  name: string;
  type: 'ddl' | 'insert' | 'update' | 'delete';
  associatedTable: string;
  definition?: string;
  timing?: 'BEFORE' | 'AFTER' | 'INSTEAD OF';
  event?: string;
}

export interface DatabaseEvent {
  name: string;
  schedule: string;
  isEnabled: boolean;
  definition?: string;
}

export interface DatabaseSchema {
  name: string;
  sizeInMB: number;
  tableCount: number;
  lastBackupDate?: Date;
  tables: DatabaseTable[];
  procedures: StoredProcedure[];
  views: DatabaseView[];
  functions: DatabaseFunction[];
  triggers: DatabaseTrigger[];
  events: DatabaseEvent[];
}

// Backup Configuration
export interface TableBackupOptions {
  includeForeignKeys: boolean;
  includeIndexes: boolean;
  includePrimaryKeys: boolean;
  includeConstraints: boolean;
  includeAutoIncrement: boolean;
  includeTableTriggers: boolean;
}

export interface CompressionConfig {
  enabled: boolean;
  level: number; // 1-5
}

export interface SqlGenerationOptions {
  includeDropStatements: boolean;
  includeCreateStatements: boolean;
  includeUseDatabase: boolean;
  disableForeignKeyChecks: boolean;
  useTransactions: boolean;
  includeComments: boolean;
  includeTimestampHeader: boolean;
}

export interface ChunkingConfig {
  enabled: boolean;
  maxFileSizeMB: number;
  rowsPerBatch: number;
  createManifest: boolean;
}

export interface EncryptionConfig {
  enabled: boolean;
  password?: string;
}

export interface BackupConfiguration {
  id: string;
  name: string;
  serverId: string;
  databaseName: string;
  schemas?: string[];
  
  includeObjects: {
    tables: {
      enabled: boolean;
      selection: 'all' | 'selected';
      selectedTables: string[];
      mode: BackupMode;
      options: TableBackupOptions;
    };
    procedures: {
      enabled: boolean;
      selection: 'all' | 'selected';
      selectedProcedures: string[];
    };
    views: {
      enabled: boolean;
      selection: 'all' | 'selected';
      selectedViews: string[];
    };
    functions: {
      enabled: boolean;
      selection: 'all' | 'selected';
      selectedFunctions: string[];
    };
    triggers: {
      enabled: boolean;
      selection: 'all' | 'selected';
      selectedTriggers: string[];
    };
    events: {
      enabled: boolean;
      selection: 'all' | 'selected';
      selectedEvents: string[];
    };
    usersAndPermissions: boolean;
  };
  
  outputFormat: OutputFormat;
  compression: CompressionConfig;
  sqlOptions: SqlGenerationOptions;
  chunking: ChunkingConfig;
  encryption: EncryptionConfig;
  
  destinationPath: string;
  fileNamingPattern: string;
  
  retentionDays: number;
  autoDeleteOld: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

// Backup History
export interface BackupMetadata {
  databaseVersion: string;
  schemaVersion: string;
  backupTool: string;
  toolVersion: string;
  checksum: string;
}

export interface ErrorLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  objectName?: string;
  stackTrace?: string;
}

export interface BackupHistory {
  id: string;
  configId?: string;
  serverId?: string;
  serverName?: string;
  environment: EnvironmentType;
  databaseName: string;
  database?: string;
  fileName: string;
  filePath?: string;
  path?: string; // Backend uses 'path' property
  fileSize: number;
  size?: number; // Backend uses 'size' property

  backupType: 'full' | 'partial' | 'schema-only' | 'data-only' | 'structure' | 'data' | 'both';
  status: BackupStatus | 'completed';

  host?: string;
  port?: number;
  type?: string;
  includeData?: boolean;
  includeStructure?: boolean;
  includeProcedures?: boolean;
  includeViews?: boolean;
  includeTriggers?: boolean;
  includeFunctions?: boolean;
  tablesCount?: number;
  timestamp?: string;

  statistics: {
    tablesBackedUp?: number;
    proceduresBackedUp?: number;
    viewsBackedUp?: number;
    functionsBackedUp?: number;
    triggersBackedUp?: number;
    totalRows?: number;
    duration: number;
    totalObjects?: number;
  };

  checksum?: string;
  metadata?: BackupMetadata;
  errorLog?: ErrorLog[];

  createdAt: Date;
  createdBy?: string;
}

// Execution State
export interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface ExecutionError {
  timestamp: Date;
  objectName: string;
  errorMessage: string;
  errorCode?: string;
}

export interface BackupExecutionState {
  id: string;
  configId: string;
  status: ExecutionStatus;
  progress: number;
  
  currentOperation: string;
  currentObject: string;
  
  statistics: {
    startTime: Date;
    endTime?: Date;
    estimatedEndTime?: Date;
    
    totalObjects: number;
    processedObjects: number;
    
    totalRows: number;
    processedRows: number;
    
    totalSize: number;
    currentSize: number;
    
    rowsPerSecond: number;
    bytesPerSecond: number;
  };
  
  logs: ExecutionLog[];
  errors: ExecutionError[];
}

// Restore Types
export interface RestoreConfiguration {
  id: string;
  sourceType: 'history' | 'custom-path';
  sourceBackupId?: string;
  sourceFilePath?: string;
  
  targetServerId: string;
  targetDatabaseName: string;
  targetDatabaseAction: 'original' | 'new' | 'existing';
  
  objectsToRestore: {
    tables: boolean;
    procedures: boolean;
    views: boolean;
    functions: boolean;
    triggers: boolean;
    events: boolean;
  };
  
  options: {
    stopOnError: boolean;
    disableForeignKeyChecks: boolean;
    useTransactions: boolean;
    createSafetyBackup: boolean;
    truncateBeforeInsert: boolean;
    ignoreDuplicates: boolean;
    updateOnDuplicate: boolean;
    batchSize: number;
  };
  
  createdAt: Date;
}

// Storage Info
export interface StorageInfo {
  localPath: string;
  totalBackups: number;
  totalStorageUsedGB: number;
  availableSpaceGB: number;
}

// Scheduled Backup
export interface ScheduledBackup {
  id: string;
  name: string;
  configId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  cronExpression?: string;
  nextRun: Date;
  lastRun?: Date;
  isActive: boolean;
  retentionCount: number;
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notificationEmail?: string;
}

// Schema Comparison Types
export type DifferenceType = 'missing' | 'extra' | 'modified' | 'identical';
export type ObjectType = 'table' | 'procedure' | 'view' | 'function' | 'trigger' | 'event';

export interface ColumnDifference {
  columnName: string;
  field: string; // e.g., 'dataType', 'nullable', 'defaultValue'
  sourceValue: any;
  targetValue: any;
  changeType: 'added' | 'removed' | 'modified';
}

export interface SchemaObjectDifference {
  name: string;
  type: ObjectType;
  differenceType: DifferenceType;
  details?: string;
  sourceMetadata?: any;
  targetMetadata?: any;
  columnDifferences?: ColumnDifference[]; // For tables
  deploymentScript?: string; // SQL script to apply changes
}

export interface SchemaComparisonResult {
  sourceServer: ServerConfig;
  targetServer: ServerConfig;
  sourceDatabase: string;
  targetDatabase: string;
  comparisonDate: Date;

  summary: {
    totalDifferences: number;
    missingInTarget: number;
    extraInTarget: number;
    modified: number;
    identical: number;
  };

  differences: {
    tables: SchemaObjectDifference[];
    procedures: SchemaObjectDifference[];
    views: SchemaObjectDifference[];
    functions: SchemaObjectDifference[];
    triggers: SchemaObjectDifference[];
    events: SchemaObjectDifference[];
  };

  deploymentScript: string; // Complete deployment script for all changes
}

// Release Management Types
export type ReleaseStatus = 'pending' | 'backing_up' | 'deploying' | 'completed' | 'failed' | 'rolled_back';

export interface ReleaseDeployment {
  id: string;
  version: string; // e.g., "v1.0.0", "R2024.12.26.001"
  releaseNumber: number; // Sequential release number
  comparisonResult: SchemaComparisonResult;
  status: ReleaseStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;

  // Source and Target Details
  sourceDetails: {
    serverName: string;
    databaseName: string;
    host: string;
    environment: EnvironmentType;
  };
  targetDetails: {
    serverName: string;
    databaseName: string;
    host: string;
    environment: EnvironmentType;
  };

  // Comparison Type
  comparisonType: {
    structure: boolean;
    data: boolean;
    procedures: boolean;
    views: boolean;
    functions: boolean;
    triggers: boolean;
  };

  preDeploymentBackup?: {
    backupId: string;
    backupPath: string;
    createdAt: Date;
  };

  deploymentProgress: {
    totalSteps: number;
    completedSteps: number;
    currentStep: string;
    errors: Array<{
      step: string;
      objectName: string;
      error: string;
      timestamp: Date;
    }>;
    warnings: Array<{
      step: string;
      objectName: string;
      warning: string;
      timestamp: Date;
    }>;
  };

  rollbackInfo?: {
    reason: string;
    rolledBackAt: Date;
    restoredFromBackup: boolean;
  };

  deployedBy?: string;
  notes?: string;
}

// Build Tracking Types
export interface BuildVersion {
  id: string;
  version: string;
  buildNumber: string;
  description: string;
  createdAt: Date;
  createdBy: string;
}

export interface BuildArtifact {
  id: string;
  objectName: string;
  objectType: ObjectType;
  action: 'create' | 'alter' | 'drop';
  sqlScript: string;
  createdDate?: Date;
  modifiedDate?: Date;
  dependencies: string[];
}

export interface ServerBuild {
  id: string;
  buildVersion: BuildVersion;
  sourceServer: {
    id: string;
    name: string;
    host: string;
    environment: EnvironmentType;
  };
  targetServer: {
    id: string;
    name: string;
    host: string;
    environment: EnvironmentType;
  };

  artifacts: BuildArtifact[];

  status: 'draft' | 'pending' | 'deploying' | 'completed' | 'failed' | 'rolled-back';
  deploymentDate?: Date;
  deployedBy?: string;

  preDeploymentBackup?: {
    backupId: string;
    backupPath: string;
    createdAt: Date;
  };

  deploymentLog: Array<{
    timestamp: Date;
    level: 'info' | 'warning' | 'error' | 'success';
    message: string;
    artifact?: string;
  }>;

  deploymentStats: {
    totalArtifacts: number;
    successfulArtifacts: number;
    failedArtifacts: number;
    duration?: number;
  };

  rollbackInfo?: {
    reason: string;
    rolledBackAt: Date;
    restoredFromBackup: boolean;
  };

  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
