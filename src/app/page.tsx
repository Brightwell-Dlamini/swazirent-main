// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Property } from '@/types/property';

// City metadata with reliable images from Unsplash
const CITIES = [
  { 
    name: 'Manzini', 
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&auto=format&fit=crop&q=80',
    description: 'Commercial hub'
  },
  { 
    name: 'Mbabane', 
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
    description: 'Capital city'
  },
  { 
    name: 'Matsapha', 
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80',
    description: 'Industrial area'
  },
  { 
    name: 'Nhlangano', 
    image: 'https://images.unsplash.com/photo-1448630360428-65456885c650?w=600&auto=format&fit=crop&q=80',
    description: 'Southern region'
  },
  { 
    name: 'Siteki', 
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&auto=format&fit=crop&q=80',
    description: 'Eastern region'
  },
  { 
    name: 'Big Bend', 
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&auto=format&fit=crop&q=80',
    description: 'Lubombo region'
  },
  { 
    name: 'Pigg\'s Peak', 
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&auto=format&fit=crop&q=80',
    description: 'Northern highlands'
  },
  { 
    name: 'Mhlume', 
    image: 'https://images.unsplash.com/photo-1448630360428-65456885c650?w=600&auto=format&fit=crop&q=80',
    description: 'Sugar estate'
  },
];

// Fallback image if city not found
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&auto=format&fit=crop&q=80';

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [featuredProperties, setFeaturedProperties] = useState<Property[]>([]);
  const [cityStats, setCityStats] = useState<{ name: string; count: number }[]>([]);
  const [totalListings, setTotalListings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setError(null);
        
        // Fetch featured properties with proper error handling
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

        // Fetch all active properties for stats
        const { data: allProperties, error: allPropertiesError } = await supabase
          .from('properties')
          .select('location_city, id')
          .eq('status', 'active');

        if (allPropertiesError) {
          console.error('Error fetching property stats:', allPropertiesError);
          setError('Failed to load property statistics');
        } else {
          // Total active listings
          setTotalListings(allProperties?.length || 0);

          // Aggregate city counts for ALL cities (not just top 6)
          const cityCounts: Record<string, number> = {};
          allProperties?.forEach((item) => {
            if (item.location_city) {
              const cityName = item.location_city.trim();
              cityCounts[cityName] = (cityCounts[cityName] || 0) + 1;
            }
          });

          // Convert to array and sort by count (descending)
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

  // Get city image with fallback
  const getCityImage = (cityName: string) => {
    const city = CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    return city?.image || FALLBACK_IMAGE;
  };

  // Get city description
  const getCityDescription = (cityName: string) => {
    const city = CITIES.find(c => c.name.toLowerCase() === cityName.toLowerCase());
    return city?.description || '';
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US').format(price);
  };

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-linear-to-b from-blue-50 to-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Find Your Next Home in{' '}
              <span className="text-primary">Eswatini</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Search verified rentals in Manzini, Mbabane, and beyond. No
              tussle.
            </p>

            {/* Search Bar */}
            <form
              onSubmit={handleSearch}
              className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto"
            >
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Enter city or town... (e.g., Manzini)"
                  className="pl-10 h-12 text-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-8">
                Search
              </Button>
            </form>

            {/* Trust Badges */}
            <div className="flex flex-wrap justify-center gap-6 mt-8">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">Verified Listings</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">No Scams</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">Direct Contact</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">Always Up-to-Date</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* City Tiles Section */}
      {!loading && cityStats.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-8 text-center">
              Browse by City
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {cityStats.slice(0, 8).map((city) => (
                <Link
                  key={city.name}
                  href={`/search?city=${encodeURIComponent(city.name.toLowerCase())}`}
                  className="group relative overflow-hidden rounded-lg aspect-square block"
                >
                  <Image
                    src={getCityImage(city.name)}
                    alt={city.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-300"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-all duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform group-hover:translate-y-[-4px] transition-transform duration-300">
                    <h3 className="font-semibold text-lg">{city.name}</h3>
                    <p className="text-sm opacity-90">{city.count} properties</p>
                    {getCityDescription(city.name) && (
                      <p className="text-xs opacity-75 mt-1">
                        {getCityDescription(city.name)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">1. Search</h3>
                <p className="text-gray-600">
                  Pick your city and filter by what matters to you - price,
                  bedrooms, amenities.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <HomeIcon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">2. Find</h3>
                <p className="text-gray-600">
                  Browse verified listings with real photos and detailed
                  information.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">3. Connect</h3>
                <p className="text-gray-600">
                  Contact the landlord directly via WhatsApp or phone with one
                  click.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Featured Properties</h2>
            <Button variant="outline" asChild>
              <Link href="/search">View All</Link>
            </Button>
          </div>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Refresh Page
              </Button>
            </div>
          ) : featuredProperties.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No featured properties available yet.</p>
              <p className="text-sm text-gray-500 mt-2">
                Check back soon for new listings.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProperties.map((property) => {
                const mainPhoto = property.photos?.[0]?.photo_url || '/images/placeholder-property.jpg';
                return (
                  <Link key={property.id} href={`/properties/${property.id}`}>
                    <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 h-full group">
                      <div className="relative h-48 bg-gray-200">
                        <Image
                          src={mainPhoto}
                          alt={property.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          onError={(e) => {
                            // Fallback for broken images
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/placeholder-property.jpg';
                          }}
                        />
                        {property.landlord?.is_verified && (
                          <Badge className="absolute top-2 left-2 bg-green-500 z-10 shadow-md">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                        {property.is_featured && (
                          <Badge className="absolute top-2 right-2 bg-amber-500 z-10 shadow-md">
                            <Zap className="h-3 w-3 mr-1" />
                            Featured
                          </Badge>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                          {property.title}
                        </h3>
                        <div className="flex items-center text-gray-500 mb-2">
                          <MapPin className="h-4 w-4 mr-1 shrink-0" />
                          <span className="text-sm truncate">
                            {property.location_suburb}, {property.location_city}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-bold text-primary">
                            E{formatPrice(property.price)}/month
                          </span>
                          <span className="text-sm text-gray-500">
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

      {/* CTA for Landlords */}
      <section className="py-16 bg-linear-to-r from-primary-600 to-primary-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Own a Property?</h2>
          <p className="text-xl mb-8 opacity-90">
            List it here and find qualified tenants fast. It&apos;s free to get
            started!
          </p>
          <Button size="lg" variant="secondary" asChild className="shadow-lg hover:shadow-xl transition-shadow">
            <Link
              href="/dashboard/landlord/add-property"
              className="flex items-center gap-2"
            >
              <Building className="mr-2 h-5 w-5" />
              List Your Property
            </Link>
          </Button>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">
                  {totalListings}
                </div>
                <div className="text-gray-600">Active Listings</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">
                  {cityStats.length}
                </div>
                <div className="text-gray-600">Cities</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">
                  {featuredProperties.length > 0 ? featuredProperties.filter(p => p.landlord?.is_verified).length : 0}+
                </div>
                <div className="text-gray-600">Verified Landlords</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">5 min</div>
                <div className="text-gray-600">Avg. Time to Contact</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <HomeIcon className="h-6 w-6" />
                <span className="font-bold text-xl">SwaziRent</span>
              </div>
              <p className="text-gray-400 text-sm">
                Find your next home in Eswatini. Fast, easy, and verified.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Renters</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/search" className="hover:text-white transition-colors">
                    Search Properties
                  </Link>
                </li>
                <li>
                  <Link href="/saved" className="hover:text-white transition-colors">
                    Saved Properties
                  </Link>
                </li>
                <li>
                  <Link href="/alerts" className="hover:text-white transition-colors">
                    Price Alerts
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Landlords</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/dashboard/landlord/add-property" className="hover:text-white transition-colors">
                    List a Property
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/landlord" className="hover:text-white transition-colors">
                    Manage Listings
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link href="/about" className="hover:text-white transition-colors">
                    About Us
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white transition-colors">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white transition-colors">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white transition-colors">
                    Terms of Use
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>
              &copy; {new Date().getFullYear()} SwaziRent. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
