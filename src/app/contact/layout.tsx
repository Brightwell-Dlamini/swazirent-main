import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Contact us',
  description:
    'Get in touch with the Ekhaya team for support with listings, verification, or partnerships across Eswatini.',
  alternates: { canonical: '/contact' },
  openGraph: {
    title: `Contact · ${SITE_NAME}`,
    description: 'Support and enquiries for Ekhaya property seekers and landlords.',
    url: absoluteUrl('/contact'),
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
