// src/app/page.tsx
'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Home as HomeIcon,
  CheckCircle,
  Phone,
  Zap,
  Shield,
  MapPin,
  Building,
  Loader2,
  Sparkles,
  ArrowRight,
  Star,
  ChevronRight,
  Users,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Property } from '@/types/property';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { formatPrice } from '@/lib/utils';

// City metadata with reliable images from Unsplash
const CITIES = [
  { 
    name: 'Manzini', 
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&auto=format&fit=crop&q=80',
    description: 'Commercial hub',
    color: '4F46E5'
  },
  { 
    name: 'Mbabane', 
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
    description: 'Capital city',
    color: '7C3AED'
  },
  { 
    name: 'Matsapha', 
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80',
    description: 'Industrial area',
    color: '059669'
  },
  { 
    name: 'Nhlangano', 
    image: 'https://images.unsplash.com/photo-1448630360428-65456885c650?w=600&auto=format&fit=crop&q=80',
    description: 'Southern region',
    color: 'D97706'
  },
  { 
    name: 'Siteki', 
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80',
    description: 'Eastern region',
    color: 'DC2626'
  },
  { 
    name: 'Big Bend', 
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
    description: 'Lubombo region',
    color: '2563EB'
  },
  { 
    name: 'Pigg\'s Peak', 
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&auto=format&fit=crop&q=80',
    description: 'Northern highlands',
    color: '8B5CF6'
  },
  { 
    name: 'Mhlume', 
    image: 'https://images.unsplash.com/photo-1448630360428-65456885c650?w=600&auto=format&fit=crop&q=80',
    description: 'Sugar estate',
    color: '0D9488'
  },
];

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&auto=format&fit=crop&q=80';

// Helper function to generate blur placeholder
const generateBlurDataURL = (color: string = '4F46E5'): string => {
  return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%23${color}"/%3E%3C/svg%3E`;
};

// Floating particles for hero background
const FloatingParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      radius: number;
      dx: number;
      dy: number;
      opacity: number;
    }> = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    const createParticles = () => {
      const count = 80;
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 1,
          dx: (Math.random() - 0.5) * 0.3,
          dy: (Math.random() - 0.5) * 0.3,
          opacity: Math.random() * 0.5 + 0.1,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
        ctx.fill();

        p.x += p.dx;
        p.y += p.dy;

        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    resize();
    createParticles();
    draw();

    window.addEventListener('resize', () => {
      resize();
      createParticles();
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none opacity-30 dark:opacity-40"
    />
  );
};

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [cityStats, setCityStats] = useState<{ name: string; count: number }[]>([]);
  const [totalListings, setTotalListings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Memoize city data for performance
  const cityMap = useMemo(() => {
    const map = new Map();
    CITIES.forEach(city => {
      map.set(city.name.toLowerCase(), city);
    });
    return map;
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);
        
        const { data: properties, error: propertiesError } = await supabase
          .from('properties')
          .select(`
            *,
            landlord:profiles!properties_landlord_id_fkey (
              full_name,
              phone,
              is_verified
            ),
            photos:property_photos (
              id,
              photo_url,
              caption,
              display_order
            )
          `)
          .eq('status', 'active')
          .eq('is_featured', true)
          .order('created_at', { ascending: false })
          .limit(6);

        if (propertiesError) {
          console.error('Error fetching properties:', propertiesError);
          setError('Failed to load featured properties');
        } else {
          setFeaturedProperties(properties || []);
        }

        const { data: allProperties, error: allPropertiesError } = await supabase
          .from('properties')
          .select('location_city, id')
          .eq('status', 'active');

        if (allPropertiesError) {
          console.error('Error fetching property stats:', allPropertiesError);
          setError('Failed to load property statistics');
        } else {
          setTotalListings(allProperties?.length || 0);

          const cityCounts: Record<string, number> = {};
          allProperties?.forEach((item) => {
            if (item.location_city) {
              const cityName = item.location_city.trim();
              cityCounts[cityName] = (cityCounts[cityName] || 0) + 1;
            }
          });

          const cityStatsArray = Object.entries(cityCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

          setCityStats(cityStatsArray);
        }
      } catch (error) {
        console.error('Error fetching home data:', error);
        setError('An unexpected error occurred. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const getCityData = useCallback((cityName: string) => {
    const city = cityMap.get(cityName.toLowerCase());
    return city || null;
  }, [cityMap]);

  const getCityImage = useCallback((cityName: string) => {
    const city = getCityData(cityName);
    return city?.image || FALLBACK_IMAGE;
  }, [getCityData]);

  const getCityDescription = useCallback((cityName: string) => {
    const city = getCityData(cityName);
    return city?.description || '';
  }, [getCityData]);

  const getCityColor = useCallback((cityName: string) => {
    const city = getCityData(cityName);
    return city?.color || '4F46E5';
  }, [getCityData]);

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 transition-colors duration-300">
      {/* ========== REDESIGNED HERO SECTION ========== */}
      <section 
        ref={heroRef}
        className="relative min-h-[90vh] flex items-center overflow-hidden"
      >
        {/* Light mode background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300" />
        
        {/* Light mode gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none dark:opacity-100 opacity-50 transition-opacity duration-300">
          <div 
            className="absolute -top-[40%] -right-[20%] w-[70%] h-[70%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
              filter: 'blur(80px)',
              animation: 'pulse 6s ease-in-out infinite alternate',
            }}
          />
          <div 
            className="absolute -bottom-[30%] -left-[20%] w-[60%] h-[60%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%)',
              filter: 'blur(80px)',
              animation: 'pulse 8s ease-in-out infinite alternate-reverse',
            }}
          />
          <div 
            className="absolute top-[20%] left-[30%] w-[40%] h-[40%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(52, 211, 153, 0.08) 0%, transparent 70%)',
              filter: 'blur(100px)',
              animation: 'pulse 10s ease-in-out infinite alternate',
            }}
          />
        </div>

        {/* Dark mode gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-300">
          <div 
            className="absolute -top-[40%] -right-[20%] w-[70%] h-[70%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3) 0%, transparent 70%)',
              filter: 'blur(80px)',
              animation: 'pulse 6s ease-in-out infinite alternate',
            }}
          />
          <div 
            className="absolute -bottom-[30%] -left-[20%] w-[60%] h-[60%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(236, 72, 153, 0.2) 0%, transparent 70%)',
              filter: 'blur(80px)',
              animation: 'pulse 8s ease-in-out infinite alternate-reverse',
            }}
          />
          <div 
            className="absolute top-[20%] left-[30%] w-[40%] h-[40%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(52, 211, 153, 0.15) 0%, transparent 70%)',
              filter: 'blur(100px)',
              animation: 'pulse 10s ease-in-out infinite alternate',
            }}
          />
        </div>

        <FloatingParticles />

        {/* Subtle grid overlay */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.03] transition-opacity duration-300"
          style={{
            backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto">
            {/* Main heading */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-center leading-[1.1] tracking-tight">
              <span className="text-gray-900 dark:text-white transition-colors duration-300">Find Your</span>
              <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300 bg-clip-text text-transparent">
                Dream Home
              </span>
              <br />
              <span className="text-gray-800 dark:text-white/90 transition-colors duration-300">in Eswatini</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-4 md:mt-6 text-center text-gray-600 dark:text-white/60 text-base md:text-lg lg:text-xl max-w-2xl mx-auto font-light leading-relaxed transition-colors duration-300 px-2">
              Discover verified rentals across Manzini, Mbabane, and beyond. 
              No scams, no tussle — just your next home.
            </p>

            {/* Search Bar */}
            <div className="mt-8 md:mt-10 max-w-3xl mx-auto px-2 sm:px-0">
              <form onSubmit={handleSearch} className="relative group">
                <div className="relative flex items-center bg-white/80 dark:bg-white/10 backdrop-blur-md rounded-2xl border border-gray-200/50 dark:border-white/10 shadow-lg shadow-gray-200/50 dark:shadow-indigo-500/10 transition-all duration-300 hover:border-gray-300/50 dark:hover:border-white/20 hover:shadow-gray-300/50 dark:hover:shadow-indigo-500/20">
                  <div className="absolute left-3 sm:left-5 pointer-events-none">
                    <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-white/40 group-hover:text-gray-600 dark:group-hover:text-white/60 transition-colors" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Enter a city or town... (e.g., Manzini)"
                    className="flex-1 h-11 sm:h-14 pl-9 sm:pl-12 pr-3 sm:pr-4 bg-transparent border-0 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 text-sm sm:text-base focus-visible:ring-0 focus-visible:ring-offset-0 rounded-2xl transition-colors duration-300"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Button 
                    type="submit" 
                    size="lg"
                    className="h-9 sm:h-11 mr-1.5 sm:mr-2 px-3 sm:px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 hover:from-indigo-700 hover:to-purple-700 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 font-medium text-sm sm:text-base"
                  >
                    <span className="hidden sm:inline">Search</span>
                    <ArrowRight className="h-4 w-4 sm:ml-2" />
                  </Button>
                </div>
              </form>
            </div>

            {/* Trust indicators */}
            <div className="mt-8 md:mt-12 flex flex-wrap justify-center items-center gap-4 md:gap-6 lg:gap-10">
              <div className="flex items-center gap-2 text-gray-600 dark:text-white/60 group cursor-default transition-colors duration-300">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500/20 transition-colors">
                  <Shield className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="text-xs md:text-sm font-medium text-gray-800 dark:text-white/80">Verified</div>
                  <div className="text-[10px] md:text-xs text-gray-500 dark:text-white/40">No scams</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-white/60 group cursor-default transition-colors duration-300">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-500/20 transition-colors">
                  <Phone className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-xs md:text-sm font-medium text-gray-800 dark:text-white/80">Direct Contact</div>
                  <div className="text-[10px] md:text-xs text-gray-500 dark:text-white/40">Chat with landlords</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-white/60 group cursor-default transition-colors duration-300">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-500/20 transition-colors">
                  <Zap className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-xs md:text-sm font-medium text-gray-800 dark:text-white/80">Real-time</div>
                  <div className="text-[10px] md:text-xs text-gray-500 dark:text-white/40">Always up-to-date</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-white/60 group cursor-default transition-colors duration-300">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center group-hover:bg-rose-200 dark:group-hover:bg-rose-500/20 transition-colors">
                  <Star className="h-3.5 w-3.5 md:h-4 md:w-4 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <div className="text-xs md:text-sm font-medium text-gray-800 dark:text-white/80">4.9/5 Rating</div>
                  <div className="text-[10px] md:text-xs text-gray-500 dark:text-white/40">From 200+ reviews</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CITY TILES SECTION ========== */}
      {!loading && cityStats.length > 0 && (
        <section className="py-10 md:py-16 bg-white dark:bg-gray-950 transition-colors duration-300">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Browse by City</h2>
              <Button variant="ghost" asChild className="group text-gray-600 dark:text-white/70 hover:text-gray-900 dark:hover:text-white text-sm md:text-base">
                <Link href="/search" className="flex items-center gap-1">
                  View all cities
                  <ChevronRight className="h-3 w-3 md:h-4 md:w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {cityStats.slice(0, 8).map((city) => {
                const cityColor = getCityColor(city.name);
                const blurDataURL = generateBlurDataURL(cityColor);
                
                return (
                  <Link
                    key={city.name}
                    href={`/search?city=${encodeURIComponent(city.name.toLowerCase())}`}
                    className="group relative overflow-hidden rounded-xl md:rounded-2xl aspect-square block shadow-lg hover:shadow-2xl transition-shadow duration-500"
                  >
                    <Image
                      src={getCityImage(city.name)}
                      alt={city.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      placeholder="blur"
                      blurDataURL={blurDataURL}
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent group-hover:from-black/90 transition-all duration-500" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 md:p-5 text-white transform group-hover:translate-y-[-4px] transition-transform duration-500">
                      <h3 className="font-semibold text-sm md:text-lg">{city.name}</h3>
                      <p className="text-xs md:text-sm opacity-80">{city.count} properties</p>
                      {getCityDescription(city.name) && (
                        <p className="text-[10px] md:text-xs opacity-60 mt-0.5 md:mt-1 hidden sm:block">
                          {getCityDescription(city.name)}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========== HOW IT WORKS SECTION ========== */}
      <section className="py-10 md:py-16 bg-gray-50 dark:bg-gray-900/50 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 md:mb-12 text-center text-gray-900 dark:text-white transition-colors duration-300">How It Works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            <Card className="text-center p-4 md:p-6 hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white dark:bg-gray-900">
              <CardContent className="pt-4 md:pt-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4 group-hover:scale-110 transition-transform">
                  <Search className="h-6 w-6 md:h-8 md:w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2 text-gray-900 dark:text-white transition-colors duration-300">1. Search</h3>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  Pick your city and filter by what matters to you — price,
                  bedrooms, amenities.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center p-4 md:p-6 hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white dark:bg-gray-900">
              <CardContent className="pt-4 md:pt-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <HomeIcon className="h-6 w-6 md:h-8 md:w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2 text-gray-900 dark:text-white transition-colors duration-300">2. Find</h3>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  Browse verified listings with real photos and detailed
                  information.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center p-4 md:p-6 hover:shadow-xl transition-all duration-300 border-0 shadow-md bg-white dark:bg-gray-900 sm:col-span-2 lg:col-span-1">
              <CardContent className="pt-4 md:pt-6">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-100 dark:bg-indigo-500/10 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-3 md:mb-4">
                  <Phone className="h-6 w-6 md:h-8 md:w-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-1 md:mb-2 text-gray-900 dark:text-white transition-colors duration-300">3. Connect</h3>
                <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 transition-colors duration-300">
                  Contact the landlord directly via WhatsApp or phone with one
                  click.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ========== FEATURED LISTINGS ========== */}
      <section className="py-10 md:py-16 bg-white dark:bg-gray-950 transition-colors duration-300">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white transition-colors duration-300">Featured Properties</h2>
            <Button variant="outline" asChild className="group border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm md:text-base">
              <Link href="/search" className="flex items-center gap-1">
                View All
                <ChevronRight className="h-3 w-3 md:h-4 md:w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-8 md:py-12">
              <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
          ) : error ? (
            <div className="text-center py-8 md:py-12">
              <p className="text-red-600 dark:text-red-400 text-sm md:text-base">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </div>
          ) : featuredProperties.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <p className="text-gray-600 dark:text-gray-400 text-sm md:text-base">No featured properties available yet.</p>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-500 mt-2">
                Check back soon for new listings.
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {featuredProperties.map((property) => {
                const mainPhoto = property.photos?.[0]?.photo_url || '/images/placeholder-property.jpg';
                return (
                  <Link key={property.id} href={`/properties/${property.id}`}>
                    <Card className="overflow-hidden hover:shadow-2xl transition-all duration-500 h-full border-0 shadow-lg bg-white dark:bg-gray-900">
                      <div className="relative h-40 sm:h-48 md:h-52 bg-gray-200 dark:bg-gray-800 overflow-hidden">
                        <Image
                          src={mainPhoto}
                          alt={property.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          placeholder="blur"
                          blurDataURL={generateBlurDataURL('4F46E5')}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/placeholder-property.jpg';
                          }}
                        />
                        {property.landlord?.is_verified && (
                          <Badge className="absolute top-2 left-2 md:top-3 md:left-3 bg-emerald-500/90 backdrop-blur-sm border-0 shadow-lg z-10 text-[10px] md:text-xs">
                            <CheckCircle className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {property.is_featured && (
                          <Badge className="absolute top-2 right-2 md:top-3 md:right-3 bg-amber-500/90 backdrop-blur-sm border-0 shadow-lg z-10 text-[10px] md:text-xs">
                            <Zap className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-3 md:p-5">
                        <h3 className="font-semibold text-sm md:text-lg mb-1 md:mb-2 line-clamp-1 text-gray-900 dark:text-white transition-colors duration-300">
                          {property.title}
                        </h3>
                        <div className="flex items-center text-gray-500 dark:text-gray-400 mb-1 md:mb-2 transition-colors duration-300">
                          <MapPin className="h-3 w-3 md:h-4 md:w-4 mr-1 shrink-0" />
                          <span className="text-xs md:text-sm truncate">
                            {property.location_suburb}, {property.location_city}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-base md:text-xl font-bold text-indigo-600 dark:text-indigo-400 transition-colors duration-300">
                            {formatPrice(property.price)}/month
                          </span>
                          <span className="text-xs md:text-sm text-gray-500 dark:text-gray-500 transition-colors duration-300">
                            {property.bedrooms || 0} bed • {property.bathrooms || 0} bath
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ========== CTA FOR LANDLORDS ========== */}
      <section className="py-10 md:py-16 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 transition-colors duration-300" />
        
        {/* Light mode orbs */}
        <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-0 transition-opacity duration-300">
          <div 
            className="absolute -top-[40%] -right-[20%] w-[70%] h-[70%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
          <div 
            className="absolute -bottom-[30%] -left-[20%] w-[60%] h-[60%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(236, 72, 153, 0.1) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
        </div>

        {/* Dark mode orbs */}
        <div className="absolute inset-0 pointer-events-none opacity-0 dark:opacity-100 transition-opacity duration-300">
          <div 
            className="absolute -top-[40%] -right-[20%] w-[70%] h-[70%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
          <div 
            className="absolute -bottom-[30%] -left-[20%] w-[60%] h-[60%] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(236, 72, 153, 0.15) 0%, transparent 70%)',
              filter: 'blur(80px)',
            }}
          />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 text-gray-900 dark:text-white transition-colors duration-300">Own a Property?</h2>
          <p className="text-base md:text-xl mb-6 md:mb-8 text-gray-600 dark:text-white/70 transition-colors duration-300">
            List it here and find qualified tenants fast. It&apos;s free to get
            started!
          </p>
          <Button size="lg" asChild className="shadow-2xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 hover:from-indigo-700 hover:to-purple-700 dark:hover:from-indigo-600 dark:hover:to-purple-600 text-white border-0 px-6 md:px-8 text-sm md:text-base h-11 md:h-12">
            <Link
              href="/dashboard/landlord/add-property"
              className="flex items-center gap-2"
            >
              <Building className="h-4 w-4 md:h-5 md:w-5" />
              List Your Property
            </Link>
          </Button>
        </div>
      </section>

      {/* ========== STATS SECTION WITH ANIMATED COUNTERS ========== */}
      <section className="py-10 md:py-16 bg-gray-50 dark:bg-gray-900/50 transition-colors duration-300">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              <div className="text-center">
                <AnimatedCounter 
                  target={totalListings} 
                  className="text-2xl md:text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-1 md:mb-2 transition-colors duration-300" 
                />
                <div className="text-xs md:text-base text-gray-600 dark:text-gray-400 transition-colors duration-300">Active Listings</div>
              </div>
              <div className="text-center">
                <AnimatedCounter 
                  target={cityStats.length} 
                  className="text-2xl md:text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-1 md:mb-2 transition-colors duration-300" 
                />
                <div className="text-xs md:text-base text-gray-600 dark:text-gray-400 transition-colors duration-300">Cities</div>
              </div>
              <div className="text-center">
                <AnimatedCounter 
                  target={featuredProperties.filter(p => p.landlord?.is_verified).length || 0} 
                  suffix="+"
                  className="text-2xl md:text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-1 md:mb-2 transition-colors duration-300" 
                />
                <div className="text-xs md:text-base text-gray-600 dark:text-gray-400 transition-colors duration-300">Verified Landlords</div>
              </div>
              <div className="text-center">
                <AnimatedCounter 
                  target={5} 
                  suffix=" min"
                  className="text-2xl md:text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-1 md:mb-2 transition-colors duration-300" 
                />
                <div className="text-xs md:text-base text-gray-600 dark:text-gray-400 transition-colors duration-300">Avg. Time to Contact</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes pulse {
          0% { transform: scale(1) translate(0, 0); opacity: 0.6; }
          50% { transform: scale(1.1) translate(20px, -20px); opacity: 0.8; }
          100% { transform: scale(1) translate(0, 0); opacity: 0.6; }
        }
      `}</style>
    </main>
  );
}
