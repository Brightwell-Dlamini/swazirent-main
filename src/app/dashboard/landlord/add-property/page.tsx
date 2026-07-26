// src/app/dashboard/landlord/add-property/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useVerification } from '@/hooks/useVerification';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';
import { supabase } from '@/lib/supabase';
import {
  AssetCategory,
  ListingIntent,
  TenureType,
  TENURE_CONFIG,
  RESIDENTIAL_SUBTYPE_LABELS,
  LAND_SUBTYPE_LABELS,
  LISTING_INTENT_LABELS,
  ASSET_CATEGORY_LABELS,
  defaultPricePeriod,
  subtypeToLegacyPropertyType,
  ResidentialSubtype,
  LandSubtype,
} from '@/types/property';
import { canPostListings, normalizeUserType } from '@/types/user';
import {
  ESWATINI_CITIES,
  TENURE_TYPES,
  RESIDENTIAL_SUBTYPES,
  LAND_SUBTYPES,
  RESIDENTIAL_AMENITIES,
  LAND_AMENITIES,
  ROOM_OPTIONS,
  BATH_OPTIONS,
  MAX_PHOTOS,
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
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Upload,
  X,
  Save,
  Eye,
  AlertCircle,
  Clock,
  Shield,
  Smartphone,
  Home,
  Map,
} from 'lucide-react';
import { TenureBadge } from '@/components/properties/TenureBadge';
import { PhoneVerifyDialog } from '@/components/auth/PhoneVerifyDialog';

const TOTAL_STEPS = 5;

export default function AddPropertyPage() {
  const { user, userType, isLoading: authLoading } = useAuth();
  const { isLandlordVerified, isLandlordPending, refreshVerification } = useVerification();
  const { isPhoneVerified, refresh: refreshPhone } = usePhoneVerification();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    asset_category: '' as AssetCategory | '',
    listing_intent: '' as ListingIntent | '',
    property_subtype: '',
    title: '',
    description: '',
    tenure_type: 'unsure' as TenureType,
    price: '',
    city: '',
    suburb: '',
    address: '',
    // residential
    bedrooms: '1',
    bathrooms: '1',
    is_furnished: false,
    // land
    land_size_ha: '',
    is_fenced: false,
    has_road_access: false,
    has_water: false,
    has_electricity: false,
    has_sewer: false,
    zoning_notes: '',
    amenities: [] as string[],
    lease_terms: '',
    contact_whatsapp: '',
    contact_phone: '',
  });

  const isLand = formData.asset_category === 'land';
  const isResidential = formData.asset_category === 'residential';

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    const normalized = normalizeUserType(userType);
    if (userType && !canPostListings(normalized) && normalized !== 'admin') {
      router.push('/dashboard');
      return;
    }
    if (userType === null) return;
    setIsAuthorized(true);
  }, [user, userType, authLoading, router]);

  useEffect(() => {
    const normalized = normalizeUserType(userType);
    if (user && (normalized === 'broker' || normalized === 'agent') && isLandlordPending) {
      refreshVerification();
    }
  }, [user, userType, isLandlordPending, refreshVerification]);

  const handleNext = useCallback(() => {
    if (currentStep === 1) {
      if (!formData.asset_category) {
        setError('Please choose what you are listing');
        return;
      }
      if (!formData.listing_intent) {
        setError('Please choose how it is offered');
        return;
      }
      if (!formData.property_subtype) {
        setError('Please select a subtype');
        return;
      }
      setError(null);
    }
    if (currentStep < TOTAL_STEPS) setCurrentStep((p) => p + 1);
  }, [currentStep, formData.asset_category, formData.listing_intent, formData.property_subtype]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 1) setCurrentStep((p) => p - 1);
  }, [currentStep]);

  const handleAmenityToggle = useCallback((amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  }, []);

  const handlePhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (photos.length + files.length > MAX_PHOTOS) {
        toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
        return;
      }
      setPhotos((prev) => [...prev, ...files]);
      setPhotoPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
    },
    [photos.length]
  );

  const removePhoto = useCallback(
    (index: number) => {
      setPhotos((prev) => prev.filter((_, i) => i !== index));
      URL.revokeObjectURL(photoPreviews[index]);
      setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
    },
    [photoPreviews]
  );

  const setCategory = (cat: AssetCategory) => {
    setFormData((p) => ({
      ...p,
      asset_category: cat,
      property_subtype: '',
      amenities: [],
      bedrooms: cat === 'residential' ? p.bedrooms || '1' : '0',
      bathrooms: cat === 'residential' ? p.bathrooms || '1' : '0',
      is_furnished: cat === 'residential' ? p.is_furnished : false,
    }));
  };

  const setIntent = (intent: ListingIntent) => {
    setFormData((p) => ({ ...p, listing_intent: intent }));
  };

  const validateForm = useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!formData.asset_category) errors.push('Select asset category');
    if (!formData.listing_intent) errors.push('Select listing intent');
    if (!formData.property_subtype) errors.push('Select subtype');
    if (!formData.title.trim()) errors.push('Enter a listing title');
    if (!formData.description.trim()) errors.push('Enter a description');
    if (!formData.tenure_type) errors.push('Select land tenure');
    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price <= 0) errors.push('Enter a valid price');
    if (!formData.city) errors.push('Select a city');
    if (!formData.suburb.trim()) errors.push('Enter a suburb');
    if (!formData.contact_phone.trim()) errors.push('Enter a contact phone');
    else if (!isValidEswatiniPhone(formData.contact_phone))
      errors.push('Enter a valid Eswatini phone (e.g. +268 7600 0000)');

    if (formData.asset_category === 'land') {
      const ha = parseFloat(formData.land_size_ha);
      if (!formData.land_size_ha || isNaN(ha) || ha <= 0)
        errors.push('Enter land size in hectares');
    }

    if (formData.asset_category === 'residential') {
      if (formData.bedrooms === '' || formData.bathrooms === '')
        errors.push('Select bedrooms and bathrooms');
    }

    return { valid: errors.length === 0, errors };
  }, [formData]);

  const uploadPhotos = async (propertyId: string): Promise<string[]> => {
    if (photos.length === 0) return [];
    const uploadedUrls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const fileExt = photo.name.split('.').pop() || 'jpg';
      const fileName = `${user!.id}/${propertyId}/${Date.now()}-${i}.${fileExt}`;
      setUploadProgress({ current: i + 1, total: photos.length });
      const { error: uploadError } = await supabase.storage
        .from('property-photos')
        .upload(fileName, photo);
      if (uploadError) throw new Error(`Failed to upload photo ${i + 1}: ${uploadError.message}`);
      const {
        data: { publicUrl },
      } = supabase.storage.from('property-photos').getPublicUrl(fileName);
      uploadedUrls.push(publicUrl);
    }
    setUploadProgress(null);
    return uploadedUrls;
  };

  const saveProperty = async (status: 'pending' | 'draft') => {
    setError(null);

    if (status === 'pending') {
      const { valid, errors } = validateForm();
      if (!valid) {
        setError(errors.join('. '));
        return false;
      }
      if (!isPhoneVerified) {
        setError('Verify your phone number before publishing.');
        setPhoneDialogOpen(true);
        return false;
      }
      if (!isLandlordVerified) {
        setError('Your account must be verified before you can publish.');
        return false;
      }
    }

    if (!user) {
      setError('You must be logged in');
      return false;
    }

    try {
      const intent = (formData.listing_intent || 'long_rent') as ListingIntent;
      const category = (formData.asset_category || 'residential') as AssetCategory;
      const subtype = formData.property_subtype || 'other_residential';
      const pricePeriod = defaultPricePeriod(intent);

      const propertyData: Record<string, unknown> = {
        landlord_id: user.id,
        title: formData.title.trim() || 'Untitled',
        description: formData.description.trim() || 'No description',
        listing_intent: intent,
        asset_category: category,
        property_subtype: subtype,
        property_type: subtypeToLegacyPropertyType(subtype),
        listing_type:
          category === 'land' ? 'land' : intent === 'sale' ? 'buy' : 'rent',
        price_period: pricePeriod,
        tenure_type: formData.tenure_type || 'unsure',
        price: parseFloat(formData.price) || 0,
        location_city: formData.city || 'Unknown',
        location_suburb: formData.suburb.trim() || 'Unknown',
        location_address: formData.address.trim() || null,
        amenities: formData.amenities,
        lease_terms: formData.lease_terms.trim() || null,
        contact_whatsapp: formData.contact_whatsapp.trim() || null,
        contact_phone: formData.contact_phone
          ? normalizeEswatiniPhone(formData.contact_phone.trim())
          : '',
        status,
        views: 0,
        is_featured: false,
      };

      if (category === 'residential') {
        propertyData.bedrooms =
          formData.bedrooms !== '0' ? parseInt(formData.bedrooms, 10) : null;
        propertyData.bathrooms =
          formData.bathrooms !== '0' ? parseFloat(formData.bathrooms) : null;
        propertyData.is_furnished = formData.is_furnished;
        propertyData.land_size_ha = null;
        propertyData.is_fenced = null;
      } else if (category === 'land') {
        propertyData.bedrooms = null;
        propertyData.bathrooms = null;
        propertyData.is_furnished = false;
        propertyData.land_size_ha = parseFloat(formData.land_size_ha) || null;
        propertyData.is_fenced = formData.is_fenced;
        propertyData.has_road_access = formData.has_road_access;
        propertyData.has_water = formData.has_water;
        propertyData.has_electricity = formData.has_electricity;
        propertyData.has_sewer = formData.has_sewer;
        propertyData.zoning_notes = formData.zoning_notes.trim() || null;
      }

      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert([propertyData])
        .select()
        .single();

      if (propertyError) throw new Error(`Failed to create: ${propertyError.message}`);
      if (!property) throw new Error('No data returned');

      if (photos.length > 0) {
        try {
          const photoUrls = await uploadPhotos(property.id);
          if (photoUrls.length > 0) {
            const { error: photosError } = await supabase.from('property_photos').insert(
              photoUrls.map((url, index) => ({
                property_id: property.id,
                photo_url: url,
                display_order: index,
                caption: null,
              }))
            );
            if (photosError) toast.warning('Listing saved but some photos failed');
          }
        } catch {
          toast.warning('Listing saved but photos failed to upload');
        }
      }

      return property.id;
    } catch (err: unknown) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneVerified) {
      setPhoneDialogOpen(true);
      toast.info('Verify your phone to publish');
      return;
    }
    setLoading(true);
    const id = await saveProperty('pending');
    if (id) {
      toast.success('Listing submitted for review');
      router.push('/dashboard/landlord');
    }
    setLoading(false);
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    const id = await saveProperty('draft');
    if (id) {
      toast.success('Draft saved');
      router.push('/dashboard/landlord');
    }
    setSavingDraft(false);
  };

  useEffect(() => {
    return () => {
      photoPreviews.forEach((p) => URL.revokeObjectURL(p));
    };
  }, [photoPreviews]);

  const priceLabel =
    formData.listing_intent === 'sale'
      ? 'Sale price (E) *'
      : formData.listing_intent === 'long_rent'
        ? 'Monthly rent (E) *'
        : 'Price (E) *';

  const stepLabels = ['Category', 'Basics', 'Location', 'Details', 'Photos'];

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">What are you listing?</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCategory('residential')}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  formData.asset_category === 'residential'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Home className="h-6 w-6 mb-2 text-primary" />
                <p className="font-semibold">{ASSET_CATEGORY_LABELS.residential}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  House, flat, backrooms, shared room
                </p>
              </button>
              <button
                type="button"
                onClick={() => setCategory('land')}
                className={`rounded-xl border-2 p-4 text-left transition ${
                  formData.asset_category === 'land'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Map className="h-6 w-6 mb-2 text-primary" />
                <p className="font-semibold">{ASSET_CATEGORY_LABELS.land}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Residential plot, commercial plot, agricultural
                </p>
              </button>
            </div>

            {formData.asset_category && (
              <>
                <div>
                  <Label className="mb-2 block">How is it offered? *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['sale', 'long_rent'] as ListingIntent[]).map((intent) => (
                      <Button
                        key={intent}
                        type="button"
                        variant={formData.listing_intent === intent ? 'default' : 'outline'}
                        className="h-12"
                        onClick={() => setIntent(intent)}
                      >
                        {LISTING_INTENT_LABELS[intent]}
                      </Button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2 block">Subtype *</Label>
                  {isResidential && (
                    <Select
                      value={formData.property_subtype}
                      onValueChange={(v) => setFormData((p) => ({ ...p, property_subtype: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select residential type" />
                      </SelectTrigger>
                      <SelectContent>
                        {RESIDENTIAL_SUBTYPES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {RESIDENTIAL_SUBTYPE_LABELS[s as ResidentialSubtype]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {isLand && (
                    <Select
                      value={formData.property_subtype}
                      onValueChange={(v) => setFormData((p) => ({ ...p, property_subtype: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select land type" />
                      </SelectTrigger>
                      <SelectContent>
                        {LAND_SUBTYPES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {LAND_SUBTYPE_LABELS[s as LandSubtype]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Basic information</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">{ASSET_CATEGORY_LABELS[formData.asset_category as AssetCategory]}</Badge>
              <Badge variant="outline">
                {LISTING_INTENT_LABELS[formData.listing_intent as ListingIntent]}
              </Badge>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Listing title *</Label>
                <Input
                  id="title"
                  placeholder={
                    isLand
                      ? 'e.g. 0.5 ha residential plot in Sidwashini'
                      : 'e.g. Spacious 2-bedroom in Ngwane Park'
                  }
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label>Land tenure *</Label>
                <Select
                  value={formData.tenure_type}
                  onValueChange={(v) => setFormData((p) => ({ ...p, tenure_type: v as TenureType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tenure" />
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
                <Label htmlFor="price">{priceLabel}</Label>
                <Input
                  id="price"
                  type="number"
                  min="1"
                  placeholder={formData.listing_intent === 'sale' ? '450000' : '3500'}
                  value={formData.price}
                  onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  rows={6}
                  value={formData.description}
                  onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                  required
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Location</h2>
            <div className="space-y-4">
              <div>
                <Label>City / town *</Label>
                <Select
                  value={formData.city}
                  onValueChange={(v) => setFormData((p) => ({ ...p, city: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select city" />
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
                <Label htmlFor="suburb">Suburb / area *</Label>
                <Input
                  id="suburb"
                  value={formData.suburb}
                  onChange={(e) => setFormData((p) => ({ ...p, suburb: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="address">Street address (optional)</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                />
              </div>
            </div>
          </div>
        );

      case 4:
        if (isLand) {
          return (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Land details</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="land_size_ha">Size (hectares) *</Label>
                  <Input
                    id="land_size_ha"
                    type="number"
                    min="0.01"
                    step="0.01"
                    placeholder="e.g. 0.5"
                    value={formData.land_size_ha}
                    onChange={(e) => setFormData((p) => ({ ...p, land_size_ha: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">1 hectare ≈ 10,000 m²</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_fenced"
                    checked={formData.is_fenced}
                    onCheckedChange={(c) => setFormData((p) => ({ ...p, is_fenced: c as boolean }))}
                  />
                  <Label htmlFor="is_fenced">Fenced</Label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(
                    [
                      ['has_road_access', 'Road access'],
                      ['has_water', 'Water available'],
                      ['has_electricity', 'Electricity available'],
                      ['has_sewer', 'Sewer / septic'],
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={key}
                        checked={formData[key]}
                        onCheckedChange={(c) =>
                          setFormData((p) => ({ ...p, [key]: c as boolean }))
                        }
                      />
                      <Label htmlFor={key}>{label}</Label>
                    </div>
                  ))}
                </div>
                <div>
                  <Label>Land features</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {LAND_AMENITIES.map((a) => (
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
                <div>
                  <Label htmlFor="zoning_notes">Zoning / notes (optional)</Label>
                  <Textarea
                    id="zoning_notes"
                    rows={3}
                    placeholder="e.g. Residential zoning, near school"
                    value={formData.zoning_notes}
                    onChange={(e) => setFormData((p) => ({ ...p, zoning_notes: e.target.value }))}
                  />
                </div>
                {formData.listing_intent === 'long_rent' && (
                  <div>
                    <Label htmlFor="lease_terms">Lease terms (optional)</Label>
                    <Textarea
                      id="lease_terms"
                      rows={2}
                      value={formData.lease_terms}
                      onChange={(e) => setFormData((p) => ({ ...p, lease_terms: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Property details & amenities</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bedrooms *</Label>
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
                        {n === '0' ? 'None / studio' : n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bathrooms *</Label>
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
                        {n === '0' ? 'None' : n}
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
                onCheckedChange={(c) => setFormData((p) => ({ ...p, is_furnished: c as boolean }))}
              />
              <Label htmlFor="furnished">Furnished</Label>
            </div>
            <div>
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {RESIDENTIAL_AMENITIES.map((a) => (
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
                <Label htmlFor="lease_terms">Lease terms</Label>
                <Textarea
                  id="lease_terms"
                  rows={3}
                  value={formData.lease_terms}
                  onChange={(e) => setFormData((p) => ({ ...p, lease_terms: e.target.value }))}
                />
              </div>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Photos & contact</h2>
            <div>
              <Label>Photos (max {MAX_PHOTOS})</Label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mt-2 mb-4">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    <Image src={preview} alt="" fill className="object-cover rounded-lg" />
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
                      <Badge className="absolute bottom-2 left-2 bg-primary">Cover</Badge>
                    )}
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary">
                    <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                    />
                  </label>
                )}
              </div>
            </div>
            {uploadProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading…</span>
                  <span>
                    {uploadProgress.current}/{uploadProgress.total}
                  </span>
                </div>
                <Progress value={(uploadProgress.current / uploadProgress.total) * 100} />
              </div>
            )}
            <div className="space-y-4">
              <h3 className="font-medium">Contact</h3>
              <div>
                <Label htmlFor="contact_phone">Phone *</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  placeholder="+268 7600 0000"
                  value={formData.contact_phone}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      contact_phone: e.target.value.replace(/[^\d+]/g, ''),
                    }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="contact_whatsapp">WhatsApp (optional)</Label>
                <Input
                  id="contact_whatsapp"
                  type="tel"
                  value={formData.contact_whatsapp}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      contact_whatsapp: e.target.value.replace(/[^\d+]/g, ''),
                    }))
                  }
                />
              </div>
            </div>
            {!isPhoneVerified && (
              <Alert className="border-amber-500/30 bg-amber-500/10">
                <AlertDescription className="flex items-center justify-between gap-2 flex-wrap text-amber-800 dark:text-amber-200">
                  <span className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" /> Phone verification required to publish
                  </span>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPhoneDialogOpen(true)}>
                    Verify phone
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            {isPhoneVerified && (
              <Alert className="border-emerald-500/30 bg-emerald-500/10">
                <AlertDescription className="text-emerald-800 dark:text-emerald-200">
                  Phone verified — you can publish.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (authLoading || isAuthorized === null) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/dashboard/landlord">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back to dashboard
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Add listing</h1>
        <p className="text-muted-foreground">Residential or land on Ekhaya</p>
      </div>

      {!isLandlordVerified && (
        <Card className="border-amber-500/30 bg-amber-500/10 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {isLandlordPending ? (
                <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
              ) : (
                <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
              )}
              <div>
                <h3 className="font-semibold">
                  {isLandlordPending ? 'Verification pending' : 'Verification required'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  You can save drafts now. Publish needs account verification and phone OTP.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-8 flex justify-between gap-1">
        {stepLabels.map((label, i) => {
          const step = i + 1;
          return (
            <div
              key={step}
              className={`flex-1 text-center ${step <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2 text-sm ${
                  step < currentStep
                    ? 'bg-primary text-primary-foreground'
                    : step === currentStep
                      ? 'border-2 border-primary'
                      : 'border-2 border-muted'
                }`}
              >
                {step}
              </div>
              <span className="text-xs hidden sm:block">{label}</span>
            </div>
          );
        })}
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
          <Button type="button" variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <div className="flex gap-2">
            {currentStep === TOTAL_STEPS && (
              <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={savingDraft}>
                {savingDraft ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save draft
              </Button>
            )}
            {currentStep < TOTAL_STEPS ? (
              <Button type="button" onClick={handleNext}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : isLandlordVerified ? (
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit for review
              </Button>
            ) : (
              <Button type="button" variant="secondary" disabled>
                <Eye className="mr-2 h-4 w-4" />
                Verify to submit
              </Button>
            )}
          </div>
        </div>
      </form>

      <PhoneVerifyDialog
        open={phoneDialogOpen}
        onOpenChange={setPhoneDialogOpen}
        defaultPhone={formData.contact_phone}
        onVerified={() => {
          refreshPhone();
          toast.success('Phone verified');
        }}
      />
    </div>
  );
}
