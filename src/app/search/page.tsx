import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchContent from './SearchContent';
import { PropertyCardSkeletonGrid } from '@/components/properties/PropertyCardSkeleton';
import { SITE_NAME, absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Search properties in Eswatini',
  description:
    'Browse verified houses for rent and sale, land, and commercial space across Manzini, Mbabane, Ezulwini, Matsapha and all of Eswatini. Filter by price, bedrooms, and location.',
  alternates: { canonical: '/search' },
  openGraph: {
    title: `Search properties · ${SITE_NAME}`,
    description:
      'Verified homes, land and commercial listings across Eswatini. Filter by city, price and type.',
    url: absoluteUrl('/search'),
  },
};

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
