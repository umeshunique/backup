import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { DatabaseTable } from '@/types/backup.types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DataEditorProps {
  table: DatabaseTable;
  row?: any | null;
  onSave: (sql: string) => void;
  onCancel: () => void;
}

export function DataEditor({ table, row, onSave, onCancel }: DataEditorProps) {
  const isEditMode = !!row;
  const [formData, setFormData] = useState<Record<string, any>>(
    row ||
    table.columns?.reduce((acc, col) => ({ ...acc, [col.name]: '' }), {}) || {}
  );

  const handleSubmit = () => {
    if (isEditMode) {
      // Generate UPDATE query
      const setClauses = table.columns
        ?.filter(col => !col.autoIncrement)
        .map(col => {
          const value = formData[col.name];
          if (value === null || value === '') {
            return `\`${col.name}\` = NULL`;
          }
          if (['INT', 'BIGINT', 'DECIMAL', 'FLOAT', 'DOUBLE'].includes(col.dataType)) {
            return `\`${col.name}\` = ${value}`;
          }
          return `\`${col.name}\` = '${String(value).replace(/'/g, "''")}'`;
        })
        .join(', ');

      // Build WHERE clause based on primary key or all original values
      const pkColumns = table.columns?.filter(col => col.primaryKey);
      const whereClause = pkColumns && pkColumns.length > 0
        ? pkColumns.map(col => {
            const value = row[col.name];
            if (value === null) return `\`${col.name}\` IS NULL`;
            if (['INT', 'BIGINT', 'DECIMAL', 'FLOAT', 'DOUBLE'].includes(col.dataType)) {
              return `\`${col.name}\` = ${value}`;
            }
            return `\`${col.name}\` = '${String(value).replace(/'/g, "''")}'`;
          }).join(' AND ')
        : table.columns?.map(col => {
            const value = row[col.name];
            if (value === null) return `\`${col.name}\` IS NULL`;
            if (['INT', 'BIGINT', 'DECIMAL', 'FLOAT', 'DOUBLE'].includes(col.dataType)) {
              return `\`${col.name}\` = ${value}`;
            }
            return `\`${col.name}\` = '${String(value).replace(/'/g, "''")}'`;
          }).join(' AND ');

      const sql = `UPDATE \`${table.name}\` SET ${setClauses} WHERE ${whereClause}`;
      onSave(sql);
    } else {
      // Generate INSERT query
      const columns = table.columns?.filter(col => !col.autoIncrement && formData[col.name] !== '') || [];
      const columnNames = columns.map(col => `\`${col.name}\``).join(', ');
      const values = columns.map(col => {
        const value = formData[col.name];
        if (value === null || value === '') return 'NULL';
        if (['INT', 'BIGINT', 'DECIMAL', 'FLOAT', 'DOUBLE'].includes(col.dataType)) {
          return value;
        }
        return `'${String(value).replace(/'/g, "''")}'`;
      }).join(', ');

      const sql = `INSERT INTO \`${table.name}\` (${columnNames}) VALUES (${values})`;
      onSave(sql);
    }
  };

  const handleChange = (columnName: string, value: any) => {
    setFormData(prev => ({ ...prev, [columnName]: value }));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditMode ? 'Edit' : 'Insert'} Row - {table.name}</DialogTitle>
        <DialogDescription>
          {isEditMode ? 'Modify the values for this row' : 'Enter values for the new row'}
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[400px] pr-4">
        <div className="space-y-4">
          {table.columns?.map((column) => (
            <div key={column.name} className="space-y-2">
              <Label htmlFor={column.name} className="flex items-center gap-2">
                <span className="font-mono">{column.name}</span>
                <span className="text-xs text-muted-foreground">
                  {column.dataType}
                  {column.length ? `(${column.length})` : ''}
                </span>
                {column.primaryKey && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">PK</span>
                )}
                {column.autoIncrement && (
                  <span className="text-xs bg-green-100 text-green-800 px-1 rounded">AUTO</span>
                )}
                {!column.nullable && (
                  <span className="text-xs bg-red-100 text-red-800 px-1 rounded">NOT NULL</span>
                )}
              </Label>
              <Input
                id={column.name}
                value={formData[column.name] ?? ''}
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
            </div>
          ))}
        </div>
      </ScrollArea>

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
