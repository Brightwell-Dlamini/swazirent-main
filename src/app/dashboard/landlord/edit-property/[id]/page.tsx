// src/app/dashboard/landlord/edit-property/[id]/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { PropertyType, Property } from '@/types/property';
import { usePriceInsight } from '@/hooks/usePriceInsight';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import {
  ESWATINI_CITIES,
  PROPERTY_TYPES,
  ESWATINI_AMENITIES,
  ROOM_OPTIONS,
  BATH_OPTIONS,
} from '@/utils/constants';
import { normalizeEswatiniPhone, isValidEswatiniPhone, formatEswatiniPhone } from '@/utils/phone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  ChevronLeft,
  Loader2,
  Upload,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Helper to extract storage path from Supabase URL
const extractStoragePath = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    
    const publicIndex = pathParts.indexOf('public');
    if (publicIndex !== -1 && publicIndex < pathParts.length - 1) {
      return pathParts.slice(publicIndex + 1).join('/');
    }
    
    const bucketIndex = pathParts.indexOf('property-photos');
    if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
      return pathParts.slice(bucketIndex + 1).join('/');
    }
    
    return null;
  } catch {
    return null;
  }
};

export default function EditPropertyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);
  
  const { files: newPhotos, previews: newPhotoPreviews, addFiles: addNewPhotos, removeFile: removeNewPhoto } = useMediaUpload({
    maxFiles: 15,
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    property_type: '' as PropertyType | '',
    price: '',
    city: '',
    suburb: '',
    address: '',
    bedrooms: '',
    bathrooms: '',
    is_furnished: false,
    amenities: [] as string[],
    lease_terms: '',
    contact_whatsapp: '',
    contact_phone: '',
  });

  // Price insight
  const { priceInsight, checkingPrice, applySuggestedPrice } = usePriceInsight({
    price: formData.price,
    city: formData.city,
    propertyType: formData.property_type,
    bedrooms: formData.bedrooms,
    excludePropertyId: propertyId,
  });

  // Fetch property data
  useEffect(() => {
    async function fetchProperty() {
      if (!user || !propertyId) return;

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('properties')
          .select(`
            *,
            photos:property_photos (
              id,
              photo_url,
              caption,
              display_order,
              created_at
            )
          `)
          .eq('id', propertyId)
          .eq('landlord_id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            setError('Property not found or you do not have permission to edit it');
          } else {
            throw error;
          }
          return;
        }

        setProperty(data);
        setExistingPhotos(data.photos || []);

        // Populate form
        setFormData({
          title: data.title || '',
          description: data.description || '',
          property_type: data.property_type || '',
          price: data.price?.toString() || '',
          city: data.location_city || '',
          suburb: data.location_suburb || '',
          address: data.location_address || '',
          bedrooms: data.bedrooms?.toString() || '',
          bathrooms: data.bathrooms?.toString() || '',
          is_furnished: data.is_furnished || false,
          amenities: data.amenities || [],
          lease_terms: data.lease_terms || '',
          contact_whatsapp: data.contact_whatsapp || '',
          contact_phone: data.contact_phone || '',
        });
      } catch (error) {
        console.error('Error fetching property:', error);
        setError('Failed to load property details');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading && user) {
      fetchProperty();
    }
  }, [user, propertyId, authLoading]);

  const handleAmenityToggle = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    addNewPhotos(e.target.files || []);
  };

  const removeExistingPhoto = (photoId: string) => {
    setPhotosToDelete([...photosToDelete, photoId]);
  };

  const restoreExistingPhoto = (photoId: string) => {
    setPhotosToDelete(photosToDelete.filter((id) => id !== photoId));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, contact_phone: normalizeEswatiniPhone(value) }));
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, contact_whatsapp: normalizeEswatiniPhone(value) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    let uploadedPhotoUrls: string[] = [];

    try {
      // Validate required fields
      if (!formData.title || !formData.description || !formData.price ||
          !formData.city || !formData.suburb || !formData.property_type ||
          !formData.contact_phone) {
        setError('Please fill in all required fields');
        setSaving(false);
        return;
      }

      if (!isValidEswatiniPhone(formData.contact_phone)) {
        setError('Please enter a valid Eswatini phone number (e.g., +268 7600 0000)');
        setSaving(false);
        return;
      }

      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        setError('Please enter a valid price');
        setSaving(false);
        return;
      }

      // 1. Upload new photos
      const photoUrls: string[] = [];

      if (newPhotos.length > 0) {
        for (const photo of newPhotos) {
          const fileExt = photo.name.split('.').pop() || 'jpg';
          const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('property-photos')
            .upload(fileName, photo);

          if (uploadError) {
            // Clean up uploaded photos
            if (uploadedPhotoUrls.length > 0) {
              const paths = uploadedPhotoUrls.map(url => {
                const parts = url.split('/');
                const publicIndex = parts.indexOf('public');
                if (publicIndex !== -1) {
                  return parts.slice(publicIndex + 1).join('/');
                }
                return null;
              }).filter((path): path is string => path !== null);
              
              if (paths.length > 0) {
                await supabase.storage.from('property-photos').remove(paths);
              }
            }
            throw new Error(`Failed to upload photo: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from('property-photos')
            .getPublicUrl(fileName);

          photoUrls.push(publicUrl);
          uploadedPhotoUrls = [...photoUrls];
        }
      }

      // 2. Update property
      const { error: updateError } = await supabase
        .from('properties')
        .update({
          title: formData.title.trim(),
          description: formData.description.trim(),
          property_type: formData.property_type,
          price: price,
          location_city: formData.city,
          location_suburb: formData.suburb.trim(),
          location_address: formData.address.trim() || null,
          bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
          bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
          is_furnished: formData.is_furnished,
          amenities: formData.amenities,
          lease_terms: formData.lease_terms.trim() || null,
          contact_whatsapp: formData.contact_whatsapp.trim() || null,
          contact_phone: normalizeEswatiniPhone(formData.contact_phone.trim()),
          updated_at: new Date().toISOString(),
          country: 'Eswatini',
        })
        .eq('id', propertyId);

      if (updateError) {
        // Rollback: Delete newly uploaded photos
        if (uploadedPhotoUrls.length > 0) {
          const paths = uploadedPhotoUrls.map(url => {
            const parts = url.split('/');
            const publicIndex = parts.indexOf('public');
            if (publicIndex !== -1) {
              return parts.slice(publicIndex + 1).join('/');
            }
            return null;
          }).filter((path): path is string => path !== null);
          
          if (paths.length > 0) {
            await supabase.storage.from('property-photos').remove(paths);
          }
        }
        throw new Error(`Failed to update property: ${updateError.message}`);
      }

      // 3. Add new photos to database
      if (photoUrls.length > 0) {
        const currentPhotoCount = existingPhotos.length - photosToDelete.length;
        const photoRecords = photoUrls.map((url, index) => ({
          property_id: propertyId,
          photo_url: url,
          display_order: currentPhotoCount + index,
          caption: null,
        }));

        const { error: photosError } = await supabase
          .from('property_photos')
          .insert(photoRecords);

        if (photosError) {
          // Rollback: Delete uploaded photos from storage
          if (uploadedPhotoUrls.length > 0) {
            const paths = uploadedPhotoUrls.map(url => {
              const parts = url.split('/');
              const publicIndex = parts.indexOf('public');
              if (publicIndex !== -1) {
                return parts.slice(publicIndex + 1).join('/');
              }
              return null;
            }).filter((path): path is string => path !== null);
            
            if (paths.length > 0) {
              await supabase.storage.from('property-photos').remove(paths);
            }
          }
          throw new Error(`Failed to save photo records: ${photosError.message}`);
        }
      }

      // 4. Delete removed photos
      if (photosToDelete.length > 0) {
        for (const photoId of photosToDelete) {
          const photo = existingPhotos.find(p => p.id === photoId);
          if (photo) {
            // Delete from database
            await supabase
              .from('property_photos')
              .delete()
              .eq('id', photoId);

            // Delete from storage
            const storagePath = extractStoragePath(photo.photo_url);
            if (storagePath) {
              await supabase.storage
                .from('property-photos')
                .remove([storagePath]);
            }
          }
        }
      }

      toast.success('Property updated successfully!');
      router.push(`/dashboard/landlord/properties/${propertyId}`);
    } catch (error: unknown) {
      console.error('Update error:', error);
      if (error instanceof Error) {
        setError(error.message);
        toast.error(error.message);
      } else {
        setError('An unknown error occurred');
        toast.error('An unknown error occurred');
      }
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-100">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-2xl font-bold mb-2">Property Not Found</h2>
            <p className="text-gray-500 mb-4">
              {error || "The property you're looking for doesn't exist or you don't have permission to edit it."}
            </p>
            <Button asChild>
              <Link href="/dashboard/landlord">
                <ChevronLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayPhone = formatEswatiniPhone(formData.contact_phone);

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href={`/dashboard/landlord/properties/${propertyId}`}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Property
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Edit Property</h1>
        <p className="text-gray-600">Update your property listing in Eswatini</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Basic Information */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Listing Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Spacious 2-Bedroom in Ngwane Park"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="property_type">Property Type *</Label>
                  <Select
                    value={formData.property_type}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        property_type: value as PropertyType,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select property type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type} className="capitalize">
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="price">Monthly Rent (E) *</Label>
                  <Input
                    id="price"
                    type="number"
                    min="1"
                    step="1"
                    placeholder="3500"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    required
                  />
                </div>

                {checkingPrice && (
                  <div className="mt-2 flex items-center text-sm text-gray-500">
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    Analyzing Eswatini market prices...
                  </div>
                )}

                {priceInsight && !checkingPrice && priceInsight.count > 0 && (
                  <div
                    className={`mt-3 p-3 rounded-lg border ${
                      priceInsight.suggestion === 'good'
                        ? 'bg-green-50 border-green-200'
                        : priceInsight.suggestion === 'high'
                          ? 'bg-yellow-50 border-yellow-200'
                          : priceInsight.suggestion === 'low'
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {priceInsight.suggestion === 'good' && (
                        <Minus className="h-5 w-5 text-green-600 mt-0.5" />
                      )}
                      {priceInsight.suggestion === 'high' && (
                        <TrendingUp className="h-5 w-5 text-yellow-600 mt-0.5" />
                      )}
                      {priceInsight.suggestion === 'low' && (
                        <TrendingDown className="h-5 w-5 text-blue-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Based on {priceInsight.count} similar properties in{' '}
                          {formData.city}, Eswatini
                        </p>
                        <p className="text-sm mt-1">{priceInsight.message}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                          <span>
                            Range: E{priceInsight.min.toLocaleString()} - E
                            {priceInsight.max.toLocaleString()}
                          </span>
                          <span>
                            Avg: E
                            {Math.round(priceInsight.average).toLocaleString()}
                          </span>
                        </div>

                        {priceInsight.suggestion !== 'good' && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="mt-2 h-auto p-0 text-primary"
                            onClick={() => {
                              const suggested = applySuggestedPrice();
                              if (suggested) {
                                setFormData(prev => ({ ...prev, price: suggested.toString() }));
                                toast.success('Suggested price applied');
                              }
                            }}
                          >
                            Apply suggested price
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {priceInsight && priceInsight.count === 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    No similar properties found in {formData.city}, Eswatini to compare pricing.
                  </p>
                )}

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your property in detail..."
                    rows={6}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">Location</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="city">City/Town *</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value) =>
                      setFormData({ ...formData, city: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select city in Eswatini" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESWATINI_CITIES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="suburb">Suburb/Area *</Label>
                  <Input
                    id="suburb"
                    placeholder="e.g., Ngwane Park"
                    value={formData.suburb}
                    onChange={(e) =>
                      setFormData({ ...formData, suburb: e.target.value })
                    }
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="address">Street Address (Optional)</Label>
                  <Input
                    id="address"
                    placeholder="123 Main Street"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    You can choose to show exact address only after contact
                  </p>
                </div>
              </div>
            </div>

            {/* Details & Amenities */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">Property Details & Amenities</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bedrooms">Bedrooms</Label>
                    <Select
                      value={formData.bedrooms}
                      onValueChange={(value) =>
                        setFormData({ ...formData, bedrooms: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROOM_OPTIONS.map((num) => (
                          <SelectItem key={num} value={num}>
                            {num === '0' ? 'None' : num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="bathrooms">Bathrooms</Label>
                    <Select
                      value={formData.bathrooms}
                      onValueChange={(value) =>
                        setFormData({ ...formData, bathrooms: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {BATH_OPTIONS.map((num) => (
                          <SelectItem key={num} value={num}>
                            {num === '0' ? 'None' : num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="furnished"
                    checked={formData.is_furnished}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_furnished: checked as boolean })
                    }
                  />
                  <Label htmlFor="furnished">Furnished</Label>
                </div>

                <div>
                  <Label>Amenities</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {ESWATINI_AMENITIES.map((amenity) => (
                      <div key={amenity} className="flex items-center space-x-2">
                        <Checkbox
                          id={`amenity-${amenity}`}
                          checked={formData.amenities.includes(amenity)}
                          onCheckedChange={() => handleAmenityToggle(amenity)}
                        />
                        <Label htmlFor={`amenity-${amenity}`} className="text-sm">
                          {amenity}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="lease_terms">Lease Terms</Label>
                  <Textarea
                    id="lease_terms"
                    placeholder="e.g., 12-month lease, 1 month deposit, immediate move-in..."
                    rows={3}
                    value={formData.lease_terms}
                    onChange={(e) =>
                      setFormData({ ...formData, lease_terms: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Photos */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">Photos</h2>
              <div>
                <Label>Property Photos (Max 15)</Label>
                <div className="mt-2">
                  {/* Existing Photos */}
                  {existingPhotos.filter(p => !photosToDelete.includes(p.id)).length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">Current Photos</p>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                        {existingPhotos
                          .filter(p => !photosToDelete.includes(p.id))
                          .sort((a, b) => a.display_order - b.display_order)
                          .map((photo) => (
                            <div key={photo.id} className="relative aspect-square">
                              <Image
                                src={photo.photo_url}
                                alt={`Property photo`}
                                fill
                                className="object-cover rounded-lg"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6"
                                onClick={() => removeExistingPhoto(photo.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              {photo.display_order === 0 && (
                                <Badge className="absolute bottom-2 left-2 bg-primary">
                                  Cover
                                </Badge>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Photos marked for deletion */}
                  {photosToDelete.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-red-500 mb-2">Photos to delete</p>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                        {photosToDelete.map((photoId) => {
                          const photo = existingPhotos.find(p => p.id === photoId);
                          if (!photo) return null;
                          return (
                            <div key={photoId} className="relative aspect-square">
                              <Image
                                src={photo.photo_url}
                                alt={`Photo to delete`}
                                fill
                                className="object-cover rounded-lg opacity-50"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 bg-green-500 hover:bg-green-600"
                                onClick={() => restoreExistingPhoto(photoId)}
                              >
                                <X className="h-3 w-3 text-white" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* New Photos */}
                  {newPhotoPreviews.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">New Photos</p>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                        {newPhotoPreviews.map((preview, index) => (
                          <div key={index} className="relative aspect-square">
                            <Image
                              src={preview}
                              alt={`New photo ${index + 1}`}
                              fill
                              className="object-cover rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6"
                              onClick={() => removeNewPhoto(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload Button */}
                  {(existingPhotos.length - photosToDelete.length + newPhotos.length) < 15 && (
                    <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors p-4">
                      <Upload className="h-6 w-6 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">Upload New Photos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                    </label>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    Upload clear photos of the property. First photo will be the cover.
                    {existingPhotos.length - photosToDelete.length + newPhotos.length > 0 && (
                      <span className="ml-2">
                        ({existingPhotos.length - photosToDelete.length + newPhotos.length}/15)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="contact_phone">Phone Number *</Label>
                  <Input
                    id="contact_phone"
                    type="tel"
                    placeholder="+268 7600 0000"
                    value={formData.contact_phone}
                    onChange={handlePhoneChange}
                    required
                  />
                  {formData.contact_phone && (
                    <p className="text-sm text-gray-500 mt-1">
                      Will be displayed as: {displayPhone}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contact_whatsapp">WhatsApp (Optional)</Label>
                  <Input
                    id="contact_whatsapp"
                    type="tel"
                    placeholder="+268 7600 0000"
                    value={formData.contact_whatsapp}
                    onChange={handleWhatsAppChange}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            asChild
          >
            <Link href={`/dashboard/landlord/properties/${propertyId}`}>
              Cancel
            </Link>
          </Button>

          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
