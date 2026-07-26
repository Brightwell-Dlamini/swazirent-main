import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import { JsonLd } from '@/components/seo/JsonLd';
import {
  SITE_NAME,
  absoluteUrl,
  truncateMeta,
  realEstateListingJsonLd,
  breadcrumbJsonLd,
} from '@/lib/seo';

type Props = { params: Promise<{ id: string }>; children: React.ReactNode };

async function fetchProperty(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const supabase = createClient(url, key);
  const { data } = await supabase
    .from('properties')
    .select(
      'id, title, description, price, price_period, location_city, location_suburb, location_address, status, listing_intent, asset_category, bedrooms, bathrooms, latitude, longitude, created_at, updated_at, photos:property_photos(photo_url, display_order)'
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
  const p = await fetchProperty(id);

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
  const image = photos[0]?.photo_url || absoluteUrl('/og-image.svg');
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

export default async function PropertyLayout({ children, params }: Props) {
  const { id } = await params;
  const p = await fetchProperty(id);

  let listingLd: Record<string, unknown> | null = null;
  let crumbsLd: Record<string, unknown> | null = null;

  if (p && (p.status === 'active' || p.status === 'rented' || p.status === 'taken')) {
    listingLd = realEstateListingJsonLd({
      id: p.id,
      title: p.title,
      description: p.description,
      price: Number(p.price) || 0,
      price_period: p.price_period,
      location_city: p.location_city,
      location_suburb: p.location_suburb,
      location_address: p.location_address,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      status: p.status,
      photos: p.photos as { photo_url: string; display_order?: number }[] | null,
      latitude: p.latitude,
      longitude: p.longitude,
      created_at: p.created_at,
      listing_intent: p.listing_intent,
      asset_category: p.asset_category,
    });
    crumbsLd = breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Search', path: '/search' },
      {
        name: p.location_city || 'Eswatini',
        path: p.location_city
          ? `/in/${encodeURIComponent(p.location_city.toLowerCase().replace(/\s+/g, '-'))}`
          : '/search',
      },
      { name: p.title, path: `/properties/${p.id}` },
    ]);
  }

  return (
    <>
      {listingLd && <JsonLd data={listingLd} />}
      {crumbsLd && <JsonLd data={crumbsLd} />}
      {children}
    </>
  );
}
