import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'About Ekhaya',
  description:
    'Ekhaya is Eswatini\'s trusted property marketplace — verified landlords, transparent listings, and homes across Manzini, Mbabane, and beyond.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: `About · ${SITE_NAME}`,
    description: 'How Ekhaya makes finding and listing property in Eswatini safer and simpler.',
    url: absoluteUrl('/about'),
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
