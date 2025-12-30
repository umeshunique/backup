import { useState } from 'react';
import { ServerList } from './ServerList';
import { ServerDetails } from './ServerDetails';
import { ServerConfig } from '@/types/backup.types';

export function ServersPage() {
  const [selectedServer, setSelectedServer] = useState<ServerConfig | null>(null);

  if (selectedServer) {
    return (
      <ServerDetails
        server={selectedServer}
        onBack={() => setSelectedServer(null)}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Database Servers</h1>
        <p className="text-muted-foreground">
          Manage your database server connections. Add, edit, test, and remove server configurations.
        </p>
      </div>

      <ServerList onServerClick={setSelectedServer} />
    </div>
  );
}
