import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DatabaseTable } from '@/types/backup.types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { escapeIdentifier } from '@/utils/sqlIdentifier';
import type { DatabaseType } from '@/types/backup.types';

interface ColumnInfo {
  name: string;
  dataType?: string;
  nullable?: boolean;
  primaryKey?: boolean;
  autoIncrement?: boolean;
  maxLength?: number;
  length?: number;
  isPrimaryKey?: boolean;
}

interface DataEditorProps {
  table: DatabaseTable;
  row?: any | null;
  /** Database type for correct identifier escaping (MySQL/MSSQL/PostgreSQL). */
  databaseType?: DatabaseType;
  onSave: (sql: string) => void;
  onCancel: () => void;
}

function isLongTextColumn(col: ColumnInfo): boolean {
  const dt = (col.dataType || '').toUpperCase();
  if (['TEXT', 'LONGTEXT', 'MEDIUMTEXT', 'BLOB', 'MEDIUMBLOB', 'LONGBLOB', 'JSON'].includes(dt)) return true;
  if (dt === 'VARCHAR' && (col.maxLength || col.length || 0) > 255) return true;
  return false;
}

function isNumericType(dataType: string | undefined): boolean {
  const dt = (dataType || '').toUpperCase();
  return ['INT', 'BIGINT', 'TINYINT', 'SMALLINT', 'MEDIUMINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'REAL', 'BIT'].includes(dt);
}

export function DataEditor({ table, row, databaseType = 'mysql', onSave, onCancel }: DataEditorProps) {
  const { toast } = useToast();
  const isEditMode = !!row;
  const esc = (name: string) => escapeIdentifier(name, databaseType);
  const [formData, setFormData] = useState<Record<string, any>>(
    row ||
    table.columns?.reduce((acc, col) => ({ ...acc, [col.name]: '' }), {}) || {}
  );

  const handleSubmit = () => {
    if (isEditMode) {
      // Generate UPDATE query (identifier-safe for MySQL/MSSQL/PostgreSQL)
      const setClauses = table.columns
        ?.filter(col => !col.autoIncrement)
        .map(col => {
          const value = formData[col.name];
          if (value === null || value === '') {
            return `${esc(col.name)} = NULL`;
          }
          if (isNumericType(col.dataType)) {
            return `${esc(col.name)} = ${value}`;
          }
          return `${esc(col.name)} = '${String(value).replace(/'/g, "''")}'`;
        })
        .join(', ');

      const pkColumns = table.columns?.filter(col => col.primaryKey || col.isPrimaryKey);
      const whereClause = pkColumns && pkColumns.length > 0
        ? pkColumns.map(col => {
            const value = row[col.name];
            if (value === null) return `${esc(col.name)} IS NULL`;
            if (isNumericType(col.dataType)) return `${esc(col.name)} = ${value}`;
            return `${esc(col.name)} = '${String(value).replace(/'/g, "''")}'`;
          }).join(' AND ')
        : table.columns?.map(col => {
            const value = row[col.name];
            if (value === null) return `${esc(col.name)} IS NULL`;
            if (isNumericType(col.dataType)) return `${esc(col.name)} = ${value}`;
            return `${esc(col.name)} = '${String(value).replace(/'/g, "''")}'`;
          }).join(' AND ');

      const sql = `UPDATE ${esc(table.name)} SET ${setClauses} WHERE ${whereClause}`;
      onSave(sql);
    } else {
      const columns = table.columns?.filter(col => !col.autoIncrement && formData[col.name] !== '') || [];
      const columnNames = columns.map(col => esc(col.name)).join(', ');
      const values = columns.map(col => {
        const value = formData[col.name];
        if (value === null || value === '') return 'NULL';
        if (isNumericType(col.dataType)) return value;
        return `'${String(value).replace(/'/g, "''")}'`;
      }).join(', ');

      const sql = `INSERT INTO ${esc(table.name)} (${columnNames}) VALUES (${values})`;
      onSave(sql);
    }
  };

  const handleChange = (columnName: string, value: any) => {
    setFormData(prev => ({ ...prev, [columnName]: value }));
  };

  const copyValue = (columnName: string) => {
    const val = formData[columnName];
    const str = val === null || val === undefined ? '' : String(val);
    navigator.clipboard.writeText(str);
    toast({ title: 'Copied', description: `${columnName} copied to clipboard` });
  };

  const cols = table.columns || [];
  const useLongText = (col: typeof cols[0]) => isLongTextColumn(col as ColumnInfo);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditMode ? 'Edit' : 'Insert'} Row — {table.name}</DialogTitle>
        <DialogDescription>
          {isEditMode ? 'Modify the values for this row' : 'Enter values for the new row'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full max-h-[min(70vh,520px)] pr-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {cols.map((column) => {
            const isPk = column.primaryKey || column.isPrimaryKey;
            const len = column.length ?? column.maxLength;
            const useTextarea = useLongText(column);
            const rawValue = formData[column.name];
            const displayValue = rawValue === null || rawValue === undefined ? '' : String(rawValue);

            return (
              <div
                key={column.name}
                className={`space-y-2 ${useTextarea ? 'sm:col-span-2' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={column.name} className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="font-mono font-medium">{column.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {column.dataType}
                      {len ? `(${len})` : ''}
                    </span>
                    {isPk && (
                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">PK</span>
                    )}
                    {column.autoIncrement && (
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">AUTO</span>
                    )}
                    {column.nullable === false && (
                      <span className="text-[10px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">NOT NULL</span>
                    )}
                  </Label>
                  {displayValue && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => copyValue(column.name)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Copy value</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                {useTextarea ? (
                  <Textarea
                    id={column.name}
                    value={displayValue}
                    onChange={(e) => handleChange(column.name, e.target.value)}
                    disabled={column.autoIncrement && !isEditMode}
                    placeholder={
                      column.autoIncrement
                        ? 'Auto-generated'
                        : column.nullable
                        ? 'NULL (leave empty)'
                        : 'Required'
                    }
                    className="font-mono min-h-[120px] resize-y text-sm"
                    rows={6}
                  />
                ) : (
                  <Input
                    id={column.name}
                    value={displayValue}
                    onChange={(e) => handleChange(column.name, e.target.value)}
                    disabled={column.autoIncrement && !isEditMode}
                    placeholder={
                      column.autoIncrement
                        ? 'Auto-generated'
                        : column.nullable
                        ? 'NULL (leave empty)'
                        : 'Required'
                    }
                    className="font-mono"
                  />
                )}
              </div>
            );
          })}
        </div>
        </ScrollArea>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          {isEditMode ? 'Update' : 'Insert'} Row
        </Button>
      </DialogFooter>
    </>
  );
}
