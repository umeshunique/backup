import type { LucideIcon } from 'lucide-react';
import type { ScreenId } from '@/config/navigationConfig';
import {
  LayoutGrid,
  Layers,
  Table2,
  FileCode,
  AlignLeft,
  GitBranch,
  Bug,
  Image,
  PenTool,
  Network,
  FileOutput,
  BookOpen,
  Key,
  Search,
  RefreshCw,
  ArrowLeftRight,
  Truck,
  Archive,
  RotateCcw,
  Calendar,
  Clock,
  ShieldCheck,
  Users,
  Wrench,
  Bell,
  CalendarCheck,
  ScrollText,
  Download,
  Upload,
  BarChart2,
  LineChart,
  TrendingUp,
  Gauge,
  Cpu,
  History,
  FileCheck,
  GitCommit,
  Cloud,
  Users2,
  Terminal,
  FlaskConical,
  Eye,
  LayoutDashboard,
  Box,
  Lock,
  FileBarChart,
  Webhook,
  MessageSquare,
  Ticket,
  Copy,
  Play,
  FileQuestion,
  ShieldAlert,
  FileSpreadsheet,
  Zap,
  Package,
} from 'lucide-react';

export type AccentColor = 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'violet' | 'orange' | 'slate';

/** Tab ID for developed modules - routes to actual screen. Absent = Coming Soon. Subset of ScreenId. */
export type ModuleTabId = Exclude<ScreenId, 'modules' | 'settings'>;

export interface AppItem {
  icon: LucideIcon;
  title: string;
  description: string;
  accentColor: AccentColor;
  /** If set, module is developed - click opens this screen. If absent, shows Coming Soon on click. */
  tabId?: ModuleTabId;
}

export const MODULE_CATEGORIES: { title: string; subtitle: string; apps: AppItem[] }[] = [
  {
    title: 'Development & Query',
    subtitle: 'SQL editing, query building, data editing, and debugging',
    apps: [
      { icon: Terminal, title: 'SQL Editor', description: 'Write and run SQL against your databases. Connect to a server, pick a database, and execute queries.', accentColor: 'blue', tabId: 'sql-editor' },
      { icon: Bug, title: 'Debug Console', description: 'Debug and inspect application state, store, and API responses.', accentColor: 'slate', tabId: 'console' },
      { icon: LayoutGrid, title: 'Query Builder', description: 'Visual query builder with drag-and-drop tables, joins, and criteria. Generate SQL from UI.', accentColor: 'violet', tabId: 'query-builder' },
      { icon: Table2, title: 'Data Editor', description: 'Grid-based table editor: browse, filter, sort, and edit data with inline validation and bulk update.', accentColor: 'cyan', tabId: 'data-editor' },
      { icon: FileCode, title: 'Code Snippets Library', description: 'Reusable SQL snippets, templates, and saved scripts with parameters and versioning.', accentColor: 'violet', tabId: 'code-snippets-library' },
      { icon: AlignLeft, title: 'SQL Formatter', description: 'Format and beautify SQL with configurable style, indent, and keyword casing.', accentColor: 'slate', tabId: 'sql-formatter' },
      { icon: GitBranch, title: 'Execution Plan Viewer', description: 'Visual execution plan with cost breakdown, operator tree, and index usage hints.', accentColor: 'emerald', tabId: 'execution-plan-viewer' },
      { icon: Bug, title: 'Stored Procedure Debugger', description: 'Step-through debugger for procedures and functions with breakpoints and watch.', accentColor: 'rose', tabId: 'procedure-debugger' },
      { icon: Image, title: 'BLOB / Image Viewer', description: 'View and export BLOB, binary, and image columns with hex view and preview.', accentColor: 'amber', tabId: 'blob-image-viewer' },
    ],
  },
  {
    title: 'Schema & Design',
    subtitle: 'Table design, ER diagrams, documentation, and object management',
    apps: [
      { icon: PenTool, title: 'Table Designer', description: 'Visual table designer: add/edit columns, keys, indexes, and constraints with live DDL preview.', accentColor: 'purple', tabId: 'table-designer' },
      { icon: Network, title: 'ER Diagram / Data Modeler', description: 'Entity-relationship diagram with auto-layout, relationships, and export to image/PDF.', accentColor: 'violet', tabId: 'er-diagram' },
      { icon: Layers, title: 'Database Objects', description: 'Browse tables, procedures, functions, views, and triggers. View definitions and manage objects.', accentColor: 'cyan', tabId: 'database-objects' },
      { icon: FileOutput, title: 'Object Scripting', description: 'Generate CREATE/ALTER scripts for tables, views, procedures, and full schema export.', accentColor: 'slate', tabId: 'object-scripting' },
      { icon: GitBranch, title: 'Dependency Tracker', description: 'Object dependency graph: what depends on this, what this depends on, impact analysis.', accentColor: 'cyan', tabId: 'dependency-tracker' },
      { icon: BookOpen, title: 'Schema Documenter', description: 'Generate HTML/PDF documentation from schema: tables, columns, relationships, and comments.', accentColor: 'emerald', tabId: 'schema-documenter' },
      { icon: Key, title: 'Index Manager', description: 'Create, drop, and analyze indexes. Redundant index finder and fill-factor tuning.', accentColor: 'amber', tabId: 'index-manager' },
      { icon: Layers, title: 'Partition Manager', description: 'Manage table partitioning: range, list, hash. Add/drop partitions and maintenance.', accentColor: 'orange', tabId: 'partition-manager' },
      { icon: Search, title: 'Full-Text Search Config', description: 'Configure full-text indexes, stopwords, and search syntax across columns.', accentColor: 'rose', tabId: 'fulltext-search-config' },
    ],
  },
  {
    title: 'Compare & Sync',
    subtitle: 'Schema and data comparison, migration, and drift detection',
    apps: [
      { icon: GitBranch, title: 'Schema Compare', description: 'Compare schemas between servers or backups. Generate sync script with options.', accentColor: 'blue', tabId: 'compare' },
      { icon: Table2, title: 'Data Compare', description: 'Compare table data between source and target. Diff view, sync direction, and generate INSERT/UPDATE.', accentColor: 'cyan', tabId: 'data-compare' },
      { icon: RefreshCw, title: 'Sync Wizard', description: 'Bidirectional sync: schema and/or data with conflict resolution and rollback.', accentColor: 'violet', tabId: 'sync-wizard' },
      { icon: Truck, title: 'Migration Wizard', description: 'Migrate database or subset: schema, data, users. Pre-check and post-verification.', accentColor: 'emerald', tabId: 'migration-wizard' },
      { icon: ArrowLeftRight, title: 'ETL Wizard', description: 'Universal ETL: extract from MySQL or MSSQL, load into MySQL or MSSQL. Same or different servers.', accentColor: 'orange', tabId: 'etl-wizard' },
      { icon: GitBranch, title: 'Drift Detection', description: 'Scheduled drift checks across environments with alerts and baseline snapshots.', accentColor: 'purple', tabId: 'drift-detection' },
    ],
  },
  {
    title: 'Backup & Recovery',
    subtitle: 'Backup, restore, scheduling, and verification',
    apps: [
      { icon: Archive, title: 'Backup Manager', description: 'Create full, incremental, and differential backups with compression and encryption options.', accentColor: 'blue', tabId: 'backup' },
      { icon: RotateCcw, title: 'Restore Manager', description: 'Restore from backup with object-level or full restore. Target server selection.', accentColor: 'cyan', tabId: 'restore' },
      { icon: History, title: 'History', description: 'Unified view of backups, builds, and releases with filtering and export.', accentColor: 'emerald', tabId: 'history' },
      { icon: Calendar, title: 'Backup Schedule Manager', description: 'Schedule recurring backups with retention policy and notification on failure.', accentColor: 'emerald', tabId: 'backup-schedule-manager' },
      { icon: Clock, title: 'Point-in-Time Recovery', description: 'Restore to a specific timestamp using transaction logs and backup chain.', accentColor: 'violet', tabId: 'point-in-time-recovery' },
      { icon: ShieldCheck, title: 'Backup Verification', description: 'Verify backup integrity: checksum, test restore, and consistency checks.', accentColor: 'amber', tabId: 'backup-verification' },
    ],
  },
  {
    title: 'Admin & Operations',
    subtitle: 'Server monitoring, security, maintenance, and jobs',
    apps: [
      { icon: LayoutDashboard, title: 'Database Servers', description: 'Manage server connections. Add, edit, and test database configurations.', accentColor: 'blue', tabId: 'servers' },
      { icon: BarChart2, title: 'Server Monitor', description: 'Real-time CPU, memory, connections, and disk. Per-database metrics and top queries.', accentColor: 'cyan', tabId: 'monitoring' },
      { icon: Users, title: 'Session / Connection Manager', description: 'View active sessions, connections, and locks. Kill or terminate sessions.', accentColor: 'violet', tabId: 'session-manager' },
      { icon: ShieldCheck, title: 'Security Manager', description: 'Users, roles, and permissions. Grant/revoke, password policy, and login audit.', accentColor: 'rose', tabId: 'security-manager' },
      { icon: Wrench, title: 'Maintenance', description: 'Optimize, analyze, repair tables. Rebuild indexes and update statistics.', accentColor: 'emerald', tabId: 'maintenance' },
      { icon: GitBranch, title: 'Replication Monitor', description: 'Replication lag, heartbeat, primary/replica health, and failover readiness.', accentColor: 'violet', tabId: 'replication-monitor' },
      { icon: Bell, title: 'Alert Manager', description: 'Configure alerts: threshold, condition, and notification (email, Slack, webhook).', accentColor: 'amber', tabId: 'alert-manager' },
      { icon: CalendarCheck, title: 'Job Scheduler', description: 'Schedule SQL jobs, backup jobs, and maintenance. Dependencies and retry policy.', accentColor: 'orange', tabId: 'job-scheduler' },
      { icon: ScrollText, title: 'Audit Log Viewer', description: 'Query and filter audit logs. Export and compliance report generation.', accentColor: 'slate', tabId: 'audit-log-viewer' },
    ],
  },
  {
    title: 'Data Tools',
    subtitle: 'Export, import, search, and visualization',
    apps: [
      { icon: Download, title: 'Export Wizard', description: 'Export tables or query results to CSV, Excel, JSON, XML, or SQL INSERT with options.', accentColor: 'blue', tabId: 'export-wizard' },
      { icon: Upload, title: 'Import Wizard', description: 'Import from file (CSV, Excel) with mapping, validation, and duplicate handling.', accentColor: 'cyan', tabId: 'import-wizard' },
      { icon: Cloud, title: 'Data Generator', description: 'Generate test data: random, pattern-based, or from template. Bulk insert with FKs.', accentColor: 'violet', tabId: 'data-generator' },
      { icon: Upload, title: 'Data Pump / Bulk Load', description: 'High-speed bulk load from file with minimal logging and batch options.', accentColor: 'emerald', tabId: 'data-pump' },
      { icon: Search, title: 'Object & Data Search', description: 'Search across object names and optionally data. Regex and scope filters.', accentColor: 'amber', tabId: 'object-data-search' },
      { icon: Table2, title: 'Pivot Table View', description: 'Pivot query results: rows, columns, values, and aggregation in grid.', accentColor: 'purple', tabId: 'pivot-table-view' },
      { icon: BarChart2, title: 'Chart / Result Visualization', description: 'Visualize query results as bar, line, pie charts with export.', accentColor: 'rose', tabId: 'chart-visualization' },
    ],
  },
  {
    title: 'Performance',
    subtitle: 'Profiling, tuning, and resource analysis',
    apps: [
      { icon: LineChart, title: 'Profiler / Query Trace', description: 'Trace SQL execution: duration, reads, writes. Filter by database or user.', accentColor: 'blue', tabId: 'profiler' },
      { icon: TrendingUp, title: 'Slow Query Analyzer', description: 'Top N slow queries with execution count, avg time, and recommendation hints.', accentColor: 'cyan', tabId: 'slow-query-analyzer' },
      { icon: Key, title: 'Index Advisor', description: 'Suggest missing indexes from query workload. Redundant index detection.', accentColor: 'emerald', tabId: 'index-advisor' },
      { icon: Gauge, title: 'Wait Statistics', description: 'Wait types and resource waits. Identify bottlenecks (I/O, lock, CPU).', accentColor: 'violet', tabId: 'wait-statistics' },
      { icon: Cpu, title: 'Resource Monitor', description: 'CPU, memory, disk I/O, and network by process or database over time.', accentColor: 'orange', tabId: 'resource-monitor' },
    ],
  },
  {
    title: 'Compliance & Governance',
    subtitle: 'Audit, change tracking, and compliance reports',
    apps: [
      { icon: ShieldCheck, title: 'Audit & Compliance', description: 'Change tracking with who/what/when. Exportable reports for SOC2, GDPR.', accentColor: 'rose', tabId: 'audit-compliance' },
      { icon: History, title: 'Change Tracking', description: 'Schema and config change history with diff view and rollback options.', accentColor: 'slate', tabId: 'change-tracking' },
      { icon: FileCheck, title: 'Compliance Reports', description: 'Pre-built and custom compliance reports. Schedule and distribute.', accentColor: 'amber', tabId: 'compliance-reports' },
    ],
  },
  {
    title: 'Version Control & DevOps',
    subtitle: 'Schema versioning, CI/CD, and deployment automation',
    apps: [
      { icon: GitBranch, title: 'Release Management', description: 'Deploy schema changes from comparisons. Create releases and deploy to target servers.', accentColor: 'blue', tabId: 'release' },
      { icon: Package, title: 'Build Manager', description: 'View and manage database build versions, artifacts, and deployment history.', accentColor: 'violet', tabId: 'builds' },
      { icon: GitCommit, title: 'Schema Version Control', description: 'Git integration for DDL: commit schema changes, branches, and diff history.', accentColor: 'emerald', tabId: 'schema-version-control' },
      { icon: GitBranch, title: 'CI/CD Integration', description: 'Deploy from pipeline: Jenkins, GitHub Actions, Azure DevOps with approval gates.', accentColor: 'amber', tabId: 'cicd-integration' },
      { icon: FileOutput, title: 'Change Script Generator', description: 'Generate migration scripts from schema diff with rollback and idempotent options.', accentColor: 'emerald', tabId: 'change-script-generator' },
      { icon: RotateCcw, title: 'Rollback Script Generator', description: 'Generate rollback scripts from deployment history and backup metadata.', accentColor: 'amber', tabId: 'rollback-script-generator' },
    ],
  },
  {
    title: 'High Availability & Disaster Recovery',
    subtitle: 'Failover, backup chain, RTO/RPO, and runbooks',
    apps: [
      { icon: RefreshCw, title: 'Failover Manager', description: 'Manual or automated failover: primary/replica switch with health checks and rollback.', accentColor: 'blue', tabId: 'failover-manager' },
      { icon: Archive, title: 'Backup Chain Viewer', description: 'Visualize full/incremental/diff chain, LSN, and restore path for point-in-time.', accentColor: 'cyan', tabId: 'backup-chain-viewer' },
      { icon: Gauge, title: 'RTO / RPO Dashboard', description: 'Recovery time and point objectives per database with SLA tracking and alerts.', accentColor: 'emerald', tabId: 'rto-rpo-dashboard' },
      { icon: ScrollText, title: 'DR Runbook', description: 'Step-by-step disaster recovery runbooks with checklists and post-failover verification.', accentColor: 'violet', tabId: 'dr-runbook' },
    ],
  },
  {
    title: 'Cloud & Hybrid',
    subtitle: 'Cloud connectors, hybrid sync, and multi-cloud',
    apps: [
      { icon: Cloud, title: 'Cloud Database Connector', description: 'Connect to RDS, Cloud SQL, Azure SQL. IAM and managed identity support.', accentColor: 'blue', tabId: 'cloud-connector' },
      { icon: RefreshCw, title: 'Hybrid Sync', description: 'Sync schema and data between on-prem and cloud with conflict resolution.', accentColor: 'cyan', tabId: 'hybrid-sync' },
      { icon: Archive, title: 'Cloud Backup Integration', description: 'Backup to S3, Azure Blob, GCS. Lifecycle policies and cross-region copy.', accentColor: 'emerald', tabId: 'cloud-backup-integration' },
      { icon: LayoutDashboard, title: 'Multi-Cloud Dashboard', description: 'Unified view of databases across AWS, Azure, GCP, and on-prem.', accentColor: 'violet', tabId: 'multi-cloud-dashboard' },
    ],
  },
  {
    title: 'Collaboration & Team',
    subtitle: 'Shared libraries, annotations, and access workflow',
    apps: [
      { icon: FileCode, title: 'Shared Query Library', description: 'Team query repository with tags, favorites, and version history.', accentColor: 'blue', tabId: 'shared-query-library' },
      { icon: MessageSquare, title: 'Team Annotations', description: 'Comments and notes on objects (tables, procedures). @mention and threads.', accentColor: 'cyan', tabId: 'team-annotations' },
      { icon: Ticket, title: 'Access Request Workflow', description: 'Request DB access or elevated rights. Approval workflow and audit trail.', accentColor: 'emerald', tabId: 'access-request-workflow' },
      { icon: Users2, title: 'Role-Based Dashboards', description: 'Custom dashboards per role: DBA, dev, support with filtered metrics.', accentColor: 'violet', tabId: 'role-based-dashboards' },
    ],
  },
  {
    title: 'Automation & Scripting',
    subtitle: 'Script runner, API, webhooks, and scheduled reports',
    apps: [
      { icon: Terminal, title: 'Script Runner', description: 'Run PowerShell, Bash, or SQL scripts. Parameters, logging, and exit-code handling.', accentColor: 'blue', tabId: 'script-runner' },
      { icon: Zap, title: 'API / CLI', description: 'REST API and CLI for backup, restore, compare, and deploy. Automation-friendly.', accentColor: 'cyan', tabId: 'api-cli' },
      { icon: Webhook, title: 'Webhook Triggers', description: 'Trigger jobs or alerts from webhooks. Incoming and outgoing with retry.', accentColor: 'emerald', tabId: 'webhook-triggers' },
      { icon: FileBarChart, title: 'Scheduled Report Runner', description: 'Schedule report generation and delivery (email, SharePoint, S3).', accentColor: 'violet', tabId: 'scheduled-report-runner' },
    ],
  },
  {
    title: 'Data Quality & Governance',
    subtitle: 'Data quality rules, lineage, masking, and discovery',
    apps: [
      { icon: FlaskConical, title: 'Data Quality Rules', description: 'Validation rules, duplicate detection, and referential integrity checks.', accentColor: 'blue', tabId: 'data-quality-rules' },
      { icon: Network, title: 'Data Lineage', description: 'Trace data flow: tables, columns, ETL. Impact analysis for changes.', accentColor: 'cyan', tabId: 'data-lineage' },
      { icon: Eye, title: 'Data Masking / Redaction', description: 'Mask PII in dev/copy. Static and dynamic masking with policies.', accentColor: 'emerald', tabId: 'data-masking' },
      { icon: Search, title: 'Sensitive Data Discovery', description: 'Scan for PII, PCI, PHI. Classify columns and suggest masking.', accentColor: 'violet', tabId: 'sensitive-data-discovery' },
    ],
  },
  {
    title: 'Monitoring & Observability',
    subtitle: 'Custom dashboards, SLA, anomaly detection, and logs',
    apps: [
      { icon: LayoutDashboard, title: 'Custom Dashboards', description: 'Build dashboards with charts, gauges, and tables. Save and share.', accentColor: 'blue', tabId: 'custom-dashboards' },
      { icon: Gauge, title: 'SLA Monitoring', description: 'Uptime, latency, error rate per database. SLA breach alerts and reports.', accentColor: 'cyan', tabId: 'sla-monitoring' },
      { icon: TrendingUp, title: 'Anomaly Detection', description: 'Detect unusual query patterns, connection spikes, and performance drift.', accentColor: 'emerald', tabId: 'anomaly-detection' },
      { icon: ScrollText, title: 'Log Aggregation Viewer', description: 'Query and filter aggregated logs from multiple servers. Export and alert.', accentColor: 'violet', tabId: 'log-aggregation-viewer' },
    ],
  },
  {
    title: 'Database Lifecycle',
    subtitle: 'Clone, refresh, provisioning, and decommission',
    apps: [
      { icon: Copy, title: 'Clone / Snapshot Manager', description: 'Create DB clones or snapshots for dev/test. Space-efficient where supported.', accentColor: 'blue', tabId: 'clone-snapshot-manager' },
      { icon: RefreshCw, title: 'Refresh from Prod', description: 'Copy prod to dev/staging with optional data masking and subset.', accentColor: 'cyan', tabId: 'refresh-from-prod' },
      { icon: Box, title: 'Database Provisioning', description: 'Provision new databases from template. Naming, sizing, and placement.', accentColor: 'emerald', tabId: 'database-provisioning' },
      { icon: FileQuestion, title: 'Decommission Checklist', description: 'Checklist for retiring databases: backups, dependencies, access revocation.', accentColor: 'amber', tabId: 'decommission-checklist' },
    ],
  },
  {
    title: 'Advanced Query',
    subtitle: 'Query history, explain, parameters, and batch',
    apps: [
      { icon: History, title: 'Query History & Favorites', description: 'Saved query history with favorites, tags, and run count per query.', accentColor: 'blue', tabId: 'query-history-favorites' },
      { icon: GitBranch, title: 'Query Explain Visualizer', description: 'Visual EXPLAIN with operator tree, cost, and index usage breakdown.', accentColor: 'cyan', tabId: 'query-explain-visualizer' },
      { icon: Play, title: 'Parameterized Query Runner', description: 'Run queries with parameters. Save parameter sets and schedule runs.', accentColor: 'emerald', tabId: 'parameterized-query-runner' },
      { icon: Terminal, title: 'Batch Script Runner', description: 'Run multiple SQL files in sequence. Transaction and error handling options.', accentColor: 'violet', tabId: 'batch-script-runner' },
    ],
  },
  {
    title: 'Security',
    subtitle: 'Encryption, SSL, row-level security, and scanning',
    apps: [
      { icon: Lock, title: 'Encryption at Rest Config', description: 'Configure TDE or equivalent. Key rotation and key vault integration.', accentColor: 'blue', tabId: 'encryption-at-rest' },
      { icon: ShieldCheck, title: 'SSL / TLS Certificate Manager', description: 'Manage client and server certificates. Expiry alerts and renewal.', accentColor: 'cyan', tabId: 'ssl-certificate-manager' },
      { icon: Users, title: 'Row-Level Security Config', description: 'Configure RLS policies and predicates. Test and audit.', accentColor: 'emerald', tabId: 'row-level-security' },
      { icon: ShieldAlert, title: 'Vulnerability Scanner', description: 'Scan for weak passwords, excessive privileges, and misconfigurations.', accentColor: 'rose', tabId: 'vulnerability-scanner' },
    ],
  },
  {
    title: 'Reporting',
    subtitle: 'Report designer, scheduled reports, and metrics',
    apps: [
      { icon: FileSpreadsheet, title: 'Report Designer', description: 'Design reports with tables, charts, and parameters. Export to PDF/Excel.', accentColor: 'blue', tabId: 'report-designer' },
      { icon: CalendarCheck, title: 'Scheduled Reports', description: 'Schedule report generation and delivery. Recipients and formats.', accentColor: 'cyan', tabId: 'scheduled-reports' },
      { icon: BarChart2, title: 'Dashboard Builder', description: 'Build interactive dashboards with filters, drill-down, and export.', accentColor: 'emerald', tabId: 'dashboard-builder' },
      { icon: Gauge, title: 'Custom Metrics', description: 'Define and collect custom metrics. Thresholds and alerting.', accentColor: 'violet', tabId: 'custom-metrics' },
    ],
  },
  {
    title: 'Integrations',
    subtitle: 'Jira, Slack, ServiceNow, and webhooks',
    apps: [
      { icon: Ticket, title: 'Jira / Ticket Integration', description: 'Link changes to Jira tickets. Create tickets from failed jobs or alerts.', accentColor: 'blue', tabId: 'jira-integration' },
      { icon: MessageSquare, title: 'Slack / Teams Notifications', description: 'Send alerts and job status to Slack or Microsoft Teams channels.', accentColor: 'cyan', tabId: 'slack-teams-notifications' },
      { icon: Ticket, title: 'ServiceNow Integration', description: 'Create incidents or change requests from alerts. Sync status back.', accentColor: 'emerald', tabId: 'servicenow-integration' },
      { icon: Webhook, title: 'Webhook Outbound', description: 'Call webhooks on backup complete, job failure, or custom events.', accentColor: 'violet', tabId: 'webhook-outbound' },
    ],
  },
];

/** Look up app by tabId (screen id). Use for module screens that share a generic shell. */
export function getAppByTabId(tabId: string): AppItem | undefined {
  for (const cat of MODULE_CATEGORIES) {
    const app = cat.apps.find((a) => a.tabId === tabId);
    if (app) return app;
  }
  return undefined;
}

export const CATEGORY_SECTIONS: { sectionTitle: string; categoryIndices: number[] }[] = [
  { sectionTitle: 'Development & Data', categoryIndices: [0, 1, 2, 5] },
  { sectionTitle: 'Operations', categoryIndices: [3, 4] },
  { sectionTitle: 'Performance', categoryIndices: [6] },
  { sectionTitle: 'Governance & Compliance', categoryIndices: [7, 13, 17] },
  { sectionTitle: 'DevOps & Lifecycle', categoryIndices: [8, 9, 15] },
  { sectionTitle: 'Cloud & Collaboration', categoryIndices: [10, 11] },
  { sectionTitle: 'Automation & Monitoring', categoryIndices: [12, 14] },
  { sectionTitle: 'Reporting & Integrations', categoryIndices: [16, 18, 19] },
];
