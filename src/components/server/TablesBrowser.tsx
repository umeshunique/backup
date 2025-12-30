import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Table2, Plus, Edit, Trash2, Eye, Search, RefreshCw, Database } from 'lucide-react';
import { useBackupStore } from '@/store/backupStore';
import { apiClient } from '@/services/apiClient';
import { TableEditor } from './TableEditor';
import { DataEditor } from './DataEditor';
import { toast } from '@/hooks/use-toast';

interface TablesBrowserProps {
  server: ServerConfig;
  database: string;
}

export function TablesBrowser({ server, database }: TablesBrowserProps) {
  const { getDatabasesForServer, loadDatabaseSchema } = useBackupStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTable, setSelectedTable] = useState<DatabaseTable | null>(null);
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [tableData, setTableData] = useState<any[] | null>(null);
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

  const loadTableData = async (table: DatabaseTable) => {
    setSelectedTable(table);
    setIsLoadingData(true);
    setShowDataDialog(true);

    try {
      const result = await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query: `SELECT * FROM \`${table.name}\` LIMIT 100`
      });

      if (result.success && result.rows) {
        setTableData(result.rows);
      }
    } catch (error) {
      console.error('Error loading table data:', error);
      setTableData([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleDeleteTable = async () => {
    if (!selectedTable) return;

    try {
      await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query: `DROP TABLE IF EXISTS \`${selectedTable.name}\``
      });

      toast({
        title: "Success",
        description: `Table "${selectedTable.name}" deleted successfully`,
      });

      setShowDeleteDialog(false);
      setSelectedTable(null);

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
        await apiClient.executeQuery({
          host: server.host,
          port: server.port,
          user: server.username,
          password: server.password,
          database,
          type: server.databaseType,
          query: `DROP TABLE IF EXISTS \`${tableName}\``
        });
      }

      toast({
        title: "Success",
        description: `${selectedTables.size} tables deleted successfully`,
      });

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

  const handleSaveTable = async (sql: string) => {
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
        description: editingTable ? `Table "${editingTable.name}" updated successfully` : "Table created successfully",
      });

      setShowEditorDialog(false);
      setEditingTable(null);

      // Reload schema
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
      // Build WHERE clause
      const pkColumns = selectedTable.columns?.filter(col => col.primaryKey);
      const whereClause = pkColumns && pkColumns.length > 0
        ? pkColumns.map(col => {
            const value = rowToDelete[col.name];
            if (value === null) return `\`${col.name}\` IS NULL`;
            if (['INT', 'BIGINT', 'DECIMAL', 'FLOAT', 'DOUBLE'].includes(col.dataType)) {
              return `\`${col.name}\` = ${value}`;
            }
            return `\`${col.name}\` = '${String(value).replace(/'/g, "''")}'`;
          }).join(' AND ')
        : selectedTable.columns?.map(col => {
            const value = rowToDelete[col.name];
            if (value === null) return `\`${col.name}\` IS NULL`;
            if (['INT', 'BIGINT', 'DECIMAL', 'FLOAT', 'DOUBLE'].includes(col.dataType)) {
              return `\`${col.name}\` = ${value}`;
            }
            return `\`${col.name}\` = '${String(value).replace(/'/g, "''")}'`;
          }).join(' AND ');

      const sql = `DELETE FROM \`${selectedTable.name}\` WHERE ${whereClause}`;

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="flex items-center gap-2">
                <Table2 className="h-5 w-5" />
                Tables
              </CardTitle>
              <Badge variant="secondary">{tables.length}</Badge>
              {selectedTables.size > 0 && (
                <Badge variant="default">{selectedTables.size} selected</Badge>
              )}
            </div>
            <div className="flex gap-2">
              {selectedTables.size > 0 && (
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedTables.size})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => loadDatabaseSchema(server.id, database)}>
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
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTables.size === filteredTables.length && filteredTables.length > 0}
                        onCheckedChange={toggleSelectAll}
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
                    <TableRow key={table.name} className={selectedTables.has(table.name) ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTables.has(table.name)}
                          onCheckedChange={() => toggleTableSelection(table.name)}
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
                            onClick={() => loadTableData(table)}
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
      <Dialog open={showDataDialog} onOpenChange={setShowDataDialog}>
        <DialogContent className="max-w-6xl max-h-[80vh]">
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
              Showing first 100 rows
            </DialogDescription>
          </DialogHeader>
          {isLoadingData ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : tableData && tableData.length > 0 ? (
            <ScrollArea className="h-[400px]">
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Table</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete table "{selectedTable?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTable}>
              Delete Table
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Table Editor Dialog */}
      <Dialog open={showEditorDialog} onOpenChange={setShowEditorDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <TableEditor
            table={editingTable}
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
        <DialogContent className="max-w-2xl">
          {selectedTable && (
            <DataEditor
              table={selectedTable}
              row={editingRow}
              onSave={handleSaveRow}
              onCancel={() => {
                setShowDataEditorDialog(false);
                setEditingRow(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Row Confirmation Dialog */}
      <Dialog open={showDeleteRowDialog} onOpenChange={setShowDeleteRowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Row</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this row? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteRowDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRow}>
              Delete Row
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
