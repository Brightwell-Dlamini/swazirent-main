// src/components/properties/PropertyCard.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Property, PropertyPhoto } from '@/types/property';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Bed, Bath, Heart, CheckCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Helper to get primary photo
const getPrimaryPhoto = (photos?: PropertyPhoto[]) => {
  if (!photos || photos.length === 0) return null;
  return [...photos].sort((a, b) => a.display_order - b.display_order)[0];
};

interface PropertyCardProps {
  property: Property;
  onSave?: () => void;
}

export function PropertyCard({ property, onSave }: PropertyCardProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Check if property is saved when user changes or property changes
  useEffect(() => {
    async function checkSaved() {
      if (!user) {
        setIsSaved(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('saved_properties')
          .select('id')
          .eq('renter_id', user.id)
          .eq('property_id', property.id)
          .maybeSingle();

        setIsSaved(!!data);
      } catch (error) {
        console.error('Error checking saved status:', error);
      }
    }

    checkSaved();
  }, [user, property.id]);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      router.push('/auth/login');
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
        toast.success('Removed from saved properties');
      } else {
        const { error } = await supabase
          .from('saved_properties')
          .insert([{
            renter_id: user.id,
            property_id: property.id,
          }]);

        if (error) throw error;
        setIsSaved(true);
        toast.success('Property saved!');
      }
      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving property:', error);
      toast.error('Failed to save property');
    } finally {
      setIsSaving(false);
    }
  };

  const primaryPhoto = getPrimaryPhoto(property.photos);
  const mainPhoto = primaryPhoto?.photo_url || '/api/placeholder/400/300';

  return (
    <Link href={`/properties/${property.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow group">
        <div className="relative h-48 bg-gray-100">
          {/* Property Image */}
          <Image
            src={mainPhoto}
            alt={property.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />

          {/* Verification Badge */}
          {property.landlord?.is_verified && (
            <Badge className="absolute top-2 left-2 bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}

          {/* Featured Badge */}
          {property.is_featured && (
            <Badge className="absolute top-2 right-12 bg-yellow-500">
              Featured
            </Badge>
          )}

          {/* Save Button */}
          <Button
            variant="ghost"
            size="icon"
            className={`absolute bottom-2 right-2 bg-white/90 hover:bg-white ${
              isSaved ? 'text-red-500' : 'text-gray-600'
            }`}
            onClick={handleSave}
            disabled={isSaving}
          >
            <Heart className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
          </Button>

          {/* Status Badge */}
          {property.status === 'rented' && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Badge variant="secondary" className="text-lg px-4 py-1">
                Rented
              </Badge>
            </div>
          )}
        </div>

        <CardContent className="p-4">
          {/* Price */}
          <div className="flex justify-between items-start mb-2">
            <span className="text-2xl font-bold text-primary">
              E{property.price.toLocaleString()}
              <span className="text-sm font-normal text-gray-500">/month</span>
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-lg mb-1 line-clamp-1">
            {property.title}
          </h3>

          {/* Location */}
          <div className="flex items-center text-gray-500 text-sm mb-3">
            <MapPin className="h-3 w-3 mr-1 shrink-0" />
            <span className="line-clamp-1">
              {property.location_suburb}, {property.location_city}
            </span>
          </div>

          {/* Details */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {property.bedrooms && (
              <div className="flex items-center">
                <Bed className="h-4 w-4 mr-1" />
                <span>{property.bedrooms} beds</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center">
                <Bath className="h-4 w-4 mr-1" />
                <span>{property.bathrooms} baths</span>
              </div>
            )}
          </div>

          {/* Amenities Preview */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {property.amenities.slice(0, 3).map((amenity) => (
                <Badge key={amenity} variant="outline" className="text-xs">
                  {amenity}
                </Badge>
              ))}
              {property.amenities.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{property.amenities.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
