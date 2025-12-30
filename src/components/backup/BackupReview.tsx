import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BackupWizardState } from './BackupWizard';
import { useBackupStore } from '@/store/backupStore';
import { EnvironmentBadge } from '@/components/shared';
import {
  Database,
  Table2,
  Code,
  Eye,
  FunctionSquare,
  Zap,
  Calendar,
  FolderOpen,
  FileCode,
  Archive,
  Settings2,
  HardDrive,
} from 'lucide-react';
import { format } from 'date-fns';

interface BackupReviewProps {
  state: BackupWizardState;
}

export function BackupReview({ state }: BackupReviewProps) {
  const { getServerById } = useBackupStore();
  const server = state.serverId ? getServerById(state.serverId) : null;

  const generateFileName = (): string => {
    const now = new Date();
    const dbName = state.database?.name || 'database';
    const env = state.environment || 'development';

    return state.fileNamingPattern
      .replace('{database}', dbName)
      .replace('{environment}', env)
      .replace('{timestamp}', format(now, 'yyyyMMdd_HHmmss'))
      .replace('{date}', format(now, 'yyyy-MM-dd'))
      .replace('{time}', format(now, 'HH-mm-ss'))
      .replace('{YYYYMMDD}', format(now, 'yyyyMMdd'))
      .replace('HHmmss', format(now, 'HHmmss'));
  };

  // Calculate estimated size based on selected objects
  const estimatedSize = (() => {
    if (!state.database) return 0;
    const selectedTableSize = state.database.tables
      .filter((t) => state.selectedTables.includes(t.name))
      .reduce((acc, t) => acc + t.sizeInMB, 0);

    // Rough estimate - procedures, views, etc. add ~10% overhead
    const overhead = state.compression.enabled ? 0.3 : 1;
    return (selectedTableSize * overhead * (state.backupMode === 'structure' ? 0.01 : 1)).toFixed(1);
  })();

  const objectCounts = [
    { label: 'Tables', count: state.selectedTables.length, icon: Table2, color: 'text-primary' },
    { label: 'Procedures', count: state.selectedProcedures.length, icon: Code, color: 'text-purple-400' },
    { label: 'Views', count: state.selectedViews.length, icon: Eye, color: 'text-blue-400' },
    { label: 'Functions', count: state.selectedFunctions.length, icon: FunctionSquare, color: 'text-green-400' },
    { label: 'Triggers', count: state.selectedTriggers.length, icon: Zap, color: 'text-amber-400' },
    { label: 'Events', count: state.selectedEvents.length, icon: Calendar, color: 'text-cyan-400' },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="rounded-xl bg-primary/20 p-4">
              <Database className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold">{state.database?.name}</h3>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>{server?.name}</span>
                <span>•</span>
                <span className="font-mono">{server?.host}:{server?.port}</span>
              </div>
            </div>
            <EnvironmentBadge environment={state.environment || 'development'} size="lg" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Selected Objects */}
        <Card>
          <CardContent className="p-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              Selected Objects
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {objectCounts.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <div>
                    <p className="text-2xl font-bold">{item.count}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Backup Mode</span>
                <Badge variant="outline" className="capitalize">{state.backupMode}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Objects</span>
                <span className="font-medium">
                  {objectCounts.reduce((acc, i) => acc + i.count, 0)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Output Configuration */}
        <Card>
          <CardContent className="p-6">
            <h4 className="font-semibold mb-4 flex items-center gap-2">
              <FileCode className="h-4 w-4 text-primary" />
              Output Configuration
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Format</span>
                <Badge variant="secondary" className="uppercase">{state.outputFormat}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Compression</span>
                <span className="font-medium">
                  {state.compression.enabled ? `Level ${state.compression.level}` : 'Disabled'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated Size</span>
                <span className="font-medium">{estimatedSize} MB</span>
              </div>
            </div>

            <Separator className="my-4" />

            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              Destination
            </h4>
            <div className="space-y-2">
              <div className="p-2 rounded-lg bg-muted/50 font-mono text-xs break-all">
                {state.destinationPath}
              </div>
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 font-mono text-sm text-primary">
                {generateFileName()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SQL Options Summary */}
        {state.outputFormat === 'sql' && (
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Archive className="h-4 w-4 text-primary" />
                SQL Generation Options
              </h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(state.sqlOptions).map(([key, value]) => (
                  <Badge
                    key={key}
                    variant={value ? 'secondary' : 'outline'}
                    className={value ? '' : 'opacity-50'}
                  >
                    {value ? '✓' : '✗'}{' '}
                    {key.replace(/([A-Z])/g, ' $1').replace('include', '').trim()}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Retention Policy */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <HardDrive className="h-5 w-5 text-primary" />
                <div>
                  <h4 className="font-semibold">Retention Policy</h4>
                  <p className="text-sm text-muted-foreground">
                    Backups will be kept for {state.retentionDays} days
                    {state.autoDeleteOld && ' and automatically deleted after expiry'}
                  </p>
                </div>
              </div>
              <Badge variant={state.autoDeleteOld ? 'default' : 'outline'}>
                {state.autoDeleteOld ? 'Auto-cleanup enabled' : 'Manual cleanup'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
