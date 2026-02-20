import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Download,
  FileDown,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RefreshCw,
  Search,
  Database,
  Link as LinkIcon,
  Plus,
  Trash2,
  Move,
  Key,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ServerConfig, DatabaseTable, TableConstraint } from '@/types/backup.types';
import { useBackupStore } from '@/store/backupStore';
import { toast } from '@/hooks/use-toast';
import { apiClient } from '@/services/apiClient';

interface EnhancedDataModelViewerProps {
  server: ServerConfig;
  database: string;
}

interface TablePosition {
  id: string;
  x: number;
  y: number;
}

interface Relationship {
  id: string;
  fromTable: string;
  toTable: string;
  fromColumns: string[];
  toColumns: string[];
  constraintName: string;
  type: 'foreign_key';
}

export function EnhancedDataModelViewer({ server, database }: EnhancedDataModelViewerProps) {
  const { getDatabasesForServer, loadDatabaseSchema } = useBackupStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [zoom, setZoom] = useState(0.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tablePositions, setTablePositions] = useState<TablePosition[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);
  const [showAddRelationDialog, setShowAddRelationDialog] = useState(false);
  const [showDeleteRelationDialog, setShowDeleteRelationDialog] = useState(false);
  const [showRelationshipDetails, setShowRelationshipDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [highlightedTable, setHighlightedTable] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // New relationship form
  const [newRelation, setNewRelation] = useState({
    fromTable: '',
    fromColumn: '',
    toTable: '',
    toColumn: '',
  });

  const databases = getDatabasesForServer(server.id);
  const selectedDb = databases.find(db => db.name === database);
  const tables = selectedDb?.tables || [];

  // Load schema if not loaded yet
  useEffect(() => {
    if (tables.length === 0) {
      loadDatabaseSchema(server.id, database);
    }
  }, [server.id, database, tables.length, loadDatabaseSchema]);

  // Reset loading state when database changes
  useEffect(() => {
    setIsLoading(true);
    setTablePositions([]);
    setRelationships([]);
  }, [database]);

  // Debounce search to improve performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);

      // Auto-highlight and scroll to first matching table
      if (searchQuery.trim()) {
        const matchingTable = tables.find(t =>
          t.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (matchingTable) {
          setHighlightedTable(matchingTable.name);

          // Scroll to table position
          const pos = tablePositions.find(p => p.id === matchingTable.name);
          if (pos && containerRef.current) {
            const scrollX = pos.x * zoom - 200;
            const scrollY = pos.y * zoom - 200;
            containerRef.current.scrollTo({
              left: Math.max(0, scrollX),
              top: Math.max(0, scrollY),
              behavior: 'smooth'
            });
          }
        }
      } else {
        setHighlightedTable(null);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, tables, tablePositions, zoom]);

  const filteredTables = tables.filter((table: DatabaseTable) =>
    table.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  // Initialize table positions in a grid layout - instant loading
  useEffect(() => {
    if (tables.length > 0 && tablePositions.length === 0) {
      // Better initial layout with proper spacing - prevent overlapping
      const cols = Math.min(5, Math.ceil(Math.sqrt(tables.length))); // Max 5 columns
      const horizontalSpacing = 550; // Increased from 450
      const verticalSpacing = 550;   // Increased from 400
      const startX = 150;
      const startY = 150;

      const positions: TablePosition[] = tables.map((table: DatabaseTable, idx: number) => ({
        id: table.name,
        x: (idx % cols) * horizontalSpacing + startX,
        y: Math.floor(idx / cols) * verticalSpacing + startY,
      }));

      setTablePositions(positions);
    }
  }, [tables, tablePositions.length]);

  // Extract relationships from constraints - instant
  useEffect(() => {
    if (tablePositions.length > 0) {
      // Instant relationship extraction
      const rels: Relationship[] = [];

      tables.forEach((table: DatabaseTable) => {
        table.constraints?.forEach((constraint: TableConstraint) => {
          if (constraint.type === 'FOREIGN KEY' && constraint.referencedTable) {
            rels.push({
              id: `${table.name}_${constraint.name}`,
              fromTable: table.name,
              toTable: constraint.referencedTable,
              fromColumns: constraint.columns,
              toColumns: constraint.referencedColumns || ['id'],
              constraintName: constraint.name,
              type: 'foreign_key',
            });
          }
        });
      });

      setRelationships(rels);
      setIsLoading(false); // Instantly show diagram
    }
  }, [tables, tablePositions.length]);

  // Draw relationships on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to cover entire scrollable area
    canvas.width = 5000;
    canvas.height = 3000;
    canvas.style.width = '5000px';
    canvas.style.height = '3000px';

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply zoom transformation
    ctx.save();
    ctx.scale(zoom, zoom);

    // Helper function to get column Y position in table
    const getColumnYPosition = (tableName: string, columnName: string): number => {
      const table = tables.find(t => t.name === tableName);
      if (!table || !table.columns) return 60;
      const { pkColumns, fkColumns, ukColumns, regularColumns } = getColumnsByType(table);
      const allColumns = [...pkColumns, ...fkColumns, ...ukColumns, ...regularColumns];
      const columnIndex = allColumns.findIndex(col => col.name === columnName);
      if (columnIndex === -1) return 60;

      // Each column row is approximately 28px (py-1.5 px-2), header is 48px
      const headerHeight = 48;
      const rowHeight = 28;
      return headerHeight + (columnIndex * rowHeight) + (rowHeight / 2);
    };

    // Filter relationships to only show between visible tables
    const visibleTableNames = new Set(filteredTables.map(t => t.name));
    const visibleRelationships = relationships.filter(rel =>
      visibleTableNames.has(rel.fromTable) && visibleTableNames.has(rel.toTable)
    );

    // Draw relationships
    visibleRelationships.forEach(rel => {
      const fromPos = tablePositions.find(p => p.id === rel.fromTable);
      const toPos = tablePositions.find(p => p.id === rel.toTable);

      if (fromPos && toPos) {
        // Get FK column position (from table)
        const fromColumnName = rel.fromColumns[0]; // Use first FK column
        const fromY = fromPos.y + getColumnYPosition(rel.fromTable, fromColumnName);

        // Get PK column position (to table)
        const toColumnName = rel.toColumns[0]; // Use first referenced column
        const toY = toPos.y + getColumnYPosition(rel.toTable, toColumnName);

        // Connection points (right side of from table, left side of to table)
        const fromX = fromPos.x + 300;
        const toX = toPos.x;

        const isSelected = selectedRelationship?.id === rel.id;

        // Draw shadow for depth
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = isSelected ? 5 : 3;
        const midX = (fromX + toX) / 2;
        ctx.moveTo(fromX + 2, fromY + 2);
        ctx.bezierCurveTo(midX + 2, fromY + 2, midX + 2, toY + 2, toX + 2, toY + 2);
        ctx.stroke();

        // Draw main connection line with curve
        ctx.beginPath();
        ctx.strokeStyle = isSelected ? '#dc2626' : '#2563eb';
        ctx.lineWidth = isSelected ? 4 : 2.5;

        // Bezier curve for smooth connections
        ctx.moveTo(fromX, fromY);
        ctx.bezierCurveTo(midX, fromY, midX, toY, toX, toY);
        ctx.stroke();

        // Draw arrow at target (PK side)
        const angle = Math.atan2(toY - fromY, toX - fromX);
        const arrowSize = 14;
        ctx.beginPath();
        ctx.fillStyle = isSelected ? '#dc2626' : '#2563eb';
        ctx.moveTo(toX, toY);
        ctx.lineTo(
          toX - arrowSize * Math.cos(angle - Math.PI / 6),
          toY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          toX - arrowSize * Math.cos(angle + Math.PI / 6),
          toY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();

        // Draw connection point at FK column (from side)
        ctx.beginPath();
        ctx.arc(fromX, fromY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? '#dc2626' : '#3b82f6';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw connection point at PK column (to side)
        ctx.beginPath();
        ctx.arc(toX, toY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? '#dc2626' : '#f59e0b';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw FK label with background
        const labelX = (fromX + toX) / 2;
        const labelY = (fromY + toY) / 2 - 15;
        const labelText = `FK: ${rel.fromColumns.join(',')}`;

        // Label background
        ctx.font = 'bold 11px monospace';
        const textMetrics = ctx.measureText(labelText);
        const padding = 4;
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.fillRect(
          labelX - padding,
          labelY - 12,
          textMetrics.width + padding * 2,
          16
        );

        // Label border
        ctx.strokeStyle = isSelected ? '#dc2626' : '#2563eb';
        ctx.lineWidth = 1;
        ctx.strokeRect(
          labelX - padding,
          labelY - 12,
          textMetrics.width + padding * 2,
          16
        );

        // Label text
        ctx.fillStyle = isSelected ? '#dc2626' : '#1e40af';
        ctx.fillText(labelText, labelX, labelY);
      }
    });

    ctx.restore();
  }, [tablePositions, relationships, zoom, pan, selectedRelationship, tables, filteredTables]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.3));
  const handleResetZoom = () => {
    setZoom(0.8);
    setPan({ x: 0, y: 0 });
  };

  const handleFullscreen = () => {
    const element = fullscreenRef.current;
    if (!element) return;

    if (!isFullscreen) {
      if (element.requestFullscreen) {
        element.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  /** Build export canvas for PNG/PDF. Returns null if context unavailable. */
  const buildExportCanvas = (): { canvas: HTMLCanvasElement; width: number; height: number } | null => {
    const exportCanvas = document.createElement('canvas');
    const ctx = exportCanvas.getContext('2d');
    if (!ctx) return null;

    // Calculate bounds
    let minX = Infinity, minY = Infinity, maxX = 0, maxY = 0;
    filteredTables.forEach(table => {
      const pos = tablePositions.find(p => p.id === table.name);
      if (pos) {
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        const tableHeight = Math.min((table.columns?.length || 0) * 28 + 60, 600);
        maxX = Math.max(maxX, pos.x + 300);
        maxY = Math.max(maxY, pos.y + tableHeight);
      }
    });

    const padding = 150;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2 + 100;

    exportCanvas.width = width;
    exportCanvas.height = height;

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.font = 'bold 28px Arial';
    ctx.fillStyle = '#1e293b';
    ctx.fillText(`Database: ${database}`, padding, 60);
    ctx.font = '16px Arial';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`${filteredTables.length} Tables • ${relationships.length} Relationships`, padding, 90);

    // Draw relationship lines first (behind tables)
    const visibleTableNames = new Set(filteredTables.map(t => t.name));
    relationships.filter(rel => visibleTableNames.has(rel.fromTable) && visibleTableNames.has(rel.toTable))
      .forEach(rel => {
        const fromPos = tablePositions.find(p => p.id === rel.fromTable);
        const toPos = tablePositions.find(p => p.id === rel.toTable);

        if (fromPos && toPos) {
          const fromX = (fromPos.x - minX + padding) + 300;
          const fromY = (fromPos.y - minY + padding + 100) + 76;
          const toX = (toPos.x - minX + padding);
          const toY = (toPos.y - minY + padding + 100) + 62;

          ctx.beginPath();
          ctx.strokeStyle = '#2563eb';
          ctx.lineWidth = 2.5;
          const midX = (fromX + toX) / 2;
          ctx.moveTo(fromX, fromY);
          ctx.bezierCurveTo(midX, fromY, midX, toY, toX, toY);
          ctx.stroke();

          // Arrow
          const angle = Math.atan2(toY - fromY, toX - fromX);
          ctx.beginPath();
          ctx.fillStyle = '#2563eb';
          ctx.moveTo(toX, toY);
          ctx.lineTo(toX - 10 * Math.cos(angle - Math.PI / 6), toY - 10 * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(toX - 10 * Math.cos(angle + Math.PI / 6), toY - 10 * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
        }
      });

    // Draw tables
    filteredTables.forEach(table => {
      const pos = tablePositions.find(p => p.id === table.name);
      if (!pos) return;

      const x = pos.x - minX + padding;
      const y = pos.y - minY + padding + 100;
      const { pkColumns, fkColumns, ukColumns, regularColumns } = getColumnsByType(table);
      const allColumns = [...pkColumns, ...fkColumns, ...ukColumns, ...regularColumns];
      const displayColumns = allColumns.slice(0, 15); // Show first 15 columns

      // Table box
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, 300, displayColumns.length * 28 + 50);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 300, displayColumns.length * 28 + 50);

      // Header
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(x, y, 300, 40);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(table.name, x + 10, y + 26);

      // Badge
      ctx.fillStyle = '#475569';
      ctx.fillRect(x + 250, y + 10, 40, 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px Arial';
      ctx.fillText(String(table.columns?.length || 0), x + 262, y + 24);

      // Columns
      let currentY = y + 45;
      displayColumns.forEach(col => {
        if (col.isPrimaryKey) {
          ctx.fillStyle = '#fef3c7';
          ctx.fillRect(x + 5, currentY, 290, 24);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(x + 240, currentY + 4, 50, 16);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px Arial';
          ctx.fillText('PK', x + 252, currentY + 15);
        } else if (col.isForeignKey) {
          ctx.fillStyle = '#dbeafe';
          ctx.fillRect(x + 5, currentY, 290, 24);
          ctx.fillStyle = '#2563eb';
          ctx.fillRect(x + 240, currentY + 4, 50, 16);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px Arial';
          ctx.fillText('FK', x + 252, currentY + 15);
        } else if (col.isUnique) {
          ctx.fillStyle = '#d1fae5';
          ctx.fillRect(x + 5, currentY, 290, 24);
          ctx.fillStyle = '#059669';
          ctx.fillRect(x + 240, currentY + 4, 50, 16);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 10px Arial';
          ctx.fillText('UK', x + 252, currentY + 15);
        }

        ctx.fillStyle = '#1e293b';
        ctx.font = '12px monospace';
        ctx.fillText(col.name.length > 25 ? col.name.substring(0, 25) + '...' : col.name, x + 10, currentY + 16);

        currentY += 28;
      });

      if (allColumns.length > 15) {
        ctx.fillStyle = '#64748b';
        ctx.font = 'italic 11px Arial';
        ctx.fillText(`... ${allColumns.length - 15} more columns`, x + 10, currentY + 10);
      }
    });

    return { canvas: exportCanvas, width, height };
  };

  const handleDownload = () => {
    const result = buildExportCanvas();
    if (!result) return;
    const { canvas } = result;
    const link = document.createElement('a');
    link.download = `${database}_datamodel_${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast({ title: "Success", description: "Data model diagram downloaded successfully" });
  };

  const handleDownloadPdf = () => {
    const result = buildExportCanvas();
    if (!result) return;
    const { canvas, width, height } = result;
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [Math.max(width, 400), Math.max(height, 300)],
    });
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`${database}_datamodel_${new Date().toISOString().split('T')[0]}.pdf`);
    toast({ title: "Success", description: "Data model diagram exported as PDF" });
  };

  const handleMouseDown = (e: React.MouseEvent, tableId?: string) => {
    if (tableId) {
      const pos = tablePositions.find(p => p.id === tableId);
      if (pos) {
        setIsDragging(tableId);
        setDragStart({ x: e.clientX - pos.x * zoom, y: e.clientY - pos.y * zoom });
      }
    } else if (e.button === 1 || e.shiftKey) { // Middle mouse or shift+click for panning
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const newX = (e.clientX - dragStart.x) / zoom;
      const newY = (e.clientY - dragStart.y) / zoom;

      setTablePositions(prev =>
        prev.map(p =>
          p.id === isDragging ? { ...p, x: newX, y: newY } : p
        )
      );
    } else if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
    setIsPanning(false);
  };

  const handleAutoLayout = () => {
    // Better spacing: 5 columns max, prevent overlapping
    const cols = Math.min(5, Math.ceil(Math.sqrt(filteredTables.length)));
    const horizontalSpacing = 550; // More space to prevent overlap
    const verticalSpacing = 550;   // More space to prevent overlap
    const startX = 150;
    const startY = 150;

    const positions = filteredTables.map((table: DatabaseTable, idx: number) => ({
      id: table.name,
      x: (idx % cols) * horizontalSpacing + startX,
      y: Math.floor(idx / cols) * verticalSpacing + startY,
    }));
    setTablePositions(positions);

    toast({
      title: "Success",
      description: "Tables rearranged with proper spacing",
    });
  };

  const handleAddRelationship = async () => {
    if (!newRelation.fromTable || !newRelation.toTable || !newRelation.fromColumn || !newRelation.toColumn) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive",
      });
      return;
    }

    const constraintName = `fk_${newRelation.fromTable}_${newRelation.fromColumn}`;
    const sql = `ALTER TABLE \`${newRelation.fromTable}\`
      ADD CONSTRAINT \`${constraintName}\`
      FOREIGN KEY (\`${newRelation.fromColumn}\`)
      REFERENCES \`${newRelation.toTable}\`(\`${newRelation.toColumn}\`)`;

    try {
      await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query: sql,
      });

      toast({
        title: "Success",
        description: "Foreign key relationship created successfully",
      });

      setShowAddRelationDialog(false);
      setNewRelation({ fromTable: '', fromColumn: '', toTable: '', toColumn: '' });
      loadDatabaseSchema(server.id, database);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to create relationship: ${error}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteRelationship = async () => {
    if (!selectedRelationship) return;

    const sql = `ALTER TABLE \`${selectedRelationship.fromTable}\`
      DROP FOREIGN KEY \`${selectedRelationship.constraintName}\``;

    try {
      await apiClient.executeQuery({
        host: server.host,
        port: server.port,
        user: server.username,
        password: server.password,
        database,
        type: server.databaseType,
        query: sql,
      });

      toast({
        title: "Success",
        description: "Foreign key relationship deleted successfully",
      });

      setShowDeleteRelationDialog(false);
      setSelectedRelationship(null);
      loadDatabaseSchema(server.id, database);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to delete relationship: ${error}`,
        variant: "destructive",
      });
    }
  };

  const getColumnsByType = (table: DatabaseTable) => {
    const pkColumns = table.columns?.filter(col => col.isPrimaryKey) || [];
    const fkColumns = table.columns?.filter(col => col.isForeignKey && !col.isPrimaryKey) || [];
    const ukColumns = table.columns?.filter(col => col.isUnique && !col.isPrimaryKey && !col.isForeignKey) || [];
    const regularColumns = table.columns?.filter(col =>
      !col.isPrimaryKey && !col.isForeignKey && !col.isUnique
    ) || [];

    return { pkColumns, fkColumns, ukColumns, regularColumns };
  };

  // Show simple loading overlay
  if (isLoading || tables.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-32">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-xl font-semibold text-slate-900">
                  {tables.length === 0 ? 'Loading Schema...' : 'Preparing Data Model...'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {tables.length === 0
                    ? `Fetching database structure for ${database}`
                    : `Processing ${tables.length} tables`}
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-3">
                  <Database className="h-4 w-4" />
                  <span className="font-mono">{database}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div ref={fullscreenRef} className="space-y-4 bg-white">
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
                onClick={() => {
                  setIsLoading(true);
                  setTablePositions([]);
                  setRelationships([]);
                  loadDatabaseSchema(server.id, database);
                }}
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
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddRelationDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add FK
              </Button>
              <Button size="sm" variant="outline" onClick={handleFullscreen}>
                {isFullscreen ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />}
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                PNG
              </Button>
              <Button size="sm" onClick={handleDownloadPdf}>
                <FileDown className="h-4 w-4 mr-2" />
                PDF
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
            className={`relative w-full overflow-auto bg-gradient-to-br from-slate-50 to-slate-100 ${isFullscreen ? 'h-screen' : 'h-[700px]'}`}
            onMouseDown={(e) => handleMouseDown(e)}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging ? 'grabbing' : isPanning ? 'grabbing' : 'grab' }}
          >
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 pointer-events-auto cursor-pointer"
              style={{ width: '5000px', height: '3000px' }}
              onClick={(e) => {
                // Detect click on relationship line
                const rect = canvasRef.current?.getBoundingClientRect();
                if (!rect) return;

                const x = (e.clientX - rect.left + containerRef.current!.scrollLeft) / zoom;
                const y = (e.clientY - rect.top + containerRef.current!.scrollTop) / zoom;

                // Filter to only visible relationships
                const visibleTableNames = new Set(filteredTables.map(t => t.name));
                const visibleRels = relationships.filter(rel =>
                  visibleTableNames.has(rel.fromTable) && visibleTableNames.has(rel.toTable)
                );

                // Check if click is near any visible relationship line
                for (const rel of visibleRels) {
                  const fromPos = tablePositions.find(p => p.id === rel.fromTable);
                  const toPos = tablePositions.find(p => p.id === rel.toTable);

                  if (fromPos && toPos) {
                    const fromX = fromPos.x + 300;
                    const fromY = fromPos.y + 76;
                    const toX = toPos.x;
                    const toY = toPos.y + 62;

                    // Simple line distance check (within 20px)
                    const midX = (fromX + toX) / 2;
                    const midY = (fromY + toY) / 2;
                    const distance = Math.sqrt((x - midX) ** 2 + (y - midY) ** 2);

                    if (distance < 50) {
                      setSelectedRelationship(rel);
                      setShowRelationshipDetails(true);
                      break;
                    }
                  }
                }
              }}
            />

            <div
              className="relative pointer-events-none"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                minWidth: '5000px',
                minHeight: '3000px',
              }}
            >
              {filteredTables.map((table: DatabaseTable) => {
                const pos = tablePositions.find(p => p.id === table.name);
                if (!pos) return null;

                const { pkColumns, fkColumns, ukColumns, regularColumns } = getColumnsByType(table);

                const isHighlighted = highlightedTable === table.name;

                return (
                  <div
                    key={table.name}
                    className={`absolute bg-white rounded-lg shadow-xl border-2 cursor-move pointer-events-auto hover:shadow-2xl transition-all ${
                      isHighlighted ? 'border-green-500 border-4 shadow-2xl ring-4 ring-green-300' : 'border-slate-400 hover:border-blue-500'
                    }`}
                    style={{
                      left: pos.x,
                      top: pos.y,
                      width: 300,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      handleMouseDown(e, table.name);
                    }}
                  >
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-4 py-3 rounded-t-lg flex items-center justify-between border-b-2 border-slate-700">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-blue-300" />
                        <span className="font-bold text-sm tracking-wide">{table.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-xs bg-slate-700 text-white border border-slate-600">
                        {table.columns?.length || 0}
                      </Badge>
                    </div>

                    <ScrollArea className="max-h-[500px] overflow-y-auto">
                      <div className="p-2 space-y-0.5">
                        {/* Primary Keys */}
                        {pkColumns.map(col => (
                          <div
                            key={col.name}
                            className="text-xs flex items-center justify-between py-1.5 px-2 bg-amber-100 border border-amber-300 rounded shadow-sm"
                          >
                            <div className="flex items-center gap-1.5">
                              <Key className="h-3 w-3 text-amber-700" />
                              <span className="font-mono font-bold text-slate-900">{col.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="default" className="text-[10px] px-1.5 py-0.5 bg-amber-600 text-white font-semibold">
                                PK
                              </Badge>
                              <span className="text-slate-700 text-[10px] font-medium">{col.dataType}</span>
                            </div>
                          </div>
                        ))}

                        {/* Foreign Keys */}
                        {fkColumns.map(col => (
                          <div
                            key={col.name}
                            className="text-xs flex items-center justify-between py-1.5 px-2 bg-blue-100 border border-blue-300 rounded shadow-sm"
                          >
                            <div className="flex items-center gap-1.5">
                              <LinkIcon className="h-3 w-3 text-blue-700" />
                              <span className="font-mono font-semibold text-slate-900">{col.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="default" className="text-[10px] px-1.5 py-0.5 bg-blue-600 text-white font-semibold">
                                FK
                              </Badge>
                              <span className="text-slate-700 text-[10px] font-medium">{col.dataType}</span>
                            </div>
                          </div>
                        ))}

                        {/* Unique Keys */}
                        {ukColumns.map(col => (
                          <div
                            key={col.name}
                            className="text-xs flex items-center justify-between py-1.5 px-2 bg-emerald-100 border border-emerald-300 rounded shadow-sm"
                          >
                            <span className="font-mono font-semibold text-slate-900">{col.name}</span>
                            <div className="flex items-center gap-1.5">
                              <Badge variant="default" className="text-[10px] px-1.5 py-0.5 bg-emerald-600 text-white font-semibold">
                                UK
                              </Badge>
                              <span className="text-slate-700 text-[10px] font-medium">{col.dataType}</span>
                            </div>
                          </div>
                        ))}

                        {/* Regular Columns */}
                        {regularColumns.map(col => (
                          <div
                            key={col.name}
                            className="text-xs flex items-center justify-between py-1.5 px-2 hover:bg-slate-100 rounded border border-transparent hover:border-slate-300 transition-colors"
                          >
                            <span className="font-mono text-slate-800 font-medium">{col.name}</span>
                            <span className="text-slate-600 text-[10px] font-medium">{col.dataType}</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                );
              })}
            </div>

            {/* Instructions overlay */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur rounded-lg px-4 py-2 shadow-lg text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Move className="h-3 w-3" />
                <span>Drag tables to move • Shift+Drag to pan • Scroll to zoom</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Legend & Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs bg-amber-600 text-white font-semibold">PK</Badge>
              <span className="font-medium text-slate-700">Primary Key</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs bg-blue-600 text-white font-semibold">FK</Badge>
              <span className="font-medium text-slate-700">Foreign Key</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs bg-emerald-600 text-white font-semibold">UK</Badge>
              <span className="font-medium text-slate-700">Unique Key</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-1 bg-blue-600 rounded"></div>
              <span className="font-medium text-slate-700">→ Relationship Line</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const rel = relationships[0];
                if (rel) {
                  setSelectedRelationship(rel);
                  setShowDeleteRelationDialog(true);
                }
              }}
              disabled={relationships.length === 0}
              className="font-semibold"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Manage Relations
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Relationship Dialog */}
      <Dialog open={showAddRelationDialog} onOpenChange={setShowAddRelationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Foreign Key Relationship</DialogTitle>
            <DialogDescription>
              Create a foreign key constraint between two tables
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>From Table</Label>
              <Select value={newRelation.fromTable} onValueChange={(v) => setNewRelation(prev => ({ ...prev, fromTable: v, fromColumn: '' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((t: DatabaseTable) => (
                    <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Column (Foreign Key)</Label>
              <Select value={newRelation.fromColumn} onValueChange={(v) => setNewRelation(prev => ({ ...prev, fromColumn: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {tables.find((t: DatabaseTable) => t.name === newRelation.fromTable)?.columns?.map(col => (
                    <SelectItem key={col.name} value={col.name}>{col.name} ({col.dataType})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>To Table (Referenced Table)</Label>
              <Select value={newRelation.toTable} onValueChange={(v) => setNewRelation(prev => ({ ...prev, toTable: v, toColumn: '' }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select table" />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((t: DatabaseTable) => (
                    <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>To Column (Primary Key)</Label>
              <Select value={newRelation.toColumn} onValueChange={(v) => setNewRelation(prev => ({ ...prev, toColumn: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {tables.find((t: DatabaseTable) => t.name === newRelation.toTable)?.columns?.map(col => (
                    <SelectItem key={col.name} value={col.name}>{col.name} ({col.dataType})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddRelationDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRelationship}>
              <Plus className="h-4 w-4 mr-2" />
              Create Foreign Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Relationship Dialog */}
      <Dialog open={showDeleteRelationDialog} onOpenChange={setShowDeleteRelationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Foreign Key</DialogTitle>
            <DialogDescription>
              Select a foreign key relationship to delete
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {relationships.map(rel => (
                <div
                  key={rel.id}
                  className={`p-3 border rounded-lg cursor-pointer hover:bg-slate-50 ${
                    selectedRelationship?.id === rel.id ? 'bg-blue-50 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedRelationship(rel)}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <div className="font-semibold">{rel.constraintName}</div>
                      <div className="text-muted-foreground text-xs">
                        {rel.fromTable}.{rel.fromColumns.join(', ')} → {rel.toTable}.{rel.toColumns.join(', ')}
                      </div>
                    </div>
                    <LinkIcon className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              ))}
              {relationships.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No relationships found
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteRelationDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteRelationship}
              disabled={!selectedRelationship}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Foreign Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Relationship Details Dialog */}
      <Dialog open={showRelationshipDetails} onOpenChange={setShowRelationshipDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Relationship Details</DialogTitle>
            <DialogDescription>
              Foreign Key constraint information
            </DialogDescription>
          </DialogHeader>
          {selectedRelationship && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Source Table (FK)
                  </h4>
                  <p className="font-mono text-lg text-blue-700">{selectedRelationship.fromTable}</p>
                  <div className="mt-2">
                    <span className="text-sm text-blue-600">Column:</span>
                    <p className="font-mono font-bold text-blue-900">{selectedRelationship.fromColumns.join(', ')}</p>
                  </div>
                </div>

                <div className="space-y-2 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="font-semibold text-amber-900 flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Referenced Table (PK)
                  </h4>
                  <p className="font-mono text-lg text-amber-700">{selectedRelationship.toTable}</p>
                  <div className="mt-2">
                    <span className="text-sm text-amber-600">Column:</span>
                    <p className="font-mono font-bold text-amber-900">{selectedRelationship.toColumns.join(', ')}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-semibold text-slate-700 mb-2">Constraint Name</h4>
                <p className="font-mono text-slate-900">{selectedRelationship.constraintName}</p>
              </div>

              <div className="flex items-center justify-center p-4 bg-gradient-to-r from-blue-50 to-amber-50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <Database className="h-8 w-8 text-blue-600 mx-auto mb-1" />
                    <p className="text-xs font-medium text-blue-700">{selectedRelationship.fromTable}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-0.5 bg-blue-500"></div>
                    <span className="text-2xl">→</span>
                    <div className="w-16 h-0.5 bg-amber-500"></div>
                  </div>
                  <div className="text-center">
                    <Key className="h-8 w-8 text-amber-600 mx-auto mb-1" />
                    <p className="text-xs font-medium text-amber-700">{selectedRelationship.toTable}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRelationshipDetails(false)}>
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowRelationshipDetails(false);
                setShowDeleteRelationDialog(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Relationship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
