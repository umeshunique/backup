import { Database, Server, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBackupStore } from '@/store/backupStore';

interface ConnectionPlaceholderProps {
  /** Optional: scroll the connection bar into view when user clicks CTA */
  connectionBarRef?: React.RefObject<HTMLDivElement | null>;
  /** When set, "Add server" opens this callback to add a server directly. */
  onAddServerClick?: () => void;
}

/**
 * Shown on database screens when no server/database is selected.
 * Clear hierarchy: 1) Pick server → 2) Pick database → content loads.
 */
export function ConnectionPlaceholder({ connectionBarRef, onAddServerClick }: ConnectionPlaceholderProps) {
  const { selectedServerId, setActiveTab } = useBackupStore();
  const hasServer = Boolean(selectedServerId);

  const scrollToConnections = () => {
    connectionBarRef?.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4 py-12"
      role="status"
      aria-label="Select a database connection to continue"
    >
      <div className="rounded-2xl border border-border bg-muted/30 p-8 max-w-md w-full space-y-6">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary/10 p-4">
            <Database className="h-10 w-10 text-primary" aria-hidden />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-foreground">
            {hasServer ? 'Select a database' : 'Select a connection'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {hasServer
              ? 'Choose a schema from the list above. Tables, queries, and tools will use this database.'
              : 'Pick a server in the Connections bar above, then choose a database. Or add a new server first.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {!hasServer && onAddServerClick && (
            <Button
              type="button"
              variant="default"
              size="sm"
              className="gap-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddServerClick();
              }}
              aria-label="Add new server"
            >
              <Server className="h-4 w-4" />
              Add server
            </Button>
          )}
          <Button
            variant={!hasServer && onAddServerClick ? 'outline' : 'default'}
            size="sm"
            className="gap-2"
            onClick={scrollToConnections}
            aria-label="Focus connection bar"
          >
            <ChevronUp className="h-4 w-4" />
            {hasServer ? 'Pick database above' : 'Pick server above'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setActiveTab('servers')}
            aria-label="Open servers page"
          >
            <Server className="h-4 w-4" />
            Manage servers
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Step 1: Connections → Step 2: Schemas → content loads here
        </p>
      </div>
    </div>
  );
}
