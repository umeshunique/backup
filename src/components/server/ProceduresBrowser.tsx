import { ObjectBrowser } from './ObjectBrowser';
import { ServerConfig } from '@/types/backup.types';

interface ProceduresBrowserProps {
  server: ServerConfig;
  database: string;
}

export function ProceduresBrowser({ server, database }: ProceduresBrowserProps) {
  return (
    <ObjectBrowser
      server={server}
      database={database}
      objectType="procedures"
      title="Stored Procedures"
      icon="FileCode"
    />
  );
}
