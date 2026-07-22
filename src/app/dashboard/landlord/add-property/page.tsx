// src/app/dashboard/landlord/add-property/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useVerification } from '@/hooks/useVerification';
import { usePriceInsight } from '@/hooks/usePriceInsight';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { supabase } from '@/lib/supabase';
import { PropertyType } from '@/types/property';
import {
  ESWATINI_CITIES,
  PROPERTY_TYPES,
  ESWATINI_AMENITIES,
  ROOM_OPTIONS,
  BATH_OPTIONS,
} from '@/utils/constants';
import { normalizeEswatiniPhone, isValidEswatiniPhone } from '@/utils/phone';
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
  ChevronRight,
  Loader2,
  Upload,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function AddPropertyPage() {
  const { user, userType, isLoading: authLoading } = useAuth();
  const { isLandlordVerified, isLandlordPending, refreshVerification } = useVerification();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  const { files: photos, previews: photoPreviews, addFiles: addPhotos, removeFile: removePhoto, count: photoCount } = useMediaUpload({
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
    bedrooms: '0',
    bathrooms: '0',
    is_furnished: false,
    amenities: [] as string[],
    lease_terms: '',
    contact_whatsapp: '',
    contact_phone: '',
  });

  const totalSteps = 4;

  // Price insight hook
  const { priceInsight, checkingPrice, applySuggestedPrice } = usePriceInsight({
    price: formData.price,
    city: formData.city,
    propertyType: formData.property_type,
    bedrooms: formData.bedrooms,
  });

  // Check auth and permissions
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (userType && userType !== 'landlord') {
      router.push('/dashboard');
      return;
    }

    if (userType === null) {
      return;
    }

    setIsAuthorized(true);
  }, [user, userType, authLoading, router]);

  // Refresh verification if pending
  useEffect(() => {
    if (user && userType === 'landlord' && isLandlordPending) {
      refreshVerification();
    }
  }, [user, userType, isLandlordPending, refreshVerification]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleAmenityToggle = useCallback((amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  }, []);

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const normalized = normalizeEswatiniPhone(value);
    setFormData((prev) => ({ ...prev, contact_phone: normalized }));
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!formData.title.trim()) {
      setError('Please enter a listing title');
      return false;
    }
    if (!formData.description.trim()) {
      setError('Please enter a description');
      return false;
    }
    if (!formData.property_type) {
      setError('Please select a property type');
      return false;
    }
    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price <= 0) {
      setError('Please enter a valid price greater than 0');
      return false;
    }
    if (!formData.city) {
      setError('Please select a city in Eswatini');
      return false;
    }
    if (!formData.suburb.trim()) {
      setError('Please enter a suburb');
      return false;
    }
    if (!formData.contact_phone.trim()) {
      setError('Please enter a contact phone number');
      return false;
    }
    if (!isValidEswatiniPhone(formData.contact_phone)) {
      setError('Please enter a valid Eswatini phone number (e.g., +268 7600 0000)');
      return false;
    }
    return true;
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    if (!isLandlordVerified) {
      setError('Your landlord account must be verified before you can list properties in Eswatini.');
      return;
    }

    if (!user) {
      setError('You must be logged in to list a property');
      return;
    }

    setLoading(true);
    let uploadedPhotoUrls: string[] = [];

    try {
      // 1. Upload photos
      const photoUrls: string[] = [];

      if (photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          const photo = photos[i];
          const fileExt = photo.name.split('.').pop() || 'jpg';
          const fileName = `${user.id}/${Date.now()}-${i}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('property-photos')
            .upload(fileName, photo);

          if (uploadError) {
            // Clean up any uploaded photos
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
            throw new Error(`Failed to upload photo ${i + 1}: ${uploadError.message}`);
          }

          const { data: { publicUrl } } = supabase.storage
            .from('property-photos')
            .getPublicUrl(fileName);

          photoUrls.push(publicUrl);
          uploadedPhotoUrls = [...photoUrls];
        }
      }

      // 2. Create property
      const propertyData = {
        landlord_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        property_type: formData.property_type as PropertyType,
        price: parseFloat(formData.price),
        location_city: formData.city,
        location_suburb: formData.suburb.trim(),
        location_address: formData.address.trim() || null,
        bedrooms: formData.bedrooms !== '0' ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms !== '0' ? parseFloat(formData.bathrooms) : null,
        is_furnished: formData.is_furnished,
        amenities: formData.amenities,
        lease_terms: formData.lease_terms.trim() || null,
        contact_whatsapp: formData.contact_whatsapp.trim() || null,
        contact_phone: normalizeEswatiniPhone(formData.contact_phone.trim()),
        status: 'pending',
        views: 0,
        is_featured: false,
        country: 'Eswatini',
      };

      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert([propertyData])
        .select()
        .single();

      if (propertyError) {
        // Clean up photos
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
        throw new Error(`Failed to create property: ${propertyError.message}`);
      }

      if (!property) {
        throw new Error('Property was created but no data was returned');
      }

      // 3. Add photos to property_photos table
      if (photoUrls.length > 0) {
        const photoRecords = photoUrls.map((url, index) => ({
          property_id: property.id,
          photo_url: url,
          display_order: index,
          caption: null,
        }));

        const { error: photosError } = await supabase
          .from('property_photos')
          .insert(photoRecords);

        if (photosError) {
          // Non-critical failure - property created but photos failed
          toast.warning('Property created but failed to save photo records. You can add photos later.');
        }
      }

      toast.success('Property submitted for review!');
      router.push('/dashboard/landlord');
    } catch (error: unknown) {
      console.error('Submission error:', error);
      if (error instanceof Error) {
        setError(error.message);
        toast.error(error.message);
      } else {
        setError('An unknown error occurred');
        toast.error('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Listing Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Spacious 2-Bedroom in Ngwane Park"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <Label htmlFor="property_type">Property Type *</Label>
                <Select
                  value={formData.property_type}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      property_type: value as PropertyType,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        className="capitalize"
                      >
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
                    setFormData((prev) => ({ ...prev, price: e.target.value }))
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
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                  required
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Location</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="city">City/Town *</Label>
                <Select
                  value={formData.city}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, city: value }))
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
                    setFormData((prev) => ({ ...prev, suburb: e.target.value }))
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
                    setFormData((prev) => ({ ...prev, address: e.target.value }))
                  }
                />
                <p className="text-sm text-gray-500 mt-1">
                  You can choose to show exact address only after contact
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">
              Property Details & Amenities
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Select
                  value={formData.bedrooms}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, bedrooms: value }))
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
                    setFormData((prev) => ({ ...prev, bathrooms: value }))
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
                  setFormData((prev) => ({ ...prev, is_furnished: checked as boolean }))
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
                      id={amenity}
                      checked={formData.amenities.includes(amenity)}
                      onCheckedChange={() => handleAmenityToggle(amenity)}
                    />
                    <Label htmlFor={amenity} className="text-sm">
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
                  setFormData((prev) => ({ ...prev, lease_terms: e.target.value }))
                }
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Photos & Contact</h2>

            <div>
              <Label>Property Photos (Max 15)</Label>
              <div className="mt-2">
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mb-4">
                  {photoPreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square">
                      <Image
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        fill
                        className="object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => removePhoto(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                      {index === 0 && (
                        <Badge className="absolute bottom-2 left-2 bg-primary">
                          Cover
                        </Badge>
                      )}
                    </div>
                  ))}

                  {photoCount < 15 && (
                    <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <Upload className="h-6 w-6 text-gray-400 mb-1" />
                      <span className="text-xs text-gray-500">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => addPhotos(e.target.files || [])}
                      />
                    </label>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  Upload clear photos of the property. First photo will be the cover.
                  {photoCount > 0 && ` (${photoCount}/15)`}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium">Contact Information</h3>

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
                <p className="text-sm text-gray-500 mt-1">
                  Enter a valid Eswatini phone number
                </p>
              </div>

              <div>
                <Label htmlFor="contact_whatsapp">WhatsApp (Optional)</Label>
                <Input
                  id="contact_whatsapp"
                  type="tel"
                  placeholder="+268 7600 0000"
                  value={formData.contact_whatsapp}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contact_whatsapp: normalizeEswatiniPhone(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Listing Summary</h3>
                <dl className="space-y-2">
                  <div className="flex">
                    <dt className="w-24 text-sm text-gray-500">Title:</dt>
                    <dd className="text-sm">{formData.title || 'Not set'}</dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-sm text-gray-500">Price:</dt>
                    <dd className="text-sm font-semibold">
                      E{parseFloat(formData.price || '0').toLocaleString()}
                      /month
                      {priceInsight?.suggestion === 'good' && (
                        <span className="ml-2 text-xs text-green-600">
                          ✓ Good price
                        </span>
                      )}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-sm text-gray-500">Location:</dt>
                    <dd className="text-sm">
                      {formData.suburb || 'Not set'}, {formData.city || 'Not set'}, Eswatini
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-sm text-gray-500">Type:</dt>
                    <dd className="text-sm capitalize">
                      {formData.property_type || 'Not set'}
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-sm text-gray-500">Bed/Bath:</dt>
                    <dd className="text-sm">
                      {formData.bedrooms === '0' ? '?' : formData.bedrooms} bed • {formData.bathrooms === '0' ? '?' : formData.bathrooms} bath
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-sm text-gray-500">Amenities:</dt>
                    <dd className="text-sm">
                      {formData.amenities.length} selected
                    </dd>
                  </div>
                  <div className="flex">
                    <dt className="w-24 text-sm text-gray-500">Photos:</dt>
                    <dd className="text-sm">{photoCount} uploaded</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800">
                ℹ️ Your property will be reviewed by an admin before going live in Eswatini.
                You will be notified once approved.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  // Show loading state
  if (authLoading || isAuthorized === null) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  // Pending verification
  if (isLandlordPending) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard/landlord">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Add New Property</h1>
          <p className="text-gray-600">List your property on Ekhaya</p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-yellow-600 animate-spin" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Verification Pending</h2>
            <p className="text-gray-600 mb-4">
              Your landlord account is being verified. You will be able to list properties in Eswatini once approved.
            </p>
            <Button asChild>
              <Link href="/dashboard/landlord">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Unverified landlord
  if (!isLandlordVerified) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/dashboard/landlord">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Add New Property</h1>
          <p className="text-gray-600">List your property on Ekhaya</p>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Verification Required</h2>
            <p className="text-gray-600 mb-4">
              Your landlord account must be verified before you can list properties in Eswatini.
            </p>
            <Button asChild>
              <Link href="/dashboard/landlord/verify">Start Verification</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/landlord">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Add New Property</h1>
        <p className="text-gray-600">List your property on Ekhaya - Eswatini&apos;s property marketplace</p>
      </div>

      <div className="mb-8">
        <div className="flex justify-between">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex-1 text-center ${
                step < currentStep
                  ? 'text-primary'
                  : step === currentStep
                    ? 'text-primary font-semibold'
                    : 'text-gray-400'
              }`}
            >
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2 ${
                  step < currentStep
                    ? 'bg-primary text-white'
                    : step === currentStep
                      ? 'border-2 border-primary text-primary'
                      : 'border-2 border-gray-300 text-gray-300'
                }`}
              >
                {step}
              </div>
              <span className="text-sm hidden md:block">
                {step === 1 && 'Basic Info'}
                {step === 2 && 'Location'}
                {step === 3 && 'Details'}
                {step === 4 && 'Photos'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="p-6">{renderStep()}</CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep < totalSteps ? (
            <Button type="button" onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit for Review'
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
