import { useState, useEffect } from 'react';
import type { CodeSnippet, SnippetParameter } from './types';
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
import { X } from 'lucide-react';

interface SnippetEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  snippet: CodeSnippet | null;
  onSave: (snippet: Omit<CodeSnippet, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
}

const emptySnippet = (): Omit<CodeSnippet, 'id' | 'createdAt' | 'updatedAt'> => ({
  title: '',
  description: '',
  sql: '',
  tags: [],
  parameters: [],
  isFavorite: false,
  isTemplate: false,
});

export function SnippetEditorDialog({
  open,
  onOpenChange,
  snippet,
  onSave,
}: SnippetEditorDialogProps) {
  const isEdit = !!snippet?.id;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sql, setSql] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [parameters, setParameters] = useState<SnippetParameter[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTemplate, setIsTemplate] = useState(false);

  useEffect(() => {
    if (open) {
      if (snippet) {
        setTitle(snippet.title);
        setDescription(snippet.description);
        setSql(snippet.sql);
        setTagsText(snippet.tags.join(', '));
        setParameters(snippet.parameters.length ? [...snippet.parameters] : []);
        setIsFavorite(snippet.isFavorite);
        setIsTemplate(snippet.isTemplate);
      } else {
        setTitle('');
        setDescription('');
        setSql('');
        setTagsText('');
        setParameters([]);
        setIsFavorite(false);
        setIsTemplate(false);
      }
    }
  }, [open, snippet]);

  const tags = tagsText
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const handleSave = () => {
    const now = new Date().toISOString();
    if (isEdit && snippet) {
      onSave({
        id: snippet.id,
        title: title.trim() || 'Untitled',
        description: description.trim(),
        sql: sql.trim(),
        tags,
        parameters,
        isFavorite,
        isTemplate,
        createdAt: snippet.createdAt,
        updatedAt: now,
      });
    } else {
      onSave({
        title: title.trim() || 'Untitled',
        description: description.trim(),
        sql: sql.trim(),
        tags,
        parameters,
        isFavorite,
        isTemplate,
        createdAt: now,
        updatedAt: now,
      });
    }
    onOpenChange(false);
  };

  const addParameter = () => {
    setParameters((p) => [...p, { name: '', defaultValue: '' }]);
  };

  const updateParameter = (index: number, field: 'name' | 'defaultValue', value: string) => {
    setParameters((p) => {
      const next = [...p];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const removeParameter = (index: number) => {
    setParameters((p) => p.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit snippet' : 'New snippet'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update title, SQL, tags, and parameters.'
              : 'Add a reusable SQL snippet with optional parameters and tags.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="snippet-title">Title</Label>
            <Input
              id="snippet-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. List tables"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="snippet-desc">Description (optional)</Label>
            <Input
              id="snippet-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="snippet-sql">SQL</Label>
            <Textarea
              id="snippet-sql"
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              placeholder="SELECT * FROM ..."
              className="min-h-[160px] font-mono text-sm"
            />
          </div>
          <div className="grid gap-2">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="query, reporting, admin"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Switch id="fav" checked={isFavorite} onCheckedChange={setIsFavorite} />
              <Label htmlFor="fav" className="text-sm font-normal cursor-pointer">
                Favorite
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="tpl" checked={isTemplate} onCheckedChange={setIsTemplate} />
              <Label htmlFor="tpl" className="text-sm font-normal cursor-pointer">
                Template
              </Label>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Parameters</Label>
              <Button type="button" variant="outline" size="sm" onClick={addParameter}>
                Add parameter
              </Button>
            </div>
            {parameters.length > 0 && (
              <div className="space-y-2 rounded-md border p-3 bg-muted/30">
                {parameters.map((param, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Name (e.g. @tableName)"
                      value={param.name}
                      onChange={(e) => updateParameter(i, 'name', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Default"
                      value={param.defaultValue ?? ''}
                      onChange={(e) => updateParameter(i, 'defaultValue', e.target.value)}
                      className="w-28"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-9 w-9"
                      onClick={() => removeParameter(i)}
                      aria-label="Remove parameter"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {isEdit ? 'Save changes' : 'Create snippet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
