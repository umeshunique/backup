import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BackupWizardState } from './BackupWizard';
import { FileCode, Archive, Settings2, Lock } from 'lucide-react';

interface BackupOptionsFormProps {
  state: BackupWizardState;
  onUpdate: (updates: Partial<BackupWizardState>) => void;
}

export function BackupOptionsForm({ state, onUpdate }: BackupOptionsFormProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Output Format */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileCode className="h-4 w-4 text-primary" />
            Output Format
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={state.outputFormat}
            onValueChange={(value: 'sql' | 'json' | 'xml' | 'csv' | 'zip') =>
              onUpdate({ outputFormat: value })
            }
            className="space-y-2"
          >
            <label className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="sql" id="sql" />
              <div>
                <Label htmlFor="sql" className="cursor-pointer font-medium">SQL (.sql)</Label>
                <p className="text-xs text-muted-foreground">Standard SQL dump format</p>
              </div>
            </label>
            <label className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="json" id="json" />
              <div>
                <Label htmlFor="json" className="cursor-pointer font-medium">JSON (.json)</Label>
                <p className="text-xs text-muted-foreground">Portable JSON format</p>
              </div>
            </label>
            <label className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="xml" id="xml" />
              <div>
                <Label htmlFor="xml" className="cursor-pointer font-medium">XML (.xml)</Label>
                <p className="text-xs text-muted-foreground">XML data export</p>
              </div>
            </label>
            <label className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="csv" id="csv" />
              <div>
                <Label htmlFor="csv" className="cursor-pointer font-medium">CSV (Tables only)</Label>
                <p className="text-xs text-muted-foreground">Comma-separated values</p>
              </div>
            </label>
            <label className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
              <RadioGroupItem value="zip" id="zip" />
              <div>
                <Label htmlFor="zip" className="cursor-pointer font-medium">Compressed Archive (.zip)</Label>
                <p className="text-xs text-muted-foreground">Compressed backup package</p>
              </div>
            </label>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Compression Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Archive className="h-4 w-4 text-primary" />
            Compression
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Compression</Label>
              <p className="text-xs text-muted-foreground">Reduce backup file size</p>
            </div>
            <Switch
              checked={state.compression.enabled}
              onCheckedChange={(checked) =>
                onUpdate({ compression: { ...state.compression, enabled: checked } })
              }
            />
          </div>

          {state.compression.enabled && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Compression Level</Label>
                <span className="text-sm font-mono">{state.compression.level}</span>
              </div>
              <Slider
                value={[state.compression.level]}
                min={1}
                max={5}
                step={1}
                onValueChange={([value]) =>
                  onUpdate({ compression: { ...state.compression, level: value } })
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Fastest</span>
                <span>Maximum</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SQL Generation Options */}
      {state.outputFormat === 'sql' && (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              SQL Generation Options
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(state.sqlOptions).map(([key, value]) => {
                const labels: Record<string, { title: string; desc: string }> = {
                  includeDropStatements: {
                    title: 'Include DROP Statements',
                    desc: 'Add DROP TABLE IF EXISTS before CREATE',
                  },
                  includeCreateStatements: {
                    title: 'Include CREATE Statements',
                    desc: 'Include table structure definitions',
                  },
                  includeUseDatabase: {
                    title: 'Include USE DATABASE',
                    desc: 'Add USE database_name statement',
                  },
                  disableForeignKeyChecks: {
                    title: 'Disable FK Checks',
                    desc: 'Disable foreign key checks during restore',
                  },
                  useTransactions: {
                    title: 'Use Transactions',
                    desc: 'Wrap statements in BEGIN/COMMIT',
                  },
                  includeComments: {
                    title: 'Include Comments',
                    desc: 'Add documentation comments',
                  },
                  includeTimestampHeader: {
                    title: 'Add Timestamp Header',
                    desc: 'Include backup timestamp in file',
                  },
                };

                const label = labels[key];

                return (
                  <label
                    key={key}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={value}
                      onCheckedChange={(checked) =>
                        onUpdate({
                          sqlOptions: { ...state.sqlOptions, [key]: checked },
                        })
                      }
                      className="mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-medium">{label.title}</span>
                      <p className="text-xs text-muted-foreground">{label.desc}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Encryption (placeholder) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Encrypt Backup</Label>
              <p className="text-xs text-muted-foreground">Password protect backup file</p>
            </div>
            <Switch disabled />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Generate Checksum</Label>
              <p className="text-xs text-muted-foreground">Create SHA-256 hash for verification</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
