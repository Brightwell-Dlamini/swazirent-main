import type { Metadata } from 'next';
import { SITE_NAME, absoluteUrl, faqPageJsonLd } from '@/lib/seo';
import { allFaqPairs } from '@/lib/faqs';
import { JsonLd } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Frequently asked questions',
  description:
    "Answers about renting, buying, listing property, verification, and safety on Ekhaya — Eswatini's property marketplace.",
  alternates: { canonical: '/faqs' },
  openGraph: {
    title: `FAQs · ${SITE_NAME}`,
    description: 'Common questions about finding and listing property on Ekhaya.',
    url: absoluteUrl('/faqs'),
  },
};

export default function FaqsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={faqPageJsonLd(allFaqPairs())} />
      {children}
    </>
  );
}
