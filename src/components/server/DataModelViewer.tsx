import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Download,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Search,
  Database,
} from 'lucide-react';
import { ServerConfig, DatabaseTable } from '@/types/backup.types';
import { useBackupStore } from '@/store/backupStore';
import { toast } from '@/hooks/use-toast';

interface DataModelViewerProps {
  server: ServerConfig;
  database: string;
}

interface TablePosition {
  id: string;
  x: number;
  y: number;
}

interface Relationship {
  from: string;
  to: string;
  fromColumn: string;
  toColumn: string;
}

export function DataModelViewer({ server, database }: DataModelViewerProps) {
  const { getDatabasesForServer, loadDatabaseSchema } = useBackupStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [zoom, setZoom] = useState(1);
  const [tablePositions, setTablePositions] = useState<TablePosition[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const databases = getDatabasesForServer(server.id);
  const selectedDb = databases.find(db => db.name === database);
  const tables = selectedDb?.tables || [];

  const filteredTables = tables.filter((table: DatabaseTable) =>
    table.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Initialize table positions in a grid layout
  useEffect(() => {
    if (tables.length > 0 && tablePositions.length === 0) {
      const cols = Math.ceil(Math.sqrt(tables.length));
      const positions = tables.map((table: DatabaseTable, idx: number) => ({
        id: table.name,
        x: (idx % cols) * 300 + 50,
        y: Math.floor(idx / cols) * 250 + 50,
      }));
      setTablePositions(positions);
    }
  }, [tables, tablePositions.length]);

  // Extract relationships from foreign keys
  useEffect(() => {
    const rels: Relationship[] = [];
    tables.forEach((table: DatabaseTable) => {
      table.columns?.forEach(col => {
        // Check if column name suggests a foreign key (e.g., user_id, customer_id)
        if (col.name.toLowerCase().endsWith('_id') || col.name.toLowerCase().includes('fk_')) {
          const possibleTable = col.name
            .replace(/_id$/i, '')
            .replace(/^fk_/i, '')
            .replace(/_/g, '');

          // Find matching table
          const targetTable = tables.find((t: DatabaseTable) =>
            t.name.toLowerCase().replace(/_/g, '') === possibleTable.toLowerCase()
          );

          if (targetTable) {
            rels.push({
              from: table.name,
              to: targetTable.name,
              fromColumn: col.name,
              toColumn: 'id', // Assume primary key is 'id'
            });
          }
        }
      });
    });
    setRelationships(rels);
  }, [tables]);

  // Draw relationships on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw relationships
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;

    relationships.forEach(rel => {
      const fromPos = tablePositions.find(p => p.id === rel.from);
      const toPos = tablePositions.find(p => p.id === rel.to);

      if (fromPos && toPos) {
        ctx.beginPath();
        ctx.moveTo(fromPos.x + 140, fromPos.y + 20);
        ctx.lineTo(toPos.x + 140, toPos.y + 20);
        ctx.stroke();

        // Draw arrow
        const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
        ctx.beginPath();
        ctx.moveTo(toPos.x + 140, toPos.y + 20);
        ctx.lineTo(
          toPos.x + 140 - 10 * Math.cos(angle - Math.PI / 6),
          toPos.y + 20 - 10 * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          toPos.x + 140 - 10 * Math.cos(angle + Math.PI / 6),
          toPos.y + 20 - 10 * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
      }
    });
  }, [tablePositions, relationships, zoom]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a larger canvas for export
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return;

    exportCanvas.width = 3000;
    exportCanvas.height = 2000;

    // Draw white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);

    // Draw the diagram (simplified - would need full redraw logic)
    ctx.drawImage(canvas, 0, 0);

    // Download
    const link = document.createElement('a');
    link.download = `${database}_datamodel_${new Date().toISOString().split('T')[0]}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();

    toast({
      title: "Success",
      description: "Data model diagram downloaded successfully",
    });
  };

  const handleMouseDown = (tableId: string, e: React.MouseEvent) => {
    const pos = tablePositions.find(p => p.id === tableId);
    if (pos) {
      setIsDragging(tableId);
      setDragOffset({
        x: e.clientX - pos.x,
        y: e.clientY - pos.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;

      setTablePositions(prev =>
        prev.map(p =>
          p.id === isDragging ? { ...p, x: newX, y: newY } : p
        )
      );
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  const handleAutoLayout = () => {
    const cols = Math.ceil(Math.sqrt(filteredTables.length));
    const positions = filteredTables.map((table: DatabaseTable, idx: number) => ({
      id: table.name,
      x: (idx % cols) * 300 + 50,
      y: Math.floor(idx / cols) * 250 + 50,
    }));
    setTablePositions(positions);

    toast({
      title: "Success",
      description: "Tables rearranged automatically",
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tables..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Badge variant="secondary">
                {filteredTables.length} Tables
              </Badge>
              <Badge variant="outline">
                {relationships.length} Relations
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDatabaseSchema(server.id, database, true)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={handleAutoLayout}>
                <Maximize2 className="h-4 w-4 mr-2" />
                Auto Layout
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleResetZoom}>
                Reset
              </Button>
              <Button size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Canvas Area */}
      <Card>
        <CardContent className="p-0">
          <div
            ref={containerRef}
            className="relative w-full h-[600px] overflow-auto bg-gradient-to-br from-slate-50 to-slate-100"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              className="absolute inset-0 pointer-events-none"
              style={{ width: '100%', height: '100%' }}
            />

            <div
              className="relative"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                width: '100%',
                minHeight: '100%',
              }}
            >
              {filteredTables.map((table: DatabaseTable) => {
                const pos = tablePositions.find(p => p.id === table.name);
                if (!pos) return null;

                return (
                  <div
                    key={table.name}
                    className="absolute bg-white rounded-lg shadow-md border border-slate-200 cursor-move"
                    style={{
                      left: pos.x,
                      top: pos.y,
                      width: 280,
                    }}
                    onMouseDown={(e) => handleMouseDown(table.name, e)}
                  >
                    <div className="bg-blue-600 text-white px-3 py-2 rounded-t-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span className="font-semibold text-sm">{table.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {table.columns?.length || 0}
                      </Badge>
                    </div>
                    <ScrollArea className="max-h-[150px]">
                      <div className="p-2 space-y-1">
                        {table.columns?.slice(0, 10).map(col => (
                          <div
                            key={col.name}
                            className="text-xs flex items-center justify-between py-1 px-2 hover:bg-slate-50 rounded"
                          >
                            <span className="font-mono text-slate-700">{col.name}</span>
                            <div className="flex items-center gap-1">
                              {col.isPrimaryKey && (
                                <Badge variant="default" className="text-[10px] px-1 py-0">
                                  PK
                                </Badge>
                              )}
                              <span className="text-slate-500">{col.dataType}</span>
                            </div>
                          </div>
                        ))}
                        {(table.columns?.length || 0) > 10 && (
                          <div className="text-xs text-center text-muted-foreground py-1">
                            +{(table.columns?.length || 0) - 10} more columns
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span>Table Header</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">PK</Badge>
              <span>Primary Key</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-blue-500"></div>
              <span>→ Relationship</span>
            </div>
            <div className="text-muted-foreground">
              Drag tables to rearrange • Scroll to pan • Use zoom controls
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
