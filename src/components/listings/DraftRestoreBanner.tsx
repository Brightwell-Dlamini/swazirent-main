// src/components/listings/DraftRestoreBanner.tsx
'use client';

import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';

export function DraftRestoreBanner({
  visible,
  onRestore,
  onDiscard,
}: {
  visible: boolean;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="mb-6 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">Unfinished listing found</p>
          <p className="text-xs text-muted-foreground">
            Saved on this device. Restore to continue where you left off.
          </p>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Button type="button" size="sm" variant="outline" onClick={onDiscard}>
          Discard
        </Button>
        <Button type="button" size="sm" onClick={onRestore}>
          Restore
        </Button>
      </div>
    </div>
  );
}
