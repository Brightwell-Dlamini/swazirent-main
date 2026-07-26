import type { MetadataRoute } from 'next';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://eswaproperty.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: BASE, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${BASE}/search`, lastModified: now, changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE}/map`, lastModified: now, changeFrequency: 'hourly', priority: 0.8 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/faqs`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];
}
