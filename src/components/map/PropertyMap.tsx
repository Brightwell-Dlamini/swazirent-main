// src/components/map/PropertyMap.tsx
'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { Property } from '@/types/property';
import { resolveCoordinates, ESWATINI_CENTER, ESWATINI_DEFAULT_ZOOM } from '@/utils/eswatini-geo';
import { TenureBadge } from '@/components/properties/TenureBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, ExternalLink, Loader2 } from 'lucide-react';

interface PropertyMapProps {
  properties: Property[];
  className?: string;
  height?: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}

type Pin = {
  id: string;
  title: string;
  price: number;
  city: string;
  suburb: string;
  lat: number;
  lng: number;
  approximate: boolean;
  tenure?: Property['tenure_type'];
};

export function PropertyMap({
  properties,
  className = '',
  height = 'h-[480px]',
  selectedId,
  onSelect,
}: PropertyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);
  const [activePin, setActivePin] = useState<Pin | null>(null);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const pins: Pin[] = useMemo(() => {
    return properties.map((p) => {
      const { lat, lng, approximate } = resolveCoordinates(
        p.latitude,
        p.longitude,
        p.location_city
      );
      return {
        id: p.id,
        title: p.title,
        price: p.price,
        city: p.location_city,
        suburb: p.location_suburb,
        lat,
        lng,
        approximate,
        tenure: p.tenure_type,
      };
    });
  }, [properties]);

  // Load Mapbox when token present
  useEffect(() => {
    if (!token) {
      setUseFallback(true);
      return;
    }
    if (!mapContainerRef.current) return;

    let cancelled = false;

    const init = async () => {
      try {
        // Dynamic import so build works without mapbox installed until token used
        const mapboxgl = (await import('mapbox-gl')).default;
        // @ts-expect-error css side-effect
        await import('mapbox-gl/dist/mapbox-gl.css');

        if (cancelled || !mapContainerRef.current) return;

        mapboxgl.accessToken = token;
        const map = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [ESWATINI_CENTER.lng, ESWATINI_CENTER.lat],
          zoom: ESWATINI_DEFAULT_ZOOM,
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        mapRef.current = map;

        map.on('load', () => {
          if (cancelled) return;
          setMapReady(true);
        });
      } catch (e) {
        console.warn('Mapbox failed, using fallback', e);
        if (!cancelled) {
          setUseFallback(true);
          setMapError('Mapbox unavailable — showing list map');
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.remove?.());
      markersRef.current = [];
      mapRef.current?.remove?.();
      mapRef.current = null;
    };
  }, [token]);

  // Update markers
  useEffect(() => {
    if (!mapReady || !mapRef.current || useFallback || !token) return;

    let mapboxgl: any;
    const run = async () => {
      mapboxgl = (await import('mapbox-gl')).default;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const bounds = new mapboxgl.LngLatBounds();

      pins.forEach((pin) => {
        const el = document.createElement('button');
        el.type = 'button';
        el.className =
          'rounded-full px-2 py-1 text-[11px] font-semibold shadow-md border border-white ' +
          (selectedId === pin.id || activePin?.id === pin.id
            ? 'bg-primary text-white scale-110'
            : 'bg-white text-gray-900');
        el.textContent = `E${Math.round(pin.price / 100) * 100 >= 1000 ? (pin.price / 1000).toFixed(1) + 'k' : pin.price}`;
        el.style.cursor = 'pointer';

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          setActivePin(pin);
          onSelect?.(pin.id);
        });

        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat([pin.lng, pin.lat])
          .addTo(mapRef.current);

        markersRef.current.push(marker);
        bounds.extend([pin.lng, pin.lat]);
      });

      if (pins.length > 0) {
        mapRef.current.fitBounds(bounds, { padding: 48, maxZoom: 12 });
      }
    };

    run();
  }, [pins, mapReady, useFallback, token, selectedId, activePin?.id, onSelect]);

  // Fallback UI: OpenStreetMap embed centered on Eswatini + pin cards
  if (useFallback || !token) {
    const bbox = '30.7,-27.4,32.2,-25.6'; // rough Eswatini bbox
    return (
      <div className={`relative ${height} ${className} rounded-xl overflow-hidden border bg-gray-100 dark:bg-gray-900`}>
        <iframe
          title="Eswatini map"
          className="absolute inset-0 w-full h-full"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`}
        />
        <div className="absolute inset-x-0 bottom-0 max-h-[45%] overflow-y-auto bg-white/95 dark:bg-gray-950/95 backdrop-blur p-3 space-y-2 border-t">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {pins.length} listings on map
            {!token && ' · Set NEXT_PUBLIC_MAPBOX_TOKEN for interactive pins'}
          </p>
          {pins.slice(0, 20).map((pin) => (
            <button
              key={pin.id}
              type="button"
              onClick={() => {
                setActivePin(pin);
                onSelect?.(pin.id);
              }}
              className={`w-full text-left p-2 rounded-lg border text-sm hover:bg-gray-50 dark:hover:bg-gray-900 ${
                activePin?.id === pin.id ? 'border-primary ring-1 ring-primary' : ''
              }`}
            >
              <div className="font-medium line-clamp-1">{pin.title}</div>
              <div className="text-xs text-muted-foreground">
                {pin.suburb}, {pin.city} · E{pin.price.toLocaleString()}/mo
                {pin.approximate && ' · approx. location'}
              </div>
            </button>
          ))}
        </div>
        {activePin && (
          <Card className="absolute top-3 left-3 right-3 sm:right-auto sm:w-72 shadow-lg z-10">
            <CardContent className="p-3 space-y-2">
              <div className="font-semibold text-sm line-clamp-2">{activePin.title}</div>
              <div className="text-primary font-bold">E{activePin.price.toLocaleString()}/mo</div>
              <div className="text-xs text-muted-foreground">
                {activePin.suburb}, {activePin.city}
              </div>
              {activePin.tenure && <TenureBadge tenure={activePin.tenure} />}
              <Button asChild size="sm" className="w-full">
                <Link href={`/properties/${activePin.id}`}>View listing</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${height} ${className} rounded-xl overflow-hidden border`}>
      <div ref={mapContainerRef} className="absolute inset-0" />
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      {mapError && (
        <p className="absolute top-2 left-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">{mapError}</p>
      )}
      {activePin && (
        <Card className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-80 shadow-xl z-10">
          <CardContent className="p-4 space-y-2">
            <div className="font-semibold line-clamp-2">{activePin.title}</div>
            <div className="text-lg font-bold text-primary">E{activePin.price.toLocaleString()}/mo</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {activePin.suburb}, {activePin.city}
              {activePin.approximate && ' (approx.)'}
            </div>
            {activePin.tenure && <TenureBadge tenure={activePin.tenure} />}
            <div className="flex gap-2 pt-1">
              <Button asChild size="sm" className="flex-1">
                <Link href={`/properties/${activePin.id}`}>View listing</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  window.open(
                    `https://www.google.com/maps/search/?api=1&query=${activePin.lat},${activePin.lng}`,
                    '_blank'
                  )
                }
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
