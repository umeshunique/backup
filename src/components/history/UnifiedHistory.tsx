import { useState, useMemo } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityLog, ActivityLogEntry } from '@/components/shared';
import { BackupHistoryTable } from './BackupHistoryTable';
import { ReleaseHistory } from '../release/ReleaseHistory';
import {
  History,
  Upload,
  Package,
  Rocket,
  Activity,
  Database,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';

export function UnifiedHistory() {
  const {
    backupHistory,
    serverBuilds,
    releaseDeployments,
    servers,
  } = useBackupStore();

  const [activeTab, setActiveTab] = useState<'all' | 'backups' | 'builds' | 'releases'>('all');

  // Convert all activities to unified format
  const allActivities = useMemo<ActivityLogEntry[]>(() => {
    const activities: ActivityLogEntry[] = [];

    // Backup activities
    backupHistory.forEach((backup) => {
      activities.push({
        id: backup.id,
        type: 'backup',
        status: backup.status === 'success' ? 'success' : 'failed',
        title: `Backup: ${backup.databaseName}`,
        description: `${backup.backupType} backup completed`,
        timestamp: backup.createdAt instanceof Date ? backup.createdAt : new Date(backup.createdAt),
        serverId: backup.serverId,
        serverName: backup.serverName,
        databaseName: backup.databaseName,
        metadata: {
          fileName: backup.fileName,
          fileSize: backup.fileSize,
          backupType: backup.backupType,
        },
        duration: backup.statistics?.duration,
        relatedId: backup.id,
      });
    });

    // Build activities
    serverBuilds.forEach((build) => {
      const statusMap: Record<string, ActivityLogEntry['status']> = {
        completed: 'success',
        failed: 'failed',
        deploying: 'in_progress',
        draft: 'pending',
        pending: 'pending',
        'rolled-back': 'cancelled',
      };

      activities.push({
        id: build.id,
        type: 'build',
        status: statusMap[build.status] || 'pending',
        title: `Build: ${build.buildVersion.version}`,
        description: build.buildVersion.description || `Deploy ${build.artifacts.length} artifacts`,
        timestamp: build.createdAt,
        serverId: build.targetServer.id,
        serverName: build.targetServer.name,
        metadata: {
          version: build.buildVersion.version,
          artifacts: build.artifacts.length,
          sourceServer: build.sourceServer.name,
          targetServer: build.targetServer.name,
        },
        duration: build.deploymentStats?.duration,
        relatedId: build.id,
      });
    });

    // Release activities
    releaseDeployments.forEach((release) => {
      const statusMap: Record<string, ActivityLogEntry['status']> = {
        completed: 'success',
        failed: 'failed',
        deploying: 'in_progress',
        backing_up: 'in_progress',
        pending: 'pending',
        rolled_back: 'cancelled',
      };

      activities.push({
        id: release.id,
        type: 'release',
        status: statusMap[release.status] || 'pending',
        title: `Release: ${release.version}`,
        description: `Deploy schema changes from ${release.sourceDetails.serverName} to ${release.targetDetails.serverName}`,
        timestamp: release.createdAt,
        serverId: release.comparisonResult.targetServer.id,
        serverName: release.targetDetails.serverName,
        databaseName: release.targetDetails.databaseName,
        metadata: {
          version: release.version,
          differences: release.comparisonResult.summary.totalDifferences,
          sourceServer: release.sourceDetails.serverName,
          targetServer: release.targetDetails.serverName,
        },
        duration: release.completedAt && release.startedAt
          ? Math.floor((release.completedAt.getTime() - release.startedAt.getTime()) / 1000)
          : undefined,
        relatedId: release.id,
      });
    });

    // Sort by timestamp (newest first)
    return activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [backupHistory, serverBuilds, releaseDeployments]);

  // Filter activities by tab
  const filteredActivities = useMemo(() => {
    if (activeTab === 'all') return allActivities;
    if (activeTab === 'backups') return allActivities.filter((a) => a.type === 'backup');
    if (activeTab === 'builds') return allActivities.filter((a) => a.type === 'build');
    if (activeTab === 'releases') return allActivities.filter((a) => a.type === 'release');
    return allActivities;
  }, [allActivities, activeTab]);

  // Statistics
  const stats = useMemo(() => {
    const total = allActivities.length;
    const success = allActivities.filter((a) => a.status === 'success').length;
    const failed = allActivities.filter((a) => a.status === 'failed').length;
    const inProgress = allActivities.filter((a) => a.status === 'in_progress').length;

    const backups = allActivities.filter((a) => a.type === 'backup').length;
    const builds = allActivities.filter((a) => a.type === 'build').length;
    const releases = allActivities.filter((a) => a.type === 'release').length;

    return {
      total,
      success,
      failed,
      inProgress,
      backups,
      builds,
      releases,
    };
  }, [allActivities]);

  const handleActivityClick = (activity: ActivityLogEntry) => {
    // Navigate to appropriate detail view based on type
    const { setActiveTab } = useBackupStore.getState();
    if (activity.type === 'backup') {
      setActiveTab('history');
    } else if (activity.type === 'build') {
      setActiveTab('builds');
    } else if (activity.type === 'release') {
      setActiveTab('release');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-8 w-8" />
            Unified History
          </h2>
          <p className="text-muted-foreground mt-1">
            Complete audit trail of all backups, builds, releases, and system activities
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Activities</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Activity className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold text-green-500">{stats.success}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold text-blue-500">{stats.inProgress}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Breakdown */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Backups</p>
                <p className="text-2xl font-bold">{stats.backups}</p>
              </div>
              <Upload className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Builds</p>
                <p className="text-2xl font-bold">{stats.builds}</p>
              </div>
              <Package className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Releases</p>
                <p className="text-2xl font-bold">{stats.releases}</p>
              </div>
              <Rocket className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="gap-2">
            <Activity className="h-4 w-4" />
            All Activities
            <span className="ml-1 text-xs">({allActivities.length})</span>
          </TabsTrigger>
          <TabsTrigger value="backups" className="gap-2">
            <Upload className="h-4 w-4" />
            Backups
            <span className="ml-1 text-xs">({stats.backups})</span>
          </TabsTrigger>
          <TabsTrigger value="builds" className="gap-2">
            <Package className="h-4 w-4" />
            Builds
            <span className="ml-1 text-xs">({stats.builds})</span>
          </TabsTrigger>
          <TabsTrigger value="releases" className="gap-2">
            <Rocket className="h-4 w-4" />
            Releases
            <span className="ml-1 text-xs">({stats.releases})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <ActivityLog
            activities={filteredActivities}
            maxHeight={700}
            onActivityClick={handleActivityClick}
          />
        </TabsContent>

        <TabsContent value="backups" className="mt-6">
          <BackupHistoryTable />
        </TabsContent>

        <TabsContent value="builds" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Build History</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityLog
                activities={filteredActivities}
                maxHeight={700}
                onActivityClick={handleActivityClick}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="releases" className="mt-6">
          <ReleaseHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
