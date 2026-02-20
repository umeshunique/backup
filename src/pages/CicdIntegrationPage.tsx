/**
 * CI/CD Integration — Pipelines, approval gates, and deployment runs.
 * Connect Jenkins, GitHub Actions, or Azure DevOps; configure approval gates; view runs.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  GitBranch,
  Settings2,
  ShieldCheck,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';

type PipelineProvider = 'jenkins' | 'github-actions' | 'azure-devops';

interface PipelineConfig {
  id: string;
  name: string;
  provider: PipelineProvider;
  baseUrl: string;
  token?: string;
  targetServerId: string;
  targetServerName?: string;
  createdAt: string;
}

interface PipelineRun {
  id: string;
  pipelineName: string;
  status: 'success' | 'failed' | 'running' | 'pending';
  triggeredAt: string;
  duration?: number; // seconds
  targetServer: string;
  triggeredBy?: string;
}

const PROVIDER_LABELS: Record<PipelineProvider, string> = {
  jenkins: 'Jenkins',
  'github-actions': 'GitHub Actions',
  'azure-devops': 'Azure DevOps',
};

const PROVIDER_HINTS: Record<PipelineProvider, string> = {
  jenkins: 'Jenkins server URL (e.g. https://jenkins.example.com)',
  'github-actions': 'Repository URL or GitHub API base (e.g. https://api.github.com)',
  'azure-devops': 'Organization URL (e.g. https://dev.azure.com/your-org)',
};

// Mock runs for demo; replace with API when backend is ready
const MOCK_RUNS: PipelineRun[] = [
  {
    id: '1',
    pipelineName: 'DB-Schema-Deploy',
    status: 'success',
    triggeredAt: new Date(Date.now() - 3600000).toISOString(),
    duration: 142,
    targetServer: 'Production SQL',
    triggeredBy: 'github-actions',
  },
  {
    id: '2',
    pipelineName: 'DB-Schema-Deploy',
    status: 'running',
    triggeredAt: new Date(Date.now() - 120000).toISOString(),
    targetServer: 'Staging SQL',
    triggeredBy: 'azure-devops',
  },
  {
    id: '3',
    pipelineName: 'Backup-Verify',
    status: 'failed',
    triggeredAt: new Date(Date.now() - 86400000).toISOString(),
    duration: 28,
    targetServer: 'Production SQL',
    triggeredBy: 'jenkins',
  },
];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

export function CicdIntegrationPage() {
  const [activeTab, setActiveTab] = useState<'pipelines' | 'approval-gates' | 'runs'>('pipelines');
  const [pipelines, setPipelines] = useState<PipelineConfig[]>([]);
  const [servers, setServers] = useState<{ id: string; name: string }[]>([]);
  const [runs, setRuns] = useState<PipelineRun[]>(MOCK_RUNS);

  // Form state for new/edit pipeline
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState<PipelineProvider>('github-actions');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formToken, setFormToken] = useState('');
  const [formTargetServerId, setFormTargetServerId] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formTesting, setFormTesting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Approval gates
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [approvalEnvironments, setApprovalEnvironments] = useState('Production');
  const [approverEmails, setApproverEmails] = useState('');

  useEffect(() => {
    let cancelled = false;
    apiClient.getAllServers().then((res) => {
      if (cancelled || !res.success || !Array.isArray(res.servers)) return;
      setServers(
        res.servers.map((s: { id: string; name?: string }) => ({
          id: s.id,
          name: s.name ?? s.id,
        }))
      );
      if (res.servers.length > 0 && !formTargetServerId) {
        setFormTargetServerId(res.servers[0].id);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormProvider('github-actions');
    setFormBaseUrl('');
    setFormToken('');
    setFormTargetServerId(servers[0]?.id ?? '');
    setFormMessage(null);
  };

  const handleSavePipeline = () => {
    if (!formName.trim() || !formBaseUrl.trim() || !formTargetServerId) {
      setFormMessage({ type: 'error', text: 'Name, base URL, and target server are required.' });
      return;
    }
    setFormSaving(true);
    setFormMessage(null);
    const targetName = servers.find((s) => s.id === formTargetServerId)?.name ?? formTargetServerId;
    const newPipeline: PipelineConfig = {
      id: `p-${Date.now()}`,
      name: formName.trim(),
      provider: formProvider,
      baseUrl: formBaseUrl.trim(),
      token: formToken.trim() || undefined,
      targetServerId: formTargetServerId,
      targetServerName: targetName,
      createdAt: new Date().toISOString(),
    };
    setPipelines((prev) => [...prev, newPipeline]);
    setFormSaving(false);
    setFormMessage({ type: 'success', text: 'Pipeline saved. Connect your CI/CD to the API when ready.' });
    resetForm();
  };

  const handleTestConnection = () => {
    setFormTesting(true);
    setFormMessage(null);
    setTimeout(() => {
      setFormTesting(false);
      setFormMessage({
        type: 'success',
        text: `Connection check requested for ${PROVIDER_LABELS[formProvider]}. Configure webhook in your pipeline to trigger deployments.`,
      });
    }, 1500);
  };

  const removePipeline = (id: string) => {
    setPipelines((prev) => prev.filter((p) => p.id !== id));
  };

  const statusIcon = (status: PipelineRun['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="pipelines" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Pipelines
            {pipelines.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {pipelines.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approval-gates" className="gap-2">
            <ShieldCheck className="h-4 w-4" />
            Approval Gates
          </TabsTrigger>
          <TabsTrigger value="runs" className="gap-2">
            <Play className="h-4 w-4" />
            Pipeline Runs
            {runs.some((r) => r.status === 'running') && (
              <span className="ml-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipelines" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Add pipeline connection
              </CardTitle>
              <CardDescription>
                Connect Jenkins, GitHub Actions, or Azure DevOps. Deployments can be triggered via webhook or API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formMessage && (
                <Alert variant={formMessage.type === 'error' ? 'destructive' : 'default'}>
                  <AlertDescription>{formMessage.text}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pipeline-name">Pipeline name</Label>
                  <Input
                    id="pipeline-name"
                    placeholder="e.g. DB-Schema-Deploy"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={formProvider}
                    onValueChange={(v) => setFormProvider(v as PipelineProvider)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="jenkins">Jenkins</SelectItem>
                      <SelectItem value="github-actions">GitHub Actions</SelectItem>
                      <SelectItem value="azure-devops">Azure DevOps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="base-url">Base URL</Label>
                <Input
                  id="base-url"
                  placeholder={formProvider === 'jenkins' ? 'https://jenkins.example.com' : formProvider === 'github-actions' ? 'https://api.github.com' : 'https://dev.azure.com/your-org'}
                  value={formBaseUrl}
                  onChange={(e) => setFormBaseUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">{PROVIDER_HINTS[formProvider]}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="token">Token / PAT (optional)</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="Leave blank to use environment or pipeline secrets"
                  value={formToken}
                  onChange={(e) => setFormToken(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Target database server</Label>
                <Select value={formTargetServerId} onValueChange={setFormTargetServerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select server" />
                  </SelectTrigger>
                  <SelectContent>
                    {servers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                    {servers.length === 0 && (
                      <SelectItem value="__no-servers__" disabled>
                        No servers configured
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={formTesting || !formBaseUrl.trim()}
                >
                  {formTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Test connection
                </Button>
                <Button onClick={handleSavePipeline} disabled={formSaving}>
                  {formSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Save pipeline
                </Button>
              </div>
            </CardContent>
          </Card>

          {pipelines.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Configured pipelines</CardTitle>
                <CardDescription>Manage pipeline connections and target servers.</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {pipelines.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {PROVIDER_LABELS[p.provider]} → {p.targetServerName ?? p.targetServerId}
                          </p>
                        </div>
                        <Badge variant="outline">{PROVIDER_LABELS[p.provider]}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removePipeline(p.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove pipeline"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approval-gates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Approval gates
              </CardTitle>
              <CardDescription>
                Require manual approval before deploying to sensitive environments (e.g. production).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Require approval for production</p>
                  <p className="text-sm text-muted-foreground">
                    Pipeline runs targeting production will wait for approval before applying changes.
                  </p>
                </div>
                <Switch checked={approvalRequired} onCheckedChange={setApprovalRequired} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="approval-env">Environments that require approval (comma-separated)</Label>
                <Input
                  id="approval-env"
                  value={approvalEnvironments}
                  onChange={(e) => setApprovalEnvironments(e.target.value)}
                  placeholder="Production, Staging"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="approvers">Approver emails (one per line or comma-separated)</Label>
                <Textarea
                  id="approvers"
                  value={approverEmails}
                  onChange={(e) => setApproverEmails(e.target.value)}
                  placeholder="dba@company.com, lead@company.com"
                  rows={3}
                  className="resize-none"
                />
              </div>
              <Button disabled>Save approval settings</Button>
              <p className="text-xs text-muted-foreground">
                Saving will be enabled when the backend approval workflow is connected.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="runs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Pipeline runs
              </CardTitle>
              <CardDescription>
                Recent deployment runs from your pipelines. Use webhooks or API to trigger and record runs here.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pipeline</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Triggered</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead className="w-[100px]">Triggered by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">{run.pipelineName}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          {statusIcon(run.status)}
                          <span className="capitalize">{run.status}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatRelativeTime(run.triggeredAt)}
                      </TableCell>
                      <TableCell>
                        {run.duration != null ? formatDuration(run.duration) : '—'}
                      </TableCell>
                      <TableCell>{run.targetServer}</TableCell>
                      <TableCell className="text-muted-foreground capitalize">
                        {run.triggeredBy?.replace('-', ' ') ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {runs.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No pipeline runs yet. Configure a pipeline and trigger a run via webhook or API.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
