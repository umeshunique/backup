import type { ScreenId } from '@/config/navigationConfig';

export type TabId = ScreenId;

export interface PageMeta {
  title: string;
  description: string;
  /** If true, PageShell will only render children (no title/description). Use for Modules etc. */
  fullWidth?: boolean;
}

export const PAGE_META: Record<TabId, PageMeta> = {
  start: {
    title: 'Start Page',
    description: 'Recent files and quick access to tools.',
    fullWidth: true,
  },
  servers: {
    title: 'Database Servers',
    description: 'Manage server connections. Add, edit, and test configurations.',
  },
  monitoring: {
    title: 'Server Monitoring',
    description: 'Monitor server health, connections, and performance.',
  },
  backup: {
    title: 'Backup',
    description: 'Create a new backup. Select server, scope, options, and destination.',
  },
  restore: {
    title: 'Restore',
    description: 'Restore from a backup. Choose backup file and target database.',
  },
  compare: {
    title: 'Schema Compare',
    description: 'Compare database schemas between servers or databases.',
  },
  release: {
    title: 'Release Management',
    description: 'Deploy builds and manage release history.',
  },
  builds: {
    title: 'Builds',
    description: 'View and manage database build versions and artifacts.',
  },
  'modules': {
    title: 'Modules',
    description: 'All modules in one place—available tools and planned features. SQL Editor, Database Management, and more.',
    fullWidth: true,
  },
  'database-management': {
    title: 'Database Management Suite',
    description: 'Full DBA suite: development, design, compare, backup, admin, data tools, performance, and compliance.',
    fullWidth: true,
  },
  'sql-editor': {
    title: 'SQL Editor',
    description: 'Run SQL queries against your database servers.',
    fullWidth: true,
  },
  'query-builder': {
    title: 'Query Builder',
    description: 'Visual query builder with drag-and-drop tables, joins, and criteria. Generate SQL from UI.',
  },
  'data-editor': {
    title: 'Data Editor',
    description: 'Browse tables, create/edit/drop tables (add/drop columns, foreign keys), and edit row data with inline validation.',
  },
  'procedure-debugger': {
    title: 'Stored Procedure Debugger',
    description: 'Debug stored procedures with breakpoints, step execution, call stack, and variable inspection.',
  },
  history: {
    title: 'History',
    description: 'Unified view of backups, builds, and releases.',
  },
  console: {
    title: 'Debug Console',
    description: 'Debug and inspect application state.',
  },
  settings: {
    title: 'Settings',
    description: 'Storage, notifications, security, and advanced options.',
  },
  // Development & Query
  'code-snippets-library': { title: 'Code Snippets Library', description: 'Reusable SQL snippets, templates, and saved scripts with parameters and versioning.' },
  'sql-formatter': { title: 'SQL Formatter', description: 'Format and beautify SQL with configurable style, indent, and keyword casing.' },
  'execution-plan-viewer': { title: 'Execution Plan Viewer', description: 'Visual execution plan with cost breakdown, operator tree, and index usage hints.' },
  'blob-image-viewer': { title: 'BLOB / Image Viewer', description: 'View and export BLOB, binary, and image columns with hex view and preview.' },
  // Schema & Design
  'table-designer': { title: 'Table Designer', description: 'Visual table designer: add/edit columns, keys, indexes, and constraints with live DDL preview.' },
  'er-diagram': { title: 'ER Diagram / Data Modeler', description: 'Entity-relationship diagram with auto-layout, relationships, and export to image/PDF.' },
  'database-objects': { title: 'Database Objects', description: 'SQL Editor, Data Model, Tables (create/edit/drop table, add/drop columns, foreign keys), procedures, views, functions, and triggers in one place.', fullWidth: true },
  'object-scripting': { title: 'Object Scripting', description: 'Generate CREATE/ALTER scripts for tables, views, procedures, and full schema export.' },
  'dependency-tracker': { title: 'Dependency Tracker', description: 'Object dependency graph: what depends on this, what this depends on, impact analysis.' },
  'schema-documenter': { title: 'Schema Documenter', description: 'Generate HTML/PDF documentation from schema: tables, columns, relationships, and comments.' },
  'index-manager': { title: 'Index Manager', description: 'Create, drop, and analyze indexes. Redundant index finder and fill-factor tuning.' },
  'partition-manager': { title: 'Partition Manager', description: 'Manage table partitioning: range, list, hash. Add/drop partitions and maintenance.' },
  'fulltext-search-config': { title: 'Full-Text Search Config', description: 'Configure full-text indexes, stopwords, and search syntax across columns.' },
  // Compare & Sync
  'data-compare': { title: 'Data Compare', description: 'Compare table data between source and target. Diff view, sync direction, and generate INSERT/UPDATE.', fullWidth: true },
  'sync-wizard': { title: 'Sync Wizard', description: 'Bidirectional sync: schema and/or data with conflict resolution and rollback.' },
  'migration-wizard': { title: 'Migration Wizard', description: 'Migrate database or subset: schema, data, users. Pre-check and post-verification.' },
  'etl-wizard': { title: 'ETL Wizard', description: 'Universal ETL: extract from MySQL or MSSQL, load into MySQL or MSSQL. Same or different servers.' },
  'drift-detection': { title: 'Drift Detection', description: 'Scheduled drift checks across environments with alerts and baseline snapshots.' },
  // Backup & Recovery
  'backup-schedule-manager': { title: 'Backup Schedule Manager', description: 'Schedule recurring backups with retention policy and notification on failure.' },
  'point-in-time-recovery': { title: 'Point-in-Time Recovery', description: 'Restore to a specific timestamp using transaction logs and backup chain.' },
  'backup-verification': { title: 'Backup Verification', description: 'Verify backup integrity: checksum, test restore, and consistency checks.' },
  // Admin & Operations
  'session-manager': { title: 'Session / Connection Manager', description: 'View active sessions, connections, and locks. Kill or terminate sessions.' },
  'security-manager': { title: 'Security Manager', description: 'Users, roles, and permissions. Grant/revoke, password policy, and login audit.' },
  maintenance: { title: 'Maintenance', description: 'Optimize, analyze, repair tables. Rebuild indexes and update statistics.' },
  'replication-monitor': { title: 'Replication Monitor', description: 'Replication lag, heartbeat, primary/replica health, and failover readiness.' },
  'alert-manager': { title: 'Alert Manager', description: 'Configure alerts: threshold, condition, and notification (email, Slack, webhook).' },
  'job-scheduler': { title: 'Job Scheduler', description: 'Schedule SQL jobs, backup jobs, and maintenance. Dependencies and retry policy.' },
  'audit-log-viewer': { title: 'Audit Log Viewer', description: 'Query and filter audit logs. Export and compliance report generation.' },
  // Data Tools
  'export-wizard': { title: 'Export Wizard', description: 'Export tables or query results to CSV, Excel, JSON, XML, or SQL INSERT with options.' },
  'import-wizard': { title: 'Import Wizard', description: 'Import from file (CSV, Excel) with mapping, validation, and duplicate handling.' },
  'data-generator': { title: 'Data Generator', description: 'Generate test data: random, pattern-based, or from template. Bulk insert with FKs.' },
  'data-pump': { title: 'Data Pump / Bulk Load', description: 'High-speed bulk load from file with minimal logging and batch options.' },
  'object-data-search': { title: 'Object & Data Search', description: 'Search across object names and optionally data. Regex and scope filters.' },
  'pivot-table-view': { title: 'Pivot Table View', description: 'Pivot query results: rows, columns, values, and aggregation in grid.' },
  'chart-visualization': { title: 'Chart / Result Visualization', description: 'Visualize query results as bar, line, pie charts with export.' },
  // Performance
  profiler: { title: 'Profiler / Query Trace', description: 'Trace SQL execution: duration, reads, writes. Filter by database or user.' },
  'slow-query-analyzer': { title: 'Slow Query Analyzer', description: 'Top N slow queries with execution count, avg time, and recommendation hints.' },
  'index-advisor': { title: 'Index Advisor', description: 'Suggest missing indexes from query workload. Redundant index detection.' },
  'wait-statistics': { title: 'Wait Statistics', description: 'Wait types and resource waits. Identify bottlenecks (I/O, lock, CPU).' },
  'resource-monitor': { title: 'Resource Monitor', description: 'CPU, memory, disk I/O, and network by process or database over time.' },
  // Compliance & Governance
  'audit-compliance': { title: 'Audit & Compliance', description: 'Change tracking with who/what/when. Exportable reports for SOC2, GDPR.' },
  'change-tracking': { title: 'Change Tracking', description: 'Schema and config change history with diff view and rollback options.' },
  'compliance-reports': { title: 'Compliance Reports', description: 'Pre-built and custom compliance reports. Schedule and distribute.' },
  // Version Control & DevOps
  'schema-version-control': { title: 'Schema Version Control', description: 'Git integration for DDL: commit schema changes, branches, and diff history.' },
  'cicd-integration': { title: 'CI/CD Integration', description: 'Deploy from pipeline: Jenkins, GitHub Actions, Azure DevOps with approval gates.' },
  'change-script-generator': { title: 'Change Script Generator', description: 'Generate migration scripts from schema diff with rollback and idempotent options.' },
  'rollback-script-generator': { title: 'Rollback Script Generator', description: 'Generate rollback scripts from deployment history and backup metadata.' },
  // High Availability & DR
  'failover-manager': { title: 'Failover Manager', description: 'Manual or automated failover: primary/replica switch with health checks and rollback.' },
  'backup-chain-viewer': { title: 'Backup Chain Viewer', description: 'Visualize full/incremental/diff chain, LSN, and restore path for point-in-time.' },
  'rto-rpo-dashboard': { title: 'RTO / RPO Dashboard', description: 'Recovery time and point objectives per database with SLA tracking and alerts.' },
  'dr-runbook': { title: 'DR Runbook', description: 'Step-by-step disaster recovery runbooks with checklists and post-failover verification.' },
  // Cloud & Hybrid
  'cloud-connector': { title: 'Cloud Database Connector', description: 'Connect to RDS, Cloud SQL, Azure SQL. IAM and managed identity support.' },
  'hybrid-sync': { title: 'Hybrid Sync', description: 'Sync schema and data between on-prem and cloud with conflict resolution.' },
  'cloud-backup-integration': { title: 'Cloud Backup Integration', description: 'Backup to S3, Azure Blob, GCS. Lifecycle policies and cross-region copy.' },
  'multi-cloud-dashboard': { title: 'Multi-Cloud Dashboard', description: 'Unified view of databases across AWS, Azure, GCP, and on-prem.' },
  // Collaboration & Team
  'shared-query-library': { title: 'Shared Query Library', description: 'Team query repository with tags, favorites, and version history.' },
  'team-annotations': { title: 'Team Annotations', description: 'Comments and notes on objects (tables, procedures). @mention and threads.' },
  'access-request-workflow': { title: 'Access Request Workflow', description: 'Request DB access or elevated rights. Approval workflow and audit trail.' },
  'role-based-dashboards': { title: 'Role-Based Dashboards', description: 'Custom dashboards per role: DBA, dev, support with filtered metrics.' },
  // Automation & Scripting
  'script-runner': { title: 'Script Runner', description: 'Run PowerShell, Bash, or SQL scripts. Parameters, logging, and exit-code handling.' },
  'api-cli': { title: 'API / CLI', description: 'REST API and CLI for backup, restore, compare, and deploy. Automation-friendly.' },
  'webhook-triggers': { title: 'Webhook Triggers', description: 'Trigger jobs or alerts from webhooks. Incoming and outgoing with retry.' },
  'scheduled-report-runner': { title: 'Scheduled Report Runner', description: 'Schedule report generation and delivery (email, SharePoint, S3).' },
  // Data Quality & Governance
  'data-quality-rules': { title: 'Data Quality Rules', description: 'Validation rules, duplicate detection, and referential integrity checks.', fullWidth: true },
  'data-lineage': { title: 'Data Lineage', description: 'Trace data flow: tables, columns, ETL. Impact analysis for changes.' },
  'data-masking': { title: 'Data Masking / Redaction', description: 'Mask PII in dev/copy. Static and dynamic masking with policies.' },
  'sensitive-data-discovery': { title: 'Sensitive Data Discovery', description: 'Scan for PII, PCI, PHI. Classify columns and suggest masking.' },
  // Monitoring & Observability
  'custom-dashboards': { title: 'Custom Dashboards', description: 'Build dashboards with charts, gauges, and tables. Save and share.' },
  'sla-monitoring': { title: 'SLA Monitoring', description: 'Uptime, latency, error rate per database. SLA breach alerts and reports.' },
  'anomaly-detection': { title: 'Anomaly Detection', description: 'Detect unusual query patterns, connection spikes, and performance drift.' },
  'log-aggregation-viewer': { title: 'Log Aggregation Viewer', description: 'Query and filter aggregated logs from multiple servers. Export and alert.' },
  // Database Lifecycle
  'clone-snapshot-manager': { title: 'Clone / Snapshot Manager', description: 'Create DB clones or snapshots for dev/test. Space-efficient where supported.' },
  'refresh-from-prod': { title: 'Refresh from Prod', description: 'Copy prod to dev/staging with optional data masking and subset.' },
  'database-provisioning': { title: 'Database Provisioning', description: 'Provision new databases from template. Naming, sizing, and placement.' },
  'decommission-checklist': { title: 'Decommission Checklist', description: 'Checklist for retiring databases: backups, dependencies, access revocation.' },
  // Advanced Query
  'query-history-favorites': { title: 'Query History & Favorites', description: 'Saved query history with favorites, tags, and run count per query.' },
  'query-explain-visualizer': { title: 'Query Explain Visualizer', description: 'Visual EXPLAIN with operator tree, cost, and index usage breakdown.' },
  'parameterized-query-runner': { title: 'Parameterized Query Runner', description: 'Run queries with parameters. Save parameter sets and schedule runs.' },
  'batch-script-runner': { title: 'Batch Script Runner', description: 'Run multiple SQL files in sequence. Transaction and error handling options.' },
  // Security
  'encryption-at-rest': { title: 'Encryption at Rest Config', description: 'Configure TDE or equivalent. Key rotation and key vault integration.' },
  'ssl-certificate-manager': { title: 'SSL / TLS Certificate Manager', description: 'Manage client and server certificates. Expiry alerts and renewal.' },
  'row-level-security': { title: 'Row-Level Security Config', description: 'Configure RLS policies and predicates. Test and audit.' },
  'vulnerability-scanner': { title: 'Vulnerability Scanner', description: 'Scan for weak passwords, excessive privileges, and misconfigurations.' },
  // Reporting
  'report-designer': { title: 'Report Designer', description: 'Design reports with tables, charts, and parameters. Export to PDF/Excel.' },
  'scheduled-reports': { title: 'Scheduled Reports', description: 'Schedule report generation and delivery. Recipients and formats.' },
  'dashboard-builder': { title: 'Dashboard Builder', description: 'Build interactive dashboards with filters, drill-down, and export.' },
  'custom-metrics': { title: 'Custom Metrics', description: 'Define and collect custom metrics. Thresholds and alerting.' },
  // Integrations
  'jira-integration': { title: 'Jira / Ticket Integration', description: 'Link changes to Jira tickets. Create tickets from failed jobs or alerts.' },
  'slack-teams-notifications': { title: 'Slack / Teams Notifications', description: 'Send alerts and job status to Slack or Microsoft Teams channels.' },
  'servicenow-integration': { title: 'ServiceNow Integration', description: 'Create incidents or change requests from alerts. Sync status back.' },
  'webhook-outbound': { title: 'Webhook Outbound', description: 'Call webhooks on backup complete, job failure, or custom events.' },
};

export function getPageMeta(tabId: TabId): PageMeta {
  return PAGE_META[tabId] ?? { title: tabId, description: '', fullWidth: false };
}
