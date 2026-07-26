import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Rental tips & property guides',
  description:
    'Guides on renting and listing in Eswatini — safety tips, city guides for Manzini and Mbabane, landlord advice, and market insights from Ekhaya.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: `Blog · ${SITE_NAME}`,
    description: 'Rental tips and property guides for Eswatini.',
    url: absoluteUrl('/blog'),
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
