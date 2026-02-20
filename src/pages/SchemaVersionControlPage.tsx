/**
 * Schema Version Control — Git integration for DDL.
 * Commit schema changes, manage branches, and view diff history.
 * Data is rendered dynamically based on the selected database connection.
 */

import { useState, useEffect } from 'react';
import { useBackupStore } from '@/store/backupStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  GitBranch,
  GitCommit,
  FolderGit2,
  FileCode2,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  ChevronRight,
  History,
  Database,
  Server as ServerIcon,
} from 'lucide-react';
import type { ServerConfig } from '@/types/backup.types';
import { apiClient } from '@/services/apiClient';

const MOCK_DIFF_LEFT = `-- main
CREATE TABLE products (
  id INT PRIMARY KEY,
  name NVARCHAR(200),
  price DECIMAL(18,2)
);
`;

const MOCK_DIFF_RIGHT = `-- compare branch
CREATE TABLE products (
  id INT PRIMARY KEY,
  name NVARCHAR(200),
  price DECIMAL(18,2),
  sku VARCHAR(50)
);

CREATE TABLE orders (
  id INT PRIMARY KEY,
  customer_id INT,
  created_at DATETIME2
);
`;

type SchemaVersionData = {
  repoPath: string;
  connected: boolean;
  branches: { name: string; isCurrent: boolean; lastCommit: string; lastMessage: string }[];
  commits: { hash: string; message: string; author: string; date: string }[];
  uncommitted: { path: string; type: string; summary: string }[];
};

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

function shortHash(hash: string): string {
  return hash.slice(0, 7);
}

export function SchemaVersionControlPage() {
  const {
    servers,
    loadServers,
    loadDatabasesForServer,
    getDatabasesForServer,
    setActiveTab,
  } = useBackupStore();

  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [activeTab, setActiveTabLocal] = useState<'repository' | 'branches' | 'commits' | 'diff'>('repository');
  const [repoPath, setRepoPath] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [committing, setCommitting] = useState(false);
  const [diffLeftRef, setDiffLeftRef] = useState('');
  const [diffRightRef, setDiffRightRef] = useState('');
  const [refreshingBranches, setRefreshingBranches] = useState(false);

  const [schemaVersionLoading, setSchemaVersionLoading] = useState(false);
  const [schemaVersionError, setSchemaVersionError] = useState<string | null>(null);
  const [schemaVersionData, setSchemaVersionData] = useState<SchemaVersionData | null>(null);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  useEffect(() => {
    if (!selectedServerId) {
      setSelectedDatabase(null);
      return;
    }
    setSelectedDatabase(null);
    setLoadingDatabases(true);
    loadDatabasesForServer(selectedServerId).finally(() => setLoadingDatabases(false));
  }, [selectedServerId, loadDatabasesForServer]);

  // Fetch repository and branches when connection is selected
  useEffect(() => {
    if (!selectedServerId || !selectedDatabase) {
      setSchemaVersionData(null);
      setSchemaVersionError(null);
      return;
    }
    setSchemaVersionLoading(true);
    setSchemaVersionError(null);
    apiClient
      .getSchemaVersion(selectedServerId, selectedDatabase)
      .then((res) => {
        if (res.success && res.data) {
          setSchemaVersionData(res.data);
          setRepoPath(res.data.repoPath ?? '');
        }
      })
      .catch((err) => {
        setSchemaVersionError(err?.message ?? 'Failed to load repository and branches');
        setSchemaVersionData(null);
      })
      .finally(() => setSchemaVersionLoading(false));
  }, [selectedServerId, selectedDatabase]);

  const selectedServer: ServerConfig | undefined = selectedServerId
    ? servers.find((s) => s.id === selectedServerId)
    : undefined;
  const databases = selectedServerId ? getDatabasesForServer(selectedServerId) : [];
  const hasConnection = Boolean(selectedServer && selectedDatabase);

  const connected = schemaVersionData?.connected ?? false;
  const branches = schemaVersionData?.branches ?? [];
  const commits = schemaVersionData?.commits ?? [];
  const uncommitted = schemaVersionData?.uncommitted ?? [];

  // Default diff refs from loaded branches or commits
  useEffect(() => {
    if (!hasConnection) return;
    const branchNames = branches.map((b) => b.name);
    const commitHashes = commits.map((c) => c.hash);
    const validRefs = [...branchNames, ...commitHashes];
    const leftDefault = branches[0]?.name ?? commits[0]?.hash ?? '';
    const rightDefault = branches[1]?.name ?? branches[0]?.name ?? commits[1]?.hash ?? commits[0]?.hash ?? '';
    setDiffLeftRef((prev) => (prev && validRefs.includes(prev)) ? prev : leftDefault);
    setDiffRightRef((prev) => (prev && validRefs.includes(prev)) ? prev : rightDefault);
  }, [hasConnection, branches, commits]);

  const isGitHubUrl = (path: string) =>
    /^https?:\/\/github\.com\//i.test(path) || /^git@github\.com:/i.test(path);

  const handleConnect = async () => {
    if (!repoPath.trim() || !selectedServerId || !selectedDatabase) return;
    setConnecting(true);
    setSchemaVersionError(null);
    try {
      await apiClient.updateSchemaVersion(selectedServerId, selectedDatabase, {
        repoPath: repoPath.trim(),
        connected: true,
      });
      if (isGitHubUrl(repoPath)) {
        const remote = await apiClient.fetchRemoteBranches(repoPath.trim());
        if (remote.success && remote.branches?.length) {
          await apiClient.updateSchemaVersion(selectedServerId, selectedDatabase, {
            branches: remote.branches,
          });
        }
      }
      const res = await apiClient.getSchemaVersion(selectedServerId, selectedDatabase);
      if (res.success && res.data) {
        setSchemaVersionData(res.data);
      }
    } catch (err) {
      setSchemaVersionError((err as Error)?.message ?? 'Failed to connect repository');
    } finally {
      setConnecting(false);
    }
  };

  const handleRefreshBranches = async () => {
    if (!repoPath.trim() || !selectedServerId || !selectedDatabase || !isGitHubUrl(repoPath)) return;
    setRefreshingBranches(true);
    setSchemaVersionError(null);
    try {
      const remote = await apiClient.fetchRemoteBranches(repoPath.trim());
      if (remote.success && remote.branches) {
        await apiClient.updateSchemaVersion(selectedServerId, selectedDatabase, {
          branches: remote.branches,
        });
        const res = await apiClient.getSchemaVersion(selectedServerId, selectedDatabase);
        if (res.success && res.data) setSchemaVersionData(res.data);
      }
    } catch (err) {
      setSchemaVersionError((err as Error)?.message ?? 'Failed to refresh branches');
    } finally {
      setRefreshingBranches(false);
    }
  };

  const handleDisconnect = async () => {
    if (!selectedServerId || !selectedDatabase) return;
    setConnecting(true);
    try {
      await apiClient.updateSchemaVersion(selectedServerId, selectedDatabase, {
        repoPath: '',
        connected: false,
      });
      setSchemaVersionData((prev) =>
        prev ? { ...prev, repoPath: '', connected: false } : null
      );
      setRepoPath('');
    } catch (err) {
      setSchemaVersionError((err as Error)?.message ?? 'Failed to disconnect');
    } finally {
      setConnecting(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim() || !selectedServerId || !selectedDatabase) return;
    setCommitting(true);
    try {
      const newCommit = {
        hash: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`,
        message: commitMessage.trim(),
        author: 'user@local',
        date: new Date().toISOString(),
      };
      await apiClient.updateSchemaVersion(selectedServerId, selectedDatabase, {
        commits: [newCommit, ...commits],
        uncommitted: [],
      });
      const res = await apiClient.getSchemaVersion(selectedServerId, selectedDatabase);
      if (res.success && res.data) {
        setSchemaVersionData(res.data);
      }
      setCommitMessage('');
    } catch (err) {
      setSchemaVersionError((err as Error)?.message ?? 'Failed to commit');
    } finally {
      setCommitting(false);
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim() || !selectedServerId || !selectedDatabase) return;
    try {
      const updatedBranches = branches.map((b) => ({ ...b, isCurrent: false }));
      const lastCommit = commits[0];
      updatedBranches.push({
        name: newBranchName.trim(),
        isCurrent: true,
        lastCommit: lastCommit?.hash ?? '—',
        lastMessage: lastCommit?.message ?? 'New branch',
      });
      await apiClient.updateSchemaVersion(selectedServerId, selectedDatabase, {
        branches: updatedBranches,
      });
      const res = await apiClient.getSchemaVersion(selectedServerId, selectedDatabase);
      if (res.success && res.data) setSchemaVersionData(res.data);
      setNewBranchName('');
    } catch (err) {
      setSchemaVersionError((err as Error)?.message ?? 'Failed to create branch');
    }
  };

  if (servers.length === 0) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500/10 p-2.5">
            <FolderGit2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Schema Version Control</h2>
            <p className="text-sm text-muted-foreground">
              Git integration for DDL: commit schema changes, branches, and diff history
            </p>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ServerIcon className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No servers configured</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Add a database server to use schema version control. Go to Servers to add your first connection.
            </p>
            <Button onClick={() => setActiveTab('servers')} className="gap-2">
              <Plus className="h-4 w-4" />
              Add server
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-500/10 p-2.5">
          <FolderGit2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Schema Version Control</h2>
          <p className="text-sm text-muted-foreground">
            Git integration for DDL: commit schema changes, manage branches, and view diff history
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4" />
            Connection
          </CardTitle>
          <CardDescription>
            Select the server and database to version. Branches, commits, and diffs are scoped to this connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2 min-w-[200px]">
            <Label>Server</Label>
            <Select
              value={selectedServerId ?? ''}
              onValueChange={(v) => {
                setSelectedServerId(v || null);
                setSelectedDatabase(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select server" />
              </SelectTrigger>
              <SelectContent>
                {servers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <ServerIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      {s.name}
                      <span className="text-muted-foreground text-xs">
                        ({s.host}:{s.port})
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 min-w-[200px]">
            <Label>Database</Label>
            <Select
              value={selectedDatabase ?? ''}
              onValueChange={(v) => setSelectedDatabase(v || null)}
              disabled={!selectedServerId || loadingDatabases}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingDatabases ? 'Loading…' : 'Select database'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {databases.map((db) => (
                  <SelectItem key={db.name} value={db.name}>
                    {db.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {hasConnection && selectedServer && selectedDatabase && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                {selectedServer.name} / {selectedDatabase}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {!hasConnection && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Select a server and database above to view and manage schema version control (branches, commits, diff) for that connection.
          </CardContent>
        </Card>
      )}

      {hasConnection && schemaVersionLoading && (
        <Card>
          <CardContent className="py-12 flex items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            Loading repository and branches…
          </CardContent>
        </Card>
      )}

      {hasConnection && schemaVersionError && !schemaVersionLoading && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{schemaVersionError}</AlertDescription>
        </Alert>
      )}

      {hasConnection && !schemaVersionLoading && (
      <Tabs value={activeTab} onValueChange={(v) => setActiveTabLocal(v as typeof activeTab)}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="repository" className="gap-2">
            <FolderGit2 className="h-4 w-4" />
            Repository
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Branches
            <Badge variant="secondary" className="ml-1">
              {branches.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="commits" className="gap-2">
            <GitCommit className="h-4 w-4" />
            Changes &amp; history
          </TabsTrigger>
          <TabsTrigger value="diff" className="gap-2">
            <History className="h-4 w-4" />
            Diff
          </TabsTrigger>
        </TabsList>

        <TabsContent value="repository" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderGit2 className="h-5 w-5" />
                Git repository
              </CardTitle>
              <CardDescription>
                Connect a local or remote repository where DDL scripts are versioned for{' '}
                <span className="font-medium text-foreground">{selectedServer?.name} / {selectedDatabase}</span>.
                Schema changes will be committed here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connected ? (
                <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <AlertDescription>
                    Connected to repository. Use Branches and Changes &amp; history to commit and view DDL.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="default">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No repository connected. Enter a local path or clone URL and connect.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="repo-path">Repository path or clone URL</Label>
                <Input
                  id="repo-path"
                  placeholder="/path/to/schema-repo or https://github.com/org/schema-ddl.git"
                  value={repoPath}
                  onChange={(e) => setRepoPath(e.target.value)}
                  disabled={connected}
                />
              </div>
              <div className="flex gap-2">
                {connected ? (
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={connecting}
                  >
                    {connecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    onClick={handleConnect}
                    disabled={connecting || !repoPath.trim()}
                  >
                    {connecting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Connect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Branches
              </CardTitle>
              <CardDescription>
                Create and switch branches for schema changes for{' '}
                <span className="font-medium text-foreground">{selectedServer?.name} / {selectedDatabase}</span>.
                {isGitHubUrl(repoPath) && (
                  <> Connected to a GitHub repo: branches are loaded from the remote. Use &quot;Refresh from remote&quot; to update.</>
                )}
                {!isGitHubUrl(repoPath) && ' Current branch is where new commits will be recorded.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {connected && isGitHubUrl(repoPath) && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRefreshBranches}
                    disabled={refreshingBranches}
                  >
                    {refreshingBranches ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh from remote
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="New branch name (e.g. feature/add-views)"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  className="max-w-xs"
                />
                <Button variant="outline" disabled={!newBranchName.trim()} onClick={handleCreateBranch}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create branch
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Branch</TableHead>
                    <TableHead>Last commit</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="w-[120px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {branches.map((b) => (
                    <TableRow key={b.name}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          {b.isCurrent && (
                            <Badge variant="default" className="text-xs">current</Badge>
                          )}
                          {b.name}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-muted-foreground">
                        {shortHash(b.lastCommit)}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {b.lastMessage}
                      </TableCell>
                      <TableCell>
                        {!b.isCurrent && (
                          <Button variant="ghost" size="sm">
                            Switch
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commits" className="mt-6 space-y-6">
          {uncommitted.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode2 className="h-5 w-5" />
                  Uncommitted changes
                </CardTitle>
                <CardDescription>
                  DDL files changed since last commit. Add a message and commit to record them in history.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {uncommitted.map((f) => (
                    <li
                      key={f.path}
                      className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 font-mono text-sm"
                    >
                      <Badge variant={f.type === 'added' ? 'default' : 'secondary'}>
                        {f.type}
                      </Badge>
                      <span className="truncate">{f.path}</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </li>
                  ))}
                </ul>
                <div className="space-y-2">
                  <Label htmlFor="commit-message">Commit message</Label>
                  <Textarea
                    id="commit-message"
                    placeholder="e.g. Add products.sku and v_inventory view"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                </div>
                <Button onClick={handleCommit} disabled={committing || !commitMessage.trim()}>
                  {committing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <GitCommit className="h-4 w-4 mr-2" />
                  )}
                  Commit changes
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Commit history
              </CardTitle>
              <CardDescription>
                Recent commits on the current branch for{' '}
                <span className="font-medium text-foreground">{selectedServer?.name} / {selectedDatabase}</span>.
                Each commit represents a snapshot of DDL in the repository.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Hash</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commits.map((c) => (
                    <TableRow key={c.hash}>
                      <TableCell className="font-mono text-muted-foreground">
                        {shortHash(c.hash)}
                      </TableCell>
                      <TableCell className="font-medium">{c.message}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{c.author}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatRelativeTime(c.date)}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" aria-label="Copy hash">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diff" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Schema diff
              </CardTitle>
              <CardDescription>
                Compare DDL between two branches or commits. View added, removed, and modified objects.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="space-y-2">
                  <Label>Left (base)</Label>
                  <Select value={diffLeftRef} onValueChange={setDiffLeftRef}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.name} value={b.name}>
                          {b.name}
                          {b.isCurrent && ' (current)'}
                        </SelectItem>
                      ))}
                      {commits.slice(0, 4).map((c) => (
                        <SelectItem key={c.hash} value={c.hash}>
                          {shortHash(c.hash)} — {c.message}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground mt-6" aria-hidden />
                <div className="space-y-2">
                  <Label>Right (compare)</Label>
                  <Select value={diffRightRef} onValueChange={setDiffRightRef}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((b) => (
                        <SelectItem key={b.name} value={b.name}>
                          {b.name}
                          {b.isCurrent && ' (current)'}
                        </SelectItem>
                      ))}
                      {commits.slice(0, 4).map((c) => (
                        <SelectItem key={c.hash} value={c.hash}>
                          {shortHash(c.hash)} — {c.message}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 overflow-hidden">
                <ScrollArea className="h-[320px]">
                  <div className="grid grid-cols-2 divide-x font-mono text-sm p-4 gap-4">
                    <pre className="whitespace-pre-wrap text-muted-foreground">
                      {MOCK_DIFF_LEFT}
                    </pre>
                    <pre className="whitespace-pre-wrap">
                      {MOCK_DIFF_RIGHT}
                    </pre>
                  </div>
                </ScrollArea>
              </div>
              <p className="text-xs text-muted-foreground">
                Full diff (line-by-line add/remove highlighting) will be available when the backend provides compare API.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </div>
  );
}
