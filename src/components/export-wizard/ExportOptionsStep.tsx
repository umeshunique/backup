import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ExportWizardState,
  ExportFormat,
  CsvDelimiter,
} from './exportWizardTypes';

const DELIMITERS: { value: CsvDelimiter; label: string }[] = [
  { value: ',', label: 'Comma (,)' },
  { value: ';', label: 'Semicolon (;)' },
  { value: '\t', label: 'Tab' },
  { value: '|', label: 'Pipe (|)' },
];

interface ExportOptionsStepProps {
  state: ExportWizardState;
  onUpdate: (updates: Partial<ExportWizardState>) => void;
}

export function ExportOptionsStep({ state, onUpdate }: ExportOptionsStepProps) {
  const showCsv = state.format === 'csv';
  const showExcel = state.format === 'excel';
  const showJson = state.format === 'json';
  const showXml = state.format === 'xml';
  const showSql = state.format === 'sql';

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Adjust format-specific options. Leave defaults if unsure.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        {(showCsv || showExcel) && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Headers & encoding</h4>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-headers"
                checked={state.includeHeaders}
                onCheckedChange={(v) => onUpdate({ includeHeaders: v === true })}
              />
              <Label htmlFor="include-headers" className="cursor-pointer">
                Include header row
              </Label>
            </div>
            <div className="space-y-2">
              <Label>Encoding</Label>
              <Select
                value={state.encoding}
                onValueChange={(v) =>
                  onUpdate({ encoding: v as ExportWizardState['encoding'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="utf-8">UTF-8</SelectItem>
                  <SelectItem value="utf-16">UTF-16</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {showCsv && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">CSV</h4>
            <div className="space-y-2">
              <Label>Delimiter</Label>
              <Select
                value={state.csvDelimiter}
                onValueChange={(v) => onUpdate({ csvDelimiter: v as CsvDelimiter })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DELIMITERS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {showJson && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">JSON</h4>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="json-pretty"
                checked={state.jsonPretty}
                onCheckedChange={(v) => onUpdate({ jsonPretty: v === true })}
              />
              <Label htmlFor="json-pretty" className="cursor-pointer">
                Pretty-print (indented)
              </Label>
            </div>
          </div>
        )}

        {showXml && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">XML</h4>
            <div className="space-y-2">
              <Label htmlFor="xml-root">Root element name</Label>
              <Input
                id="xml-root"
                value={state.xmlRootName}
                onChange={(e) => onUpdate({ xmlRootName: e.target.value || 'root' })}
                placeholder="root"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="xml-row">Row element name</Label>
              <Input
                id="xml-row"
                value={state.xmlRowName}
                onChange={(e) => onUpdate({ xmlRowName: e.target.value || 'row' })}
                placeholder="row"
              />
            </div>
          </div>
        )}

        {showSql && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium">SQL INSERT</h4>
            <div className="space-y-2">
              <Label htmlFor="sql-table">Target table name</Label>
              <Input
                id="sql-table"
                value={state.sqlInsertTableName}
                onChange={(e) => onUpdate({ sqlInsertTableName: e.target.value })}
                placeholder={
                  state.sourceType === 'table' && state.tableName
                    ? state.tableName
                    : 'table_name'
                }
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to use the source table name.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sql-batch">Rows per INSERT batch</Label>
              <Input
                id="sql-batch"
                type="number"
                min={1}
                max={10000}
                value={state.sqlBatchSize}
                onChange={(e) =>
                  onUpdate({ sqlBatchSize: Math.max(1, parseInt(e.target.value, 10) || 100) })
                }
              />
            </div>
          </div>
        )}

        {(showExcel || showJson || showXml) && (
          <div className="space-y-2">
            <Label>Encoding</Label>
            <Select
              value={state.encoding}
              onValueChange={(v) =>
                onUpdate({ encoding: v as ExportWizardState['encoding'] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="utf-8">UTF-8</SelectItem>
                <SelectItem value="utf-16">UTF-16</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
