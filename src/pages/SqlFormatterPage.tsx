import { useState, useCallback } from 'react';
import { format, supportedDialects } from 'sql-formatter';
import type { IndentStyle, KeywordCase } from 'sql-formatter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlignLeft, Copy, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const DEFAULT_SQL = `select * from users where active=1 and created_at>='2024-01-01' order by name;
SELECT id,name,email FROM orders o JOIN customers c ON o.customer_id=c.id WHERE o.status='pending'`;

const INDENT_STYLES: { value: IndentStyle; label: string }[] = [
  { value: 'standard', label: 'Standard' },
  { value: 'tabularLeft', label: 'Tabular (left)' },
  { value: 'tabularRight', label: 'Tabular (right)' },
];

const KEYWORD_CASES: { value: KeywordCase; label: string }[] = [
  { value: 'preserve', label: 'Preserve' },
  { value: 'upper', label: 'UPPERCASE' },
  { value: 'lower', label: 'lowercase' },
];

const TAB_WIDTHS = [2, 4, 8];

export function SqlFormatterPage() {
  const [input, setInput] = useState(DEFAULT_SQL);
  const [output, setOutput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('sql');
  const [indentStyle, setIndentStyle] = useState<IndentStyle>('standard');
  const [keywordCase, setKeywordCase] = useState<KeywordCase>('upper');
  const [useTabs, setUseTabs] = useState(false);
  const [tabWidth, setTabWidth] = useState(2);
  const [linesBetweenQueries, setLinesBetweenQueries] = useState(1);
  const { toast } = useToast();

  const handleFormat = useCallback(() => {
    setError(null);
    const trimmed = input.trim();
    if (!trimmed) {
      setOutput('');
      return;
    }
    try {
      const result = format(trimmed, {
        language: language as 'sql' | 'mysql' | 'postgresql' | 'transactsql' | 'sqlite' | 'spark' | 'bigquery' | 'snowflake' | 'plsql' | 'n1ql' | 'redshift' | 'mariadb' | 'tidb' | 'trino' | 'duckdb' | 'clickhouse' | 'hive' | 'db2' | 'db2i' | 'singlestoredb',
        indentStyle,
        keywordCase,
        useTabs,
        tabWidth,
        linesBetweenQueries,
      });
      setOutput(result);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      setOutput('');
      toast({
        title: 'Format failed',
        description: message,
        variant: 'destructive',
      });
    }
  }, [input, language, indentStyle, keywordCase, useTabs, tabWidth, linesBetweenQueries, toast]);

  const handleCopy = useCallback(() => {
    if (!output) return;
    void navigator.clipboard.writeText(output).then(() => {
      toast({ title: 'Copied to clipboard' });
    });
  }, [output, toast]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 p-3">
            <AlignLeft className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">SQL Formatter</h2>
            <p className="text-sm text-muted-foreground">
              Format and beautify SQL with configurable style, indent, and keyword casing.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Input */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Input SQL</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Paste or type SQL here..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="min-h-[220px] font-mono text-sm resize-y"
              spellCheck={false}
            />
          </CardContent>
        </Card>

        {/* Output */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Formatted SQL</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!output}
              className="gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              readOnly
              value={output}
              placeholder="Click Format to see result..."
              className={cn(
                'min-h-[220px] font-mono text-sm resize-y bg-muted/50',
                error && 'border-destructive/50'
              )}
              spellCheck={false}
            />
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Options */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Format options
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Dialect</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedDialects.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Keyword case</Label>
              <Select value={keywordCase} onValueChange={(v) => setKeywordCase(v as KeywordCase)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KEYWORD_CASES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Indent style</Label>
              <Select value={indentStyle} onValueChange={(v) => setIndentStyle(v as IndentStyle)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INDENT_STYLES.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Indent width</Label>
              <Select
                value={String(tabWidth)}
                onValueChange={(v) => setTabWidth(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TAB_WIDTHS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {useTabs ? 'tab width' : 'spaces'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id="use-tabs"
                checked={useTabs}
                onCheckedChange={setUseTabs}
              />
              <Label htmlFor="use-tabs" className="cursor-pointer font-normal">
                Use tabs for indent
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="lines-between" className="font-normal">
                Lines between queries:
              </Label>
              <Select
                value={String(linesBetweenQueries)}
                onValueChange={(v) => setLinesBetweenQueries(Number(v))}
              >
                <SelectTrigger id="lines-between" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleFormat} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Format
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
