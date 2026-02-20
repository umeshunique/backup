import { useState, useEffect } from 'react';
import type { SavedQuery } from './types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface QueryEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: SavedQuery | null;
  onSave: (payload: Omit<SavedQuery, 'id' | 'createdAt' | 'updatedAt'> & { id?: string; createdAt?: string; updatedAt?: string }) => void;
}

export function QueryEditorDialog({
  open,
  onOpenChange,
  query,
  onSave,
}: QueryEditorDialogProps) {
  const isEdit = !!query?.id;
  const [title, setTitle] = useState('');
  const [sql, setSql] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (open) {
      if (query) {
        setTitle(query.title ?? '');
        setSql(query.sql);
        setTagsText(query.tags.join(', '));
        setIsFavorite(query.isFavorite);
      } else {
        setTitle('');
        setSql('');
        setTagsText('');
        setIsFavorite(false);
      }
    }
  }, [open, query]);

  const tags = tagsText
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const handleSave = () => {
    const now = new Date().toISOString();
    if (isEdit && query) {
      onSave({
        id: query.id,
        title: title.trim() || undefined,
        sql: sql.trim(),
        tags,
        isFavorite,
        runCount: query.runCount,
        lastRunAt: query.lastRunAt,
        createdAt: query.createdAt,
        updatedAt: now,
      });
    } else {
      onSave({
        title: title.trim() || undefined,
        sql: sql.trim(),
        tags,
        isFavorite,
        runCount: 0,
        lastRunAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    onOpenChange(false);
  };

  const valid = sql.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit saved query' : 'Add saved query'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update title, SQL, tags, or favorite.'
              : 'Save a query to history with optional title, tags, and favorite.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="qh-title">Title (optional)</Label>
            <Input
              id="qh-title"
              placeholder="e.g. Top customers by revenue"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qh-sql">SQL *</Label>
            <Textarea
              id="qh-sql"
              placeholder="SELECT ..."
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              className="min-h-[160px] font-mono text-sm"
              rows={8}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qh-tags">Tags (comma-separated)</Label>
            <Input
              id="qh-tags"
              placeholder="reporting, analytics, daily"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="qh-favorite" checked={isFavorite} onCheckedChange={setIsFavorite} />
            <Label htmlFor="qh-favorite" className="font-normal">Favorite</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!valid}>
            {isEdit ? 'Save' : 'Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
