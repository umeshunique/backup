import { ObjectBrowser } from './ObjectBrowser';
import { ServerConfig } from '@/types/backup.types';

interface ViewsBrowserProps {
  server: ServerConfig;
  database: string;
}

export function ViewsBrowser({ server, database }: ViewsBrowserProps) {
  return (
    <ObjectBrowser
      server={server}
      database={database}
      objectType="views"
      title="Views"
      icon="Eye"
    />
  );
}
