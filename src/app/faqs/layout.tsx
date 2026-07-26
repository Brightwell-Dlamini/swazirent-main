import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Frequently asked questions',
  description:
    'Answers about renting, buying, listing property, verification, and safety on Ekhaya — Eswatini\'s property marketplace.',
  alternates: { canonical: '/faqs' },
  openGraph: {
    title: `FAQs · ${SITE_NAME}`,
    description: 'Common questions about finding and listing property on Ekhaya.',
    url: absoluteUrl('/faqs'),
  },
};

export default function FaqsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
