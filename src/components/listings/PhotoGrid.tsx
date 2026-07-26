// src/components/listings/PhotoGrid.tsx
'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, X, GripVertical, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoGridProps {
  previews: string[];
  max: number;
  compressing: boolean;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent) => void;
  onRemove: (index: number) => void;
  onMove: (from: number, to: number) => void;
  onSetCover: (index: number) => void;
  error?: boolean;
}

export function PhotoGrid({
  previews,
  max,
  compressing,
  onFileInput,
  onDrop,
  onRemove,
  onMove,
  onSetCover,
  error,
}: PhotoGridProps) {
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const onDragStart = (i: number) => setDragIndex(i);
  const onDragOverItem = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    setOverIndex(i);
  };
  const onDragEnd = () => {
    if (dragIndex != null && overIndex != null && dragIndex !== overIndex) {
      onMove(dragIndex, overIndex);
    }
    setDragIndex(null);
    setOverIndex(null);
  };

  const onZoneDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onZoneDragLeave = () => setDragOver(false);

  const onZoneDrop = (e: React.DragEvent) => {
    setDragOver(false);
    // If dragging internal reorder, ignore file drop
    if (dragIndex != null) return;
    onDrop(e);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={onZoneDragOver}
        onDragLeave={onZoneDragLeave}
        onDrop={onZoneDrop}
        className={cn(
          'rounded-xl border-2 border-dashed p-4 transition-colors',
          error && 'border-destructive bg-destructive/5',
          dragOver && 'border-primary bg-primary/5',
          !error && !dragOver && 'border-border'
        )}
      >
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {previews.map((src, i) => (
            <div
              key={src}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={(e) => onDragOverItem(e, i)}
              onDragEnd={onDragEnd}
              className={cn(
                'relative aspect-square rounded-lg overflow-hidden group border bg-muted cursor-grab active:cursor-grabbing',
                overIndex === i && dragIndex !== i && 'ring-2 ring-primary',
                i === 0 && 'ring-2 ring-primary/60'
              )}
            >
              <Image src={src} alt="" fill className="object-cover pointer-events-none" />
              <div className="absolute top-1 left-1 flex gap-1">
                {i === 0 ? (
                  <Badge className="text-[10px] h-5 bg-primary text-primary-foreground border-0">Cover</Badge>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSetCover(i)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded-full bg-background/90 flex items-center justify-center shadow"
                    title="Set as cover"
                  >
                    <Star className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="absolute top-1 right-1 flex gap-1">
                <span className="h-6 w-6 rounded-full bg-background/80 flex items-center justify-center opacity-70">
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onRemove(i)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {previews.length < max && (
            <label
              className={cn(
                'aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors',
                'hover:border-primary/50 hover:bg-muted/40'
              )}
            >
              {compressing ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-5 w-5 mb-1 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground text-center px-1">Add / drop</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onFileInput}
                disabled={compressing}
              />
            </label>
          )}
        </div>
        {previews.length === 0 && (
          <p className="text-center text-sm text-muted-foreground mt-3">
            Drag photos here or click Add. First photo is the cover — drag any photo to position 1 to change it.
          </p>
        )}
      </div>
      {previews.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Drag to reorder. Star or drag to first slot = cover / thumbnail.
        </p>
      )}
    </div>
  );
}
