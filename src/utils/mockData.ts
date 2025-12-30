import {
  ServerConfig,
  BackupHistory,
  DatabaseSchema,
  DatabaseTable,
  StoredProcedure,
  DatabaseView,
  DatabaseFunction,
  DatabaseTrigger,
  DatabaseEvent,
  StorageInfo,
  ScheduledBackup,
  EnvironmentType,
} from '@/types/backup.types';

// Helper to generate random date within range
const randomDate = (start: Date, end: Date): Date => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

// Server Configurations
export const mockServers: ServerConfig[] = [
  {
    id: 'srv-001',
    name: 'Dev Primary',
    environment: 'development',
    host: '192.168.1.100',
    port: 3306,
    databaseType: 'mysql',
    username: 'dev_admin',
    password: '********',
    isActive: true,
    connectionStatus: 'connected',
    lastConnected: new Date('2024-12-25T08:30:00'),
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-12-20'),
  },
  {
    id: 'srv-002',
    name: 'Staging DB',
    environment: 'staging',
    host: 'staging-db.acme.internal',
    port: 5432,
    databaseType: 'postgresql',
    username: 'stg_backup_user',
    password: '********',
    isActive: true,
    connectionStatus: 'connected',
    lastConnected: new Date('2024-12-25T07:45:00'),
    createdAt: new Date('2024-02-10'),
    updatedAt: new Date('2024-12-18'),
  },
  {
    id: 'srv-003',
    name: 'UAT Server',
    environment: 'uat',
    host: 'uat-sql.acme.internal',
    port: 1433,
    databaseType: 'mssql',
    username: 'uat_svc_account',
    password: '********',
    isActive: true,
    connectionStatus: 'disconnected',
    lastConnected: new Date('2024-12-24T16:20:00'),
    createdAt: new Date('2024-03-05'),
    updatedAt: new Date('2024-12-15'),
  },
  {
    id: 'srv-004',
    name: 'Production Master',
    environment: 'production',
    host: 'prod-db-master.acme.com',
    port: 3306,
    databaseType: 'mysql',
    username: 'prod_backup_svc',
    password: '********',
    isActive: true,
    connectionStatus: 'connected',
    lastConnected: new Date('2024-12-25T09:00:00'),
    createdAt: new Date('2023-06-20'),
    updatedAt: new Date('2024-12-25'),
  },
  {
    id: 'srv-005',
    name: 'DR Replica',
    environment: 'dr',
    host: 'dr-db-01.acme-dr.com',
    port: 3306,
    databaseType: 'mysql',
    username: 'dr_admin',
    password: '********',
    isActive: true,
    connectionStatus: 'connected',
    lastConnected: new Date('2024-12-25T06:00:00'),
    createdAt: new Date('2023-09-15'),
    updatedAt: new Date('2024-12-22'),
  },
];

// Generate Tables
const generateTables = (): DatabaseTable[] => {
  const tableNames = [
    'tbl_users', 'tbl_customers', 'tbl_orders', 'tbl_order_items', 'tbl_products',
    'tbl_categories', 'tbl_inventory', 'tbl_payments', 'tbl_invoices', 'tbl_shipments',
    'tbl_addresses', 'tbl_user_roles', 'tbl_permissions', 'tbl_audit_logs', 'tbl_sessions',
    'tbl_notifications', 'tbl_messages', 'tbl_attachments', 'tbl_settings', 'tbl_config',
    'tbl_employees', 'tbl_departments', 'tbl_projects', 'tbl_tasks', 'tbl_timesheets',
    'tbl_expenses', 'tbl_budgets', 'tbl_vendors', 'tbl_contracts', 'tbl_documents',
    'tbl_comments', 'tbl_reviews', 'tbl_ratings', 'tbl_wishlists', 'tbl_carts',
    'tbl_coupons', 'tbl_discounts', 'tbl_promotions', 'tbl_campaigns', 'tbl_analytics',
    'tbl_reports', 'tbl_exports', 'tbl_imports', 'tbl_migrations', 'tbl_backups',
    'tbl_logs', 'tbl_errors', 'tbl_events', 'tbl_webhooks', 'tbl_api_keys',
  ];

  return tableNames.map((name) => ({
    name,
    rowCount: Math.floor(Math.random() * 500000) + 100,
    sizeInMB: Math.round((Math.random() * 500 + 1) * 100) / 100,
    lastModified: randomDate(new Date('2024-10-01'), new Date()),
    hasTriggers: Math.random() > 0.7,
  }));
};

// Generate Procedures
const generateProcedures = (): StoredProcedure[] => {
  const prefixes = ['sp_', 'proc_', 'usp_'];
  const actions = ['Get', 'Set', 'Update', 'Delete', 'Insert', 'Calculate', 'Process', 'Validate', 'Generate', 'Archive'];
  const entities = ['User', 'Order', 'Customer', 'Product', 'Payment', 'Invoice', 'Report', 'Notification', 'Session', 'Audit'];
  
  const procedures: StoredProcedure[] = [];
  
  for (let i = 0; i < 120; i++) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const entity = entities[Math.floor(Math.random() * entities.length)];
    
    procedures.push({
      name: `${prefix}${action}${entity}${i > 30 ? `_v${Math.floor(i / 30)}` : ''}`,
      parameterCount: Math.floor(Math.random() * 8),
      lastModified: randomDate(new Date('2024-06-01'), new Date()),
    });
  }
  
  return procedures;
};

// Generate Views
const generateViews = (): DatabaseView[] => {
  const viewNames = [
    'vw_ActiveUsers', 'vw_RecentOrders', 'vw_TopProducts', 'vw_CustomerSummary',
    'vw_SalesReport', 'vw_InventoryStatus', 'vw_PaymentHistory', 'vw_UserActivity',
    'vw_OrderDetails', 'vw_ProductCatalog', 'vw_EmployeeHierarchy', 'vw_ProjectStatus',
    'vw_ExpenseReport', 'vw_BudgetOverview', 'vw_VendorPerformance', 'vw_AuditTrail',
    'vw_DashboardMetrics', 'vw_KPIReport', 'vw_MonthlyRevenue', 'vw_CustomerRetention',
  ];

  return viewNames.map((name) => ({
    name,
    dependencies: Array.from({ length: Math.floor(Math.random() * 4) + 1 }, () =>
      `tbl_${['users', 'orders', 'products', 'customers', 'payments'][Math.floor(Math.random() * 5)]}`
    ),
    hasTriggers: Math.random() > 0.85,
  }));
};

// Generate Functions
const generateFunctions = (): DatabaseFunction[] => {
  const functions: DatabaseFunction[] = [
    { name: 'fn_CalculateDiscount', type: 'scalar', parameterCount: 3 },
    { name: 'fn_GetUserAge', type: 'scalar', parameterCount: 1 },
    { name: 'fn_FormatCurrency', type: 'scalar', parameterCount: 2 },
    { name: 'fn_ValidateEmail', type: 'scalar', parameterCount: 1 },
    { name: 'fn_GetOrderTotal', type: 'scalar', parameterCount: 1 },
    { name: 'fn_GetUserOrders', type: 'table-valued', parameterCount: 2 },
    { name: 'fn_SearchProducts', type: 'table-valued', parameterCount: 3 },
    { name: 'fn_GetCustomerHistory', type: 'table-valued', parameterCount: 1 },
    { name: 'fn_SplitString', type: 'table-valued', parameterCount: 2 },
    { name: 'fn_GetDateRange', type: 'table-valued', parameterCount: 2 },
    { name: 'agg_WeightedAverage', type: 'aggregate', parameterCount: 2 },
    { name: 'agg_Median', type: 'aggregate', parameterCount: 1 },
    { name: 'agg_Mode', type: 'aggregate', parameterCount: 1 },
  ];

  return functions;
};

// Generate Triggers
const generateTriggers = (): DatabaseTrigger[] => {
  const triggers: DatabaseTrigger[] = [
    { name: 'trg_Users_Insert_Audit', type: 'insert', associatedTable: 'tbl_users' },
    { name: 'trg_Users_Update_Audit', type: 'update', associatedTable: 'tbl_users' },
    { name: 'trg_Users_Delete_Audit', type: 'delete', associatedTable: 'tbl_users' },
    { name: 'trg_Orders_Insert_Inventory', type: 'insert', associatedTable: 'tbl_orders' },
    { name: 'trg_Orders_Update_Status', type: 'update', associatedTable: 'tbl_orders' },
    { name: 'trg_Products_Update_Cache', type: 'update', associatedTable: 'tbl_products' },
    { name: 'trg_Payments_Insert_Notify', type: 'insert', associatedTable: 'tbl_payments' },
    { name: 'trg_Inventory_Update_Alert', type: 'update', associatedTable: 'tbl_inventory' },
    { name: 'trg_Customers_Insert_Welcome', type: 'insert', associatedTable: 'tbl_customers' },
    { name: 'trg_Customers_Delete_Archive', type: 'delete', associatedTable: 'tbl_customers' },
    { name: 'trg_DDL_SchemaChange_Log', type: 'ddl', associatedTable: 'DATABASE' },
    { name: 'trg_DDL_TableCreate_Alert', type: 'ddl', associatedTable: 'DATABASE' },
    { name: 'trg_Sessions_Insert_Track', type: 'insert', associatedTable: 'tbl_sessions' },
    { name: 'trg_AuditLogs_Insert_Index', type: 'insert', associatedTable: 'tbl_audit_logs' },
    { name: 'trg_Invoices_Update_Totals', type: 'update', associatedTable: 'tbl_invoices' },
    { name: 'trg_Shipments_Insert_Track', type: 'insert', associatedTable: 'tbl_shipments' },
    { name: 'trg_Expenses_Insert_Approve', type: 'insert', associatedTable: 'tbl_expenses' },
    { name: 'trg_Tasks_Update_Project', type: 'update', associatedTable: 'tbl_tasks' },
    { name: 'trg_Documents_Delete_Cleanup', type: 'delete', associatedTable: 'tbl_documents' },
    { name: 'trg_Reviews_Insert_Rating', type: 'insert', associatedTable: 'tbl_reviews' },
    { name: 'trg_Carts_Update_Totals', type: 'update', associatedTable: 'tbl_carts' },
    { name: 'trg_Promotions_Update_Valid', type: 'update', associatedTable: 'tbl_promotions' },
  ];

  return triggers;
};

// Generate Events
const generateEvents = (): DatabaseEvent[] => {
  return [
    { name: 'evt_DailyCleanup', schedule: '0 2 * * *', isEnabled: true },
    { name: 'evt_WeeklyReport', schedule: '0 6 * * 1', isEnabled: true },
    { name: 'evt_MonthlyArchive', schedule: '0 3 1 * *', isEnabled: true },
    { name: 'evt_HourlySync', schedule: '0 * * * *', isEnabled: true },
    { name: 'evt_SessionCleanup', schedule: '*/30 * * * *', isEnabled: true },
    { name: 'evt_CacheRefresh', schedule: '*/15 * * * *', isEnabled: false },
  ];
};

// Database Schemas
export const mockDatabaseSchemas: Record<string, DatabaseSchema[]> = {
  'srv-001': [
    {
      name: 'ecommerce_dev',
      sizeInMB: 2450,
      tableCount: 45,
      lastBackupDate: new Date('2024-12-24T22:00:00'),
      tables: generateTables().slice(0, 45),
      procedures: generateProcedures().slice(0, 80),
      views: generateViews().slice(0, 15),
      functions: generateFunctions(),
      triggers: generateTriggers().slice(0, 18),
      events: generateEvents(),
    },
    {
      name: 'analytics_dev',
      sizeInMB: 890,
      tableCount: 22,
      lastBackupDate: new Date('2024-12-23T18:00:00'),
      tables: generateTables().slice(0, 22),
      procedures: generateProcedures().slice(0, 35),
      views: generateViews().slice(0, 8),
      functions: generateFunctions().slice(0, 6),
      triggers: generateTriggers().slice(0, 8),
      events: generateEvents().slice(0, 3),
    },
  ],
  'srv-002': [
    {
      name: 'staging_main',
      sizeInMB: 4200,
      tableCount: 50,
      lastBackupDate: new Date('2024-12-25T02:00:00'),
      tables: generateTables(),
      procedures: generateProcedures(),
      views: generateViews(),
      functions: generateFunctions(),
      triggers: generateTriggers(),
      events: generateEvents(),
    },
  ],
  'srv-003': [
    {
      name: 'uat_testing',
      sizeInMB: 3100,
      tableCount: 48,
      tables: generateTables().slice(0, 48),
      procedures: generateProcedures().slice(0, 100),
      views: generateViews(),
      functions: generateFunctions(),
      triggers: generateTriggers(),
      events: generateEvents(),
    },
  ],
  'srv-004': [
    {
      name: 'production_core',
      sizeInMB: 15600,
      tableCount: 50,
      lastBackupDate: new Date('2024-12-25T06:00:00'),
      tables: generateTables(),
      procedures: generateProcedures(),
      views: generateViews(),
      functions: generateFunctions(),
      triggers: generateTriggers(),
      events: generateEvents(),
    },
    {
      name: 'production_analytics',
      sizeInMB: 8900,
      tableCount: 35,
      lastBackupDate: new Date('2024-12-25T04:00:00'),
      tables: generateTables().slice(0, 35),
      procedures: generateProcedures().slice(0, 60),
      views: generateViews().slice(0, 12),
      functions: generateFunctions().slice(0, 8),
      triggers: generateTriggers().slice(0, 12),
      events: generateEvents().slice(0, 4),
    },
  ],
  'srv-005': [
    {
      name: 'dr_replica',
      sizeInMB: 15600,
      tableCount: 50,
      lastBackupDate: new Date('2024-12-25T06:30:00'),
      tables: generateTables(),
      procedures: generateProcedures(),
      views: generateViews(),
      functions: generateFunctions(),
      triggers: generateTriggers(),
      events: generateEvents(),
    },
  ],
};

// Backup History
export const mockBackupHistory: BackupHistory[] = [
  {
    id: 'bkp-001',
    configId: 'cfg-001',
    serverId: 'srv-004',
    serverName: 'Production Master',
    environment: 'production',
    databaseName: 'production_core',
    fileName: 'production_core_20241225_060000.sql.gz',
    filePath: '/backups/production/2024-12/',
    fileSize: 2450000000,
    backupType: 'full',
    status: 'success',
    statistics: {
      tablesBackedUp: 50,
      proceduresBackedUp: 120,
      viewsBackedUp: 20,
      functionsBackedUp: 13,
      triggersBackedUp: 22,
      totalRows: 5420000,
      duration: 1847,
    },
    checksum: 'sha256:8d4a2f1e9c3b5d7a6e8f0c2b4a6d8e0f2a4c6e8f0b2d4a6c8e0f2a4c6e8f0a2b',
    metadata: {
      databaseVersion: 'MySQL 8.0.35',
      schemaVersion: '2024.12.25',
      backupTool: 'DB Backup Manager',
      toolVersion: '2.1.0',
      checksum: 'sha256:8d4a2f1e9c3b5d7a...',
    },
    createdAt: new Date('2024-12-25T06:00:00'),
    createdBy: 'system_scheduler',
  },
  {
    id: 'bkp-002',
    configId: 'cfg-002',
    serverId: 'srv-002',
    serverName: 'Staging DB',
    environment: 'staging',
    databaseName: 'staging_main',
    fileName: 'staging_main_20241225_020000.sql.gz',
    filePath: '/backups/staging/2024-12/',
    fileSize: 980000000,
    backupType: 'full',
    status: 'success',
    statistics: {
      tablesBackedUp: 50,
      proceduresBackedUp: 120,
      viewsBackedUp: 20,
      functionsBackedUp: 13,
      triggersBackedUp: 22,
      totalRows: 1250000,
      duration: 542,
    },
    checksum: 'sha256:a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',
    metadata: {
      databaseVersion: 'PostgreSQL 15.4',
      schemaVersion: '2024.12.25',
      backupTool: 'DB Backup Manager',
      toolVersion: '2.1.0',
      checksum: 'sha256:a1b2c3d4e5f6g7h8...',
    },
    createdAt: new Date('2024-12-25T02:00:00'),
    createdBy: 'system_scheduler',
  },
  {
    id: 'bkp-003',
    configId: 'cfg-001',
    serverId: 'srv-004',
    serverName: 'Production Master',
    environment: 'production',
    databaseName: 'production_analytics',
    fileName: 'production_analytics_20241225_040000.sql.gz',
    filePath: '/backups/production/2024-12/',
    fileSize: 1650000000,
    backupType: 'full',
    status: 'success',
    statistics: {
      tablesBackedUp: 35,
      proceduresBackedUp: 60,
      viewsBackedUp: 12,
      functionsBackedUp: 8,
      triggersBackedUp: 12,
      totalRows: 8900000,
      duration: 1234,
    },
    checksum: 'sha256:1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7',
    metadata: {
      databaseVersion: 'MySQL 8.0.35',
      schemaVersion: '2024.12.25',
      backupTool: 'DB Backup Manager',
      toolVersion: '2.1.0',
      checksum: 'sha256:1a2b3c4d5e6f7g8h...',
    },
    createdAt: new Date('2024-12-25T04:00:00'),
    createdBy: 'system_scheduler',
  },
];

// Generate more backup history entries
const environments: EnvironmentType[] = ['development', 'staging', 'uat', 'production', 'dr'];
const statuses: ('success' | 'failed' | 'partial')[] = ['success', 'success', 'success', 'success', 'partial', 'failed'];

for (let i = 4; i <= 30; i++) {
  const env = environments[Math.floor(Math.random() * environments.length)];
  const server = mockServers.find(s => s.environment === env) || mockServers[0];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const date = randomDate(new Date('2024-10-01'), new Date('2024-12-24'));
  
  mockBackupHistory.push({
    id: `bkp-${String(i).padStart(3, '0')}`,
    configId: `cfg-${String(Math.floor(Math.random() * 5) + 1).padStart(3, '0')}`,
    serverId: server.id,
    serverName: server.name,
    environment: env,
    databaseName: env === 'production' ? 'production_core' : `${env}_main`,
    fileName: `${env}_backup_${date.toISOString().slice(0, 10).replace(/-/g, '')}_${String(Math.floor(Math.random() * 240000)).padStart(6, '0')}.sql${Math.random() > 0.3 ? '.gz' : ''}`,
    filePath: `/backups/${env}/${date.toISOString().slice(0, 7)}/`,
    fileSize: Math.floor(Math.random() * 5000000000) + 100000000,
    backupType: ['full', 'partial', 'schema-only', 'data-only'][Math.floor(Math.random() * 4)] as any,
    status,
    statistics: {
      tablesBackedUp: Math.floor(Math.random() * 50) + 10,
      proceduresBackedUp: Math.floor(Math.random() * 120) + 20,
      viewsBackedUp: Math.floor(Math.random() * 20) + 5,
      functionsBackedUp: Math.floor(Math.random() * 13) + 2,
      triggersBackedUp: Math.floor(Math.random() * 22) + 5,
      totalRows: Math.floor(Math.random() * 10000000) + 100000,
      duration: Math.floor(Math.random() * 3600) + 120,
    },
    checksum: `sha256:${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    metadata: {
      databaseVersion: 'MySQL 8.0.35',
      schemaVersion: '2024.12.25',
      backupTool: 'DB Backup Manager',
      toolVersion: '2.1.0',
      checksum: `sha256:${Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}...`,
    },
    errorLog: status !== 'success' ? [
      {
        timestamp: date,
        level: 'error',
        message: status === 'failed' ? 'Connection timeout after 30 seconds' : 'Warning: Some tables were skipped due to locks',
        objectName: 'tbl_audit_logs',
      },
    ] : undefined,
    createdAt: date,
    createdBy: Math.random() > 0.7 ? 'admin@acme.com' : 'system_scheduler',
  });
}

// Sort by date descending
mockBackupHistory.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

// Storage Info
export const mockStorageInfo: StorageInfo = {
  localPath: '/var/backups/db-manager',
  totalBackups: mockBackupHistory.length,
  totalStorageUsedGB: 78.5,
  availableSpaceGB: 421.5,
};

// Scheduled Backups
export const mockScheduledBackups: ScheduledBackup[] = [
  {
    id: 'sch-001',
    name: 'Daily Production Backup',
    configId: 'cfg-001',
    frequency: 'daily',
    cronExpression: '0 6 * * *',
    nextRun: new Date('2024-12-26T06:00:00'),
    lastRun: new Date('2024-12-25T06:00:00'),
    isActive: true,
    retentionCount: 30,
    notifyOnSuccess: false,
    notifyOnFailure: true,
    notificationEmail: 'dba-team@acme.com',
  },
  {
    id: 'sch-002',
    name: 'Weekly Full Backup - All Environments',
    configId: 'cfg-002',
    frequency: 'weekly',
    cronExpression: '0 2 * * 0',
    nextRun: new Date('2024-12-29T02:00:00'),
    lastRun: new Date('2024-12-22T02:00:00'),
    isActive: true,
    retentionCount: 12,
    notifyOnSuccess: true,
    notifyOnFailure: true,
    notificationEmail: 'dba-team@acme.com',
  },
  {
    id: 'sch-003',
    name: 'Hourly Staging Sync',
    configId: 'cfg-003',
    frequency: 'custom',
    cronExpression: '0 * * * *',
    nextRun: new Date('2024-12-25T10:00:00'),
    lastRun: new Date('2024-12-25T09:00:00'),
    isActive: true,
    retentionCount: 24,
    notifyOnSuccess: false,
    notifyOnFailure: true,
  },
];

// Utility functions
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

export const getEnvironmentColor = (env: EnvironmentType): string => {
  const colors: Record<EnvironmentType, string> = {
    development: 'env-development',
    staging: 'env-staging',
    uat: 'env-uat',
    production: 'env-production',
    dr: 'env-dr',
  };
  return colors[env];
};
