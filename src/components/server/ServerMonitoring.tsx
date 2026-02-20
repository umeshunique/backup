import { useState, useEffect } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Server,
  Database,
  Activity,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { EnvironmentBadge } from '@/components/shared';
import { cn } from '@/lib/utils';

interface ServerHealth {
  serverId: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastChecked: Date;
  responseTime?: number; // ms
  connectionCount?: number;
  activeQueries?: number;
  uptime?: number; // seconds
  cpuUsage?: number; // percentage
  memoryUsage?: number; // percentage
  diskUsage?: number; // percentage
  databaseCount?: number;
  totalConnections?: number;
}

export function ServerMonitoring() {
  const { servers, getDatabasesForServer, testConnection } = useBackupStore();
  const [serverHealth, setServerHealth] = useState<Record<string, ServerHealth>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  const refreshHealth = async () => {
    setIsRefreshing(true);
    const health: Record<string, ServerHealth> = {};

    for (const server of servers) {
      const startTime = Date.now();
      const isConnected = await testConnection(server.id);
      const responseTime = Date.now() - startTime;

      const databases = getDatabasesForServer(server.id);
      
      // Determine health status
      let status: ServerHealth['status'] = 'unknown';
      if (isConnected) {
        if (responseTime < 100) status = 'healthy';
        else if (responseTime < 500) status = 'warning';
        else status = 'critical';
      } else {
        status = 'critical';
      }

      health[server.id] = {
        serverId: server.id,
        status,
        lastChecked: new Date(),
        responseTime,
        databaseCount: databases.length,
        // Simulated metrics (in real app, fetch from server)
        connectionCount: Math.floor(Math.random() * 50) + 10,
        activeQueries: Math.floor(Math.random() * 20),
        uptime: Math.floor(Math.random() * 86400 * 30), // 0-30 days
        cpuUsage: Math.floor(Math.random() * 30) + 10,
        memoryUsage: Math.floor(Math.random() * 40) + 30,
        diskUsage: Math.floor(Math.random() * 30) + 40,
        totalConnections: Math.floor(Math.random() * 100) + 50,
      };
    }

    setServerHealth(health);
    setIsRefreshing(false);
  };

  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [servers.length]);

  const getStatusColor = (status: ServerHealth['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500 bg-green-500/10';
      case 'warning':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'critical':
        return 'text-red-500 bg-red-500/10';
      default:
        return 'text-gray-500 bg-gray-500/10';
    }
  };

  const getStatusIcon = (status: ServerHealth['status']) => {
    switch (status) {
      case 'healthy':
        return CheckCircle2;
      case 'warning':
        return AlertTriangle;
      case 'critical':
        return XCircle;
      default:
        return Activity;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (servers.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Server className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <p className="text-muted-foreground">No servers configured</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Server Monitoring
          </h2>
          <p className="text-muted-foreground mt-1">
            Real-time health monitoring and performance metrics for all database servers
          </p>
        </div>
        <Button
          variant="outline"
          onClick={refreshHealth}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {servers.map((server) => {
          const health = serverHealth[server.id];
          const StatusIcon = health ? getStatusIcon(health.status) : Activity;
          const databases = getDatabasesForServer(server.id);

          return (
            <Card
              key={server.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-lg',
                selectedServerId === server.id && 'ring-2 ring-primary',
                health?.status === 'critical' && 'border-red-500/50',
                health?.status === 'warning' && 'border-yellow-500/50'
              )}
              onClick={() => setSelectedServerId(selectedServerId === server.id ? null : server.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Server className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{server.name}</CardTitle>
                      {health && (
                        <Badge className={cn('ml-2', getStatusColor(health.status))}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {health.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {server.host}:{server.port}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <EnvironmentBadge environment={server.environment} size="sm" />
                      <Badge variant="outline" className="text-xs">
                        {server.databaseType.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {server.connectionStatus === 'connected' ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {health ? (
                  <div className="space-y-4">
                    {/* Response Time */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">Response Time</span>
                        <span className={cn(
                          'font-medium',
                          health.responseTime! < 100 && 'text-green-500',
                          health.responseTime! >= 100 && health.responseTime! < 500 && 'text-yellow-500',
                          health.responseTime! >= 500 && 'text-red-500'
                        )}>
                          {health.responseTime}ms
                        </span>
                      </div>
                      <Progress
                        value={Math.min((health.responseTime! / 1000) * 100, 100)}
                        className="h-2"
                      />
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs">Databases</p>
                        <p className="font-semibold flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {health.databaseCount || databases.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Connections</p>
                        <p className="font-semibold">{health.connectionCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Active Queries</p>
                        <p className="font-semibold">{health.activeQueries || 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Uptime</p>
                        <p className="font-semibold text-xs">
                          {health.uptime ? formatUptime(health.uptime) : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* Resource Usage */}
                    {selectedServerId === server.id && (
                      <div className="space-y-2 pt-2 border-t">
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">CPU Usage</span>
                            <span className="font-medium">{health.cpuUsage || 0}%</span>
                          </div>
                          <Progress value={health.cpuUsage || 0} className="h-1.5" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Memory Usage</span>
                            <span className="font-medium">{health.memoryUsage || 0}%</span>
                          </div>
                          <Progress value={health.memoryUsage || 0} className="h-1.5" />
                        </div>
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Disk Usage</span>
                            <span className="font-medium">{health.diskUsage || 0}%</span>
                          </div>
                          <Progress value={health.diskUsage || 0} className="h-1.5" />
                        </div>
                      </div>
                    )}

                    {/* Last Checked */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground pt-2 border-t">
                      <Clock className="h-3 w-3" />
                      Last checked: {formatDistanceToNow(health.lastChecked, { addSuffix: true })}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-4">
                    <Activity className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Stats */}
      {Object.keys(serverHealth).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Health Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">
                  {Object.values(serverHealth).filter((h) => h.status === 'healthy').length}
                </p>
                <p className="text-sm text-muted-foreground">Healthy</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-500">
                  {Object.values(serverHealth).filter((h) => h.status === 'warning').length}
                </p>
                <p className="text-sm text-muted-foreground">Warning</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">
                  {Object.values(serverHealth).filter((h) => h.status === 'critical').length}
                </p>
                <p className="text-sm text-muted-foreground">Critical</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {Object.values(serverHealth).reduce((sum, h) => sum + (h.databaseCount || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Total Databases</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
