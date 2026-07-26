// src/components/properties/PropertyCard.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Property, PropertyPhoto, formatPricePeriod, inferAssetCategory,
  inferListingIntent, subtypeLabel, ASSET_CATEGORY_LABELS,
} from '@/types/property';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Bed, Bath, Heart, Eye, CheckCircle, Clock, Ruler, Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { TenureBadge } from './TenureBadge';

interface PropertyCardProps {
  property: Property;
  viewMode?: 'grid' | 'list';
}

const getPrimaryPhoto = (photos?: PropertyPhoto[]) => {
  if (!photos?.length) return null;
  return [...photos].sort((a, b) => a.display_order - b.display_order)[0];
};

function SpecsRow({ property }: { property: Property }) {
  const category = inferAssetCategory(property);
  const intent = inferListingIntent(property);

  if (category === 'land') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        {property.land_size_ha != null && (
          <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{property.land_size_ha} ha</span>
        )}
        {property.is_fenced != null && (
          <Badge variant="outline" className="text-[10px] h-5">{property.is_fenced ? 'Fenced' : 'Open'}</Badge>
        )}
        <Badge variant="secondary" className="text-[10px] h-5">{ASSET_CATEGORY_LABELS.land}</Badge>
        {intent === 'sale' && <Badge variant="outline" className="text-[10px] h-5">Sale</Badge>}
      </div>
    );
  }

  if (category === 'commercial') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        {property.floor_area_sqm != null && (
          <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{property.floor_area_sqm} m²</span>
        )}
        <Badge variant="outline" className="text-[10px] h-5">{subtypeLabel(property.property_subtype || property.property_type)}</Badge>
        <Badge variant="secondary" className="text-[10px] h-5">Commercial</Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{property.bedrooms ?? '—'}</span>
      <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{property.bathrooms ?? '—'}</span>
      {property.is_furnished && <Badge variant="outline" className="text-[10px] h-5">Furnished</Badge>}
    </div>
  );
}

function PriceLabel({ property }: { property: Property }) {
  const intent = inferListingIntent(property);
  const period =
    property.price_period ||
    (intent === 'sale' ? 'once' : intent === 'short_stay' ? 'night' : 'month');
  return (
    <span className="text-lg font-bold text-primary shrink-0 tabular-nums">
      E{property.price.toLocaleString()}
      <span className="text-xs font-normal text-muted-foreground">{formatPricePeriod(period)}</span>
    </span>
  );
}

export function PropertyCard({ property, viewMode = 'grid' }: PropertyCardProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const primaryPhoto = getPrimaryPhoto(property.photos);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('saved_properties')
        .select('id')
        .eq('renter_id', user.id)
        .eq('property_id', property.id)
        .maybeSingle();
      if (!cancelled) setIsSaved(!!data);
    })();
    return () => { cancelled = true; };
  }, [user, property.id]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info('Sign in to save listings');
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    const next = !isSaved;
    setIsSaved(next); // optimistic
    try {
      if (!next) {
        const { error } = await supabase
          .from('saved_properties')
          .delete()
          .eq('renter_id', user.id)
          .eq('property_id', property.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_properties')
          .insert({ renter_id: user.id, property_id: property.id });
        if (error) throw error;
      }
    } catch {
      setIsSaved(!next);
      toast.error('Could not update saved');
    } finally {
      setIsSaving(false);
    }
  };

  const media = (
    <div className={`relative ${viewMode === 'list' ? 'w-full sm:w-48 h-44 sm:h-auto sm:min-h-[9rem]' : 'h-44'} bg-muted shrink-0 overflow-hidden`}>
      {primaryPhoto ? (
        <Image
          src={primaryPhoto.photo_url}
          alt=""
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          sizes={viewMode === 'list' ? '192px' : '(max-width: 768px) 100vw, 33vw'}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No photo</div>
      )}
      <div className="absolute top-2 left-2 flex gap-1 flex-wrap max-w-[75%]">
        {property.landlord?.is_verified && (
          <Badge className="bg-emerald-600 text-white border-0 text-[10px] h-5">
            <CheckCircle className="h-2.5 w-2.5 mr-0.5" />Verified
          </Badge>
        )}
        <TenureBadge tenure={property.tenure_type} />
        {(property.status === 'rented' || property.status === 'taken') && (
          <Badge variant="secondary" className="text-[10px] h-5">Taken</Badge>
        )}
        {property.is_featured && (
          <Badge className="bg-amber-500 text-white border-0 text-[10px] h-5">Featured</Badge>
        )}
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        aria-label={isSaved ? 'Remove from saved' : 'Save listing'}
        className="absolute top-2 right-2 p-2 rounded-full bg-background/90 backdrop-blur-sm shadow-sm border border-border/50 hover:bg-background transition-colors"
      >
        <Heart className={`h-4 w-4 transition-colors ${isSaved ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
      </button>
    </div>
  );

  const body = (
    <CardContent className={`p-3.5 ${viewMode === 'list' ? 'flex-1 flex flex-col justify-between' : ''}`}>
      <div>
        <div className="flex justify-between items-start gap-2 mb-1">
          <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
            {property.title}
          </h3>
          <PriceLabel property={property} />
        </div>
        <div className="flex items-center text-muted-foreground text-xs mb-2">
          <MapPin className="h-3 w-3 mr-1 shrink-0" />
          <span className="truncate">{property.location_suburb}, {property.location_city}</span>
        </div>
        <SpecsRow property={property} />
        {viewMode === 'list' && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{property.description}</p>
        )}
      </div>
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{property.views || 0}</span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(property.created_at).toLocaleDateString()}
        </span>
      </div>
    </CardContent>
  );

  return (
    <Link href={`/properties/${property.id}`} className="block h-full group">
      <Card className="overflow-hidden h-full border-border/80 shadow-sm hover:shadow-md transition-shadow duration-200">
        <div className={viewMode === 'list' ? 'flex flex-col sm:flex-row h-full' : 'h-full flex flex-col'}>
          {media}
          {body}
        </div>
      </Card>
    </Link>
  );
}
