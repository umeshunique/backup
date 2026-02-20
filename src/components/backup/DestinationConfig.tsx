import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { BackupWizardState } from './BackupWizard';
import { FolderBrowserDialog } from './FolderBrowserDialog';
import { FolderOpen, FileText, Trash2, HardDrive, Info } from 'lucide-react';
import { format } from 'date-fns';

interface DestinationConfigProps {
  state: BackupWizardState;
  onUpdate: (updates: Partial<BackupWizardState>) => void;
}

const filePatterns = [
  { pattern: '{database}_{timestamp}.sql', label: 'Database + Timestamp' },
  { pattern: '{environment}_{database}_{date}_{time}.sql', label: 'Environment + Database + DateTime' },
  { pattern: 'backup_{database}_{YYYYMMDD}_HHmmss.sql', label: 'Backup prefix + Database + DateTime' },
  { pattern: '{database}_full_{date}.sql', label: 'Database + Full + Date' },
];

export function DestinationConfig({ state, onUpdate }: DestinationConfigProps) {
  const [showBrowserDialog, setShowBrowserDialog] = useState(false);

  const generatePreview = (pattern: string): string => {
    const now = new Date();
    const dbName = state.database?.name || 'database_name';
    const env = state.environment || 'development';

    return pattern
      .replace('{database}', dbName)
      .replace('{environment}', env)
      .replace('{timestamp}', format(now, 'yyyyMMdd_HHmmss'))
      .replace('{date}', format(now, 'yyyy-MM-dd'))
      .replace('{time}', format(now, 'HH-mm-ss'))
      .replace('{YYYYMMDD}', format(now, 'yyyyMMdd'))
      .replace('HHmmss', format(now, 'HHmmss'));
  };

  const handleFolderSelect = (path: string) => {
    onUpdate({ destinationPath: path });
  };

  return (
    <>
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Storage Location */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            Storage Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Destination Path</Label>
            <div className="flex gap-2">
              <Input
                value={state.destinationPath}
                onChange={(e) => onUpdate({ destinationPath: e.target.value })}
                placeholder="Leave empty to use server default (./backups)"
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowBrowserDialog(true)}
                title="Browse for folder"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Click the folder icon to browse your local file system
            </p>
          </div>

          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <HardDrive className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Available Space</p>
              <p className="text-xs text-muted-foreground">421.5 GB free of 500 GB</p>
            </div>
            <div className="h-2 w-24 rounded-full bg-secondary overflow-hidden">
              <div className="h-full w-[16%] rounded-full bg-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Naming */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            File Naming
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={state.fileNamingPattern}
            onValueChange={(value) => onUpdate({ fileNamingPattern: value })}
            className="space-y-2"
          >
            {filePatterns.map((fp) => (
              <label
                key={fp.pattern}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
              >
                <RadioGroupItem value={fp.pattern} />
                <div className="flex-1">
                  <span className="text-sm font-medium">{fp.label}</span>
                  <p className="text-xs text-muted-foreground font-mono">{fp.pattern}</p>
                </div>
              </label>
            ))}
          </RadioGroup>

          <div className="pt-3 border-t border-border">
            <Label className="text-xs text-muted-foreground">Preview</Label>
            <div className="mt-1 p-2 rounded-lg bg-primary/10 border border-primary/20">
              <code className="text-sm text-primary font-mono">
                {generatePreview(state.fileNamingPattern)}
              </code>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 text-xs">
            <span className="text-muted-foreground">Placeholders:</span>
            {['{database}', '{environment}', '{date}', '{time}', '{timestamp}'].map((ph) => (
              <Badge key={ph} variant="outline" className="font-mono text-[10px]">
                {ph}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Retention Policy */}
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-primary" />
            Backup Retention Policy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-4">
              <Label htmlFor="retention-days">Keep backups for</Label>
              <Input
                id="retention-days"
                type="number"
                value={state.retentionDays}
                onChange={(e) => onUpdate({ retentionDays: parseInt(e.target.value) || 30 })}
                className="w-20"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                checked={state.autoDeleteOld}
                onCheckedChange={(checked) => onUpdate({ autoDeleteOld: checked })}
              />
              <Label>Auto-delete expired backups</Label>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
              <Info className="h-3.5 w-3.5" />
              <span>Backups older than {state.retentionDays} days will be removed</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <FolderBrowserDialog
      open={showBrowserDialog}
      onClose={() => setShowBrowserDialog(false)}
      onSelect={handleFolderSelect}
      initialPath={state.destinationPath}
    />
    </>
  );
}
