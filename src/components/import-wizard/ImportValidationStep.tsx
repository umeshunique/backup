import { useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ImportWizardState, ValidationIssue } from './importWizardTypes';
import type { TableColumn } from '@/types/backup.types';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportValidationStepProps {
  state: ImportWizardState;
  /** Table columns for the selected table (for type/required checks) */
  tableColumns: TableColumn[];
  /** Called when validation result changes so parent can block Next */
  onValidationChange?: (errors: ValidationIssue[], warnings: ValidationIssue[]) => void;
}

const PREVIEW_ROWS = 10;

export function ImportValidationStep({ state, tableColumns, onValidationChange }: ImportValidationStepProps) {
  const parsed = state.parsedFile;
  const mapping = state.columnMapping;

  const { errors, warnings } = useMemo(() => {
    const errs: ValidationIssue[] = [];
    const warns: ValidationIssue[] = [];
    if (!parsed) return { errors: errs, warnings: warns };

    const mappedCols = Object.entries(mapping).filter(([, t]) => t !== '');
    const tableColMap = new Map(tableColumns.map((c) => [c.name, c]));

    // Required columns not mapped
    const requiredCols = tableColumns.filter((c) => !c.nullable && !c.autoIncrement);
    for (const col of requiredCols) {
      const mapped = mappedCols.some(([, t]) => t === col.name);
      if (!mapped) warns.push({ rowIndex: -1, column: col.name, message: `Required column "${col.name}" has no mapping.`, severity: 'warning' });
    }

    // Rows with empty required values
    for (let r = 0; r < parsed.rows.length; r++) {
      const row = parsed.rows[r];
      for (let c = 0; c < parsed.headers.length; c++) {
        const fileHeader = parsed.headers[c];
        const tableCol = mapping[fileHeader];
        if (!tableCol) continue;
        const colDef = tableColMap.get(tableCol);
        if (colDef?.nullable || colDef?.autoIncrement) continue;
        const val = row[c]?.trim() ?? '';
        if (val === '') errs.push({ rowIndex: r + 1, column: tableCol, message: `Row ${r + 2}: required column "${tableCol}" is empty.`, severity: 'error' });
      }
    }

    return { errors: errs, warnings: warns };
  }, [parsed, mapping, tableColumns]);

  useEffect(() => {
    onValidationChange?.(errors, warnings);
  }, [errors, warnings, onValidationChange]);

  const hasErrors = errors.length > 0;
  const hasWarnings = warnings.length > 0;
  const isValid = !hasErrors;

  if (!parsed) return null;

  const previewRows = parsed.rows.slice(0, PREVIEW_ROWS);
  const mappedHeaders = parsed.headers.filter((h) => mapping[h]);
  const getRowValues = (row: string[]) =>
    parsed.headers
      .filter((h) => mapping[h])
      .map((h) => {
        const i = parsed.headers.indexOf(h);
        return row[i] ?? '';
      });

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Review a preview of the data and any validation issues. Fix errors before importing; warnings can be ignored.
      </p>

      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant={isValid ? 'default' : 'destructive'} className="gap-1">
          {isValid ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {errors.length} error{errors.length !== 1 ? 's' : ''}
        </Badge>
        <Badge variant="secondary" className="gap-1">
          {hasWarnings ? <AlertTriangle className="h-3 w-3" /> : null}
          {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {errors.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              Validation errors
            </CardTitle>
            <CardDescription>These must be resolved before importing.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[140px] rounded border border-border p-2">
              <ul className="text-sm space-y-1">
                {errors.slice(0, 20).map((e, i) => (
                  <li key={i} className="text-destructive">
                    {e.message}
                  </li>
                ))}
                {errors.length > 20 && <li className="text-muted-foreground">… and {errors.length - 20} more</li>}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {warnings.length > 0 && errors.length === 0 && (
        <Card className="border-amber-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[100px] rounded border border-border p-2">
              <ul className="text-sm space-y-1 text-muted-foreground">
                {warnings.slice(0, 10).map((w, i) => (
                  <li key={i}>{w.message}</li>
                ))}
              </ul>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Data preview</CardTitle>
          <CardDescription>
            First {PREVIEW_ROWS} rows with mapped columns only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {mappedHeaders.map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-medium">
                      {h} → {mapping[h]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, ri) => (
                  <tr key={ri} className="border-b border-border/50">
                    {getRowValues(row).map((cell, ci) => (
                      <td key={ci} className="px-3 py-1.5 max-w-[180px] truncate" title={cell}>
                        {cell || <span className="text-muted-foreground">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
