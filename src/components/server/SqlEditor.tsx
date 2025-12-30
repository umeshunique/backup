import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ServerConfig } from '@/types/backup.types';
import { Play, Download, Trash2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface SqlEditorProps {
  server: ServerConfig;
  database: string;
}

interface QueryResult {
  success: boolean;
  columns?: string[];
  rows?: any[];
  affectedRows?: number;
  message?: string;
  error?: string;
  executionTime?: number;
}

export function SqlEditor({ server, database }: SqlEditorProps) {
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM information_schema.tables LIMIT 10;');
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryHistory, setQueryHistory] = useState<Array<{ query: string; timestamp: Date }>>([]);

  const executeQuery = async () => {
    if (!sqlQuery.trim()) return;

    setIsExecuting(true);
    const startTime = Date.now();

    try {
      const result = await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query: sqlQuery
      });

      const executionTime = Date.now() - startTime;

      setQueryResult({
        ...result,
        executionTime
      });

      // Add to history
      setQueryHistory(prev => [
        { query: sqlQuery, timestamp: new Date() },
        ...prev.slice(0, 9) // Keep last 10
      ]);
    } catch (error: any) {
      setQueryResult({
        success: false,
        error: error.message || 'Query execution failed',
        executionTime: Date.now() - startTime
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const clearQuery = () => {
    setSqlQuery('');
    setQueryResult(null);
  };

  const loadFromHistory = (query: string) => {
    setSqlQuery(query);
  };

  const downloadResults = () => {
    if (!queryResult?.rows) return;

    const csv = [
      queryResult.columns?.join(','),
      ...queryResult.rows.map(row =>
        queryResult.columns?.map(col => JSON.stringify(row[col] ?? '')).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-result-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* SQL Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>SQL Query Editor</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={clearQuery}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                onClick={executeQuery}
                disabled={isExecuting || !sqlQuery.trim()}
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                {isExecuting ? 'Executing...' : 'Execute Query'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            value={sqlQuery}
            onChange={(e) => setSqlQuery(e.target.value)}
            placeholder="Enter your SQL query here..."
            className="font-mono min-h-[200px]"
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === 'Enter') {
                executeQuery();
              }
            }}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Press Ctrl+Enter to execute • Connected to: {database}
          </p>
        </CardContent>
      </Card>

      {/* Query Results */}
      {queryResult && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>Query Results</CardTitle>
                {queryResult.success ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Success
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Error
                  </Badge>
                )}
                {queryResult.executionTime && (
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {queryResult.executionTime}ms
                  </Badge>
                )}
              </div>
              {queryResult.rows && queryResult.rows.length > 0 && (
                <Button variant="outline" size="sm" onClick={downloadResults}>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {queryResult.error ? (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-mono">{queryResult.error}</p>
              </div>
            ) : queryResult.rows && queryResult.rows.length > 0 ? (
              <div>
                <p className="text-sm text-muted-foreground mb-3">
                  {queryResult.rows.length} row(s) returned
                </p>
                <ScrollArea className="h-[400px] w-full border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {queryResult.columns?.map((col) => (
                          <TableHead key={col} className="font-mono text-xs">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queryResult.rows.map((row, idx) => (
                        <TableRow key={idx}>
                          {queryResult.columns?.map((col) => (
                            <TableCell key={col} className="font-mono text-xs">
                              {row[col] === null ? (
                                <span className="text-muted-foreground italic">NULL</span>
                              ) : typeof row[col] === 'object' ? (
                                JSON.stringify(row[col])
                              ) : (
                                String(row[col])
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            ) : queryResult.affectedRows !== undefined ? (
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-400">
                  Query executed successfully. {queryResult.affectedRows} row(s) affected.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {queryResult.message || 'Query executed successfully.'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Query History */}
      {queryHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Query History</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {queryHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => loadFromHistory(item.query)}
                  >
                    <p className="text-xs font-mono text-muted-foreground mb-1">
                      {item.timestamp.toLocaleTimeString()}
                    </p>
                    <p className="text-sm font-mono line-clamp-2">{item.query}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
