import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Search, Home } from 'lucide-react';
import { CITY_CENTROIDS } from '@/utils/eswatini-geo';
import {
  SITE_NAME,
  absoluteUrl,
  truncateMeta,
  breadcrumbJsonLd,
} from '@/lib/seo';
import { JsonLd } from '@/components/seo/JsonLd';

const CITY_LIST = Object.keys(CITY_CENTROIDS);

function resolveCity(slug: string): string | null {
  const decoded = decodeURIComponent(slug).replace(/-/g, ' ');
  const found = CITY_LIST.find((c) => c.toLowerCase() === decoded.toLowerCase());
  return found || null;
}

function citySlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, '-');
}

export function generateStaticParams() {
  return CITY_LIST.map((c) => ({ city: citySlug(c) }));
}

type Props = { params: Promise<{ city: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: slug } = await params;
  const city = resolveCity(slug);
  if (!city) return { title: 'City not found', robots: { index: false } };

  const title = `Properties in ${city}, Eswatini`;
  const description = truncateMeta(
    `Browse verified houses for rent and sale, land, and commercial space in ${city}, Eswatini on ${SITE_NAME}. Contact landlords and agents directly.`,
    160
  );

  return {
    title,
    description,
    alternates: { canonical: `/in/${citySlug(city)}` },
    openGraph: {
      title: `${title} · ${SITE_NAME}`,
      description,
      url: absoluteUrl(`/in/${citySlug(city)}`),
      locale: 'en_SZ',
      siteName: SITE_NAME,
    },
  };
}

export default async function CityLandingPage({ params }: Props) {
  const { city: slug } = await params;
  const city = resolveCity(slug);
  if (!city) notFound();

  let count = 0;
  let samples: { id: string; title: string; price: number; location_suburb: string | null }[] = [];

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createClient(url, key);
      const { count: c } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .ilike('location_city', city);
      count = c || 0;
      const { data } = await supabase
        .from('properties')
        .select('id, title, price, location_suburb')
        .eq('status', 'active')
        .ilike('location_city', city)
        .order('created_at', { ascending: false })
        .limit(6);
      samples = (data || []) as typeof samples;
    }
  } catch {
    /* ignore */
  }

  const crumbs = breadcrumbJsonLd([
    { name: 'Home', path: '/' },
    { name: 'Search', path: '/search' },
    { name: city, path: `/in/${citySlug(city)}` },
  ]);

  return (
    <main className="min-h-screen bg-background">
      <JsonLd data={crumbs} />
      <section className="border-b bg-muted/30">
        <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl">
          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <MapPin className="h-4 w-4" /> Eswatini
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Properties in {city}
          </h1>
          <p className="text-muted-foreground text-lg mb-6 max-w-2xl">
            {count > 0
              ? `${count} active listing${count === 1 ? '' : 's'} in ${city} on ${SITE_NAME}. Homes, land, and commercial space from verified posters.`
              : `Search homes, land, and commercial space in ${city}. New listings appear here as soon as they are approved.`}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href={`/search?city=${encodeURIComponent(city)}`}>
                <Search className="h-4 w-4 mr-2" />
                Search {city}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/map">
                <MapPin className="h-4 w-4 mr-2" />
                View on map
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {samples.length > 0 && (
        <section className="container mx-auto px-4 py-10 max-w-4xl">
          <h2 className="text-xl font-semibold mb-4">Recent listings in {city}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {samples.map((s) => (
              <Link key={s.id} href={`/properties/${s.id}`}>
                <Card className="hover:border-primary/40 transition-colors h-full">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Home className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {s.location_suburb ? `${s.location_suburb}, ` : ''}
                          {city}
                        </p>
                        <p className="text-sm font-semibold text-primary mt-1">
                          E{Number(s.price || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="mt-6">
            <Button variant="outline" asChild>
              <Link href={`/search?city=${encodeURIComponent(city)}`}>See all in {city}</Link>
            </Button>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 pb-16 max-w-4xl">
        <h2 className="text-lg font-semibold mb-3">Other cities</h2>
        <div className="flex flex-wrap gap-2">
          {CITY_LIST.filter((c) => c !== city).map((c) => (
            <Link
              key={c}
              href={`/in/${citySlug(c)}`}
              className="text-sm px-3 py-1.5 rounded-full border bg-card hover:border-primary/40 transition-colors"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
