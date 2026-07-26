// src/app/page.tsx
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search, Home as HomeIcon, Phone, Zap, Shield, Building, Loader2,
  ArrowRight, ChevronRight, Map as MapIcon, Building2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Property } from '@/types/property';
import { mapPropertyRow } from '@/lib/mapProperty';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { EmptyState } from '@/components/ui/EmptyState';

const CITIES = [
  { name: 'Manzini', image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&auto=format&fit=crop&q=80', description: 'Commercial hub', color: '4F46E5' },
  { name: 'Mbabane', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80', description: 'Capital city', color: '7C3AED' },
  { name: 'Matsapha', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80', description: 'Industrial area', color: '059669' },
  { name: 'Nhlangano', image: 'https://images.unsplash.com/photo-1448630360428-65456885c650?w=600&auto=format&fit=crop&q=80', description: 'Southern region', color: 'D97706' },
  { name: 'Siteki', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80', description: 'Eastern region', color: 'DC2626' },
  { name: 'Big Bend', image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80', description: 'Lubombo region', color: '2563EB' },
  { name: "Pigg's Peak", image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&auto=format&fit=crop&q=80', description: 'Northern highlands', color: '8B5CF6' },
  { name: 'Mhlume', image: 'https://images.unsplash.com/photo-1448630360428-65456885c650?w=600&auto=format&fit=crop&q=80', description: 'Sugar estate', color: '0D9488' },
];

const FALLBACK_IMAGE = CITIES[0].image;

const generateBlurDataURL = (color = '4F46E5') =>
  `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40"%3E%3Crect width="40" height="40" fill="%23${color}"/%3E%3C/svg%3E`;

/** Lightweight ambient dots — respects reduced motion */
function FloatingParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let particles: { x: number; y: number; r: number; dx: number; dy: number; o: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const create = () => {
      particles = Array.from({ length: 28 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.5,
        dx: (Math.random() - 0.5) * 0.25,
        dy: (Math.random() - 0.5) * 0.25,
        o: Math.random() * 0.35 + 0.08,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${p.o})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    create();
    draw();
    const onResize = () => { resize(); create(); };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none opacity-25 dark:opacity-35" aria-hidden />;
}

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [cityStats, setCityStats] = useState<{ name: string; count: number }[]>([]);
  const [totalListings, setTotalListings] = useState(0);
  const [loading, setLoading] = useState(true);

  const cityMap = useMemo(() => {
    const map = new Map<string, (typeof CITIES)[0]>();
    CITIES.forEach((c) => map.set(c.name.toLowerCase(), c));
    return map;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [{ data: featured }, { data: all }] = await Promise.all([
          supabase
            .from('properties')
            .select(`*, landlord:profiles!properties_landlord_id_fkey (full_name, phone, is_verified), photos:property_photos (id, photo_url, caption, display_order, created_at)`)
            .eq('status', 'active')
            .order('is_featured', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(6),
          supabase.from('properties').select('location_city').eq('status', 'active'),
        ]);
        if (!mounted) return;
        setFeaturedProperties((featured || []).map(mapPropertyRow));
        setTotalListings(all?.length || 0);
        const counts: Record<string, number> = {};
        all?.forEach((row) => {
          const n = row.location_city?.trim();
          if (n) counts[n] = (counts[n] || 0) + 1;
        });
        setCityStats(
          Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
        );
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : '/search');
  };

  const getCity = useCallback(
    (name: string) => cityMap.get(name.toLowerCase()),
    [cityMap]
  );

  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative min-h-[min(88vh,720px)] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/40 via-background to-background dark:from-background dark:via-background dark:to-muted/20" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-[30%] -right-[15%] w-[55%] h-[55%] rounded-full opacity-60 dark:opacity-100"
            style={{
              background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
              filter: 'blur(72px)',
            }}
          />
          <div
            className="absolute -bottom-[25%] -left-[10%] w-[45%] h-[45%] rounded-full opacity-50 dark:opacity-80"
            style={{
              background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)',
              filter: 'blur(72px)',
            }}
          />
        </div>
        <FloatingParticles />

        <div className="container mx-auto px-4 relative z-10 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-medium text-primary mb-3 tracking-wide">Eswatini only</p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] text-foreground">
              Find your next home
              <span className="block bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 dark:from-indigo-300 dark:via-violet-300 dark:to-fuchsia-300 bg-clip-text text-transparent">
                without the tussle
              </span>
            </h1>
            <p className="mt-4 text-muted-foreground text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              Verified listings across Manzini, Mbabane, and beyond. Homes, land, and commercial — contact owners directly.
            </p>

            <form onSubmit={handleSearch} className="mt-8 max-w-xl mx-auto">
              <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-card border border-border shadow-sm focus-within:ring-2 focus-within:ring-ring/40 transition-shadow">
                <Search className="h-4 w-4 text-muted-foreground ml-3 shrink-0" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="City, suburb, or keyword…"
                  className="border-0 shadow-none focus-visible:ring-0 h-11 bg-transparent"
                  aria-label="Search listings"
                />
                <Button type="submit" className="rounded-xl h-10 px-4 shrink-0">
                  <span className="hidden sm:inline mr-1">Search</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>

            {/* Category shortcuts — zero friction */}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {[
                { href: '/search?category=residential', label: 'Homes', icon: HomeIcon },
                { href: '/search?category=land', label: 'Land', icon: MapIcon },
                { href: '/search?category=commercial', label: 'Commercial', icon: Building2 },
                { href: '/map', label: 'Map', icon: MapIcon },
              ].map(({ href, label, icon: Icon }) => (
                <Button key={href} variant="outline" size="sm" asChild className="rounded-full">
                  <Link href={href} className="gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </Link>
                </Button>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-6 md:gap-10 text-left">
              {[
                { icon: Shield, title: 'Verified posters', sub: 'Account checks before publish' },
                { icon: Phone, title: 'Direct contact', sub: 'WhatsApp or call in one tap' },
                { icon: Zap, title: 'Always local', sub: 'Built only for Eswatini' },
              ].map(({ icon: Icon, title, sub }) => (
                <div key={title} className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{title}</div>
                    <div className="text-xs text-muted-foreground">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cities */}
      {!loading && cityStats.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Browse by city</h2>
                <p className="text-sm text-muted-foreground mt-1">Where people are listing right now</p>
              </div>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/search">All listings <ChevronRight className="h-4 w-4 ml-1" /></Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {cityStats.slice(0, 8).map((city) => {
                const meta = getCity(city.name);
                return (
                  <Link
                    key={city.name}
                    href={`/search?city=${encodeURIComponent(city.name)}`}
                    className="group relative overflow-hidden rounded-2xl aspect-[4/3] shadow-sm ring-1 ring-border/60"
                  >
                    <Image
                      src={meta?.image || FALLBACK_IMAGE}
                      alt={city.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      placeholder="blur"
                      blurDataURL={generateBlurDataURL(meta?.color)}
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4 text-white">
                      <h3 className="font-semibold text-sm md:text-base">{city.name}</h3>
                      <p className="text-xs text-white/80">{city.count} listing{city.count === 1 ? '' : 's'}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="py-12 md:py-16 bg-muted/40">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center tracking-tight mb-2">Three steps</h2>
          <p className="text-center text-muted-foreground text-sm mb-10 max-w-md mx-auto">Designed to get you from search to conversation fast.</p>
          <div className="grid sm:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            {[
              { step: '1', icon: Search, title: 'Search', body: 'Filter by city, price, homes, land, or commercial.' },
              { step: '2', icon: HomeIcon, title: 'Compare', body: 'Real photos, tenure badges, and clear pricing.' },
              { step: '3', icon: Phone, title: 'Connect', body: 'WhatsApp or call the poster in one tap.' },
            ].map(({ step, icon: Icon, title, body }) => (
              <Card key={step} className="border-0 shadow-sm bg-card">
                <CardContent className="pt-6 pb-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Step {step}</p>
                  <h3 className="font-semibold text-lg mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Latest listings</h2>
              <p className="text-sm text-muted-foreground mt-1">Fresh from across the kingdom</p>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/search">View all <ChevronRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : featuredProperties.length === 0 ? (
            <EmptyState
              icon={HomeIcon}
              title="No listings yet"
              description="Be the first to post a home, plot, or commercial space."
              actionLabel="List a property"
              actionHref="/dashboard/landlord/add-property"
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {featuredProperties.map((p) => (
                <div key={p.id} className="cv-auto">
                  <PropertyCard property={p} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Poster CTA */}
      <section className="py-14 md:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-muted/50" />
        <div className="container mx-auto px-4 relative z-10 text-center max-w-lg">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">Have a place to list?</h2>
          <p className="text-muted-foreground mb-6 text-sm md:text-base leading-relaxed">
            Reach serious seekers across Eswatini. Free to start — publish when you’re verified.
          </p>
          <Button size="lg" asChild className="rounded-xl">
            <Link href="/dashboard/landlord/add-property" className="gap-2">
              <Building className="h-4 w-4" />
              List your property
            </Link>
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-t border-border">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
              <div>
                <AnimatedCounter target={totalListings} className="text-3xl font-bold text-primary" />
                <div className="text-sm text-muted-foreground mt-1">Active listings</div>
              </div>
              <div>
                <AnimatedCounter target={cityStats.length} className="text-3xl font-bold text-primary" />
                <div className="text-sm text-muted-foreground mt-1">Cities</div>
              </div>
              <div className="col-span-2 md:col-span-1">
                <div className="text-3xl font-bold text-primary">1 tap</div>
                <div className="text-sm text-muted-foreground mt-1">To WhatsApp the poster</div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
