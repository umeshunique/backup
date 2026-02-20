import { cn } from '@/lib/utils';
import type { TabId } from './pageConfig';
import { getPageMeta } from './pageConfig';
import { DATABASE_SCREEN_IDS } from '@/config/navigationConfig';
import { useBackupStore } from '@/store/backupStore';
import { Database } from 'lucide-react';

interface PageShellProps {
  tabId: TabId;
  children: React.ReactNode;
  /** Optional actions (e.g. "Add server" button) shown next to title on desktop */
  actions?: React.ReactNode;
  /** Optional extra class for the wrapper */
  className?: string;
}

export function PageShell({ tabId, children, actions, className }: PageShellProps) {
  const meta = getPageMeta(tabId);
  const isDatabaseScreen = DATABASE_SCREEN_IDS.includes(tabId);
  const { selectedServerId, selectedDatabaseName, getServerById } = useBackupStore();
  const server = selectedServerId ? getServerById(selectedServerId) : undefined;
  const showConnection = isDatabaseScreen && server && selectedDatabaseName && tabId !== 'sql-editor';

  if (meta.fullWidth) {
    return (
      <div
        className={cn('flex flex-1 flex-col min-h-0 min-w-0 overflow-hidden', className)}
        role="main"
        aria-label={meta.title}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn('space-y-6 min-h-0', className)}
      role="main"
      aria-label={meta.title}
    >
      <header className="space-y-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {meta.title}
            </h1>
            {meta.description && (
              <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                {meta.description}
              </p>
            )}
            {showConnection && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Current connection">
                <Database className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="font-mono truncate max-w-md inline-block" title={`${server.name} / ${selectedDatabaseName}`}>
                  {server.name} / {selectedDatabaseName}
                </span>
              </p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </header>
      <div className="min-h-0">{children}</div>
    </div>
  );
}
