import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Map of properties in Eswatini',
  description:
    'Explore homes, land, and commercial listings on a map of Eswatini — Manzini, Mbabane, Ezulwini, Matsapha and more.',
  alternates: { canonical: '/map' },
  openGraph: {
    title: `Property map · ${SITE_NAME}`,
    description: 'Browse Eswatini property listings visually on the map.',
    url: absoluteUrl('/map'),
  },
};

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
