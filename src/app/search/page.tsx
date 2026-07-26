import { Suspense } from 'react';
import SearchContent from './SearchContent';
import { PropertyCardSkeletonGrid } from '@/components/properties/PropertyCardSkeleton';

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">
          <div className="h-8 bg-muted rounded-md w-48 mb-2 animate-pulse" />
          <div className="h-4 bg-muted rounded-md w-72 mb-8 animate-pulse" />
          <PropertyCardSkeletonGrid count={6} />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
