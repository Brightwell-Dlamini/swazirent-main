// src/app/dashboard/landlord/edit-property/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  Property, TenureType, AssetCategory, ListingIntent, FitOut,
  TENURE_CONFIG, ASSET_CATEGORY_LABELS, LISTING_INTENT_LABELS,
  RESIDENTIAL_SUBTYPE_LABELS, LAND_SUBTYPE_LABELS, COMMERCIAL_SUBTYPE_LABELS,
  FIT_OUT_LABELS, defaultPricePeriod, subtypeToLegacyPropertyType, inferAssetCategory,
  ResidentialSubtype, LandSubtype, CommercialSubtype,
} from '@/types/property';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import {
  ESWATINI_CITIES, TENURE_TYPES, RESIDENTIAL_SUBTYPES, LAND_SUBTYPES,
  COMMERCIAL_SUBTYPES, FIT_OUT_OPTIONS, RESIDENTIAL_AMENITIES, LAND_AMENITIES,
  COMMERCIAL_AMENITIES, ROOM_OPTIONS, BATH_OPTIONS, MAX_PHOTOS,
} from '@/utils/constants';
import { normalizeEswatiniPhone, isValidEswatiniPhone, formatEswatiniPhone } from '@/utils/phone';
import { mapPropertyRow } from '@/lib/mapProperty';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ChevronLeft, Loader2, Upload, X } from 'lucide-react';
import { TenureBadge } from '@/components/properties/TenureBadge';

const extractStoragePath = (url: string): string | null => {
  try {
    const pathParts = new URL(url).pathname.split('/');
    const publicIndex = pathParts.indexOf('public');
    if (publicIndex !== -1) return pathParts.slice(publicIndex + 1).join('/');
    const bucketIndex = pathParts.indexOf('property-photos');
    if (bucketIndex !== -1) return pathParts.slice(bucketIndex + 1).join('/');
    return null;
  } catch {
    return null;
  }
};

export default function EditPropertyPage() {
  const { user, userType, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;
  const isAdmin = userType === 'admin';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<any[]>([]);
  const [photosToDelete, setPhotosToDelete] = useState<string[]>([]);

  const {
    files: newPhotos,
    previews: newPhotoPreviews,
    addFiles: addNewPhotos,
    removeFile: removeNewPhoto,
  } = useMediaUpload({ maxFiles: MAX_PHOTOS });

  const [formData, setFormData] = useState({
    asset_category: 'residential' as AssetCategory,
    listing_intent: 'long_rent' as ListingIntent,
    property_subtype: '',
    title: '',
    description: '',
    tenure_type: 'unsure' as TenureType,
    price: '',
    city: '',
    suburb: '',
    address: '',
    bedrooms: '1',
    bathrooms: '1',
    is_furnished: false,
    land_size_ha: '',
    is_fenced: false,
    has_road_access: false,
    has_water: false,
    has_electricity: false,
    has_sewer: false,
    zoning_notes: '',
    floor_area_sqm: '',
    floors: '',
    parking_bays: '',
    fit_out: '' as FitOut | '',
    has_loading_bay: false,
    has_street_frontage: false,
    power_notes: '',
    amenities: [] as string[],
    lease_terms: '',
    contact_whatsapp: '',
    contact_phone: '',
  });

  const isLand = formData.asset_category === 'land';
  const isCommercial = formData.asset_category === 'commercial';
  const isResidential = formData.asset_category === 'residential';

  useEffect(() => {
    async function fetchProperty() {
      if (!user || !propertyId) return;
      try {
        setLoading(true);
        let query = supabase
          .from('properties')
          .select(`*, photos:property_photos (id, photo_url, caption, display_order, created_at)`)
          .eq('id', propertyId);

        if (!isAdmin) {
          query = query.eq('landlord_id', user.id);
        }

        const { data, error: fetchError } = await query.single();

        if (fetchError) {
          setError(
            fetchError.code === 'PGRST116'
              ? 'Property not found or you do not have permission'
              : fetchError.message
          );
          return;
        }

        const mapped = mapPropertyRow(data);
        setProperty(mapped);
        setExistingPhotos(data.photos || []);

        const cat = inferAssetCategory(mapped);
        setFormData({
          asset_category: cat,
          listing_intent: (mapped.listing_intent as ListingIntent) || 'long_rent',
          property_subtype: mapped.property_subtype || mapped.property_type || '',
          title: mapped.title || '',
          description: mapped.description || '',
          tenure_type: (mapped.tenure_type as TenureType) || 'unsure',
          price: mapped.price?.toString() || '',
          city: mapped.location_city || '',
          suburb: mapped.location_suburb || '',
          address: mapped.location_address || '',
          bedrooms: mapped.bedrooms?.toString() || '1',
          bathrooms: mapped.bathrooms?.toString() || '1',
          is_furnished: mapped.is_furnished || false,
          land_size_ha: mapped.land_size_ha?.toString() || '',
          is_fenced: mapped.is_fenced || false,
          has_road_access: mapped.has_road_access || false,
          has_water: mapped.has_water || false,
          has_electricity: mapped.has_electricity || false,
          has_sewer: mapped.has_sewer || false,
          zoning_notes: mapped.zoning_notes || '',
          floor_area_sqm: mapped.floor_area_sqm?.toString() || '',
          floors: mapped.floors?.toString() || '',
          parking_bays: mapped.parking_bays?.toString() || '',
          fit_out: (mapped.fit_out as FitOut) || '',
          has_loading_bay: mapped.has_loading_bay || false,
          has_street_frontage: mapped.has_street_frontage || false,
          power_notes: mapped.power_notes || '',
          amenities: mapped.amenities || [],
          lease_terms: mapped.lease_terms || '',
          contact_whatsapp: mapped.contact_whatsapp || '',
          contact_phone: mapped.contact_phone || '',
        });
      } catch (e) {
        console.error(e);
        setError('Failed to load property');
      } finally {
        setLoading(false);
      }
    }
    if (!authLoading && user) fetchProperty();
  }, [user, propertyId, authLoading, isAdmin]);

  const handleAmenityToggle = (amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (
        !formData.title ||
        !formData.description ||
        !formData.price ||
        !formData.city ||
        !formData.suburb ||
        !formData.contact_phone
      ) {
        setError('Fill in all required fields');
        setSaving(false);
        return;
      }
      const normalizedPhone = normalizeEswatiniPhone(formData.contact_phone);
      if (!isValidEswatiniPhone(normalizedPhone)) {
        setError('Valid Eswatini phone required');
        setSaving(false);
        return;
      }
      const price = parseFloat(formData.price);
      if (isNaN(price) || price <= 0) {
        setError('Valid price required');
        setSaving(false);
        return;
      }
      if (isLand) {
        const ha = parseFloat(formData.land_size_ha);
        if (!formData.land_size_ha || isNaN(ha) || ha <= 0) {
          setError('Land size (ha) required');
          setSaving(false);
          return;
        }
      }
      if (isCommercial) {
        const area = parseFloat(formData.floor_area_sqm);
        if (!formData.floor_area_sqm || isNaN(area) || area <= 0) {
          setError('Floor area (m²) required');
          setSaving(false);
          return;
        }
      }

      const photoUrls: string[] = [];
      if (newPhotos.length > 0) {
        for (const photo of newPhotos) {
          const ext = photo.name.split('.').pop() || 'jpg';
          const ownerFolder = property?.landlord_id || user?.id;
          const fileName = `${ownerFolder}/${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from('property-photos')
            .upload(fileName, photo);
          if (uploadError) throw new Error(uploadError.message);
          const {
            data: { publicUrl },
          } = supabase.storage.from('property-photos').getPublicUrl(fileName);
          photoUrls.push(publicUrl);
        }
      }

      const subtype = formData.property_subtype || 'other_residential';
      const update: Record<string, unknown> = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        asset_category: formData.asset_category,
        listing_intent: formData.listing_intent,
        property_subtype: subtype,
        property_type: subtypeToLegacyPropertyType(subtype),
        listing_type: isLand ? 'land' : formData.listing_intent === 'sale' ? 'buy' : 'rent',
        price_period: defaultPricePeriod(formData.listing_intent),
        tenure_type: formData.tenure_type,
        price,
        location_city: formData.city,
        location_suburb: formData.suburb.trim(),
        location_address: formData.address.trim() || null,
        amenities: formData.amenities,
        lease_terms: formData.lease_terms.trim() || null,
        contact_whatsapp: formData.contact_whatsapp.trim() || null,
        contact_phone: normalizedPhone,
        updated_at: new Date().toISOString(),
      };

      if (isResidential) {
        update.bedrooms = formData.bedrooms ? parseInt(formData.bedrooms, 10) : null;
        update.bathrooms = formData.bathrooms ? parseFloat(formData.bathrooms) : null;
        update.is_furnished = formData.is_furnished;
      } else if (isLand) {
        update.land_size_ha = parseFloat(formData.land_size_ha) || null;
        update.is_fenced = formData.is_fenced;
        update.has_road_access = formData.has_road_access;
        update.has_water = formData.has_water;
        update.has_electricity = formData.has_electricity;
        update.has_sewer = formData.has_sewer;
        update.zoning_notes = formData.zoning_notes.trim() || null;
        update.bedrooms = null;
        update.bathrooms = null;
      } else if (isCommercial) {
        update.floor_area_sqm = parseFloat(formData.floor_area_sqm) || null;
        update.floors = formData.floors ? parseInt(formData.floors, 10) : null;
        update.parking_bays = formData.parking_bays ? parseInt(formData.parking_bays, 10) : null;
        update.fit_out = formData.fit_out || null;
        update.has_loading_bay = formData.has_loading_bay;
        update.has_street_frontage = formData.has_street_frontage;
        update.power_notes = formData.power_notes.trim() || null;
      }

      const { error: updateError } = await supabase
        .from('properties')
        .update(update)
        .eq('id', propertyId);
      if (updateError) throw new Error(updateError.message);

      if (photoUrls.length > 0) {
        const currentCount = existingPhotos.length - photosToDelete.length;
        await supabase.from('property_photos').insert(
          photoUrls.map((url, index) => ({
            property_id: propertyId,
            photo_url: url,
            display_order: currentCount + index,
            caption: null,
          }))
        );
      }

      for (const photoId of photosToDelete) {
        const photo = existingPhotos.find((p) => p.id === photoId);
        if (photo) {
          await supabase.from('property_photos').delete().eq('id', photoId);
          const path = extractStoragePath(photo.photo_url);
          if (path) await supabase.storage.from('property-photos').remove([path]);
        }
      }

      toast.success('Listing updated');
      router.push(`/dashboard/landlord/properties/${propertyId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-2xl font-bold mb-2">Not found</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button asChild>
              <Link href={isAdmin ? '/dashboard/admin' : '/dashboard/landlord'}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const amenityList = isLand
    ? LAND_AMENITIES
    : isCommercial
      ? COMMERCIAL_AMENITIES
      : RESIDENTIAL_AMENITIES;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button variant="ghost" asChild className="mb-4">
        <Link href={`/dashboard/landlord/properties/${propertyId}`}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Link>
      </Button>
      <h1 className="text-3xl font-bold mb-1">Edit listing</h1>
      {isAdmin && (
        <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">Editing as admin</p>
      )}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Badge variant="outline">{ASSET_CATEGORY_LABELS[formData.asset_category]}</Badge>
        <Badge variant="outline">{LISTING_INTENT_LABELS[formData.listing_intent]}</Badge>
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Basics</h2>
              <div>
                <Label>Offer *</Label>
                <Select
                  value={formData.listing_intent}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, listing_intent: v as ListingIntent }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">For sale</SelectItem>
                    <SelectItem value="long_rent">Long-term rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Subtype *</Label>
                <Select
                  value={formData.property_subtype}
                  onValueChange={(v) => setFormData((p) => ({ ...p, property_subtype: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Subtype" />
                  </SelectTrigger>
                  <SelectContent>
                    {isResidential &&
                      RESIDENTIAL_SUBTYPES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {RESIDENTIAL_SUBTYPE_LABELS[s as ResidentialSubtype]}
                        </SelectItem>
                      ))}
                    {isLand &&
                      LAND_SUBTYPES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {LAND_SUBTYPE_LABELS[s as LandSubtype]}
                        </SelectItem>
                      ))}
                    {isCommercial &&
                      COMMERCIAL_SUBTYPES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {COMMERCIAL_SUBTYPE_LABELS[s as CommercialSubtype]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Tenure *</Label>
                <Select
                  value={formData.tenure_type}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, tenure_type: v as TenureType }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TENURE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {TENURE_CONFIG[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-2">
                  <TenureBadge tenure={formData.tenure_type} size="md" />
                </div>
              </div>
              <div>
                <Label>
                  {formData.listing_intent === 'sale' ? 'Sale price (E) *' : 'Monthly rent (E) *'}
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.price}
                  onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Description *</Label>
                <Textarea
                  rows={5}
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <h2 className="text-xl font-semibold">Location</h2>
              <div>
                <Label>City *</Label>
                <Select
                  value={formData.city}
                  onValueChange={(v) => setFormData((p) => ({ ...p, city: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESWATINI_CITIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Suburb *</Label>
                <Input
                  value={formData.suburb}
                  onChange={(e) => setFormData((p) => ({ ...p, suburb: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <h2 className="text-xl font-semibold">Details</h2>

              {isResidential && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Bedrooms</Label>
                      <Select
                        value={formData.bedrooms}
                        onValueChange={(v) => setFormData((p) => ({ ...p, bedrooms: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROOM_OPTIONS.map((n) => (
                            <SelectItem key={n} value={n}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Bathrooms</Label>
                      <Select
                        value={formData.bathrooms}
                        onValueChange={(v) => setFormData((p) => ({ ...p, bathrooms: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BATH_OPTIONS.map((n) => (
                            <SelectItem key={n} value={n}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="furn"
                      checked={formData.is_furnished}
                      onCheckedChange={(c) => setFormData((p) => ({ ...p, is_furnished: !!c }))}
                    />
                    <Label htmlFor="furn">Furnished</Label>
                  </div>
                </>
              )}

              {isLand && (
                <>
                  <div>
                    <Label>Size (ha) *</Label>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={formData.land_size_ha}
                      onChange={(e) => setFormData((p) => ({ ...p, land_size_ha: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="fenced"
                      checked={formData.is_fenced}
                      onCheckedChange={(c) => setFormData((p) => ({ ...p, is_fenced: !!c }))}
                    />
                    <Label htmlFor="fenced">Fenced</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        ['has_road_access', 'Road access'],
                        ['has_water', 'Water'],
                        ['has_electricity', 'Electricity'],
                        ['has_sewer', 'Sewer'],
                      ] as const
                    ).map(([k, l]) => (
                      <div key={k} className="flex items-center space-x-2">
                        <Checkbox
                          id={k}
                          checked={formData[k]}
                          onCheckedChange={(c) => setFormData((p) => ({ ...p, [k]: !!c }))}
                        />
                        <Label htmlFor={k}>{l}</Label>
                      </div>
                    ))}
                  </div>
                  <div>
                    <Label>Zoning notes</Label>
                    <Textarea
                      rows={2}
                      value={formData.zoning_notes}
                      onChange={(e) => setFormData((p) => ({ ...p, zoning_notes: e.target.value }))}
                    />
                  </div>
                </>
              )}

              {isCommercial && (
                <>
                  <div>
                    <Label>Floor area (m²) *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.floor_area_sqm}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, floor_area_sqm: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Floors</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.floors}
                        onChange={(e) => setFormData((p) => ({ ...p, floors: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Parking bays</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.parking_bays}
                        onChange={(e) => setFormData((p) => ({ ...p, parking_bays: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Fit-out</Label>
                    <Select
                      value={formData.fit_out || undefined}
                      onValueChange={(v) => setFormData((p) => ({ ...p, fit_out: v as FitOut }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Optional" />
                      </SelectTrigger>
                      <SelectContent>
                        {FIT_OUT_OPTIONS.map((f) => (
                          <SelectItem key={f} value={f}>
                            {FIT_OUT_LABELS[f]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="load"
                        checked={formData.has_loading_bay}
                        onCheckedChange={(c) =>
                          setFormData((p) => ({ ...p, has_loading_bay: !!c }))
                        }
                      />
                      <Label htmlFor="load">Loading bay</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="front"
                        checked={formData.has_street_frontage}
                        onCheckedChange={(c) =>
                          setFormData((p) => ({ ...p, has_street_frontage: !!c }))
                        }
                      />
                      <Label htmlFor="front">Street frontage</Label>
                    </div>
                  </div>
                  <div>
                    <Label>Power notes</Label>
                    <Input
                      value={formData.power_notes}
                      onChange={(e) => setFormData((p) => ({ ...p, power_notes: e.target.value }))}
                    />
                  </div>
                </>
              )}

              <div>
                <Label>Amenities / features</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                  {amenityList.map((a) => (
                    <div key={a} className="flex items-center space-x-2">
                      <Checkbox
                        id={a}
                        checked={formData.amenities.includes(a)}
                        onCheckedChange={() => handleAmenityToggle(a)}
                      />
                      <Label htmlFor={a} className="text-sm">
                        {a}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {formData.listing_intent === 'long_rent' && (
                <div>
                  <Label>Lease terms</Label>
                  <Textarea
                    rows={2}
                    value={formData.lease_terms}
                    onChange={(e) => setFormData((p) => ({ ...p, lease_terms: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <div className="border-t pt-6">
              <h2 className="text-xl font-semibold mb-4">Photos</h2>
              {existingPhotos.filter((p) => !photosToDelete.includes(p.id)).length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                  {existingPhotos
                    .filter((p) => !photosToDelete.includes(p.id))
                    .map((photo) => (
                      <div key={photo.id} className="relative aspect-square">
                        <Image src={photo.photo_url} alt="" fill className="object-cover rounded-lg" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6"
                          onClick={() => setPhotosToDelete((prev) => [...prev, photo.id])}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                </div>
              )}
              {newPhotoPreviews.length > 0 && (
                <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
                  {newPhotoPreviews.map((preview, i) => (
                    <div key={i} className="relative aspect-square">
                      <Image src={preview} alt="" fill className="object-cover rounded-lg" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => removeNewPhoto(i)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {existingPhotos.length - photosToDelete.length + newPhotos.length < MAX_PHOTOS && (
                <label className="inline-flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 cursor-pointer hover:border-primary">
                  <Upload className="h-6 w-6 mb-1 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Add photos</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => addNewPhotos(e.target.files || [])}
                  />
                </label>
              )}
            </div>

            <div className="border-t pt-6 space-y-4">
              <h2 className="text-xl font-semibold">Contact</h2>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={formData.contact_phone}
                  onChange={(e) => setFormData((p) => ({ ...p, contact_phone: e.target.value }))}
                  onBlur={() => {
                    if (formData.contact_phone) {
                      setFormData((p) => ({
                        ...p,
                        contact_phone: normalizeEswatiniPhone(p.contact_phone),
                      }));
                    }
                  }}
                  required
                />
                {formData.contact_phone && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Shows as {formatEswatiniPhone(formData.contact_phone)}
                  </p>
                )}
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  value={formData.contact_whatsapp}
                  onChange={(e) => setFormData((p) => ({ ...p, contact_whatsapp: e.target.value }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button type="button" variant="outline" asChild>
            <Link href={`/dashboard/landlord/properties/${propertyId}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
