import { useState, useEffect, useMemo } from 'react';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, AlertTriangle, RefreshCw, Edit2 } from 'lucide-react';
import { DatabaseTable, TableColumn, TableConstraint } from '@/types/backup.types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type TableEditorAction = 'create' | 'update' | 'drop';

interface TableEditorProps {
  table?: DatabaseTable | null;
  /** All table names in current database (for FK referenced table dropdown) */
  tableNames?: string[];
  /** Schema/database name (Workbench-style header) */
  schemaName?: string;
  onSave: (sql: string, action: TableEditorAction) => void;
  onCancel: () => void;
}

export interface Column {
  name: string;
  dataType: string;
  length?: string;
  nullable: boolean;
  defaultValue?: string;
  autoIncrement: boolean;
  primaryKey: boolean;
  unique: boolean;
  /** When set, column has a foreign key to referencedTable.referencedColumn */
  foreignKey?: { referencedTable: string; referencedColumn: string; constraintName?: string };
}

export interface ForeignKeyConstraint {
  id: string;
  constraintName: string;
  sourceColumn: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

function colToDef(col: Column): string {
  let def = `\`${col.name.replace(/`/g, '``')}\` ${col.dataType}`;
  if (col.length && ['VARCHAR', 'CHAR'].includes(col.dataType)) {
    def += `(${col.length})`;
  }
  if (col.dataType === 'DECIMAL' && col.length) {
    def += `(${col.length})`;
  }
  if (!col.nullable) def += ' NOT NULL';
  if (col.unique) def += ' UNIQUE';
  if (col.autoIncrement) def += ' AUTO_INCREMENT';
  if (col.defaultValue !== undefined && col.defaultValue !== '') {
    const d = col.defaultValue.trim();
    if (d.toUpperCase() === 'NULL') def += ' DEFAULT NULL';
    else if (/^\d+$/.test(d)) def += ` DEFAULT ${d}`;
    else def += ` DEFAULT '${d.replace(/'/g, "''")}'`;
  }
  return def;
}

function buildCreateTable(tableName: string, columns: Column[]): string {
  const escapedTable = tableName.replace(/`/g, '``');
  const columnDefs = columns.map((col) => colToDef(col));
  const primaryKeys = columns.filter((c) => c.primaryKey).map((c) => c.name);
  if (primaryKeys.length > 0) {
    columnDefs.push(
      `  PRIMARY KEY (\`${primaryKeys.map((n) => n.replace(/`/g, '``')).join('`, `')}\`)`
    );
  }
  const fkClauses: string[] = [];
  columns.forEach((col) => {
    if (!col.foreignKey?.referencedTable || !col.foreignKey?.referencedColumn) return;
    const cname =
      col.foreignKey.constraintName ||
      `fk_${tableName}_${col.name}`.replace(/[^a-zA-Z0-9_]/g, '_');
    fkClauses.push(
      `  CONSTRAINT \`${cname}\` FOREIGN KEY (\`${col.name.replace(/`/g, '``')}\`) REFERENCES \`${col.foreignKey.referencedTable.replace(/`/g, '``')}\` (\`${col.foreignKey.referencedColumn.replace(/`/g, '``')}\`)`
    );
  });
  if (fkClauses.length) columnDefs.push(...fkClauses);
  return `CREATE TABLE \`${escapedTable}\` (\n${columnDefs.join(',\n')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
}

export function TableEditor({
  table,
  tableNames = [],
  schemaName = '',
  onSave,
  onCancel,
}: TableEditorProps) {
  const [tableName, setTableName] = useState('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [requestDrop, setRequestDrop] = useState(false);
  const [activeTab, setActiveTab] = useState('columns');
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | null>(null);
  const [foreignKeys, setForeignKeys] = useState<ForeignKeyConstraint[]>([]);
  const [fkDialogOpen, setFkDialogOpen] = useState(false);
  const [editingFk, setEditingFk] = useState<ForeignKeyConstraint | null>(null);

  const originalColumnsByName = useMemo(() => {
    if (!table?.columns?.length) return new Map<string, TableColumn>();
    const m = new Map<string, TableColumn>();
    table.columns.forEach((c) => m.set(c.name, c));
    return m;
  }, [table?.columns]);

  const originalFkByColumn = useMemo(() => {
    if (!table?.constraints) return new Map<string, TableConstraint>();
    const m = new Map<string, TableConstraint>();
    table.constraints
      .filter((c) => c.type === 'FOREIGN KEY' && c.columns?.length === 1)
      .forEach((c) => m.set(c.columns![0], c));
    return m;
  }, [table?.constraints]);

  useEffect(() => {
    if (table) {
      setTableName(table.name);
      setRequestDrop(false);
      const cols: Column[] = (table.columns || []).map((col) => {
        const fk = originalFkByColumn.get(col.name);
        return {
          name: col.name,
          dataType: col.dataType,
          length:
            col.maxLength != null
              ? String(col.maxLength)
              : col.precision != null
                ? `${col.precision}${col.scale != null ? ',' + col.scale : ''}`
                : undefined,
          nullable: col.nullable === true,
          defaultValue: col.defaultValue,
          autoIncrement: col.autoIncrement || false,
          primaryKey: col.isPrimaryKey || false,
          unique: col.isUnique || false,
          foreignKey:
            fk && fk.referencedTable && fk.referencedColumns?.[0]
              ? {
                referencedTable: fk.referencedTable,
                referencedColumn: fk.referencedColumns[0],
                constraintName: fk.name,
              }
              : undefined,
        };
      });
      setColumns(cols);
    } else {
      setTableName('');
      setRequestDrop(false);
      setColumns([
        {
          name: 'id',
          dataType: 'INT',
          nullable: false,
          autoIncrement: true,
          primaryKey: true,
          unique: false,
        },
      ]);
    }
  }, [table, originalFkByColumn]);

  const addColumn = () => {
    setColumns([
      ...columns,
      {
        name: '',
        dataType: 'VARCHAR',
        length: '255',
        nullable: true,
        autoIncrement: false,
        primaryKey: false,
        unique: false,
      },
    ]);
  };

  const removeColumn = (index: number) => {
    setColumns(columns.filter((_, i) => i !== index));
  };

  const updateColumn = (index: number, field: keyof Column, value: unknown) => {
    const updated = [...columns];
    const col = { ...updated[index], [field]: value };
    updated[index] = col;
    if (field === 'primaryKey' && value === true) {
      col.autoIncrement = col.dataType === 'INT' ? col.autoIncrement : false;
    }
    setColumns(updated);
  };

  const updateColumnFk = (
    index: number,
    value: { referencedTable: string; referencedColumn: string; constraintName?: string } | null
  ) => {
    const updated = [...columns];
    updated[index] = { ...updated[index], foreignKey: value ?? undefined };
    setColumns(updated);
  };

  const generateSQL = (): { sql: string; action: TableEditorAction } => {
    const escapedTable = tableName.replace(/`/g, '``');
    if (requestDrop && table) {
      return { sql: `DROP TABLE IF EXISTS \`${escapedTable}\`;`, action: 'drop' };
    }
    if (!table) {
      return { sql: buildCreateTable(tableName, columns), action: 'create' };
    }
    const currentNames = new Set(columns.map((c) => c.name));
    const originalNames = new Set(originalColumnsByName.keys());
    const added = columns.filter((c) => c.name && !originalNames.has(c.name));
    const dropped = [...originalNames].filter((n) => !currentNames.has(n));
    const modified = columns.filter(
      (c) =>
        c.name &&
        originalNames.has(c.name) &&
        currentNames.has(c.name)
    );
    const clauses: string[] = [];
    const fkDrops: string[] = [];
    dropped.forEach((colName) => {
      const fk = originalFkByColumn.get(colName);
      if (fk?.name) {
        fkDrops.push(`  DROP FOREIGN KEY \`${fk.name.replace(/`/g, '``')}\``);
      }
      clauses.push(`  DROP COLUMN \`${colName.replace(/`/g, '``')}\``);
    });
    modified.forEach((col) => {
      const origFk = originalFkByColumn.get(col.name);
      const hadFk = !!origFk?.name;
      const hasFk = !!(col.foreignKey?.referencedTable && col.foreignKey?.referencedColumn);
      if (hadFk && !hasFk) {
        fkDrops.push(`  DROP FOREIGN KEY \`${origFk!.name.replace(/`/g, '``')}\``);
      }
    });
    added.forEach((col) => {
      clauses.push(`  ADD COLUMN ${colToDef(col)}`);
    });
    modified.forEach((col) => {
      const orig = originalColumnsByName.get(col.name);
      if (!orig) return;
      const same =
        orig.dataType === col.dataType &&
        orig.nullable === col.nullable &&
        (orig.defaultValue ?? '') === (col.defaultValue ?? '') &&
        (orig.isPrimaryKey ?? false) === col.primaryKey &&
        (orig.autoIncrement ?? false) === col.autoIncrement &&
        String(orig.maxLength ?? '') === String(col.length ?? '');
      if (!same) {
        clauses.push(`  MODIFY COLUMN ${colToDef(col)}`);
      }
    });
    added.forEach((col) => {
      if (col.foreignKey?.referencedTable && col.foreignKey?.referencedColumn) {
        const cname =
          col.foreignKey.constraintName ||
          `fk_${tableName}_${col.name}`.replace(/[^a-zA-Z0-9_]/g, '_');
        clauses.push(
          `  ADD CONSTRAINT \`${cname}\` FOREIGN KEY (\`${col.name.replace(/`/g, '``')}\`) REFERENCES \`${col.foreignKey.referencedTable.replace(/`/g, '``')}\` (\`${col.foreignKey.referencedColumn.replace(/`/g, '``')}\`)`
        );
      }
    });
    modified.forEach((col) => {
      const hadFk = originalFkByColumn.has(col.name);
      const hasFk = !!(col.foreignKey?.referencedTable && col.foreignKey?.referencedColumn);
      if (!hadFk && hasFk) {
        const cname =
          col.foreignKey!.constraintName ||
          `fk_${tableName}_${col.name}`.replace(/[^a-zA-Z0-9_]/g, '_');
        clauses.push(
          `  ADD CONSTRAINT \`${cname}\` FOREIGN KEY (\`${col.name.replace(/`/g, '``')}\`) REFERENCES \`${col.foreignKey!.referencedTable.replace(/`/g, '``')}\` (\`${col.foreignKey!.referencedColumn.replace(/`/g, '``')}\`)`
        );
      }
    });
    if (fkDrops.length === 0 && clauses.length === 0) {
      return {
        sql: `-- No structural changes for \`${escapedTable}\`.`,
        action: 'update',
      };
    }
    const alterParts = [...fkDrops, ...clauses];
    const sql = `ALTER TABLE \`${escapedTable}\`\n${alterParts.join(',\n')};`;
    return { sql, action: 'update' };
  };

  const handleSave = () => {
    const { sql, action } = generateSQL();
    onSave(sql, action);
  };

  const { sql, action } = generateSQL();
  const canSave =
    tableName.trim() &&
    columns.length > 0 &&
    columns.every((c) => c.name.trim()) &&
    (action !== 'update' || sql.includes('ALTER TABLE') || sql.includes('DROP TABLE'));

  const isEdit = !!table;

  const selectedColumn = selectedColumnIndex != null ? columns[selectedColumnIndex] : null;

  return (
    <>
      <DialogHeader className="sr-only">
        <DialogTitle>{isEdit ? 'Edit Table' : 'Create Table'}</DialogTitle>
        <DialogDescription>
          {isEdit ? 'Add columns, drop columns, or change column definitions.' : 'Define table structure, columns, and foreign keys.'}
        </DialogDescription>
      </DialogHeader>

      {/* Workbench-style header: Name, Schema, Refresh, Apply, Revert */}
      <div className="flex flex-wrap items-center gap-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground shrink-0">Name:</Label>
          <Input
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="table_name"
            disabled={isEdit}
            className="h-8 w-48 font-mono"
          />
        </div>
        {schemaName && (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground shrink-0">Schema:</Label>
            <span className="text-sm font-mono text-muted-foreground">{schemaName}</span>
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8" onClick={onCancel}>
            Revert
          </Button>
          <Button size="sm" className="h-8" onClick={handleSave} disabled={!canSave}>
            Apply
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3">
        <TabsList className="h-9 w-full justify-start border-b border-border rounded-none bg-transparent p-0 gap-0">
          <TabsTrigger value="columns" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none">Columns</TabsTrigger>
          <TabsTrigger value="indexes" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none">Indexes</TabsTrigger>
          <TabsTrigger value="foreign-keys" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none">Foreign Keys</TabsTrigger>
          <TabsTrigger value="triggers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none">Triggers</TabsTrigger>
          <TabsTrigger value="partitioning" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none">Partitioning</TabsTrigger>
          <TabsTrigger value="options" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none">Options</TabsTrigger>
        </TabsList>

        <TabsContent value="columns" className="mt-0">
          <ScrollArea className="h-[380px] pr-2">
            {/* Column definition grid (Workbench-style) */}
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border">
                  <TableHead className="w-8 font-medium">#</TableHead>
                  <TableHead className="font-medium">Column Name</TableHead>
                  <TableHead className="font-medium">Datatype</TableHead>
                  <TableHead className="w-10 text-center font-medium">PK</TableHead>
                  <TableHead className="w-10 text-center font-medium">NN</TableHead>
                  <TableHead className="w-10 text-center font-medium">UQ</TableHead>
                  <TableHead className="w-10 text-center font-medium">AI</TableHead>
                  <TableHead className="font-medium">Default/Expression</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.map((col, index) => (
                  <TableRow
                    key={index}
                    className={cn(
                      'border-border',
                      selectedColumnIndex === index && 'bg-muted/50'
                    )}
                    onClick={() => setSelectedColumnIndex(index)}
                  >
                    <TableCell className="py-1 font-mono text-xs">{index + 1}</TableCell>
                    <TableCell className="py-1">
                      <Input
                        placeholder="name"
                        value={col.name}
                        onChange={(e) => updateColumn(index, 'name', e.target.value)}
                        className="h-7 text-xs font-mono"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      <div className="flex gap-1 items-center">
                        <Select
                          value={col.dataType}
                          onValueChange={(v) => updateColumn(index, 'dataType', v)}
                        >
                          <SelectTrigger className="h-7 text-xs font-mono w-28" onClick={(e) => e.stopPropagation()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INT">INT</SelectItem>
                            <SelectItem value="BIGINT">BIGINT</SelectItem>
                            <SelectItem value="VARCHAR">VARCHAR</SelectItem>
                            <SelectItem value="CHAR">CHAR</SelectItem>
                            <SelectItem value="TEXT">TEXT</SelectItem>
                            <SelectItem value="DATE">DATE</SelectItem>
                            <SelectItem value="DATETIME">DATETIME</SelectItem>
                            <SelectItem value="TIMESTAMP">TIMESTAMP</SelectItem>
                            <SelectItem value="BOOLEAN">BOOLEAN</SelectItem>
                            <SelectItem value="DECIMAL">DECIMAL</SelectItem>
                            <SelectItem value="FLOAT">FLOAT</SelectItem>
                            <SelectItem value="DOUBLE">DOUBLE</SelectItem>
                          </SelectContent>
                        </Select>
                        {['VARCHAR', 'CHAR'].includes(col.dataType) && (
                          <Input
                            placeholder="len"
                            value={col.length ?? ''}
                            onChange={(e) => updateColumn(index, 'length', e.target.value)}
                            className="h-7 w-14 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {col.dataType === 'DECIMAL' && (
                          <Input
                            placeholder="p,s"
                            value={col.length ?? ''}
                            onChange={(e) => updateColumn(index, 'length', e.target.value)}
                            className="h-7 w-14 text-xs"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1 text-center">
                      <Checkbox
                        checked={col.primaryKey}
                        onCheckedChange={(c) => updateColumn(index, 'primaryKey', c)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="py-1 text-center">
                      <Checkbox
                        checked={!col.nullable}
                        onCheckedChange={(c) => updateColumn(index, 'nullable', !c)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="py-1 text-center">
                      <Checkbox
                        checked={col.unique}
                        onCheckedChange={(c) => updateColumn(index, 'unique', c)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="py-1 text-center">
                      <Checkbox
                        checked={col.autoIncrement}
                        onCheckedChange={(c) => updateColumn(index, 'autoIncrement', c)}
                        disabled={col.dataType !== 'INT' && col.dataType !== 'BIGINT'}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      <Input
                        placeholder="NULL"
                        value={col.defaultValue ?? ''}
                        onChange={(e) => updateColumn(index, 'defaultValue', e.target.value)}
                        className="h-7 text-xs font-mono"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => { e.stopPropagation(); removeColumn(index); setSelectedColumnIndex(null); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={addColumn}>
              <Plus className="h-4 w-4 mr-2" />
              Add Column
            </Button>

            {/* Column Details (Workbench-style) */}
            {selectedColumn && (
              <div className="mt-4 pt-3 border-t border-border space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Column Details</p>
                {tableNames.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Label className="text-xs">Foreign Key →</Label>
                    <Select
                      value={selectedColumn.foreignKey?.referencedTable ?? '__none__'}
                      onValueChange={(v) => {
                        const idx = selectedColumnIndex!;
                        if (v === '__none__') updateColumnFk(idx, null);
                        else updateColumnFk(idx, { ...columns[idx].foreignKey, referencedTable: v, referencedColumn: columns[idx].foreignKey?.referencedColumn || 'id' });
                      }}
                    >
                      <SelectTrigger className="h-8 w-40">
                        <SelectValue placeholder="Table" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {tableNames.filter((n) => n !== tableName).map((n) => (
                          <SelectItem key={n} value={n}>{n}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedColumn.foreignKey?.referencedTable && (
                      <Input
                        placeholder="column"
                        className="h-8 w-24"
                        value={selectedColumn.foreignKey?.referencedColumn ?? ''}
                        onChange={(e) =>
                          selectedColumnIndex != null &&
                          updateColumnFk(selectedColumnIndex, { ...selectedColumn.foreignKey!, referencedColumn: e.target.value })
                        }
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {isEdit && (
              <div className="mt-4 space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <Label>Drop table</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="request-drop" checked={requestDrop} onCheckedChange={(c) => setRequestDrop(c === true)} />
                  <Label htmlFor="request-drop" className="cursor-pointer text-destructive text-sm">Drop table &quot;{tableName}&quot;</Label>
                </div>
              </div>
            )}

            <div className="mt-3">
              <Label className="text-xs text-muted-foreground">SQL Preview</Label>
              <pre className="mt-1 p-3 bg-muted rounded text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                {sql}
              </pre>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="indexes" className="mt-2">
          <p className="text-sm text-muted-foreground">Index management — add, edit, or remove indexes. (Placeholder)</p>
        </TabsContent>
        <TabsContent value="foreign-keys" className="mt-2">
          <p className="text-sm text-muted-foreground">Foreign key relationships are configured per column in the Columns tab.</p>
        </TabsContent>
        <TabsContent value="triggers" className="mt-2">
          <p className="text-sm text-muted-foreground">Triggers — define BEFORE/AFTER triggers. (Placeholder)</p>
        </TabsContent>
        <TabsContent value="partitioning" className="mt-2">
          <p className="text-sm text-muted-foreground">Partitioning — range, list, hash. (Placeholder)</p>
        </TabsContent>
        <TabsContent value="options" className="mt-2">
          <p className="text-sm text-muted-foreground">Table options — engine, charset, collation. (Placeholder)</p>
        </TabsContent>
      </Tabs>

      <DialogFooter className="mt-3 border-t pt-3">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSave} disabled={!canSave}>
          {requestDrop ? 'Drop Table' : isEdit ? 'Apply Changes' : 'Create Table'}
        </Button>
      </DialogFooter>
    </>
  );
}
