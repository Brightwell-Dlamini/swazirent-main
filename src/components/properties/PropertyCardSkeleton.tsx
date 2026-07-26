// src/components/properties/PropertyCardSkeleton.tsx
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function PropertyCardSkeleton({ viewMode = 'grid' }: { viewMode?: 'grid' | 'list' }) {
  if (viewMode === 'list') {
    return (
      <Card className="overflow-hidden border-border/80">
        <div className="flex flex-col sm:flex-row">
          <div className="w-full sm:w-48 h-44 sm:min-h-[9rem] bg-muted animate-pulse shrink-0" />
          <CardContent className="p-3.5 flex-1 space-y-3">
            <div className="flex justify-between gap-3">
              <div className="h-5 bg-muted rounded w-2/3 animate-pulse" />
              <div className="h-5 bg-muted rounded w-16 animate-pulse" />
            </div>
            <div className="h-3 bg-muted rounded w-1/2 animate-pulse" />
            <div className="h-3 bg-muted rounded w-1/3 animate-pulse" />
            <div className="h-3 bg-muted rounded w-full animate-pulse" />
          </CardContent>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden h-full border-border/80">
      <div className="h-44 bg-muted animate-pulse" />
      <CardContent className="p-3.5 space-y-3">
        <div className="flex justify-between gap-2">
          <div className="h-5 bg-muted rounded flex-1 animate-pulse" />
          <div className="h-5 bg-muted rounded w-16 shrink-0 animate-pulse" />
        </div>
        <div className="h-3 bg-muted rounded w-3/5 animate-pulse" />
        <div className="flex gap-3">
          <div className="h-3 bg-muted rounded w-10 animate-pulse" />
          <div className="h-3 bg-muted rounded w-10 animate-pulse" />
        </div>
        <div className="pt-2.5 border-t border-border flex justify-between">
          <div className="h-3 bg-muted rounded w-8 animate-pulse" />
          <div className="h-3 bg-muted rounded w-16 animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

export function PropertyCardSkeletonGrid({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn('grid md:grid-cols-2 lg:grid-cols-3 gap-5', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}
