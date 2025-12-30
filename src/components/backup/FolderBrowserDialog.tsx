import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/services/apiClient';
import { Folder, ChevronRight, Home, ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FolderBrowserDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (path: string) => void;
  initialPath?: string;
}

export function FolderBrowserDialog({
  open,
  onClose,
  onSelect,
  initialPath,
}: FolderBrowserDialogProps) {
  const [currentPath, setCurrentPath] = useState(initialPath || '');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [directories, setDirectories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPath, setSelectedPath] = useState('');
  const [pathSeparator, setPathSeparator] = useState('/');

  const loadDirectories = async (path?: string) => {
    setLoading(true);
    try {
      const result = await apiClient.browseDirectories(path);
      if (result.success) {
        setCurrentPath(result.currentPath);
        setParentPath(result.parentPath);
        setDirectories(result.directories);
        setPathSeparator(result.separator);
        setSelectedPath(result.currentPath);
      }
    } catch (error) {
      console.error('Failed to load directories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadDirectories(initialPath);
    }
  }, [open, initialPath]);

  const handleNavigate = (path: string) => {
    loadDirectories(path);
  };

  const handleGoHome = () => {
    loadDirectories();
  };

  const handleGoUp = () => {
    if (parentPath) {
      loadDirectories(parentPath);
    }
  };

  const handleSelectFolder = () => {
    onSelect(selectedPath);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[600px] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Select Backup Destination Folder</DialogTitle>
          <DialogDescription>
            Browse your file system and select a folder to save backups
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4 px-6 min-h-0">
          {/* Current Path Display */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="flex-shrink-0"
              onClick={handleGoHome}
              title="Go to home directory"
              disabled={loading}
            >
              <Home className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="flex-shrink-0"
              onClick={handleGoUp}
              title="Go up one level"
              disabled={loading || !parentPath}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Input
              value={currentPath}
              onChange={(e) => setCurrentPath(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  loadDirectories(currentPath);
                }
              }}
              className="font-mono text-sm flex-1 min-w-0"
              placeholder="Enter path..."
            />
            <Button
              variant="outline"
              className="flex-shrink-0"
              onClick={() => loadDirectories(currentPath)}
              disabled={loading}
            >
              Go
            </Button>
          </div>

          {/* Directory List */}
          <div className="border rounded-lg flex-1 min-h-0">
            <ScrollArea className="h-full">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : directories.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <p className="text-sm">No subdirectories found</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {directories.map((dir) => (
                    <button
                      key={dir.path}
                      onClick={() => setSelectedPath(dir.path)}
                      onDoubleClick={() => handleNavigate(dir.path)}
                      className={cn(
                        'w-full flex items-center gap-2 p-2.5 rounded-md hover:bg-muted transition-colors text-left',
                        selectedPath === dir.path && 'bg-primary/10 border border-primary/30'
                      )}
                    >
                      <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="text-sm flex-1 truncate">{dir.name}</span>
                      <ChevronRight
                        className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100"
                      />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Selected Path Display */}
          <div className="p-3 rounded-lg bg-muted/50 border flex-shrink-0">
            <p className="text-xs text-muted-foreground mb-1">Selected path:</p>
            <p className="text-sm font-mono font-medium break-all">{selectedPath}</p>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSelectFolder} disabled={!selectedPath}>
            Select Folder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
