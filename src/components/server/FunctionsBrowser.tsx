import { ObjectBrowser } from './ObjectBrowser';
import { ServerConfig } from '@/types/backup.types';

interface FunctionsBrowserProps {
  server: ServerConfig;
  database: string;
}

export function FunctionsBrowser({ server, database }: FunctionsBrowserProps) {
  return (
    <ObjectBrowser
      server={server}
      database={database}
      objectType="functions"
      title="Functions"
      icon="Zap"
    />
  );
}
