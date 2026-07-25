// src/app/map/page.tsx — Map discovery (DOC-003)
'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Property } from '@/types/property';
import { PropertyMap } from '@/components/map/PropertyMap';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ESWATINI_CITIES } from '@/utils/constants';
import { Loader2, List, Map as MapIcon, Search } from 'lucide-react';

export default function MapDiscoveryPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('any');
  const [keyword, setKeyword] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showList, setShowList] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('properties')
          .select(
            `*,
            landlord:profiles!properties_landlord_id_fkey (full_name, phone, is_verified),
            photos:property_photos (id, photo_url, caption, display_order)`
          )
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(200);

        if (error) throw error;
        if (!mounted) return;

        const rows: Property[] = (data || []).map((item: any) => ({
          id: item.id,
          landlord_id: item.landlord_id,
          title: item.title || '',
          description: item.description || '',
          price: item.price || 0,
          property_type: item.property_type || 'other',
          location_city: item.location_city || '',
          location_suburb: item.location_suburb || '',
          location_address: item.location_address,
          latitude: item.latitude,
          longitude: item.longitude,
          bedrooms: item.bedrooms,
          bathrooms: item.bathrooms,
          is_furnished: item.is_furnished || false,
          amenities: item.amenities || [],
          tenure_type: item.tenure_type || 'unsure',
          status: item.status || 'active',
          is_featured: item.is_featured || false,
          views: item.views || 0,
          created_at: item.created_at,
          updated_at: item.updated_at,
          contact_phone: item.contact_phone || '',
          contact_whatsapp: item.contact_whatsapp,
          landlord: item.landlord,
          photos: item.photos || [],
        }));
        setProperties(rows);
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = properties;
    if (city !== 'any') {
      list = list.filter(
        (p) => p.location_city?.toLowerCase() === city.toLowerCase()
      );
    }
    if (keyword.trim()) {
      const k = keyword.toLowerCase();
      list = list.filter(
        (p) =>
          p.title?.toLowerCase().includes(k) ||
          p.location_suburb?.toLowerCase().includes(k) ||
          p.location_city?.toLowerCase().includes(k)
      );
    }
    return list;
  }, [properties, city, keyword]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4 py-4 md:py-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <MapIcon className="h-7 w-7 text-primary" />
              Discover on the map
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Explore active listings across Eswatini
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 h-10"
                placeholder="Search area or title..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="w-[160px] h-10">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All cities</SelectItem>
                {ESWATINI_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => setShowList((s) => !s)}
            >
              <List className="h-4 w-4 mr-1" />
              {showList ? 'Hide list' : 'Show list'}
            </Button>
            <Button variant="outline" size="sm" className="h-10" asChild>
              <Link href="/search">List search</Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <div className={`grid gap-4 ${showList ? 'lg:grid-cols-3' : 'grid-cols-1'}`}>
            <div className={showList ? 'lg:col-span-2' : ''}>
              <PropertyMap
                properties={filtered}
                height="h-[min(70vh,640px)]"
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
              <p className="text-xs text-muted-foreground mt-2">
                {filtered.length} listing{filtered.length !== 1 ? 's' : ''} shown.
                Pins without exact coordinates use town centre (approximate).
              </p>
            </div>
            {showList && (
              <div className="max-h-[min(70vh,640px)] overflow-y-auto space-y-3 pr-1">
                {filtered.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No listings match.</p>
                ) : (
                  filtered.map((p) => (
                    <div
                      key={p.id}
                      className={selectedId === p.id ? 'ring-2 ring-primary rounded-xl' : ''}
                      onClick={() => setSelectedId(p.id)}
                    >
                      <PropertyCard property={p} viewMode="list" />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
