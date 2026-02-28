import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { ServerConfig, DatabaseTable } from '@/types/backup.types';
import { Table2, Plus, Edit, Eye, Search, RefreshCw, Database, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ListOrdered, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useBackupStore } from '@/store/backupStore';
import { apiClient } from '@/services/apiClient';
import { escapeIdentifier } from '@/utils/sqlIdentifier';
import { TableEditor, type TableEditorAction } from './TableEditor';
import { DataEditor } from './DataEditor';
import { toast } from '@/hooks/use-toast';

const TABLE_DATA_PAGE_SIZE = 100;

interface TablesBrowserProps {
  server: ServerConfig;
  database: string;
  /** When set (e.g. from Database Explorer "View data"), open this table's data on load. */
  initialTableName?: string | null;
  /** Called after opening data for initialTableName (so caller can clear the initial table). */
  onTableDataOpened?: () => void;
}

export function TablesBrowser({ server, database, initialTableName, onTableDataOpened }: TablesBrowserProps) {
  const { getDatabasesForServer, loadDatabaseSchema } = useBackupStore();
  const hasOpenedInitialRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<DatabaseTable | null>(null);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [tableData, setTableData] = useState<any[] | null>(null);
  const [tableDataTotal, setTableDataTotal] = useState<number | null>(null);
  const [tableDataPage, setTableDataPage] = useState(1);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);
  const [showDataDialog, setShowDataDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditorDialog, setShowEditorDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<DatabaseTable | null>(null);
  const [showDataEditorDialog, setShowDataEditorDialog] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [rowToDelete, setRowToDelete] = useState<any | null>(null);
  const [showDeleteRowDialog, setShowDeleteRowDialog] = useState(false);
  const [showStructureDialog, setShowStructureDialog] = useState(false);
  const [structureTable, setStructureTable] = useState<DatabaseTable | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const databases = getDatabasesForServer(server.id);
  const selectedDb = databases.find(db => db.name === database);
  const tables = selectedDb?.tables || [];

  useEffect(() => {
    const fetchSchema = async () => {
      setIsLoadingSchema(true);
      await loadDatabaseSchema(server.id, database);
      setIsLoadingSchema(false);
    };
    fetchSchema();
  }, [server.id, database, loadDatabaseSchema]);

  // When opened from Database Explorer "View data", open this table's data directly
  useEffect(() => {
    if (!initialTableName || tables.length === 0 || hasOpenedInitialRef.current) return;
    const t = tables.find((x) => x.name === initialTableName);
    if (!t) return;
    hasOpenedInitialRef.current = true;
    onTableDataOpened?.();
    loadTableData(t, 1);
  }, [initialTableName, tables]);

  const filteredTables = tables.filter(table =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleTableSelection = (tableName: string) => {
    const newSelection = new Set(selectedTables);
    if (newSelection.has(tableName)) {
      newSelection.delete(tableName);
    } else {
      newSelection.add(tableName);
    }
    setSelectedTables(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedTables.size === filteredTables.length) {
      setSelectedTables(new Set());
    } else {
      setSelectedTables(new Set(filteredTables.map(table => table.name)));
    }
  };

  const loadTableData = async (table: DatabaseTable, page: number = 1) => {
    if (page === 1) {
      setSelectedTable(table);
      setTableDataPage(1);
      setShowDataDialog(true);
    }
    setIsLoadingData(true);

    try {
      const offset = (page - 1) * TABLE_DATA_PAGE_SIZE;
      const dbType = server.databaseType;
      const quotedTable = escapeIdentifier(table.name, dbType);
      if (page === 1) {
        const countResult = await apiClient.executeQuery({
          host: server.host,
          port: server.port,
          user: server.username,
          password: server.password,
          database,
          type: server.databaseType,
          query: `SELECT COUNT(*) AS total FROM ${quotedTable}`
        });
        if (countResult.success && countResult.rows?.[0]) {
          const total = Number((countResult.rows[0] as { total: number }).total);
          setTableDataTotal(Number.isFinite(total) ? total : null);
        } else {
          setTableDataTotal(null);
        }
      }

      const dataQuery = dbType === 'mssql'
        ? `SELECT * FROM ${quotedTable} ORDER BY (SELECT NULL) OFFSET ${offset} ROWS FETCH NEXT ${TABLE_DATA_PAGE_SIZE} ROWS ONLY`
        : `SELECT * FROM ${quotedTable} LIMIT ${TABLE_DATA_PAGE_SIZE} OFFSET ${offset}`;
      const result = await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query: dataQuery
      });

      if (result.success && result.rows) {
        setTableData(result.rows);
        setTableDataPage(page);
      }
    } catch (error) {
      console.error('Error loading table data:', error);
      setTableData([]);
      if (page === 1) setTableDataTotal(null);
    } finally {
      setIsLoadingData(false);
    }
  };

  const tableDataTotalPages = tableDataTotal != null ? Math.ceil(tableDataTotal / TABLE_DATA_PAGE_SIZE) : null;
  const paginationStart = (tableDataPage - 1) * TABLE_DATA_PAGE_SIZE + 1;
  const paginationEnd = tableDataTotal != null
    ? Math.min(tableDataPage * TABLE_DATA_PAGE_SIZE, tableDataTotal)
    : (tableData?.length ? paginationStart + tableData.length - 1 : paginationStart);

  const dropTableSql = (tableName: string) => {
    const quoted = escapeIdentifier(tableName, server.databaseType);
    if (server.databaseType === 'mssql') {
      return `IF OBJECT_ID('dbo.${tableName.replace(/'/g, "''")}', 'U') IS NOT NULL DROP TABLE dbo.${quoted}`;
    }
    return `DROP TABLE IF EXISTS ${quoted}`;
  };

  const handleDeleteTable = async () => {
    if (!selectedTable) return;

    try {
      const query = dropTableSql(selectedTable.name);
      await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query
      });

      toast({
        title: "Success",
        description: `Table "${selectedTable.name}" deleted successfully`,
      });

      setShowDeleteDialog(false);
      setSelectedTable(null);
      setSelectedTables((prev) => {
        const next = new Set(prev);
        if (selectedTable) next.delete(selectedTable.name);
        return next;
      });

      // Reload schema
      loadDatabaseSchema(server.id, database);
    } catch (error) {
      console.error('Error deleting table:', error);
      toast({
        title: "Error",
        description: `Failed to delete table: ${error}`,
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTables.size === 0) return;

    try {
      for (const tableName of selectedTables) {
        const query = dropTableSql(tableName);
        await apiClient.executeQuery({
          host: server.host,
          port: server.port,
          user: server.username,
          password: server.password,
          database,
          type: server.databaseType,
          query
        });
      }

      toast({
        title: "Success",
        description: `${selectedTables.size} tables deleted successfully`,
      });

      setShowBulkDeleteDialog(false);
      setSelectedTables(new Set());
      loadDatabaseSchema(server.id, database);
    } catch (error) {
      console.error('Error deleting tables:', error);
      toast({
        title: "Error",
        description: `Failed to delete tables: ${error}`,
        variant: "destructive",
      });
    }
  };

  const handleSaveTable = async (sql: string, action?: TableEditorAction) => {
    try {
      await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query: sql
      });

      if (action === 'drop' && editingTable) {
        toast({ title: "Success", description: `Table "${editingTable.name}" dropped successfully` });
        if (selectedTable?.name === editingTable.name) {
          setSelectedTable(null);
          setShowDataDialog(false);
        }
      } else {
        toast({
          title: "Success",
          description: editingTable ? `Table "${editingTable.name}" updated successfully` : "Table created successfully",
        });
      }

      setShowEditorDialog(false);
      setEditingTable(null);

      loadDatabaseSchema(server.id, database);
    } catch (error) {
      console.error('Error saving table:', error);
      toast({
        title: "Error",
        description: `Failed to save table: ${error}`,
        variant: "destructive",
      });
    }
  };

  const handleSaveRow = async (sql: string) => {
    try {
      await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query: sql
      });

      toast({
        title: "Success",
        description: editingRow ? "Row updated successfully" : "Row inserted successfully",
      });

      setShowDataEditorDialog(false);
      setEditingRow(null);

      // Reload table data
      if (selectedTable) {
        loadTableData(selectedTable);
      }
    } catch (error) {
      console.error('Error saving row:', error);
      toast({
        title: "Error",
        description: `Failed to save row: ${error}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteRow = async () => {
    if (!rowToDelete || !selectedTable) return;

    try {
      const dbType = server.databaseType;
      const esc = (n: string) => escapeIdentifier(n, dbType);
      const pkColumns = selectedTable.columns?.filter(col => col.isPrimaryKey);
      const whereClause = pkColumns && pkColumns.length > 0
        ? pkColumns.map(col => {
            const value = rowToDelete[col.name];
            if (value === null) return `${esc(col.name)} IS NULL`;
            if (['INT', 'BIGINT', 'DECIMAL', 'FLOAT', 'DOUBLE'].includes(col.dataType)) {
              return `${esc(col.name)} = ${value}`;
            }
            return `${esc(col.name)} = '${String(value).replace(/'/g, "''")}'`;
          }).join(' AND ')
        : selectedTable.columns?.map(col => {
            const value = rowToDelete[col.name];
            if (value === null) return `${esc(col.name)} IS NULL`;
            if (['INT', 'BIGINT', 'DECIMAL', 'FLOAT', 'DOUBLE'].includes(col.dataType)) {
              return `${esc(col.name)} = ${value}`;
            }
            return `${esc(col.name)} = '${String(value).replace(/'/g, "''")}'`;
          }).join(' AND ');

      const sql = `DELETE FROM ${esc(selectedTable.name)} WHERE ${whereClause}`;

      await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query: sql
      });

      toast({
        title: "Success",
        description: "Row deleted successfully",
      });

      setShowDeleteRowDialog(false);
      setRowToDelete(null);

      // Reload table data
      loadTableData(selectedTable);
    } catch (error) {
      console.error('Error deleting row:', error);
      toast({
        title: "Error",
        description: `Failed to delete row: ${error}`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Table2 className="h-5 w-5" />
                  Tables
                </CardTitle>
                <Badge variant="secondary">{tables.length}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Create table, edit table (add/drop/modify columns, foreign keys), or drop table. Use <strong>Create Table</strong> or the <strong>Edit</strong> (pencil) icon on a row.
              </p>
            </div>
            <div className="flex gap-2">
              {selectedTables.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowBulkDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete selected ({selectedTables.size})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => loadDatabaseSchema(server.id, database, true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => {
                setEditingTable(null);
                setShowEditorDialog(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Create Table
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tables..."
              value={searchQuery}
              onChange={(e: any) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tables List */}
      <Card>
        <CardContent className="p-0">
          {isLoadingSchema ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Loading tables...</p>
              <p className="text-sm text-muted-foreground mt-1">Please wait while we fetch the database schema</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={filteredTables.length > 0 && selectedTables.size === filteredTables.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all tables"
                      />
                    </TableHead>
                    <TableHead>Table Name</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Size (MB)</TableHead>
                    <TableHead>Columns</TableHead>
                    <TableHead>Engine</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTables.map((table) => (
                    <TableRow key={table.name}>
                      <TableCell className="w-10">
                        <Checkbox
                          checked={selectedTables.has(table.name)}
                          onCheckedChange={() => toggleTableSelection(table.name)}
                          aria-label={`Select ${table.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">{table.name}</TableCell>
                      <TableCell>{table.rowCount?.toLocaleString() || '-'}</TableCell>
                      <TableCell>{table.sizeInMB?.toFixed(2) || '-'}</TableCell>
                      <TableCell>{table.columns?.length || 0}</TableCell>
                      <TableCell>{table.engine || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setStructureTable(table);
                              setShowStructureDialog(true);
                            }}
                            title="View table structure"
                          >
                            <ListOrdered className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadTableData(table)}
                            title="View data"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingTable(table);
                              setShowEditorDialog(true);
                            }}
                            title="Edit table (add/drop columns, FK, or drop table)"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTable(table);
                              setShowDeleteDialog(true);
                            }}
                            title="Delete table"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTables.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {searchQuery ? 'No tables found matching your search' : 'No tables in this database'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* View Table Data Dialog */}
      <Dialog open={showDataDialog} onOpenChange={(open) => {
        setShowDataDialog(open);
        if (!open) setTableDataPage(1);
      }}>
        <DialogContent className="max-w-6xl max-h-[80vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Table Data: {selectedTable?.name}</span>
              <Button size="sm" onClick={() => {
                setEditingRow(null);
                setShowDataEditorDialog(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Insert Row
              </Button>
            </DialogTitle>
            <DialogDescription>
              {TABLE_DATA_PAGE_SIZE} records per page
              {tableDataTotal != null && ` · ${tableDataTotal.toLocaleString()} total rows`}
            </DialogDescription>
          </DialogHeader>
          {tableDataTotal != null && tableData != null && !isLoadingData && (
            <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
              <span className="text-muted-foreground tabular-nums">
                Rows {paginationStart}–{paginationEnd} of {tableDataTotal.toLocaleString()}
                {tableDataTotalPages != null && tableDataTotalPages > 1 && ` · 100 per page`}
              </span>
              {tableDataTotalPages != null && tableDataTotalPages > 1 ? (
              <div className="flex items-center gap-0.5">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={tableDataPage <= 1}
                  onClick={() => selectedTable && loadTableData(selectedTable, 1)}
                  aria-label="First page"
                >
                  <ChevronsLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={tableDataPage <= 1}
                  onClick={() => selectedTable && loadTableData(selectedTable, tableDataPage - 1)}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <span className="px-2 font-mono tabular-nums min-w-[4rem] text-center">
                  Page {tableDataPage} of {tableDataTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={tableDataPage >= tableDataTotalPages}
                  onClick={() => selectedTable && loadTableData(selectedTable, tableDataPage + 1)}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  disabled={tableDataPage >= tableDataTotalPages}
                  onClick={() => selectedTable && loadTableData(selectedTable, tableDataTotalPages)}
                  aria-label="Last page"
                >
                  <ChevronsRight className="h-3.5 w-3.5" />
                </Button>
              </div>
              ) : null}
            </div>
          )}
          {isLoadingData ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tableData && tableData.length > 0 ? (
            <ScrollArea className="h-[min(400px,50vh)] min-h-[280px] w-full shrink-0 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {selectedTable?.columns?.map((col) => (
                      <TableHead key={col.name} className="font-mono text-xs">
                        {col.name}
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row, idx) => (
                    <TableRow key={idx}>
                      {selectedTable?.columns?.map((col) => (
                        <TableCell key={col.name} className="font-mono text-xs">
                          {row[col.name] === null ? (
                            <span className="text-muted-foreground italic">NULL</span>
                          ) : (
                            String(row[col.name])
                          )}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRow(row);
                              setShowDataEditorDialog(true);
                            }}
                            title="Edit row"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRowToDelete(row);
                              setShowDeleteRowDialog(true);
                            }}
                            title="Delete row"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No data in this table</p>
              <Button className="mt-4" onClick={() => {
                setEditingRow(null);
                setShowDataEditorDialog(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Insert First Row
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Table Editor Dialog */}
      <Dialog
        open={showEditorDialog}
        onOpenChange={(open) => {
          setShowEditorDialog(open);
          if (!open) setEditingTable(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogTitle className="sr-only">Edit table</DialogTitle>
          <TableEditor
            table={editingTable}
            tableNames={tables.map((t) => t.name)}
            schemaName={database}
            onSave={handleSaveTable}
            onCancel={() => {
              setShowEditorDialog(false);
              setEditingTable(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Data Row Editor Dialog */}
      <Dialog open={showDataEditorDialog} onOpenChange={setShowDataEditorDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogTitle className="sr-only">{editingRow ? 'Edit row' : 'Insert row'}</DialogTitle>
          {selectedTable && (
            <DataEditor
              table={selectedTable}
              row={editingRow}
              databaseType={server.databaseType}
              onSave={handleSaveRow}
              onCancel={() => {
                setShowDataEditorDialog(false);
                setEditingRow(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete table confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => {
        if (!open) setShowDeleteDialog(false);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete table</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the table &quot;{selectedTable?.name}&quot;? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteTable}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete row confirmation */}
      <Dialog open={showDeleteRowDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDeleteRowDialog(false);
          setRowToDelete(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete row</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this row? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDeleteRowDialog(false); setRowToDelete(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRow}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete tables confirmation */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedTables.size} table(s)</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the selected tables? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBulkDelete}>Delete all</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table structure dialog */}
      <Dialog
        open={showStructureDialog}
        onOpenChange={(open) => {
          setShowStructureDialog(open);
          if (!open) setStructureTable(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5" />
              Table structure: {structureTable?.name}
            </DialogTitle>
            <DialogDescription>
              Columns, types, keys, and constraints for this table.
            </DialogDescription>
          </DialogHeader>
          {structureTable && (
            <ScrollArea className="flex-1 border rounded-md">
              {structureTable.columns && structureTable.columns.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-mono">Field</TableHead>
                      <TableHead className="font-mono">Type</TableHead>
                      <TableHead>Null</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead className="font-mono">Default</TableHead>
                      <TableHead>Extra</TableHead>
                      {structureTable.columns.some((c) => c.comment) && (
                        <TableHead>Comment</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {structureTable.columns.map((col) => {
                      const keys: string[] = [];
                      if (col.isPrimaryKey) keys.push('PRI');
                      if (col.isUnique && !col.isPrimaryKey) keys.push('UNI');
                      if (col.isForeignKey) keys.push('MUL');
                      const extra: string[] = [];
                      if (col.autoIncrement) extra.push('auto_increment');
                      const typeDisplay =
                        col.dataType +
                        (col.maxLength != null ? `(${col.maxLength})` : '') +
                        (col.precision != null && col.scale != null ? `(${col.precision},${col.scale})` : '') +
                        (col.precision != null && col.scale == null ? `(${col.precision})` : '');
                      return (
                        <TableRow key={col.name}>
                          <TableCell className="font-mono font-medium">{col.name}</TableCell>
                          <TableCell className="font-mono text-xs">{typeDisplay}</TableCell>
                          <TableCell>{col.nullable ? 'YES' : 'NO'}</TableCell>
                          <TableCell>{keys.length ? keys.join(', ') : '-'}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {col.defaultValue != null && col.defaultValue !== '' ? col.defaultValue : '-'}
                          </TableCell>
                          <TableCell>{extra.length ? extra.join(', ') : '-'}</TableCell>
                          {structureTable.columns!.some((c) => c.comment) && (
                            <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate" title={col.comment}>
                              {col.comment || '-'}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <p className="font-medium">No column information loaded</p>
                  <p className="text-sm mt-1">Refresh the schema to load table structure, or open Edit to see the table definition.</p>
                </div>
              )}
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
