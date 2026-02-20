import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search } from 'lucide-react';
import { ALL_SCREEN_IDS } from '@/config/navigationConfig';
import type { ScreenId } from '@/config/navigationConfig';
import { getPageMeta } from '@/components/layout/pageConfig';

export interface ScreenSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (screenId: ScreenId) => void;
}

function matchQuery(screenId: ScreenId, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const meta = getPageMeta(screenId);
  const title = meta.title.toLowerCase();
  const desc = (meta.description ?? '').toLowerCase();
  const id = screenId.toLowerCase();
  return title.includes(q) || desc.includes(q) || id.replace(/-/g, ' ').includes(q.replace(/-/g, ' '));
}

export function ScreenSearchDialog({ open, onOpenChange, onSelect }: ScreenSearchDialogProps) {
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => {
    const list = (ALL_SCREEN_IDS as readonly ScreenId[]).filter((id) => matchQuery(id, query));
    return list.map((id) => ({ id, ...getPageMeta(id) }));
  }, [query]);

  const reset = useCallback(() => {
    setQuery('');
    setHighlightIndex(0);
  }, []);

  useEffect(() => {
    if (open) {
      reset();
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, reset]);

  useEffect(() => {
    setHighlightIndex((i) => Math.min(Math.max(0, i), Math.max(0, items.length - 1)));
  }, [items.length]);

  useEffect(() => {
    const el = listRef.current;
    if (!el || highlightIndex >= items.length) return;
    const row = el.querySelector(`[data-index="${highlightIndex}"]`);
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightIndex, items.length]);

  const handleSelect = useCallback(
    (screenId: ScreenId) => {
      onSelect(screenId);
      onOpenChange(false);
    },
    [onSelect, onOpenChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, items.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' && items[highlightIndex]) {
        e.preventDefault();
        handleSelect(items[highlightIndex].id);
        return;
      }
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    },
    [items, highlightIndex, handleSelect, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl gap-0 p-0 overflow-hidden"
        onKeyDown={handleKeyDown}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Search all screens</DialogTitle>
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden />
            <Input
              ref={inputRef}
              type="search"
              placeholder="Search all 103 screens..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 h-10 bg-muted/50 border-0 focus-visible:ring-2"
              aria-label="Search screens"
              autoComplete="off"
            />
          </div>
        </div>
        <ScrollArea className="max-h-[min(60vh,400px)]">
          <div ref={listRef} className="p-2" role="listbox" aria-label="Screens">
            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No screens match &quot;{query}&quot;
              </p>
            ) : (
              items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  data-index={index}
                  role="option"
                  aria-selected={index === highlightIndex}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                    index === highlightIndex
                      ? 'bg-primary/15 text-primary'
                      : 'hover:bg-muted/70 text-foreground'
                  }`}
                >
                  <span className="font-medium block">{item.title}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</span>
                  )}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="px-3 py-2 border-t border-border bg-muted/30 text-[11px] text-muted-foreground flex items-center justify-between">
          <span>{items.length} screen{items.length !== 1 ? 's' : ''}</span>
          <span className="hidden sm:inline">↑↓ navigate · Enter open · Esc close</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
