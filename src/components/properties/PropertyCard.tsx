// src/components/properties/PropertyCard.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Property, PropertyPhoto } from '@/types/property';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Bed, Bath, Heart, Eye, CheckCircle, Clock } from 'lucide-react';
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

export function PropertyCard({ property, viewMode = 'grid' }: PropertyCardProps) {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const primaryPhoto = getPrimaryPhoto(property.photos);

  // Check if property is saved
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

  if (viewMode === 'list') {
    return (
      <Link href={`/properties/${property.id}`}>
        <Card className="overflow-hidden hover:shadow-lg transition-all duration-300 group">
          <div className="flex flex-col sm:flex-row">
            <div className="relative w-full sm:w-48 h-48 sm:h-auto bg-gray-200 shrink-0">
              {primaryPhoto ? (
                <Image
                  src={primaryPhoto.photo_url}
                  alt={property.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <span className="text-gray-400">No photo</span>
                </div>
              )}
              <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                {property.landlord?.is_verified && (
                  <Badge className="bg-green-500 hover:bg-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
                <TenureBadge tenure={property.tenure_type} />
                {property.status === 'active' && (
                  <Badge variant="default">Available</Badge>
                )}
                {(property.status === 'rented' || property.status === 'taken') && (
                  <Badge variant="secondary">Taken</Badge>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="absolute top-2 right-2 p-2 rounded-full bg-white/90 hover:bg-white shadow-md transition-all"
              >
                <Heart
                  className={`h-4 w-4 transition-colors ${
                    isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600'
                  }`}
                />
              </button>
            </div>
            <CardContent className="flex-1 p-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                    {property.title}
                  </h3>
                  <span className="text-xl font-bold text-primary shrink-0">
                    E{property.price.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center text-gray-500 text-sm mt-1">
                  <MapPin className="h-3 w-3 mr-1 shrink-0" />
                  <span className="truncate">
                    {property.location_suburb}, {property.location_city}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Bed className="h-4 w-4" />
                    {property.bedrooms || 'N/A'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="h-4 w-4" />
                    {property.bathrooms || 'N/A'}
                  </span>
                  {property.is_furnished && (
                    <Badge variant="outline" className="text-xs">
                      Furnished
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                  {property.description}
                </p>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Eye className="h-3 w-3" />
                  {property.views || 0} views
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {new Date(property.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Link href={`/properties/${property.id}`}>
        <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 group h-full">
          <div className="relative h-48 bg-gray-200">
            {primaryPhoto ? (
              <Image
                src={primaryPhoto.photo_url}
                alt={property.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <span className="text-gray-400">No photo</span>
              </div>
            )}
            <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
              {property.landlord?.is_verified && (
                <Badge className="bg-green-500 hover:bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Verified
                </Badge>
              )}
              <TenureBadge tenure={property.tenure_type} />
              {property.status === 'active' && (
                <Badge variant="default">Available</Badge>
              )}
              {(property.status === 'rented' || property.status === 'taken') && (
                <Badge variant="secondary">Taken</Badge>
              )}
              {property.is_featured && (
                <Badge className="bg-amber-500 hover:bg-amber-600">
                  Featured
                </Badge>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="absolute top-2 right-2 p-2 rounded-full bg-white/90 hover:bg-white shadow-md transition-all"
            >
              <Heart
                className={`h-4 w-4 transition-colors ${
                  isSaved ? 'fill-red-500 text-red-500' : 'text-gray-600'
                }`}
              />
            </button>
          </div>
          <CardContent className="p-4">
            <div className="flex justify-between items-start gap-2 mb-1">
              <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-primary transition-colors">
                {property.title}
              </h3>
              <span className="text-xl font-bold text-primary shrink-0">
                E{property.price.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center text-gray-500 text-sm mb-2">
              <MapPin className="h-3 w-3 mr-1 shrink-0" />
              <span className="truncate">
                {property.location_suburb}, {property.location_city}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Bed className="h-4 w-4" />
                {property.bedrooms || 'N/A'}
              </span>
              <span className="flex items-center gap-1">
                <Bath className="h-4 w-4" />
                {property.bathrooms || 'N/A'}
              </span>
              {property.is_furnished && (
                <Badge variant="outline" className="text-xs">
                  Furnished
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-gray-500">
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
        </Card>
      </Link>
    </motion.div>
  );
}
