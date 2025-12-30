import { useState, useEffect } from 'react';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2 } from 'lucide-react';
import { DatabaseTable } from '@/types/backup.types';

interface TableEditorProps {
  table?: DatabaseTable | null;
  onSave: (sql: string) => void;
  onCancel: () => void;
}

interface Column {
  name: string;
  dataType: string;
  length?: string;
  nullable: boolean;
  defaultValue?: string;
  autoIncrement: boolean;
  primaryKey: boolean;
}

export function TableEditor({ table, onSave, onCancel }: TableEditorProps) {
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<Column[]>([]);

  useEffect(() => {
    if (table) {
      setTableName(table.name);
      setColumns(
        table.columns?.map(col => ({
          name: col.name,
          dataType: col.dataType,
          length: col.maxLength?.toString(),
          nullable: col.nullable === true,
          defaultValue: col.defaultValue,
          autoIncrement: col.autoIncrement || false,
          primaryKey: col.isPrimaryKey || false,
        })) || []
      );
    } else {
      setTableName('');
      setColumns([{ name: 'id', dataType: 'INT', nullable: false, autoIncrement: true, primaryKey: true }]);
    }
  }, [table]);

  const addColumn = () => {
    setColumns([...columns, { name: '', dataType: 'VARCHAR', length: '255', nullable: true, autoIncrement: false, primaryKey: false }]);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof Column, value: any) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], [field]: value };
    setColumns(updated);
  };

  const generateSQL = () => {
    if (table) {
      // ALTER TABLE - for now, just show a message
      return `-- To modify table structure, use SQL Editor
-- Example:
ALTER TABLE \`${tableName}\`
  ADD COLUMN new_column VARCHAR(255),
  MODIFY COLUMN existing_column INT NOT NULL;`;
    } else {
      // CREATE TABLE
      const columnDefs = columns.map(col => {
        let def = `  \`${col.name}\` ${col.dataType}`;

        if (col.length && ['VARCHAR', 'CHAR'].includes(col.dataType)) {
          def += `(${col.length})`;
        }

        if (!col.nullable) def += ' NOT NULL';
        if (col.autoIncrement) def += ' AUTO_INCREMENT';
        if (col.defaultValue) def += ` DEFAULT '${col.defaultValue}'`;

        return def;
      });

      const primaryKeys = columns.filter(col => col.primaryKey).map(col => col.name);
      if (primaryKeys.length > 0) {
        columnDefs.push(`  PRIMARY KEY (\`${primaryKeys.join('`, `')}\`)`);
      }

      return `CREATE TABLE \`${tableName}\` (
${columnDefs.join(',\n')}
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
    }
  };

  const handleSave = () => {
    const sql = generateSQL();
    onSave(sql);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{table ? 'Edit Table' : 'Create Table'}</DialogTitle>
        <DialogDescription>
          {table ? 'Modify table structure using ALTER statements' : 'Define table structure and columns'}
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-6">
          {/* Table Name */}
          <div className="space-y-2">
            <Label>Table Name</Label>
            <Input
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="table_name"
              disabled={!!table}
            />
          </div>

          {/* Columns */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Columns</Label>
              <Button size="sm" onClick={addColumn} disabled={!!table}>
                <Plus className="h-4 w-4 mr-2" />
                Add Column
              </Button>
            </div>

            <div className="space-y-2">
              {columns.map((col, index) => (
                <div key={index} className="flex gap-2 items-start p-3 border rounded-lg">
                  <div className="flex-1 grid grid-cols-6 gap-2">
                    <Input
                      placeholder="Column name"
                      value={col.name}
                      onChange={(e) => updateColumn(index, 'name', e.target.value)}
                      disabled={!!table}
                    />
                    <Select
                      value={col.dataType}
                      onValueChange={(value) => updateColumn(index, 'dataType', value)}
                      disabled={!!table}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INT">INT</SelectItem>
                        <SelectItem value="BIGINT">BIGINT</SelectItem>
                        <SelectItem value="VARCHAR">VARCHAR</SelectItem>
                        <SelectItem value="TEXT">TEXT</SelectItem>
                        <SelectItem value="DATE">DATE</SelectItem>
                        <SelectItem value="DATETIME">DATETIME</SelectItem>
                        <SelectItem value="TIMESTAMP">TIMESTAMP</SelectItem>
                        <SelectItem value="BOOLEAN">BOOLEAN</SelectItem>
                        <SelectItem value="DECIMAL">DECIMAL</SelectItem>
                      </SelectContent>
                    </Select>
                    {['VARCHAR', 'CHAR'].includes(col.dataType) && (
                      <Input
                        placeholder="Length"
                        value={col.length || ''}
                        onChange={(e) => updateColumn(index, 'length', e.target.value)}
                        disabled={!!table}
                      />
                    )}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={col.nullable}
                        onCheckedChange={(checked) => updateColumn(index, 'nullable', checked)}
                        disabled={!!table}
                      />
                      <Label className="text-xs">NULL</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={col.primaryKey}
                        onCheckedChange={(checked) => updateColumn(index, 'primaryKey', checked)}
                        disabled={!!table}
                      />
                      <Label className="text-xs">PK</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={col.autoIncrement}
                        onCheckedChange={(checked) => updateColumn(index, 'autoIncrement', checked)}
                        disabled={!!table || col.dataType !== 'INT'}
                      />
                      <Label className="text-xs">AI</Label>
                    </div>
                  </div>
                  {!table && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeColumn(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SQL Preview */}
          <div className="space-y-2">
            <Label>SQL Preview</Label>
            <pre className="p-4 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
              {generateSQL()}
            </pre>
          </div>
        </div>
      </ScrollArea>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!tableName || columns.length === 0}>
          {table ? 'Show SQL' : 'Create Table'}
        </Button>
      </DialogFooter>
    </>
  );
}
