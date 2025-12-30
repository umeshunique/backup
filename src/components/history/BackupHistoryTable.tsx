import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EnvironmentBadge, StatusBadge } from '@/components/shared';
import { useBackupStore } from '@/store/backupStore';
import { formatBytes, formatDuration } from '@/utils/mockData';
import { format } from 'date-fns';
import {
  Search, Filter, RefreshCw, Trash2, Download, Eye, RotateCcw,
  MoreVertical, Calendar, ChevronDown
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

export function BackupHistoryTable() {
  const { backupHistory, deleteBackup, deleteMultipleBackups, setActiveTab } = useBackupStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [envFilter, setEnvFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filteredHistory = backupHistory.filter((backup) => {
    if (searchQuery && !backup.databaseName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !backup.fileName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && backup.status !== statusFilter) return false;
    if (envFilter !== 'all' && backup.environment !== envFilter) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredHistory.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredHistory.map((b) => b.id));
    }
  };

  const handleDeleteSelected = () => {
    deleteMultipleBackups(selectedIds);
    setSelectedIds([]);
    toast({ title: 'Backups Deleted', description: `${selectedIds.length} backups removed.` });
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search backups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={envFilter} onValueChange={setEnvFilter}>
          <SelectTrigger className="w-[150px]">
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <Card>
        <ScrollArea className="h-[500px]">
          <div className="min-w-[800px]">
            {/* Header */}
            <div className="flex items-center gap-4 p-3 border-b border-border bg-muted/30 sticky top-0 text-xs font-medium text-muted-foreground uppercase">
              <Checkbox
                checked={selectedIds.length === filteredHistory.length && filteredHistory.length > 0}
                onCheckedChange={toggleSelectAll}
              />
              <span className="w-32">Date/Time</span>
              <span className="w-24">Environment</span>
              <span className="flex-1">Database / File</span>
              <span className="w-20">Type</span>
              <span className="w-20 text-right">Size</span>
              <span className="w-20 text-right">Duration</span>
              <span className="w-20 text-center">Status</span>
              <span className="w-10"></span>
            </div>

            {/* Rows */}
            {filteredHistory.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center gap-4 p-3 border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                <Checkbox
                  checked={selectedIds.includes(backup.id)}
                  onCheckedChange={() => toggleSelect(backup.id)}
                />
                <div className="w-32 text-sm">
                  <p>{format(backup.createdAt instanceof Date ? backup.createdAt : new Date(backup.createdAt), 'MMM d, yyyy')}</p>
                  <p className="text-xs text-muted-foreground">{format(backup.createdAt instanceof Date ? backup.createdAt : new Date(backup.createdAt), 'HH:mm:ss')}</p>
                </div>
                <div className="w-24">
                  <EnvironmentBadge environment={backup.environment} size="sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{backup.databaseName}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{backup.fileName}</p>
                </div>
                <div className="w-20">
                  <Badge variant="outline" className="text-[10px] capitalize">{backup.backupType}</Badge>
                </div>
                <div className="w-20 text-right text-sm">{formatBytes(backup.fileSize)}</div>
                <div className="w-20 text-right text-sm text-muted-foreground">
                  {formatDuration(backup.statistics.duration)}
                </div>
                <div className="w-20 flex justify-center">
                  <StatusBadge status={backup.status} size="sm" />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><Eye className="h-4 w-4 mr-2" /> View Details</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setActiveTab('restore')}>
                      <RotateCcw className="h-4 w-4 mr-2" /> Restore
                    </DropdownMenuItem>
                    <DropdownMenuItem><Download className="h-4 w-4 mr-2" /> Download</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => { deleteBackup(backup.id); toast({ title: 'Backup Deleted' }); }}
                      className="text-red-400"
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}

            {filteredHistory.length === 0 && (
              <div className="flex items-center justify-center h-40 text-muted-foreground">
                No backups found
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
