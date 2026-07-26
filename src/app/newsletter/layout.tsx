import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Newsletter',
  description:
    'Get Eswatini property tips and new listing alerts from Ekhaya in your inbox.',
  alternates: { canonical: '/newsletter' },
  openGraph: {
    title: `Newsletter · ${SITE_NAME}`,
    description: 'Property tips and listing alerts for Eswatini.',
    url: absoluteUrl('/newsletter'),
  },
};

export default function NewsletterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
