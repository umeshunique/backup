import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity,
  Search,
  Filter,
  Download,
  Calendar,
  Database,
  Package,
  Rocket,
  Upload,
  Server,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  FileText,
} from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { cn } from '@/lib/utils';

export type ActivityType = 
  | 'backup' 
  | 'restore' 
  | 'build' 
  | 'release' 
  | 'server' 
  | 'schema_compare' 
  | 'deployment' 
  | 'rollback'
  | 'user_action'
  | 'system';

export type ActivityStatus = 'success' | 'failed' | 'in_progress' | 'pending' | 'cancelled';

export interface ActivityLogEntry {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  title: string;
  description: string;
  timestamp: Date;
  userId?: string;
  userName?: string;
  serverId?: string;
  serverName?: string;
  databaseName?: string;
  metadata?: Record<string, any>;
  duration?: number; // in seconds
  relatedId?: string; // ID of related build/release/backup
}

interface ActivityLogProps {
  activities: ActivityLogEntry[];
  maxHeight?: number;
  showFilters?: boolean;
  onActivityClick?: (activity: ActivityLogEntry) => void;
}

const activityIcons = {
  backup: Upload,
  restore: Download,
  build: Package,
  release: Rocket,
  server: Server,
  schema_compare: Database,
  deployment: Rocket,
  rollback: AlertTriangle,
  user_action: User,
  system: Activity,
};

const activityColors = {
  backup: 'text-blue-500',
  restore: 'text-green-500',
  build: 'text-purple-500',
  release: 'text-orange-500',
  server: 'text-cyan-500',
  schema_compare: 'text-indigo-500',
  deployment: 'text-orange-500',
  rollback: 'text-red-500',
  user_action: 'text-gray-500',
  system: 'text-slate-500',
};

const statusConfig = {
  success: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Success' },
  failed: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Failed' },
  in_progress: { icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10', label: 'In Progress' },
  pending: { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Pending' },
  cancelled: { icon: XCircle, color: 'text-gray-500', bg: 'bg-gray-500/10', label: 'Cancelled' },
};

export function ActivityLog({
  activities,
  maxHeight = 600,
  showFilters = true,
  onActivityClick,
}: ActivityLogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ActivityType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ActivityStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'yesterday' | 'week' | 'month'>('all');

  const filteredActivities = activities.filter((activity) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !activity.title.toLowerCase().includes(query) &&
        !activity.description.toLowerCase().includes(query) &&
        !activity.serverName?.toLowerCase().includes(query) &&
        !activity.databaseName?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Type filter
    if (typeFilter !== 'all' && activity.type !== typeFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== 'all' && activity.status !== statusFilter) {
      return false;
    }

    // Date filter
    if (dateFilter !== 'all') {
      const activityDate = activity.timestamp;
      switch (dateFilter) {
        case 'today':
          if (!isToday(activityDate)) return false;
          break;
        case 'yesterday':
          if (!isYesterday(activityDate)) return false;
          break;
        case 'week':
          if (!isThisWeek(activityDate)) return false;
          break;
        case 'month':
          if (!isThisMonth(activityDate)) return false;
          break;
      }
    }

    return true;
  });

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Type', 'Status', 'Title', 'Description', 'Server', 'Database', 'User', 'Duration'].join(','),
      ...filteredActivities.map((a) =>
        [
          format(a.timestamp, 'yyyy-MM-dd HH:mm:ss'),
          a.type,
          a.status,
          `"${a.title}"`,
          `"${a.description}"`,
          a.serverName || '',
          a.databaseName || '',
          a.userName || '',
          a.duration ? `${a.duration}s` : '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getTimeAgo = (date: Date) => {
    if (isToday(date)) return `Today ${format(date, 'HH:mm')}`;
    if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`;
    if (isThisWeek(date)) return format(date, 'EEE HH:mm');
    if (isThisMonth(date)) return format(date, 'MMM d, HH:mm');
    return format(date, 'MMM d, yyyy HH:mm');
  };

  const stats = {
    total: activities.length,
    success: activities.filter((a) => a.status === 'success').length,
    failed: activities.filter((a) => a.status === 'failed').length,
    inProgress: activities.filter((a) => a.status === 'in_progress').length,
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Log
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Comprehensive audit trail of all system activities
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{stats.total} total</Badge>
            <Badge variant="outline" className="text-green-500">
              {stats.success} success
            </Badge>
            <Badge variant="outline" className="text-red-500">
              {stats.failed} failed
            </Badge>
            {stats.inProgress > 0 && (
              <Badge variant="outline" className="text-blue-500">
                {stats.inProgress} in progress
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showFilters && (
          <div className="space-y-4 mb-4">
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="backup">Backups</SelectItem>
                  <SelectItem value="restore">Restores</SelectItem>
                  <SelectItem value="build">Builds</SelectItem>
                  <SelectItem value="release">Releases</SelectItem>
                  <SelectItem value="server">Servers</SelectItem>
                  <SelectItem value="deployment">Deployments</SelectItem>
                  <SelectItem value="rollback">Rollbacks</SelectItem>
                  <SelectItem value="user_action">User Actions</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as any)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        )}

        <ScrollArea style={{ height: maxHeight }}>
          <div className="space-y-2">
            {filteredActivities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">No activities found</p>
                <p className="text-xs mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              filteredActivities.map((activity) => {
                const Icon = activityIcons[activity.type];
                const status = statusConfig[activity.status];
                const StatusIcon = status.icon;

                return (
                  <div
                    key={activity.id}
                    onClick={() => onActivityClick?.(activity)}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border transition-colors',
                      'hover:bg-muted/50 cursor-pointer',
                      activity.status === 'failed' && 'border-red-500/20 bg-red-500/5',
                      activity.status === 'success' && 'border-green-500/20 bg-green-500/5',
                      activity.status === 'in_progress' && 'border-blue-500/20 bg-blue-500/5'
                    )}
                  >
                    <div className={cn('p-2 rounded-lg', status.bg)}>
                      <Icon className={cn('h-4 w-4', activityColors[activity.type])} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">{activity.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {activity.type.replace('_', ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {activity.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <StatusIcon className={cn('h-4 w-4', status.color)} />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {getTimeAgo(activity.timestamp)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {activity.serverName && (
                          <span className="flex items-center gap-1">
                            <Server className="h-3 w-3" />
                            {activity.serverName}
                          </span>
                        )}
                        {activity.databaseName && (
                          <span className="flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            {activity.databaseName}
                          </span>
                        )}
                        {activity.userName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {activity.userName}
                          </span>
                        )}
                        {activity.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {activity.duration}s
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
