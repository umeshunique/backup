import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useBackupStore } from '@/store/backupStore';
import { SqlEditor } from '@/components/server/SqlEditor';

const POPOUT_STORAGE_PREFIX = 'sql-editor-popout-';

export function SqlEditorPopoutPage() {
  const [searchParams] = useSearchParams();
  const key = searchParams.get('k');
  const { getServerById, loadServers } = useBackupStore();
  const [payload, setPayload] = useState<{ sql: string; serverId: string; databaseName: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!key) {
      setError('Missing popout key');
      return;
    }
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) {
        setError('Session expired or invalid link');
        return;
      }
      const data = JSON.parse(raw) as { sql: string; serverId: string; databaseName: string };
      if (!data.serverId || !data.databaseName) {
        setError('Invalid popout data');
        return;
      }
      setPayload({ sql: data.sql ?? '', serverId: data.serverId, databaseName: data.databaseName });
    } catch {
      setError('Invalid popout data');
    }
  }, [key]);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const server = payload?.serverId ? getServerById(payload.serverId) : undefined;
  const ready = payload && server && payload.databaseName;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center text-destructive">{error}</div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="sql-editor-root h-screen bg-background">
      <SqlEditor
        server={server}
        database={payload.databaseName}
        initialSql={payload.sql}
      />
    </div>
  );
}

/** Store payload and return the storage key to pass in popout URL (?k=...) */
export function savePopoutPayload(sql: string, serverId: string, databaseName: string): string {
  const fullKey = `${POPOUT_STORAGE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  try {
    sessionStorage.setItem(fullKey, JSON.stringify({ sql, serverId, databaseName }));
  } catch {
    // ignore
  }
  return fullKey;
}
