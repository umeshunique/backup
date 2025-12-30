import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useBackupStore } from '@/store/backupStore';
import {
  PackageSearch,
  Calendar as CalendarIcon,
  Server,
  Table2,
  FileCode,
  Eye,
  Zap,
  Plus,
  ArrowRight,
  GitBranch,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  List,
  Filter,
  Search
} from 'lucide-react';
import { format, isAfter, isBefore, isWithinInterval } from 'date-fns';
import { ServerBuild, BuildArtifact, DatabaseTable, StoredProcedure, DatabaseView, DatabaseFunction, DatabaseTrigger } from '@/types/backup.types';

export function BuildManagement() {
  const { servers, getDatabasesForServer, loadDatabasesForServer, loadDatabaseSchema, serverBuilds, addBuild, updateBuildStatus } = useBackupStore();

  const [selectedBuild, setSelectedBuild] = useState<ServerBuild | null>(null);

  // Build creation state
  const [buildName, setBuildName] = useState('');
  const [buildDescription, setBuildDescription] = useState('');
  const [sourceServerId, setSourceServerId] = useState<string>('');
  const [sourceDatabase, setSourceDatabase] = useState<string>('');
  const [targetServerId, setTargetServerId] = useState<string>('');
  const [targetDatabase, setTargetDatabase] = useState<string>('');
  const [selectedArtifacts, setSelectedArtifacts] = useState<BuildArtifact[]>([]);

  // Auto-generate version number
  const getNextVersion = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const buildNumber = serverBuilds.length + 1;
    return `B${dateStr}.${String(buildNumber).padStart(3, '0')}`;
  };

  // Date filter state
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [filterObjectType, setFilterObjectType] = useState<string>('all');

  // Search and multi-select state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());

  const sourceServer = servers.find(s => s.id === sourceServerId);
  const targetServer = servers.find(s => s.id === targetServerId);
  const sourceDatabases = sourceServerId ? getDatabasesForServer(sourceServerId) : [];
  const targetDatabases = targetServerId ? getDatabasesForServer(targetServerId) : [];

  useEffect(() => {
    if (sourceServerId) {
      loadDatabasesForServer(sourceServerId);
    }
  }, [sourceServerId, loadDatabasesForServer]);

  useEffect(() => {
    if (targetServerId) {
      loadDatabasesForServer(targetServerId);
    }
  }, [targetServerId, loadDatabasesForServer]);

  useEffect(() => {
    if (sourceServerId && sourceDatabase) {
      loadDatabaseSchema(sourceServerId, sourceDatabase);
    }
  }, [sourceServerId, sourceDatabase, loadDatabaseSchema]);

  useEffect(() => {
    if (targetServerId && targetDatabase) {
      loadDatabaseSchema(targetServerId, targetDatabase);
    }
  }, [targetServerId, targetDatabase, loadDatabaseSchema]);

  // Filter database objects by creation date and search query
  const getFilteredObjects = () => {
    if (!sourceDatabase || !sourceDatabases.length) return { tables: [], procedures: [], views: [], functions: [], triggers: [] };

    const filtered = {
      tables: [] as DatabaseTable[],
      procedures: [] as StoredProcedure[],
      views: [] as DatabaseView[],
      functions: [] as DatabaseFunction[],
      triggers: [] as DatabaseTrigger[],
    };

    const selectedDb = sourceDatabases.find(db => db.name === sourceDatabase);
    if (!selectedDb) return filtered;

    const dbList = [selectedDb];
    dbList.forEach(db => {
      // Filter tables
      db.tables.forEach(table => {
        if (matchesDateFilter(table.lastModified) && matchesTypeFilter('table') && matchesSearchQuery(table.name)) {
          filtered.tables.push(table);
        }
      });

      // Filter procedures
      db.procedures.forEach(proc => {
        if (matchesDateFilter(proc.lastModified) && matchesTypeFilter('procedure') && matchesSearchQuery(proc.name)) {
          filtered.procedures.push(proc);
        }
      });

      // Filter views
      db.views.forEach(view => {
        if (matchesTypeFilter('view') && matchesSearchQuery(view.name)) {
          filtered.views.push(view);
        }
      });

      // Filter functions
      db.functions.forEach(func => {
        if (matchesTypeFilter('function') && matchesSearchQuery(func.name)) {
          filtered.functions.push(func);
        }
      });

      // Filter triggers
      db.triggers.forEach(trigger => {
        if (matchesTypeFilter('trigger') && matchesSearchQuery(trigger.name)) {
          filtered.triggers.push(trigger);
        }
      });
    });

    return filtered;
  };

  const matchesDateFilter = (date: Date): boolean => {
    if (!showDateFilter || (!dateFrom && !dateTo)) return true;

    if (dateFrom && dateTo) {
      return isWithinInterval(date, { start: dateFrom, end: dateTo });
    } else if (dateFrom) {
      return isAfter(date, dateFrom) || date.getTime() === dateFrom.getTime();
    } else if (dateTo) {
      return isBefore(date, dateTo) || date.getTime() === dateTo.getTime();
    }

    return true;
  };

  const matchesTypeFilter = (type: string): boolean => {
    return filterObjectType === 'all' || filterObjectType === type;
  };

  const matchesSearchQuery = (name: string): boolean => {
    if (!searchQuery.trim()) return true;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  };

  const toggleObjectSelection = (objectName: string) => {
    const newSelection = new Set(selectedObjects);
    if (newSelection.has(objectName)) {
      newSelection.delete(objectName);
    } else {
      newSelection.add(objectName);
    }
    setSelectedObjects(newSelection);
  };

  const toggleSelectAll = () => {
    const allObjects = [
      ...filteredObjects.tables.map(t => t.name),
      ...filteredObjects.procedures.map(p => p.name),
      ...filteredObjects.views.map(v => v.name),
      ...filteredObjects.functions.map(f => f.name),
      ...filteredObjects.triggers.map(t => t.name),
    ];

    if (selectedObjects.size === allObjects.length && allObjects.length > 0) {
      setSelectedObjects(new Set());
    } else {
      setSelectedObjects(new Set(allObjects));
    }
  };

  const handleAddSelectedToBuild = () => {
    selectedObjects.forEach(objectName => {
      // Find object type
      let objectType: 'table' | 'procedure' | 'view' | 'function' | 'trigger' | null = null;
      if (filteredObjects.tables.some(t => t.name === objectName)) objectType = 'table';
      else if (filteredObjects.procedures.some(p => p.name === objectName)) objectType = 'procedure';
      else if (filteredObjects.views.some(v => v.name === objectName)) objectType = 'view';
      else if (filteredObjects.functions.some(f => f.name === objectName)) objectType = 'function';
      else if (filteredObjects.triggers.some(t => t.name === objectName)) objectType = 'trigger';

      if (objectType && !selectedArtifacts.some(a => a.objectName === objectName)) {
        handleAddToBuild(objectName, objectType);
      }
    });
    setSelectedObjects(new Set());
  };

  const filteredObjects = getFilteredObjects();

  // Debug: Log filtered objects whenever they change
  useEffect(() => {
    console.log('🔍 Filtered Objects:', {
      tables: filteredObjects.tables.length,
      procedures: filteredObjects.procedures.length,
      views: filteredObjects.views.length,
      functions: filteredObjects.functions.length,
      triggers: filteredObjects.triggers.length,
      sourceDatabase,
      sourceDatabases: sourceDatabases.length,
    });
  }, [filteredObjects, sourceDatabase, sourceDatabases]);

  const handleAddToBuild = (objectName: string, objectType: 'table' | 'procedure' | 'view' | 'function' | 'trigger') => {
    const artifact: BuildArtifact = {
      id: `artifact-${Date.now()}-${Math.random()}`,
      objectName,
      objectType,
      action: 'create',
      sqlScript: `-- Generated script for ${objectName}`,
      dependencies: [],
    };

    setSelectedArtifacts(prev => [...prev, artifact]);
  };

  const handleRemoveFromBuild = (artifactId: string) => {
    setSelectedArtifacts(prev => prev.filter(a => a.id !== artifactId));
  };

  const handleCreateBuild = () => {
    const autoVersion = getNextVersion();

    if (!sourceServerId || !sourceDatabase || !targetServerId || !targetDatabase || selectedArtifacts.length === 0) {
      alert('Please select source, target, and add at least one artifact');
      return;
    }

    const newBuild: ServerBuild = {
      id: `build-${Date.now()}`,
      buildVersion: {
        id: `version-${Date.now()}`,
        version: autoVersion,
        buildNumber: autoVersion,
        description: buildDescription,
        createdAt: new Date(),
        createdBy: 'admin',
      },
      sourceServer: {
        id: sourceServer!.id,
        name: sourceServer!.name,
        host: sourceServer!.host,
        environment: sourceServer!.environment,
      },
      targetServer: {
        id: targetServer!.id,
        name: targetServer!.name,
        host: targetServer!.host,
        environment: targetServer!.environment,
      },
      artifacts: selectedArtifacts,
      status: 'draft',
      deploymentLog: [],
      deploymentStats: {
        totalArtifacts: selectedArtifacts.length,
        successfulArtifacts: 0,
        failedArtifacts: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    addBuild(newBuild);
    setSelectedBuild(newBuild);

    // Reset form
    setBuildDescription('');
    setSelectedArtifacts([]);
  };

  const handleDeployBuild = (buildId: string) => {
    updateBuildStatus(buildId, 'deploying');

    // Simulate deployment
    setTimeout(() => {
      updateBuildStatus(buildId, 'completed');
    }, 3000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-6 w-6" />
            Build Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and deploy database builds across servers with version control
          </p>
        </div>
      </div>

      {/* Server and Database Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Source and Target</CardTitle>
          <p className="text-sm text-muted-foreground">Choose source and target servers/databases for the build</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
            {/* Source Selection - LEFT */}
            <div className="space-y-4 border-r pr-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <span className="text-blue-500 font-semibold">S</span>
                </div>
                <div>
                  <h3 className="font-semibold">Source</h3>
                  <p className="text-xs text-muted-foreground">Objects to deploy</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Server</Label>
                <Select value={sourceServerId} onValueChange={setSourceServerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source server" />
                  </SelectTrigger>
                  <SelectContent>
                    {servers.map(server => (
                      <SelectItem key={server.id} value={server.id}>
                        {server.name} ({server.environment})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Database</Label>
                <Select
                  value={sourceDatabase}
                  onValueChange={setSourceDatabase}
                  disabled={!sourceServerId || sourceDatabases.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source database" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceDatabases.map(db => (
                      <SelectItem key={db.name} value={db.name}>
                        {db.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Arrow - CENTER */}
            <div className="flex items-center justify-center pt-16">
              <ArrowRight className="h-8 w-8 text-primary" />
            </div>

            {/* Target Selection - RIGHT */}
            <div className="space-y-4 border-l pl-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <span className="text-green-500 font-semibold">T</span>
                </div>
                <div>
                  <h3 className="font-semibold">Target</h3>
                  <p className="text-xs text-muted-foreground">Deployment destination</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Server</Label>
                <Select value={targetServerId} onValueChange={setTargetServerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target server" />
                  </SelectTrigger>
                  <SelectContent>
                    {servers.map(server => (
                      <SelectItem key={server.id} value={server.id}>
                        {server.name} ({server.environment})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Database</Label>
                <Select
                  value={targetDatabase}
                  onValueChange={setTargetDatabase}
                  disabled={!targetServerId || targetDatabases.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target database" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetDatabases.map(db => (
                      <SelectItem key={db.name} value={db.name}>
                        {db.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Build Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create New Build
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Auto-generated Version Display */}
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary">Next Build Version</span>
                <Badge variant="default" className="font-mono">{getNextVersion()}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Auto-generated version number</p>
            </div>

            {/* Build Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe this build..."
                value={buildDescription}
                onChange={(e) => setBuildDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Selected Artifacts Count */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Selected Artifacts</span>
                <Badge variant="secondary">{selectedArtifacts.length}</Badge>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleCreateBuild}
              disabled={!sourceServerId || !sourceDatabase || !targetServerId || !targetDatabase || selectedArtifacts.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Build
            </Button>
          </CardContent>
        </Card>

        {/* Selected Artifacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Build Artifacts ({selectedArtifacts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {selectedArtifacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No artifacts selected</p>
                  <p className="text-xs mt-1">Add objects from the list below</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedArtifacts.map(artifact => (
                    <div
                      key={artifact.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {artifact.objectType === 'table' && <Table2 className="h-4 w-4" />}
                        {artifact.objectType === 'procedure' && <FileCode className="h-4 w-4" />}
                        {artifact.objectType === 'view' && <Eye className="h-4 w-4" />}
                        {artifact.objectType === 'function' && <FileCode className="h-4 w-4" />}
                        {artifact.objectType === 'trigger' && <Zap className="h-4 w-4" />}
                        <div>
                          <p className="text-sm font-medium">{artifact.objectName}</p>
                          <p className="text-xs text-muted-foreground capitalize">{artifact.objectType}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFromBuild(artifact.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Database Objects Browser with Date Filter */}
      {sourceServerId && sourceDatabase && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="flex items-center gap-2">
                  <PackageSearch className="h-5 w-5" />
                  Database Objects - {sourceServer?.name} / {sourceDatabase}
                </CardTitle>
                {selectedObjects.size > 0 && (
                  <Badge variant="default">{selectedObjects.size} selected</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedObjects.size > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleAddSelectedToBuild}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Selected ({selectedObjects.size})
                  </Button>
                )}
                {/* Object Type Filter */}
                <Select value={filterObjectType} onValueChange={setFilterObjectType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Objects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Objects</SelectItem>
                    <SelectItem value="table">Tables</SelectItem>
                    <SelectItem value="procedure">Procedures</SelectItem>
                    <SelectItem value="view">Views</SelectItem>
                    <SelectItem value="function">Functions</SelectItem>
                    <SelectItem value="trigger">Triggers</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant={showDateFilter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowDateFilter(!showDateFilter)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Date Filter
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search database objects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={
                      selectedObjects.size > 0 &&
                      selectedObjects.size ===
                        [
                          ...filteredObjects.tables,
                          ...filteredObjects.procedures,
                          ...filteredObjects.views,
                          ...filteredObjects.functions,
                          ...filteredObjects.triggers,
                        ].length &&
                      [
                        ...filteredObjects.tables,
                        ...filteredObjects.procedures,
                        ...filteredObjects.views,
                        ...filteredObjects.functions,
                        ...filteredObjects.triggers,
                      ].length > 0
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                  <Label className="text-sm text-muted-foreground cursor-pointer" onClick={toggleSelectAll}>
                    Select All
                  </Label>
                </div>
                {selectedObjects.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedObjects(new Set())}
                  >
                    Clear Selection
                  </Button>
                )}
              </div>
            </div>

            {/* Date Filter */}
            {showDateFilter && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, 'PPP') : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateFrom}
                          onSelect={setDateFrom}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, 'PPP') : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={dateTo}
                          onSelect={setDateTo}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDateFrom(undefined);
                      setDateTo(undefined);
                    }}
                  >
                    Clear Dates
                  </Button>
                  {(dateFrom || dateTo) && (
                    <div className="text-xs text-muted-foreground flex items-center">
                      Showing objects
                      {dateFrom && ` from ${format(dateFrom, 'PP')}`}
                      {dateTo && ` to ${format(dateTo, 'PP')}`}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {/* Tables */}
                {(filterObjectType === 'all' || filterObjectType === 'table') && filteredObjects.tables.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Table2 className="h-4 w-4" />
                      Tables ({filteredObjects.tables.length})
                    </h4>
                    <div className="space-y-1">
                      {filteredObjects.tables.map(table => (
                        <div key={table.name} className={`flex items-center gap-3 p-2 rounded hover:bg-muted/50 ${selectedObjects.has(table.name) ? 'bg-muted/50' : ''}`}>
                          <Checkbox
                            checked={selectedObjects.has(table.name)}
                            onCheckedChange={() => toggleObjectSelection(table.name)}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{table.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Modified: {format(table.lastModified, 'PP')} • {table.rowCount} rows • {table.sizeInMB.toFixed(2)} MB
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddToBuild(table.name, 'table')}
                            disabled={selectedArtifacts.some(a => a.objectName === table.name)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Stored Procedures */}
                {(filterObjectType === 'all' || filterObjectType === 'procedure') && filteredObjects.procedures.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <FileCode className="h-4 w-4" />
                      Stored Procedures ({filteredObjects.procedures.length})
                    </h4>
                    <div className="space-y-1">
                      {filteredObjects.procedures.map(proc => (
                        <div key={proc.name} className={`flex items-center gap-3 p-2 rounded hover:bg-muted/50 ${selectedObjects.has(proc.name) ? 'bg-muted/50' : ''}`}>
                          <Checkbox
                            checked={selectedObjects.has(proc.name)}
                            onCheckedChange={() => toggleObjectSelection(proc.name)}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{proc.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Modified: {format(proc.lastModified, 'PP')} • {proc.parameterCount} parameters
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddToBuild(proc.name, 'procedure')}
                            disabled={selectedArtifacts.some(a => a.objectName === proc.name)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Views */}
                {(filterObjectType === 'all' || filterObjectType === 'view') && filteredObjects.views.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Views ({filteredObjects.views.length})
                    </h4>
                    <div className="space-y-1">
                      {filteredObjects.views.map(view => (
                        <div key={view.name} className={`flex items-center gap-3 p-2 rounded hover:bg-muted/50 ${selectedObjects.has(view.name) ? 'bg-muted/50' : ''}`}>
                          <Checkbox
                            checked={selectedObjects.has(view.name)}
                            onCheckedChange={() => toggleObjectSelection(view.name)}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{view.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {view.dependencies.length} dependencies
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddToBuild(view.name, 'view')}
                            disabled={selectedArtifacts.some(a => a.objectName === view.name)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Functions */}
                {(filterObjectType === 'all' || filterObjectType === 'function') && filteredObjects.functions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <FileCode className="h-4 w-4" />
                      Functions ({filteredObjects.functions.length})
                    </h4>
                    <div className="space-y-1">
                      {filteredObjects.functions.map(func => (
                        <div key={func.name} className={`flex items-center gap-3 p-2 rounded hover:bg-muted/50 ${selectedObjects.has(func.name) ? 'bg-muted/50' : ''}`}>
                          <Checkbox
                            checked={selectedObjects.has(func.name)}
                            onCheckedChange={() => toggleObjectSelection(func.name)}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{func.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {func.type} • {func.parameterCount} parameters
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddToBuild(func.name, 'function')}
                            disabled={selectedArtifacts.some(a => a.objectName === func.name)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Triggers */}
                {(filterObjectType === 'all' || filterObjectType === 'trigger') && filteredObjects.triggers.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      Triggers ({filteredObjects.triggers.length})
                    </h4>
                    <div className="space-y-1">
                      {filteredObjects.triggers.map(trigger => (
                        <div key={trigger.name} className={`flex items-center gap-3 p-2 rounded hover:bg-muted/50 ${selectedObjects.has(trigger.name) ? 'bg-muted/50' : ''}`}>
                          <Checkbox
                            checked={selectedObjects.has(trigger.name)}
                            onCheckedChange={() => toggleObjectSelection(trigger.name)}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{trigger.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {trigger.timing} {trigger.type} on {trigger.associatedTable}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddToBuild(trigger.name, 'trigger')}
                            disabled={selectedArtifacts.some(a => a.objectName === trigger.name)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Build History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Build History ({serverBuilds.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            {serverBuilds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No builds created yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {serverBuilds.map(build => (
                  <div
                    key={build.id}
                    className="p-4 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedBuild(build)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold flex items-center gap-2">
                          {build.buildVersion.version}
                          <Badge variant={
                            build.status === 'completed' ? 'default' :
                            build.status === 'failed' ? 'destructive' :
                            build.status === 'deploying' ? 'secondary' : 'outline'
                          }>
                            {build.status}
                          </Badge>
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {build.buildVersion.description || 'No description'}
                        </p>
                      </div>
                      {build.status === 'draft' && (
                        <Button size="sm" onClick={() => handleDeployBuild(build.id)}>
                          <Play className="h-3 w-3 mr-1" />
                          Deploy
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Source</p>
                        <p className="font-medium">{build.sourceServer.name}</p>
                        <p className="text-xs text-muted-foreground">{build.sourceServer.environment}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Target</p>
                        <p className="font-medium">{build.targetServer.name}</p>
                        <p className="text-xs text-muted-foreground">{build.targetServer.environment}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {build.artifacts.length} artifacts
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(build.createdAt, 'PPp')}
                        </span>
                      </div>
                      {build.status === 'completed' && (
                        <span className="flex items-center gap-1 text-green-500">
                          <CheckCircle2 className="h-3 w-3" />
                          {build.deploymentStats.successfulArtifacts}/{build.deploymentStats.totalArtifacts} deployed
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
