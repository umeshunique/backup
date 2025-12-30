import { ObjectBrowser } from './ObjectBrowser';
import { ServerConfig } from '@/types/backup.types';

interface TriggersBrowserProps {
  server: ServerConfig;
  database: string;
}

export function TriggersBrowser({ server, database }: TriggersBrowserProps) {
  return (
    <ObjectBrowser
      server={server}
      database={database}
      objectType="triggers"
      title="Triggers"
      icon="Zap"
    />
  );
}
