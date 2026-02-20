import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { ImportWizardState } from './importWizardTypes';
import { CheckCircle2, XCircle, Loader2, RotateCcw } from 'lucide-react';

interface ImportExecutionProps {
  state: ImportWizardState;
  onComplete: () => void;
}

/** Simulated import: no backend yet. Runs a timer and reports success. */
async function runSimulatedImport(
  rowCount: number,
  onProgress: (p: number) => void
): Promise<{ inserted: number; updated: number; skipped: number; failed: number; errors: string[] }> {
  const steps = 20;
  for (let i = 0; i <= steps; i++) {
    await new Promise((r) => setTimeout(r, 80));
    onProgress((i / steps) * 100);
  }
  return {
    inserted: rowCount,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };
}

export function ImportExecution({ state, onComplete }: ImportExecutionProps) {
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportWizardState['importResult']>(null);
  const [error, setError] = useState<string | null>(null);

  const parsedFile = state.parsedFile;
  const rowCount = parsedFile?.rows.length ?? 0;

  useEffect(() => {
    let cancelled = false;
    runSimulatedImport(rowCount, (p) => !cancelled && setProgress(p))
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Import failed.');
      });
    return () => {
      cancelled = true;
    };
  }, [rowCount]);

  const isDone = result !== null || error !== null;
  const isSuccess = result !== null && result.errors.length === 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {!isDone ? (
              <>
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
                Importing…
              </>
            ) : isSuccess ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Import complete
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Import failed
              </>
            )}
          </CardTitle>
          <CardDescription>
            {!isDone
              ? `Importing ${rowCount} rows into the target table…`
              : isSuccess
                ? `${result?.inserted ?? 0} rows imported successfully.`
                : error ?? result?.errors?.join(' ') ?? 'An error occurred.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isDone && (
            <Progress value={progress} className="h-2" />
          )}
          {isSuccess && result && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-1">
              <p>Inserted: {result.inserted}</p>
              {result.updated > 0 && <p>Updated: {result.updated}</p>}
              {result.skipped > 0 && <p>Skipped: {result.skipped}</p>}
              {result.failed > 0 && <p className="text-destructive">Failed: {result.failed}</p>}
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              {error}
            </div>
          )}
          {isDone && (
            <Button onClick={onComplete} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Start another import
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
