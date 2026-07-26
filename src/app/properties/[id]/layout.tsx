import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { SITE_NAME, absoluteUrl, truncateMeta } from '@/lib/seo';

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

async function fetchPropertyMeta(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key);
  const { data } = await supabase
    .from('properties')
    .select(
      'id, title, description, price, price_period, location_city, location_suburb, status, listing_intent, photos:property_photos(photo_url, display_order)'
    )
    .eq('id', id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const p = await fetchPropertyMeta(id);

  if (!p || (p.status !== 'active' && p.status !== 'rented' && p.status !== 'taken')) {
    return {
      title: 'Listing not found',
      robots: { index: false, follow: false },
    };
  }

  const location = [p.location_suburb, p.location_city].filter(Boolean).join(', ');
  const intent =
    p.listing_intent === 'sale' || p.price_period === 'once' ? 'for sale' : 'for rent';
  const title = `${p.title}${location ? ` — ${location}` : ''}`;
  const description = truncateMeta(
    p.description ||
      `${p.title} ${intent} in ${location || 'Eswatini'}. Listed on ${SITE_NAME}. Price E${Number(p.price || 0).toLocaleString()}.`,
    160
  );

  const photos = ((p.photos as { photo_url: string; display_order?: number }[]) || [])
    .slice()
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const image = photos[0]?.photo_url || absoluteUrl('/icons/icon.svg');
  const canonical = `/properties/${p.id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'article',
      title,
      description,
      url: absoluteUrl(canonical),
      siteName: SITE_NAME,
      locale: 'en_SZ',
      images: [{ url: image, alt: p.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
    robots:
      p.status === 'active'
        ? { index: true, follow: true }
        : { index: false, follow: true },
  };
}

export default function PropertyLayout({ children }: Props) {
  return children;
}
