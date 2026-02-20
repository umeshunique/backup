import { useCallback, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { parseImportFile, getFileType } from './parseImportFile';
import type { ImportWizardState, ParsedImportFile } from './importWizardTypes';
import { FileSpreadsheet, FileText, Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImportFileStepProps {
  state: Pick<ImportWizardState, 'parsedFile' | 'fileError'>;
  onUpdate: (updates: Partial<ImportWizardState>) => void;
}

const ACCEPT = '.csv,.xlsx,.xls';
const MAX_ROWS_PREVIEW = 5;

export function ImportFileStep({ state, onUpdate }: ImportFileStepProps) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) {
        onUpdate({ parsedFile: null, fileError: null });
        return;
      }
      const type = getFileType(file.name);
      if (!type) {
        onUpdate({ parsedFile: null, fileError: 'Unsupported file type. Use .csv, .xlsx, or .xls.' });
        return;
      }
      setLoading(true);
      onUpdate({ fileError: null });
      try {
        const parsed = await parseImportFile(file);
        onUpdate({ parsedFile: parsed, fileError: null });
      } catch (err) {
        onUpdate({
          parsedFile: null,
          fileError: err instanceof Error ? err.message : 'Failed to parse file.',
        });
      } finally {
        setLoading(false);
      }
    },
    [onUpdate]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    handleFile(file ?? null);
    e.target.value = '';
  };

  const clearFile = () => handleFile(null);

  const parsed = state.parsedFile;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Upload a CSV or Excel file. The first row will be used as column headers. Supported formats: .csv, .xlsx, .xls.
      </p>

      {!parsed ? (
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          className={cn(
            'rounded-xl border-2 border-dashed p-10 text-center transition-colors',
            dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:bg-muted/50'
          )}
        >
          <input
            type="file"
            accept={ACCEPT}
            onChange={onInputChange}
            className="hidden"
            id="import-file-input"
          />
          <label htmlFor="import-file-input" className="cursor-pointer">
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Parsing file…</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-full bg-primary/10 p-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Drop your file here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">CSV, .xlsx, .xls</p>
                </div>
                <Button type="button" variant="secondary" asChild>
                  <span>Choose file</span>
                </Button>
              </div>
            )}
          </label>
        </div>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                {parsed.fileType === 'excel' ? (
                  <FileSpreadsheet className="h-5 w-5 text-green-600" />
                ) : (
                  <FileText className="h-5 w-5 text-blue-600" />
                )}
                {parsed.fileName}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={clearFile} aria-label="Remove file">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              <span className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{parsed.headers.length} columns</Badge>
                <Badge variant="outline">{parsed.rows.length} rows</Badge>
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Preview (first {MAX_ROWS_PREVIEW} rows)</p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    {parsed.headers.map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left font-medium">
                        {h || `Column ${i + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parsed.rows.slice(0, MAX_ROWS_PREVIEW).map((row, ri) => (
                    <tr key={ri} className="border-b border-border/50">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-1.5 max-w-[200px] truncate" title={cell}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={clearFile}>
              Choose a different file
            </Button>
          </CardContent>
        </Card>
      )}

      {state.fileError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.fileError}
        </div>
      )}
    </div>
  );
}
