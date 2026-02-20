/**
 * Maps screen IDs to page components.
 * Screens are the rendered content for each route.
 */

import type { ReactNode } from 'react';
import type { ScreenId } from './navigationConfig';
import { DATABASE_SCREEN_IDS as DB_SCREEN_IDS } from './navigationConfig';
import { PageShell } from '@/components/layout';
import { BackupWizard } from '@/components/backup';
import { RestoreWizard } from '@/components/restore';
import { UnifiedHistory } from '@/components/history';
import { SchemaCompare } from '@/components/compare';
import { ReleaseManagement } from '@/components/release';
import { ServersPage, ServerMonitoring } from '@/components/server';
import { BuildManagement } from '@/components/build';
import { ModulesHub, ModuleScreen } from '@/components/modules';
import { DatabaseManagementHub } from '@/components/database-management';
import { DebugConsolePage } from '@/pages/DebugConsolePage';
import { SqlEditorPage } from '@/pages/SqlEditorPage';
import { QueryBuilderPage } from '@/pages/QueryBuilderPage';
import { DataEditorPage } from '@/pages/DataEditorPage';
import { ProcedureDebuggerPage } from '@/pages/ProcedureDebuggerPage';
import { CodeSnippetsLibraryPage } from '@/pages/CodeSnippetsLibraryPage';
import { SqlFormatterPage } from '@/pages/SqlFormatterPage';
import { ExecutionPlanPage } from '@/pages/ExecutionPlanPage';
import { ProfilerPage } from '@/pages/ProfilerPage';
import { SlowQueryAnalyzerPage } from '@/pages/SlowQueryAnalyzerPage';
import { SyncWizard } from '@/components/sync-wizard';
import { MigrationWizard } from '@/components/migration-wizard';
import { ImportWizard } from '@/components/import-wizard';
import { ExportWizard } from '@/components/export-wizard';
import { ChangeScriptGenerator } from '@/components/change-script-generator';
import { RollbackScriptGenerator } from '@/components/rollback-script-generator';
import { CicdIntegrationPage } from '@/pages/CicdIntegrationPage';
import { QueryHistoryFavoritesPage } from '@/pages/QueryHistoryFavoritesPage';
import { SchemaVersionControlPage } from '@/pages/SchemaVersionControlPage';
import { ErDiagramPage } from '@/pages/ErDiagramPage';
import { DatabaseObjectsPage } from '@/pages/DatabaseObjectsPage';
import { DataComparePage } from '@/pages/DataComparePage';
import { DataQualityRulesPage } from '@/pages/DataQualityRulesPage';
import { DataLineagePage } from '@/pages/DataLineagePage';
import { DataGeneratorPage } from '@/pages/DataGeneratorPage';
import { DriftDetectionPage } from '@/pages/DriftDetectionPage';
import { PivotTableViewPage } from '@/pages/PivotTableViewPage';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, FolderOpen, Bell, Shield } from 'lucide-react';
import { StartPage } from '@/components/layout/StartPage';

/** Re-export for consumers; defined in navigationConfig to avoid circular deps. */
export const DATABASE_SCREEN_IDS: readonly ScreenId[] = DB_SCREEN_IDS;

/** Screen IDs that use the generic ModuleScreen (implemented shell, full feature TBD). */
const MODULE_ONLY_SCREEN_IDS: ScreenId[] = [
  'blob-image-viewer',
  'table-designer', 'object-scripting', 'dependency-tracker', 'schema-documenter',
  'index-manager', 'partition-manager', 'fulltext-search-config',
  'backup-schedule-manager', 'point-in-time-recovery', 'backup-verification',
  'session-manager', 'security-manager', 'maintenance', 'replication-monitor', 'alert-manager',
  'job-scheduler', 'audit-log-viewer',
  'data-pump', 'object-data-search',
  'chart-visualization',
  'index-advisor', 'wait-statistics', 'resource-monitor',
  'audit-compliance', 'change-tracking', 'compliance-reports',
  'failover-manager', 'backup-chain-viewer', 'rto-rpo-dashboard', 'dr-runbook',
  'cloud-connector', 'hybrid-sync', 'cloud-backup-integration', 'multi-cloud-dashboard',
  'shared-query-library', 'team-annotations', 'access-request-workflow', 'role-based-dashboards',
  'script-runner', 'api-cli', 'webhook-triggers', 'scheduled-report-runner',
  'data-masking', 'sensitive-data-discovery',
  'custom-dashboards', 'sla-monitoring', 'anomaly-detection', 'log-aggregation-viewer',
  'clone-snapshot-manager', 'refresh-from-prod', 'database-provisioning', 'decommission-checklist',
  'query-explain-visualizer', 'parameterized-query-runner', 'batch-script-runner',
  'encryption-at-rest', 'ssl-certificate-manager', 'row-level-security', 'vulnerability-scanner',
  'report-designer', 'scheduled-reports', 'dashboard-builder', 'custom-metrics',
  'jira-integration', 'slack-teams-notifications', 'servicenow-integration', 'webhook-outbound',
];

function moduleScreenEntry(id: ScreenId): [ScreenId, ReactNode] {
  return [
    id,
    (
      <PageShell key={id} tabId={id}>
        <ModuleScreen screenId={id} />
      </PageShell>
    ),
  ];
}

const MODULE_SCREEN_ENTRIES = Object.fromEntries(
  MODULE_ONLY_SCREEN_IDS.map((id) => moduleScreenEntry(id))
) as Record<ScreenId, ReactNode>;

function SettingsPageContent() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="card-hover cursor-pointer">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <FolderOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Storage Settings</h3>
            <p className="text-sm text-muted-foreground">Configure backup storage locations</p>
          </div>
        </CardContent>
      </Card>
      <Card className="card-hover cursor-pointer">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Notifications</h3>
            <p className="text-sm text-muted-foreground">Email and webhook settings</p>
          </div>
        </CardContent>
      </Card>
      <Card className="card-hover cursor-pointer">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Security</h3>
            <p className="text-sm text-muted-foreground">Encryption and access control</p>
          </div>
        </CardContent>
      </Card>
      <Card className="card-hover cursor-pointer">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Settings className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Advanced</h3>
            <p className="text-sm text-muted-foreground">Timeouts, limits, and performance</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/** Screen ID → React component (wrapped in PageShell) */
export const SCREEN_COMPONENTS: Record<ScreenId, ReactNode> = {
  start: (
    <PageShell tabId="start">
      <StartPage />
    </PageShell>
  ),
  servers: (
    <PageShell tabId="servers">
      <ServersPage />
    </PageShell>
  ),
  monitoring: (
    <PageShell tabId="monitoring">
      <ServerMonitoring />
    </PageShell>
  ),
  modules: (
    <PageShell tabId="modules">
      <ModulesHub />
    </PageShell>
  ),
  'database-management': (
    <PageShell tabId="database-management">
      <DatabaseManagementHub />
    </PageShell>
  ),
  backup: (
    <PageShell tabId="backup">
      <BackupWizard />
    </PageShell>
  ),
  restore: (
    <PageShell tabId="restore">
      <RestoreWizard />
    </PageShell>
  ),
  compare: (
    <PageShell tabId="compare">
      <SchemaCompare />
    </PageShell>
  ),
  release: (
    <PageShell tabId="release">
      <ReleaseManagement />
    </PageShell>
  ),
  builds: (
    <PageShell tabId="builds">
      <BuildManagement />
    </PageShell>
  ),
  'sql-editor': (
    <PageShell tabId="sql-editor">
      <SqlEditorPage />
    </PageShell>
  ),
  'query-builder': (
    <PageShell tabId="query-builder">
      <QueryBuilderPage />
    </PageShell>
  ),
  'data-editor': (
    <PageShell tabId="data-editor">
      <DataEditorPage />
    </PageShell>
  ),
  'procedure-debugger': (
    <PageShell tabId="procedure-debugger">
      <ProcedureDebuggerPage />
    </PageShell>
  ),
  'code-snippets-library': (
    <PageShell tabId="code-snippets-library">
      <CodeSnippetsLibraryPage />
    </PageShell>
  ),
  'sql-formatter': (
    <PageShell tabId="sql-formatter">
      <SqlFormatterPage />
    </PageShell>
  ),
  'execution-plan-viewer': (
    <PageShell tabId="execution-plan-viewer">
      <ExecutionPlanPage />
    </PageShell>
  ),
  profiler: (
    <PageShell tabId="profiler">
      <ProfilerPage />
    </PageShell>
  ),
  'slow-query-analyzer': (
    <PageShell tabId="slow-query-analyzer">
      <SlowQueryAnalyzerPage />
    </PageShell>
  ),
  'er-diagram': (
    <PageShell tabId="er-diagram">
      <ErDiagramPage />
    </PageShell>
  ),
  'database-objects': (
    <PageShell tabId="database-objects">
      <DatabaseObjectsPage />
    </PageShell>
  ),
  'data-compare': (
    <PageShell tabId="data-compare">
      <DataComparePage />
    </PageShell>
  ),
  'data-quality-rules': (
    <PageShell tabId="data-quality-rules">
      <DataQualityRulesPage />
    </PageShell>
  ),
  'data-lineage': (
    <PageShell tabId="data-lineage">
      <DataLineagePage />
    </PageShell>
  ),
  'data-generator': (
    <PageShell tabId="data-generator">
      <DataGeneratorPage />
    </PageShell>
  ),
  'sync-wizard': (
    <PageShell tabId="sync-wizard">
      <SyncWizard />
    </PageShell>
  ),
  'migration-wizard': (
    <PageShell tabId="migration-wizard">
      <MigrationWizard />
    </PageShell>
  ),
  'import-wizard': (
    <PageShell tabId="import-wizard">
      <ImportWizard />
    </PageShell>
  ),
  'export-wizard': (
    <PageShell tabId="export-wizard">
      <ExportWizard />
    </PageShell>
  ),
  'change-script-generator': (
    <PageShell tabId="change-script-generator">
      <ChangeScriptGenerator />
    </PageShell>
  ),
  'rollback-script-generator': (
    <PageShell tabId="rollback-script-generator">
      <RollbackScriptGenerator />
    </PageShell>
  ),
  'cicd-integration': (
    <PageShell tabId="cicd-integration">
      <CicdIntegrationPage />
    </PageShell>
  ),
  'query-history-favorites': (
    <PageShell tabId="query-history-favorites">
      <QueryHistoryFavoritesPage />
    </PageShell>
  ),
  'schema-version-control': (
    <PageShell tabId="schema-version-control">
      <SchemaVersionControlPage />
    </PageShell>
  ),
  'drift-detection': (
    <PageShell tabId="drift-detection">
      <DriftDetectionPage />
    </PageShell>
  ),
  'pivot-table-view': (
    <PageShell tabId="pivot-table-view">
      <PivotTableViewPage />
    </PageShell>
  ),
  history: (
    <PageShell tabId="history">
      <UnifiedHistory />
    </PageShell>
  ),
  console: (
    <PageShell tabId="console">
      <DebugConsolePage />
    </PageShell>
  ),
  settings: (
    <PageShell tabId="settings">
      <SettingsPageContent />
    </PageShell>
  ),
  ...MODULE_SCREEN_ENTRIES,
};
