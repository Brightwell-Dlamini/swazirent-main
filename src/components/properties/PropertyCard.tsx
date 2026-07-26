// src/components/properties/PropertyCard.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Property,
  PropertyPhoto,
  formatPricePeriod,
  inferAssetCategory,
  inferListingIntent,
  subtypeLabel,
  ASSET_CATEGORY_LABELS,
} from '@/types/property';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Bed, Bath, Heart, Eye, CheckCircle, Clock, Ruler, Building2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { TenureBadge } from './TenureBadge';

interface PropertyCardProps {
  property: Property;
  viewMode?: 'grid' | 'list';
}

const getPrimaryPhoto = (photos?: PropertyPhoto[]) => {
  if (!photos || photos.length === 0) return null;
  return [...photos].sort((a, b) => a.display_order - b.display_order)[0];
};

function SpecsRow({ property }: { property: Property }) {
  const category = inferAssetCategory(property);
  const intent = inferListingIntent(property);

  if (category === 'land') {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
        {property.land_size_ha != null && (
          <span className="flex items-center gap-1">
            <Ruler className="h-4 w-4" />
            {property.land_size_ha} ha
          </span>
        )}
        {property.is_fenced != null && (
          <Badge variant="outline" className="text-xs">
            {property.is_fenced ? 'Fenced' : 'Not fenced'}
          </Badge>
        )}
        <Badge variant="secondary" className="text-xs">
          {ASSET_CATEGORY_LABELS.land}
        </Badge>
        {intent === 'sale' && (
          <Badge variant="outline" className="text-xs">
            For sale
          </Badge>
        )}
      </div>
    );
  }

  if (category === 'commercial') {
    return (
      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
        {property.floor_area_sqm != null && (
          <span className="flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            {property.floor_area_sqm} m²
          </span>
        )}
        <Badge variant="outline" className="text-xs">
          {subtypeLabel(property.property_subtype || property.property_type)}
        </Badge>
        {property.parking_bays != null && property.parking_bays > 0 && (
          <span className="text-xs">{property.parking_bays} parking</span>
        )}
        <Badge variant="secondary" className="text-xs">
          Commercial
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
      <span className="flex items-center gap-1">
        <Bed className="h-4 w-4" />
        {property.bedrooms ?? '—'}
      </span>
      <span className="flex items-center gap-1">
        <Bath className="h-4 w-4" />
        {property.bathrooms ?? '—'}
      </span>
      {property.is_furnished && (
        <Badge variant="outline" className="text-xs">
          Furnished
        </Badge>
      )}
    </div>
  );
}

function PriceLabel({ property }: { property: Property }) {
  const intent = inferListingIntent(property);
  const period =
    property.price_period ||
    (intent === 'sale' ? 'once' : intent === 'short_stay' ? 'night' : 'month');
  return (
    <span className="text-xl font-bold text-primary shrink-0">
      E{property.price.toLocaleString()}
      <span className="text-xs font-normal text-muted-foreground">
        {formatPricePeriod(period)}
      </span>
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
    const checkSaved = async () => {
      const { data } = await supabase
        .from('saved_properties')
        .select('id')
        .eq('renter_id', user.id)
        .eq('property_id', property.id)
        .single();
      setIsSaved(!!data);
    };
    checkSaved();
  }, [user, property.id]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.info('Please sign in to save properties');
      return;
    }
    setIsSaving(true);
    try {
      if (isSaved) {
        const { error } = await supabase
          .from('saved_properties')
          .delete()
          .eq('renter_id', user.id)
          .eq('property_id', property.id);
        if (error) throw error;
        setIsSaved(false);
        toast.success('Removed from saved');
      } else {
        const { error } = await supabase
          .from('saved_properties')
          .insert({ renter_id: user.id, property_id: property.id });
        if (error) throw error;
        setIsSaved(true);
        toast.success('Property saved!');
      }
    } catch (error) {
      console.error('Error saving property:', error);
      toast.error('Failed to save property');
    } finally {
      setIsSaving(false);
    }
  };

  const cardInner = (list: boolean) => (
    <Card className={`overflow-hidden hover:shadow-xl transition-all duration-300 group ${list ? '' : 'h-full'}`}>
      <div className={list ? 'flex flex-col sm:flex-row' : ''}>
        <div className={`relative ${list ? 'w-full sm:w-48 h-48 sm:h-auto' : 'h-48'} bg-muted shrink-0`}>
          {primaryPhoto ? (
            <Image
              src={primaryPhoto.photo_url}
              alt={property.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <span className="text-muted-foreground">No photo</span>
            </div>
          )}
          <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
            {property.landlord?.is_verified && (
              <Badge className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
            <TenureBadge tenure={property.tenure_type} />
            {property.status === 'active' && <Badge variant="default">Available</Badge>}
            {(property.status === 'rented' || property.status === 'taken') && (
              <Badge variant="secondary">Taken</Badge>
            )}
            {!list && property.is_featured && (
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Featured</Badge>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="absolute top-2 right-2 p-2 rounded-full bg-background/90 hover:bg-background shadow-md"
          >
            <Heart
              className={`h-4 w-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
            />
          </button>
        </div>
        <CardContent className={`p-4 ${list ? 'flex-1 flex flex-col justify-between' : ''}`}>
          <div>
            <div className="flex justify-between items-start gap-2 mb-1">
              <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary">
                {property.title}
              </h3>
              <PriceLabel property={property} />
            </div>
            <div className="flex items-center text-muted-foreground text-sm mb-2">
              <MapPin className="h-3 w-3 mr-1 shrink-0" />
              <span className="truncate">
                {property.location_suburb}, {property.location_city}
              </span>
            </div>
            <SpecsRow property={property} />
            {list && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{property.description}</p>
            )}
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {property.views || 0} views
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(property.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </div>
    </Card>
  );

  if (viewMode === 'list') {
    return <Link href={`/properties/${property.id}`}>{cardInner(true)}</Link>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Link href={`/properties/${property.id}`}>{cardInner(false)}</Link>
    </motion.div>
  );
}
