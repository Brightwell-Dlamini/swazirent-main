import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { CITY_CENTROIDS } from '@/utils/eswatini-geo';
import { BLOG_POSTS } from '@/lib/blog';

const BASE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  'https://eswaproperty.vercel.app';

function citySlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/search`, lastModified: now, changeFrequency: 'hourly', priority: 0.95 },
    { url: `${BASE}/map`, lastModified: now, changeFrequency: 'hourly', priority: 0.85 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.55 },
    { url: `${BASE}/faqs`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/blog`, lastModified: now, changeFrequency: 'weekly', priority: 0.45 },
    { url: `${BASE}/newsletter`, lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map((p) => ({
    url: `${BASE}/blog/${p.id}`,
    lastModified: new Date(p.date),
    changeFrequency: 'monthly' as const,
    priority: 0.4,
  }));

  const cityRoutes: MetadataRoute.Sitemap = Object.keys(CITY_CENTROIDS).map((city) => ({
    url: `${BASE}/in/${citySlug(city)}`,
    lastModified: now,
    changeFrequency: 'daily' as const,
    priority: 0.75,
  }));

  let propertyRoutes: MetadataRoute.Sitemap = [];

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createClient(url, key);
      const { data } = await supabase
        .from('properties')
        .select('id, updated_at, created_at')
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(5000);

      if (data?.length) {
        propertyRoutes = data.map((p) => ({
          url: `${BASE}/properties/${p.id}`,
          lastModified: new Date(p.updated_at || p.created_at || now),
          changeFrequency: 'daily' as const,
          priority: 0.8,
        }));
      }
    }
  } catch (e) {
    console.warn('[sitemap] property fetch failed', e);
  }

  return [...staticRoutes, ...blogRoutes, ...cityRoutes, ...propertyRoutes];
}
