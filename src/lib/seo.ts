// src/lib/seo.ts
// Central SEO constants + JSON-LD builders for Ekhaya (Eswatini)

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://eswaproperty.vercel.app';

export const SITE_NAME = 'Ekhaya';
export const SITE_TAGLINE = 'Homes, land & commercial space in Eswatini';
export const SITE_DESCRIPTION =
  'Find verified homes for rent and sale, residential plots, agricultural land, and commercial space across Eswatini. Search Manzini, Mbabane, Ezulwini, Matsapha and more — contact landlords and agents directly.';

export const SITE_KEYWORDS = [
  'Eswatini property',
  'houses for rent Eswatini',
  'houses for sale Eswatini',
  'Manzini rentals',
  'Mbabane apartments',
  'Ezulwini houses',
  'Matsapha property',
  'land for sale Eswatini',
  'agricultural land Swaziland',
  'commercial property Eswatini',
  'Ekhaya',
  'verified landlords Eswatini',
  'rentals Manzini',
  'rentals Mbabane',
];

export function absoluteUrl(path = ''): string {
  if (!path) return SITE_URL;
  if (path.startsWith('http')) return path;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function truncateMeta(text: string, max = 155): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd() + '…';
}

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/icons/icon.svg'),
    description: SITE_DESCRIPTION,
    areaServed: {
      '@type': 'Country',
      name: 'Eswatini',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: ['English', 'siSwati'],
      url: absoluteUrl('/contact'),
    },
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: 'en-SZ',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export type ListingJsonInput = {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  price_period?: string | null;
  location_city?: string | null;
  location_suburb?: string | null;
  location_address?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  status?: string | null;
  photos?: { photo_url: string; display_order?: number }[] | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  listing_intent?: string | null;
  asset_category?: string | null;
};

export function realEstateListingJsonLd(p: ListingJsonInput) {
  const images = (p.photos || [])
    .slice()
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((ph) => ph.photo_url)
    .filter(Boolean);

  const isSale = p.listing_intent === 'sale' || p.price_period === 'once';
  const addressLocality = [p.location_suburb, p.location_city].filter(Boolean).join(', ');

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: p.title,
    description: truncateMeta(p.description || p.title, 300),
    url: absoluteUrl(`/properties/${p.id}`),
    datePosted: p.created_at || undefined,
    image: images.length ? images : [absoluteUrl('/icons/icon.svg')],
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'SZL',
      availability:
        p.status === 'active'
          ? 'https://schema.org/InStock'
          : 'https://schema.org/SoldOut',
      url: absoluteUrl(`/properties/${p.id}`),
      ...(isSale
        ? {}
        : {
            priceSpecification: {
              '@type': 'UnitPriceSpecification',
              price: p.price,
              priceCurrency: 'SZL',
              unitText: p.price_period === 'week' ? 'WEEK' : 'MONTH',
            },
          }),
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: addressLocality || p.location_city || 'Eswatini',
      addressRegion: p.location_city || undefined,
      streetAddress: p.location_address || undefined,
      addressCountry: 'SZ',
    },
    ...(p.latitude && p.longitude
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: p.latitude,
            longitude: p.longitude,
          },
        }
      : {}),
    ...(p.bedrooms != null ? { numberOfRooms: p.bedrooms } : {}),
    ...(p.bathrooms != null ? { numberOfBathroomsTotal: p.bathrooms } : {}),
  };
}

export function faqPageJsonLd(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}
