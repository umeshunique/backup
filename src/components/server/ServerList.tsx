import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { EnvironmentBadge } from '@/components/shared';
import { ServerConfig, EnvironmentType, DatabaseType } from '@/types/backup.types';
import { useBackupStore } from '@/store/backupStore';
import { cn } from '@/lib/utils';
import {
  Database,
  MoreVertical,
  Plus,
  RefreshCw,
  Edit,
  Wifi,
  WifiOff,
  Loader2,
  Server,
  HardDrive,
  Clock,
  Shield,
  Zap,
  Activity,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Copy,
  Power,
  PowerOff,
  Search,
  Filter,
  LayoutGrid,
  List,
  SortAsc,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format, formatDistanceToNow } from 'date-fns';
import { ServerConfigWizard } from './ServerConfigWizard';
import { toast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Database type configuration
const databaseConfig: Record<DatabaseType, { name: string; icon: string; color: string; bgColor: string }> = {
  mysql: { name: 'MySQL', icon: '🐬', color: 'text-orange-400', bgColor: 'bg-orange-500/10' },
  mssql: { name: 'SQL Server', icon: '🔷', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  postgresql: { name: 'PostgreSQL', icon: '🐘', color: 'text-sky-400', bgColor: 'bg-sky-500/10' },
};

// Environment configuration
const environmentConfig: Record<EnvironmentType, { color: string; bgColor: string; borderColor: string }> = {
  development: { color: 'text-blue-400', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/30' },
  staging: { color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  uat: { color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
  production: { color: 'text-red-400', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  dr: { color: 'text-orange-400', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
};

interface ServerCardProps {
  server: ServerConfig;
  onEdit: (server: ServerConfig) => void;
  onClick?: (server: ServerConfig) => void;
  viewMode: 'grid' | 'list';
}

function ServerCard({ server, onEdit, onClick, viewMode }: ServerCardProps) {
  const { testConnection, getDatabasesForServer, loadDatabasesForServer } = useBackupStore();
  const [isTesting, setIsTesting] = useState(false);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
  const databases = getDatabasesForServer(server.id);
  const dbConfig = databaseConfig[server.databaseType];
  const envConfig = environmentConfig[server.environment];

  const handleTestConnection = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsTesting(true);
    const success = await testConnection(server.id);
    setIsTesting(false);
    
    if (success) {
      // Load databases after successful connection
      setIsLoadingDatabases(true);
      await loadDatabasesForServer(server.id);
      setIsLoadingDatabases(false);
    }
    
    toast({
      title: success ? 'Connection Successful' : 'Connection Failed',
      description: success
        ? `Connected to ${server.name} successfully.`
        : `Failed to connect to ${server.name}. Please check your settings.`,
      variant: success ? 'default' : 'destructive',
    });
  };

  const copyConnectionString = (e: React.MouseEvent) => {
    e.stopPropagation();
    const connString = `${server.databaseType}://${server.username}@${server.host}:${server.port}`;
    navigator.clipboard.writeText(connString);
    toast({
      title: 'Copied!',
      description: 'Connection string copied to clipboard',
    });
  };

  const connectionIcon = () => {
    if (isTesting || server.connectionStatus === 'testing') {
      return <Loader2 className="h-4 w-4 animate-spin text-amber-400" />;
    }
    if (server.connectionStatus === 'connected') {
      return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    }
    return <AlertCircle className="h-4 w-4 text-red-400" />;
  };

  const connectionStatus = () => {
    if (isTesting || server.connectionStatus === 'testing') {
      return { text: 'Testing...', color: 'text-amber-400', bg: 'bg-amber-500/10' };
    }
    if (server.connectionStatus === 'connected') {
      return { text: 'Connected', color: 'text-green-400', bg: 'bg-green-500/10' };
    }
    return { text: 'Disconnected', color: 'text-red-400', bg: 'bg-red-500/10' };
  };

  const status = connectionStatus();

  if (viewMode === 'list') {
    return (
      <Card 
        className={cn(
          'card-hover cursor-pointer transition-all duration-200',
          'border-l-4',
          envConfig.borderColor
        )}
        onClick={() => onClick?.(server)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', dbConfig.bgColor)}>
              <span className="text-2xl">{dbConfig.icon}</span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{server.name}</h3>
                {connectionIcon()}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="font-mono">{server.host}:{server.port}</span>
                <span>•</span>
                <span>{databases.length} databases</span>
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-2">
              <EnvironmentBadge environment={server.environment} size="sm" />
              <Badge variant="outline" className={cn('uppercase text-xs', dbConfig.color)}>
                {dbConfig.name}
              </Badge>
            </div>

            {/* Status */}
            <Badge variant="outline" className={cn('gap-1.5', status.bg, status.color)}>
              {connectionIcon()}
              <span>{status.text}</span>
            </Badge>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={handleTestConnection}
                      disabled={isTesting}
                    >
                      <RefreshCw className={cn('h-4 w-4', isTesting && 'animate-spin')} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Test Connection</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(server); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Configuration
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={copyConnectionString}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Connection String
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Grid View
  return (
    <Card 
      className={cn(
        'card-hover cursor-pointer transition-all duration-200 group overflow-hidden',
        'hover:shadow-lg hover:shadow-primary/5'
      )}
      onClick={() => onClick?.(server)}
    >
      {/* Environment Indicator Bar */}
      <div className={cn('h-1', envConfig.bgColor.replace('/10', '/50'))} />

      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110',
              dbConfig.bgColor
            )}>
              <span className="text-2xl">{dbConfig.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{server.name}</h3>
              </div>
              <p className="text-sm text-muted-foreground font-mono">
                {server.host}:{server.port}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(server); }}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Configuration
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleTestConnection} disabled={isTesting}>
                <RefreshCw className={cn('h-4 w-4 mr-2', isTesting && 'animate-spin')} />
                Test Connection
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyConnectionString}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Connection String
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 mb-4">
          <EnvironmentBadge environment={server.environment} size="sm" />
          <Badge variant="outline" className={cn('uppercase text-[10px]', dbConfig.color)}>
            {dbConfig.name}
          </Badge>
          {!server.isActive && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">
              <PowerOff className="h-3 w-3 mr-1" />
              Inactive
            </Badge>
          )}
        </div>

        {/* Connection Status */}
        <div className={cn(
          'flex items-center justify-between p-3 rounded-lg mb-4',
          status.bg
        )}>
          <div className="flex items-center gap-2">
            {connectionIcon()}
            <span className={cn('text-sm font-medium', status.color)}>
              {status.text}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleTestConnection}
            disabled={isTesting}
          >
            {isTesting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Test
              </>
            )}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <HardDrive className="h-4 w-4" />
            <span>{isLoadingDatabases ? '...' : databases.length} databases</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {server.lastConnected 
                ? formatDistanceToNow(server.lastConnected, { addSuffix: true })
                : 'Never'
              }
            </span>
          </div>
        </div>

        {/* Footer */}
        <Separator className="my-4" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Created {format(server.createdAt, 'MMM d, yyyy')}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => { e.stopPropagation(); onClick?.(server); }}
          >
            View Details
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface ServerListProps {
  onServerClick?: (server: ServerConfig) => void;
}

export function ServerList({ onServerClick }: ServerListProps = {}) {
  const { servers, addServer, updateServer, loadServers } = useBackupStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterEnvironment, setFilterEnvironment] = useState<string>('all');
  const [filterDatabase, setFilterDatabase] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');

  // Load servers on mount
  useEffect(() => {
    loadServers();
  }, [loadServers]);

  // Filter and sort servers
  const filteredServers = servers
    .filter((server) => {
      const matchesSearch = server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           server.host.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesEnvironment = filterEnvironment === 'all' || server.environment === filterEnvironment;
      const matchesDatabase = filterDatabase === 'all' || server.databaseType === filterDatabase;
      return matchesSearch && matchesEnvironment && matchesDatabase;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'environment':
          return a.environment.localeCompare(b.environment);
        case 'type':
          return a.databaseType.localeCompare(b.databaseType);
        case 'status':
          return a.connectionStatus.localeCompare(b.connectionStatus);
        default:
          return 0;
      }
    });

  const handleEdit = (server: ServerConfig) => {
    setEditingServer(server);
    setIsDialogOpen(true);
  };

  const handleSave = async (data: Omit<ServerConfig, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingServer) {
        await updateServer(editingServer.id, data);
        toast({
          title: 'Server Updated',
          description: 'The server configuration has been updated.',
        });
      } else {
        await addServer(data);
        toast({
          title: 'Server Added',
          description: 'New server configuration has been added.',
        });
      }
      setIsDialogOpen(false);
      setEditingServer(null);
    } catch (error: any) {
      console.error('Failed to save server:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to save server. Please try again.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingServer(null);
  };

  // Stats
  const stats = {
    total: servers.length,
    connected: servers.filter(s => s.connectionStatus === 'connected').length,
    production: servers.filter(s => s.environment === 'production').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Server className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Servers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Wifi className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.connected}</p>
              <p className="text-sm text-muted-foreground">Connected</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.production}</p>
              <p className="text-sm text-muted-foreground">Production</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">Add New Server</p>
              <p className="text-sm text-muted-foreground">Configure a new database</p>
            </div>
            <Button onClick={() => setIsDialogOpen(true)} size="lg">
              <Plus className="h-5 w-5 mr-2" />
              Add Server
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-1 gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search servers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <Select value={filterEnvironment} onValueChange={setFilterEnvironment}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Environments</SelectItem>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="staging">Staging</SelectItem>
              <SelectItem value="uat">UAT</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="dr">DR</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterDatabase} onValueChange={setFilterDatabase}>
            <SelectTrigger className="w-[140px]">
              <Database className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Database" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="mysql">MySQL</SelectItem>
              <SelectItem value="mssql">SQL Server</SelectItem>
              <SelectItem value="postgresql">PostgreSQL</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort */}
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[130px]">
              <SortAsc className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="environment">Environment</SelectItem>
              <SelectItem value="type">Database Type</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Server List */}
      {filteredServers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Server className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">
              {servers.length === 0 ? 'No Servers Configured' : 'No Servers Found'}
            </h3>
            <p className="text-muted-foreground text-center max-w-sm mb-4">
              {servers.length === 0 
                ? 'Get started by adding your first database server configuration.'
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
            {servers.length === 0 && (
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Server
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={cn(
          viewMode === 'grid' 
            ? 'grid gap-4 md:grid-cols-2 lg:grid-cols-3'
            : 'flex flex-col gap-3'
        )}>
          {filteredServers.map((server) => (
            <ServerCard
              key={server.id}
              server={server}
              onEdit={handleEdit}
              onClick={onServerClick}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}

      {/* Server Config Wizard */}
      <ServerConfigWizard
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        server={editingServer}
        onSave={handleSave}
      />
    </div>
  );
}
