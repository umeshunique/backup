import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { ServerConfig } from '@/types/backup.types';
import { Plus, Edit, Trash2, Eye, Search, RefreshCw, Code2 } from 'lucide-react';
import { useBackupStore } from '@/store/backupStore';
import { apiClient } from '@/services/apiClient';
import { toast } from '@/hooks/use-toast';

interface ObjectBrowserProps {
  server: ServerConfig;
  database: string;
  objectType: 'procedures' | 'views' | 'functions' | 'triggers';
  title: string;
  icon: string;
}

export function ObjectBrowser({ server, database, objectType, title }: ObjectBrowserProps) {
  const { getDatabasesForServer, loadDatabaseSchema } = useBackupStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedObject, setSelectedObject] = useState<any | null>(null);
  const [selectedObjects, setSelectedObjects] = useState<Set<string>>(new Set());
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [createSQL, setCreateSQL] = useState('');
  const [editSQL, setEditSQL] = useState('');
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);

  const databases = getDatabasesForServer(server.id);
  const selectedDb = databases.find(db => db.name === database);
  const objects = selectedDb?.[objectType] || [];

  useEffect(() => {
    const fetchSchema = async () => {
      setIsLoadingSchema(true);
      await loadDatabaseSchema(server.id, database);
      setIsLoadingSchema(false);
    };
    fetchSchema();
  }, [server.id, database, loadDatabaseSchema]);

  const filteredObjects = objects.filter((obj: any) =>
    obj.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleObjectSelection = (objectName: string) => {
    const newSelection = new Set(selectedObjects);
    if (newSelection.has(objectName)) {
      newSelection.delete(objectName);
    } else {
      newSelection.add(objectName);
    }
    setSelectedObjects(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedObjects.size === filteredObjects.length) {
      setSelectedObjects(new Set());
    } else {
      setSelectedObjects(new Set(filteredObjects.map(obj => obj.name)));
    }
  };

  const handleDelete = async () => {
    if (!selectedObject) return;

    const objectTypeMap = {
      procedures: 'PROCEDURE',
      views: 'VIEW',
      functions: 'FUNCTION',
      triggers: 'TRIGGER'
    };

    try {
      await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query: `DROP ${objectTypeMap[objectType]} IF EXISTS \`${selectedObject.name}\``
      });

      toast({
        title: "Success",
        description: `${title.slice(0, -1)} "${selectedObject.name}" deleted successfully`,
      });

      setShowDeleteDialog(false);
      setSelectedObject(null);
      loadDatabaseSchema(server.id, database);
    } catch (error) {
      console.error(`Error deleting ${objectType}:`, error);
      toast({
        title: "Error",
        description: `Failed to delete ${objectType.slice(0, -1)}: ${error}`,
        variant: "destructive",
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedObjects.size === 0) return;

    const objectTypeMap = {
      procedures: 'PROCEDURE',
      views: 'VIEW',
      functions: 'FUNCTION',
      triggers: 'TRIGGER'
    };

    try {
      for (const objectName of selectedObjects) {
        await apiClient.executeQuery({
          host: server.host,
          port: server.port,
          user: server.username,
          password: server.password,
          database,
          type: server.databaseType,
          query: `DROP ${objectTypeMap[objectType]} IF EXISTS \`${objectName}\``
        });
      }

      toast({
        title: "Success",
        description: `${selectedObjects.size} ${objectType} deleted successfully`,
      });

      setSelectedObjects(new Set());
      loadDatabaseSchema(server.id, database);
    } catch (error) {
      console.error(`Error deleting ${objectType}:`, error);
      toast({
        title: "Error",
        description: `Failed to delete ${objectType}: ${error}`,
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!editSQL.trim() || !selectedObject) return;

    const objectTypeMap = {
      procedures: 'PROCEDURE',
      views: 'VIEW',
      functions: 'FUNCTION',
      triggers: 'TRIGGER'
    };

    try {
      // First drop the existing object
      await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query: `DROP ${objectTypeMap[objectType]} IF EXISTS \`${selectedObject.name}\``
      });

      // Then create with new definition
      await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query: editSQL
      });

      toast({
        title: "Success",
        description: `${title.slice(0, -1)} "${selectedObject.name}" updated successfully`,
      });

      setShowEditDialog(false);
      setEditSQL('');
      setSelectedObject(null);
      loadDatabaseSchema(server.id, database);
    } catch (error) {
      console.error(`Error editing ${objectType}:`, error);
      toast({
        title: "Error",
        description: `Failed to edit ${objectType.slice(0, -1)}: ${error}`,
        variant: "destructive",
      });
    }
  };

  const handleCreate = async () => {
    if (!createSQL.trim()) return;

    try {
      await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query: createSQL
      });

      toast({
        title: "Success",
        description: `${title.slice(0, -1)} created successfully`,
      });

      setShowCreateDialog(false);
      setCreateSQL('');
      loadDatabaseSchema(server.id, database);
    } catch (error) {
      console.error(`Error creating ${objectType}:`, error);
      toast({
        title: "Error",
        description: `Failed to create ${objectType.slice(0, -1)}: ${error}`,
        variant: "destructive",
      });
    }
  };

  const getCreateTemplate = () => {
    switch (objectType) {
      case 'procedures':
        return `CREATE PROCEDURE procedure_name(IN param1 VARCHAR(255))
BEGIN
    -- Your SQL statements here
    SELECT * FROM table_name WHERE column = param1;
END;`;
      case 'views':
        return `CREATE VIEW view_name AS
SELECT column1, column2
FROM table_name
WHERE condition;`;
      case 'functions':
        return `CREATE FUNCTION function_name(param1 INT)
RETURNS INT
DETERMINISTIC
BEGIN
    DECLARE result INT;
    -- Your logic here
    RETURN result;
END;`;
      case 'triggers':
        return `CREATE TRIGGER trigger_name
BEFORE INSERT ON table_name
FOR EACH ROW
BEGIN
    -- Your trigger logic here
END;`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>{title}</CardTitle>
              <Badge variant="secondary">{objects.length}</Badge>
              {selectedObjects.size > 0 && (
                <Badge variant="default">{selectedObjects.size} selected</Badge>
              )}
            </div>
            <div className="flex gap-2">
              {selectedObjects.size > 0 && (
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedObjects.size})
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => loadDatabaseSchema(server.id, database)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button size="sm" onClick={() => {
                setCreateSQL(getCreateTemplate());
                setShowCreateDialog(true);
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Create {title.slice(0, -1)}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Objects List */}
      <Card>
        <CardContent className="p-0">
          {isLoadingSchema ? (
            <div className="flex flex-col items-center justify-center py-16">
              <RefreshCw className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Loading {title.toLowerCase()}...</p>
              <p className="text-sm text-muted-foreground mt-1">Please wait while we fetch the database schema</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedObjects.size === filteredObjects.length && filteredObjects.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredObjects.map((obj: any) => (
                    <TableRow key={obj.name} className={selectedObjects.has(obj.name) ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={selectedObjects.has(obj.name)}
                          onCheckedChange={() => toggleObjectSelection(obj.name)}
                        />
                      </TableCell>
                      <TableCell className="font-mono font-medium">{obj.name}</TableCell>
                      <TableCell>{obj.type || objectType.slice(0, -1)}</TableCell>
                      <TableCell>
                        {obj.lastModified ? new Date(obj.lastModified).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedObject(obj);
                              setShowViewDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedObject(obj);
                              setEditSQL(obj.definition || getCreateTemplate());
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedObject(obj);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredObjects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        {searchQuery ? `No ${title.toLowerCase()} found matching your search` : `No ${title.toLowerCase()} in this database`}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* View Definition Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5" />
              {selectedObject?.name}
            </DialogTitle>
            <DialogDescription>
              Definition
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            <pre className="p-4 bg-muted rounded-lg font-mono text-sm">
              {selectedObject?.definition || 'No definition available'}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Create {title.slice(0, -1)}</DialogTitle>
            <DialogDescription>
              Enter SQL to create a new {objectType.slice(0, -1)}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={createSQL}
            onChange={(e) => setCreateSQL(e.target.value)}
            className="font-mono min-h-[300px]"
            placeholder={`Enter CREATE ${objectType.toUpperCase()} statement...`}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit {title.slice(0, -1)}: {selectedObject?.name}</DialogTitle>
            <DialogDescription>
              Modify the SQL definition for this {objectType.slice(0, -1)}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={editSQL}
            onChange={(e) => setEditSQL(e.target.value)}
            className="font-mono min-h-[300px]"
            placeholder={`Enter CREATE ${objectType.toUpperCase()} statement...`}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {title.slice(0, -1)}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedObject?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
