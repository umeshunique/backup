/**
 * Navigation config - Screen IDs derived from modulesConfig.
 * Sidebar structure comes from sidebarNavConfig (which uses modulesConfig).
 * This file provides: ScreenId type, ALL_SCREEN_IDS, isScreenId.
 */

import type { LucideIcon } from 'lucide-react';
import { MODULE_CATEGORIES } from '@/components/modules/modulesConfig';

/** All screen IDs - derived from main + modules (tabId) + settings */
export type ScreenId =
  | 'start'
  | 'servers'
  | 'monitoring'
  | 'modules'
  | 'database-management'
  | 'backup'
  | 'restore'
  | 'compare'
  | 'release'
  | 'builds'
  | 'sql-editor'
  | 'query-builder'
  | 'data-editor'
  | 'procedure-debugger'
  | 'history'
  | 'console'
  | 'settings'
  // Development & Query
  | 'code-snippets-library'
  | 'sql-formatter'
  | 'execution-plan-viewer'
  | 'blob-image-viewer'
  // Schema & Design
  | 'table-designer'
  | 'er-diagram'
  | 'database-objects'
  | 'object-scripting'
  | 'dependency-tracker'
  | 'schema-documenter'
  | 'index-manager'
  | 'partition-manager'
  | 'fulltext-search-config'
  // Compare & Sync
  | 'data-compare'
  | 'sync-wizard'
  | 'migration-wizard'
  | 'drift-detection'
  // Backup & Recovery
  | 'backup-schedule-manager'
  | 'point-in-time-recovery'
  | 'backup-verification'
  // Admin & Operations
  | 'session-manager'
  | 'security-manager'
  | 'maintenance'
  | 'replication-monitor'
  | 'alert-manager'
  | 'job-scheduler'
  | 'audit-log-viewer'
  // Data Tools
  | 'export-wizard'
  | 'import-wizard'
  | 'data-generator'
  | 'data-pump'
  | 'object-data-search'
  | 'pivot-table-view'
  | 'chart-visualization'
  // Performance
  | 'profiler'
  | 'slow-query-analyzer'
  | 'index-advisor'
  | 'wait-statistics'
  | 'resource-monitor'
  // Compliance & Governance
  | 'audit-compliance'
  | 'change-tracking'
  | 'compliance-reports'
  // Version Control & DevOps
  | 'schema-version-control'
  | 'cicd-integration'
  | 'change-script-generator'
  | 'rollback-script-generator'
  // High Availability & DR
  | 'failover-manager'
  | 'backup-chain-viewer'
  | 'rto-rpo-dashboard'
  | 'dr-runbook'
  // Cloud & Hybrid
  | 'cloud-connector'
  | 'hybrid-sync'
  | 'cloud-backup-integration'
  | 'multi-cloud-dashboard'
  // Collaboration & Team
  | 'shared-query-library'
  | 'team-annotations'
  | 'access-request-workflow'
  | 'role-based-dashboards'
  // Automation & Scripting
  | 'script-runner'
  | 'api-cli'
  | 'webhook-triggers'
  | 'scheduled-report-runner'
  // Data Quality & Governance
  | 'data-quality-rules'
  | 'data-lineage'
  | 'data-masking'
  | 'sensitive-data-discovery'
  // Monitoring & Observability
  | 'custom-dashboards'
  | 'sla-monitoring'
  | 'anomaly-detection'
  | 'log-aggregation-viewer'
  // Database Lifecycle
  | 'clone-snapshot-manager'
  | 'refresh-from-prod'
  | 'database-provisioning'
  | 'decommission-checklist'
  // Advanced Query
  | 'query-history-favorites'
  | 'query-explain-visualizer'
  | 'parameterized-query-runner'
  | 'batch-script-runner'
  // Security
  | 'encryption-at-rest'
  | 'ssl-certificate-manager'
  | 'row-level-security'
  | 'vulnerability-scanner'
  // Reporting
  | 'report-designer'
  | 'scheduled-reports'
  | 'dashboard-builder'
  | 'custom-metrics'
  // Integrations
  | 'jira-integration'
  | 'slack-teams-notifications'
  | 'servicenow-integration'
  | 'webhook-outbound';

export interface NavItem {
  id: ScreenId;
  label: string;
  icon: LucideIcon;
}

export interface NavCategory {
  title: string;
  items: NavItem[];
}

/** Main + Settings screen IDs (not in module categories) */
const MAIN_SCREEN_IDS: ScreenId[] = ['start', 'servers', 'monitoring', 'modules', 'database-management'];
const SETTINGS_SCREEN_IDS: ScreenId[] = ['settings'];

/** Screens that require a selected server + database (show connection placeholder when none selected). */
export const DATABASE_SCREEN_IDS: readonly ScreenId[] = [
  'sql-editor', 'data-editor', 'database-objects', 'er-diagram', 'query-builder',
  'procedure-debugger', 'execution-plan-viewer', 'profiler', 'slow-query-analyzer',
  'schema-version-control', 'data-compare', 'data-generator', 'data-quality-rules',
];

/** Module screen IDs - all tabIds from modulesConfig (for sidebar/modules hub) */
export const MODULE_SCREEN_IDS: ScreenId[] = [
  ...new Set(
    MODULE_CATEGORIES.flatMap((c) =>
      c.apps.map((a) => a.tabId).filter((id): id is NonNullable<typeof id> => id != null)
    )
  ),
] as ScreenId[];

/** Every screen ID – explicit list so All Screens page and routing show all 103+ screens */
export const ALL_SCREEN_IDS: readonly ScreenId[] = [
  ...MAIN_SCREEN_IDS,
  'backup',
  'restore',
  'compare',
  'release',
  'builds',
  'sql-editor',
  'query-builder',
  'data-editor',
  'procedure-debugger',
  'history',
  'console',
  ...SETTINGS_SCREEN_IDS,
  'code-snippets-library',
  'sql-formatter',
  'execution-plan-viewer',
  'blob-image-viewer',
  'table-designer',
  'er-diagram',
  'database-objects',
  'object-scripting',
  'dependency-tracker',
  'schema-documenter',
  'index-manager',
  'partition-manager',
  'fulltext-search-config',
  'data-compare',
  'sync-wizard',
  'migration-wizard',
  'drift-detection',
  'backup-schedule-manager',
  'point-in-time-recovery',
  'backup-verification',
  'session-manager',
  'security-manager',
  'maintenance',
  'replication-monitor',
  'alert-manager',
  'job-scheduler',
  'audit-log-viewer',
  'export-wizard',
  'import-wizard',
  'data-generator',
  'data-pump',
  'object-data-search',
  'pivot-table-view',
  'chart-visualization',
  'profiler',
  'slow-query-analyzer',
  'index-advisor',
  'wait-statistics',
  'resource-monitor',
  'audit-compliance',
  'change-tracking',
  'compliance-reports',
  'schema-version-control',
  'cicd-integration',
  'change-script-generator',
  'rollback-script-generator',
  'failover-manager',
  'backup-chain-viewer',
  'rto-rpo-dashboard',
  'dr-runbook',
  'cloud-connector',
  'hybrid-sync',
  'cloud-backup-integration',
  'multi-cloud-dashboard',
  'shared-query-library',
  'team-annotations',
  'access-request-workflow',
  'role-based-dashboards',
  'script-runner',
  'api-cli',
  'webhook-triggers',
  'scheduled-report-runner',
  'data-quality-rules',
  'data-lineage',
  'data-masking',
  'sensitive-data-discovery',
  'custom-dashboards',
  'sla-monitoring',
  'anomaly-detection',
  'log-aggregation-viewer',
  'clone-snapshot-manager',
  'refresh-from-prod',
  'database-provisioning',
  'decommission-checklist',
  'query-history-favorites',
  'query-explain-visualizer',
  'parameterized-query-runner',
  'batch-script-runner',
  'encryption-at-rest',
  'ssl-certificate-manager',
  'row-level-security',
  'vulnerability-scanner',
  'report-designer',
  'scheduled-reports',
  'dashboard-builder',
  'custom-metrics',
  'jira-integration',
  'slack-teams-notifications',
  'servicenow-integration',
  'webhook-outbound',
];

/** Check if id is a valid screen */
export function isScreenId(id: string): id is ScreenId {
  return (ALL_SCREEN_IDS as readonly string[]).includes(id);
}
