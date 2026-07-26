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
  FitOut,
  TENURE_CONFIG,
  RESIDENTIAL_SUBTYPE_LABELS,
  LAND_SUBTYPE_LABELS,
  COMMERCIAL_SUBTYPE_LABELS,
  FIT_OUT_LABELS,
  LISTING_INTENT_LABELS,
  ASSET_CATEGORY_LABELS,
  defaultPricePeriod,
  subtypeToLegacyPropertyType,
  ResidentialSubtype,
  LandSubtype,
  CommercialSubtype,
} from '@/types/property';
import { canPostListings, normalizeUserType } from '@/types/user';
import {
  ESWATINI_CITIES,
  TENURE_TYPES,
  RESIDENTIAL_SUBTYPES,
  LAND_SUBTYPES,
  COMMERCIAL_SUBTYPES,
  FIT_OUT_OPTIONS,
  RESIDENTIAL_AMENITIES,
  LAND_AMENITIES,
  COMMERCIAL_AMENITIES,
  ROOM_OPTIONS,
  BATH_OPTIONS,
  MAX_PHOTOS,
} from '@/utils/constants';
import { normalizeEswatiniPhone, isValidEswatiniPhone } from '@/utils/phone';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, Loader2, Upload, X, Save, Eye, AlertCircle, Clock,
  Smartphone, Home, Map, Building2,
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
  const isResidential = formData.asset_category === 'residential';
  const isCommercial = formData.asset_category === 'commercial';

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.push('/auth/login'); return; }
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
      if (!formData.asset_category || !formData.listing_intent || !formData.property_subtype) {
        setError('Select category, how it is offered, and subtype');
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

  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > MAX_PHOTOS) {
      toast.error(`Maximum ${MAX_PHOTOS} photos`);
      return;
    }
    setPhotos((prev) => [...prev, ...files]);
    setPhotoPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  }, [photos.length]);

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  }, [photoPreviews]);

  const setCategory = (cat: AssetCategory) => {
    setFormData((p) => ({
      ...p,
      asset_category: cat,
      property_subtype: '',
      amenities: [],
    }));
  };

  const validateForm = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!formData.asset_category) errors.push('Category');
    if (!formData.listing_intent) errors.push('Intent');
    if (!formData.property_subtype) errors.push('Subtype');
    if (!formData.title.trim()) errors.push('Title');
    if (!formData.description.trim()) errors.push('Description');
    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price <= 0) errors.push('Valid price');
    if (!formData.city) errors.push('City');
    if (!formData.suburb.trim()) errors.push('Suburb');
    if (!formData.contact_phone.trim() || !isValidEswatiniPhone(formData.contact_phone))
      errors.push('Valid Eswatini phone');
    if (formData.asset_category === 'land') {
      const ha = parseFloat(formData.land_size_ha);
      if (!formData.land_size_ha || isNaN(ha) || ha <= 0) errors.push('Land size (ha)');
    }
    if (formData.asset_category === 'commercial') {
      const area = parseFloat(formData.floor_area_sqm);
      if (!formData.floor_area_sqm || isNaN(area) || area <= 0) errors.push('Floor area (m²)');
    }
    return { valid: errors.length === 0, errors };
  };

  const uploadPhotos = async (propertyId: string): Promise<string[]> => {
    if (photos.length === 0) return [];
    const urls: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const ext = photo.name.split('.').pop() || 'jpg';
      const fileName = `${user!.id}/${propertyId}/${Date.now()}-${i}.${ext}`;
      setUploadProgress({ current: i + 1, total: photos.length });
      const { error: upErr } = await supabase.storage.from('property-photos').upload(fileName, photo);
      if (upErr) throw new Error(upErr.message);
      const { data: { publicUrl } } = supabase.storage.from('property-photos').getPublicUrl(fileName);
      urls.push(publicUrl);
    }
    setUploadProgress(null);
    return urls;
  };

  const saveProperty = async (status: 'pending' | 'draft') => {
    setError(null);
    if (status === 'pending') {
      const { valid, errors } = validateForm();
      if (!valid) { setError(errors.join('. ')); return false; }
      if (!isPhoneVerified) { setPhoneDialogOpen(true); setError('Verify phone first'); return false; }
      if (!isLandlordVerified) { setError('Account verification required'); return false; }
    }
    if (!user) return false;

    try {
      const intent = (formData.listing_intent || 'long_rent') as ListingIntent;
      const category = (formData.asset_category || 'residential') as AssetCategory;
      const subtype = formData.property_subtype || 'other_residential';

      const propertyData: Record<string, unknown> = {
        landlord_id: user.id,
        title: formData.title.trim() || 'Untitled',
        description: formData.description.trim() || '',
        listing_intent: intent,
        asset_category: category,
        property_subtype: subtype,
        property_type: subtypeToLegacyPropertyType(subtype),
        listing_type: category === 'land' ? 'land' : intent === 'sale' ? 'buy' : 'rent',
        price_period: defaultPricePeriod(intent),
        tenure_type: formData.tenure_type,
        price: parseFloat(formData.price) || 0,
        location_city: formData.city,
        location_suburb: formData.suburb.trim(),
        location_address: formData.address.trim() || null,
        amenities: formData.amenities,
        lease_terms: formData.lease_terms.trim() || null,
        contact_whatsapp: formData.contact_whatsapp.trim() || null,
        contact_phone: normalizeEswatiniPhone(formData.contact_phone.trim()),
        status,
        views: 0,
        is_featured: false,
      };

      if (category === 'residential') {
        propertyData.bedrooms = parseInt(formData.bedrooms, 10) || null;
        propertyData.bathrooms = parseFloat(formData.bathrooms) || null;
        propertyData.is_furnished = formData.is_furnished;
      } else if (category === 'land') {
        propertyData.land_size_ha = parseFloat(formData.land_size_ha) || null;
        propertyData.is_fenced = formData.is_fenced;
        propertyData.has_road_access = formData.has_road_access;
        propertyData.has_water = formData.has_water;
        propertyData.has_electricity = formData.has_electricity;
        propertyData.has_sewer = formData.has_sewer;
        propertyData.zoning_notes = formData.zoning_notes.trim() || null;
      } else if (category === 'commercial') {
        propertyData.floor_area_sqm = parseFloat(formData.floor_area_sqm) || null;
        propertyData.floors = formData.floors ? parseInt(formData.floors, 10) : null;
        propertyData.parking_bays = formData.parking_bays ? parseInt(formData.parking_bays, 10) : null;
        propertyData.fit_out = formData.fit_out || null;
        propertyData.has_loading_bay = formData.has_loading_bay;
        propertyData.has_street_frontage = formData.has_street_frontage;
        propertyData.power_notes = formData.power_notes.trim() || null;
      }

      const { data: property, error: propertyError } = await supabase
        .from('properties').insert([propertyData]).select().single();
      if (propertyError) throw new Error(propertyError.message);

      if (photos.length > 0) {
        try {
          const photoUrls = await uploadPhotos(property.id);
          if (photoUrls.length) {
            await supabase.from('property_photos').insert(
              photoUrls.map((url, index) => ({
                property_id: property.id, photo_url: url, display_order: index, caption: null,
              }))
            );
          }
        } catch { toast.warning('Saved but photos failed'); }
      }
      return property.id;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneVerified) { setPhoneDialogOpen(true); return; }
    setLoading(true);
    const id = await saveProperty('pending');
    if (id) { toast.success('Submitted for review'); router.push('/dashboard/landlord'); }
    setLoading(false);
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    const id = await saveProperty('draft');
    if (id) { toast.success('Draft saved'); router.push('/dashboard/landlord'); }
    setSavingDraft(false);
  };

  useEffect(() => () => photoPreviews.forEach((p) => URL.revokeObjectURL(p)), [photoPreviews]);

  const priceLabel = formData.listing_intent === 'sale' ? 'Sale price (E) *' : 'Monthly rent (E) *';
  const stepLabels = ['Category', 'Basics', 'Location', 'Details', 'Photos'];

  const renderDetails = () => {
    if (isLand) {
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Land details</h2>
          <div>
            <Label>Size (hectares) *</Label>
            <Input type="number" min="0.01" step="0.01" value={formData.land_size_ha}
              onChange={(e) => setFormData((p) => ({ ...p, land_size_ha: e.target.value }))} />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="fenced" checked={formData.is_fenced}
              onCheckedChange={(c) => setFormData((p) => ({ ...p, is_fenced: !!c }))} />
            <Label htmlFor="fenced">Fenced</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {([['has_road_access', 'Road access'], ['has_water', 'Water'], ['has_electricity', 'Electricity'], ['has_sewer', 'Sewer']] as const).map(([k, l]) => (
              <div key={k} className="flex items-center space-x-2">
                <Checkbox id={k} checked={formData[k]} onCheckedChange={(c) => setFormData((p) => ({ ...p, [k]: !!c }))} />
                <Label htmlFor={k}>{l}</Label>
              </div>
            ))}
          </div>
          <div>
            <Label>Land features</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {LAND_AMENITIES.map((a) => (
                <div key={a} className="flex items-center space-x-2">
                  <Checkbox id={a} checked={formData.amenities.includes(a)} onCheckedChange={() => handleAmenityToggle(a)} />
                  <Label htmlFor={a} className="text-sm">{a}</Label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Label>Zoning notes</Label>
            <Textarea rows={2} value={formData.zoning_notes}
              onChange={(e) => setFormData((p) => ({ ...p, zoning_notes: e.target.value }))} />
          </div>
        </div>
      );
    }

    if (isCommercial) {
      return (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Commercial details</h2>
          <div>
            <Label>Floor area (m²) *</Label>
            <Input type="number" min="1" value={formData.floor_area_sqm}
              onChange={(e) => setFormData((p) => ({ ...p, floor_area_sqm: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Floors</Label>
              <Input type="number" min="0" value={formData.floors}
                onChange={(e) => setFormData((p) => ({ ...p, floors: e.target.value }))} />
            </div>
            <div>
              <Label>Parking bays</Label>
              <Input type="number" min="0" value={formData.parking_bays}
                onChange={(e) => setFormData((p) => ({ ...p, parking_bays: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Fit-out</Label>
            <Select value={formData.fit_out} onValueChange={(v) => setFormData((p) => ({ ...p, fit_out: v as FitOut }))}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                {FIT_OUT_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>{FIT_OUT_LABELS[f]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="loading" checked={formData.has_loading_bay}
                onCheckedChange={(c) => setFormData((p) => ({ ...p, has_loading_bay: !!c }))} />
              <Label htmlFor="loading">Loading bay</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="frontage" checked={formData.has_street_frontage}
                onCheckedChange={(c) => setFormData((p) => ({ ...p, has_street_frontage: !!c }))} />
              <Label htmlFor="frontage">Street frontage</Label>
            </div>
          </div>
          <div>
            <Label>Power notes</Label>
            <Input value={formData.power_notes} placeholder="e.g. 3-phase"
              onChange={(e) => setFormData((p) => ({ ...p, power_notes: e.target.value }))} />
          </div>
          <div>
            <Label>Amenities</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {COMMERCIAL_AMENITIES.map((a) => (
                <div key={a} className="flex items-center space-x-2">
                  <Checkbox id={a} checked={formData.amenities.includes(a)} onCheckedChange={() => handleAmenityToggle(a)} />
                  <Label htmlFor={a} className="text-sm">{a}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Property details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Bedrooms</Label>
            <Select value={formData.bedrooms} onValueChange={(v) => setFormData((p) => ({ ...p, bedrooms: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROOM_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n === '0' ? 'Studio' : n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Bathrooms</Label>
            <Select value={formData.bathrooms} onValueChange={(v) => setFormData((p) => ({ ...p, bathrooms: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BATH_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox id="furn" checked={formData.is_furnished}
            onCheckedChange={(c) => setFormData((p) => ({ ...p, is_furnished: !!c }))} />
          <Label htmlFor="furn">Furnished</Label>
        </div>
        <div>
          <Label>Amenities</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
            {RESIDENTIAL_AMENITIES.map((a) => (
              <div key={a} className="flex items-center space-x-2">
                <Checkbox id={a} checked={formData.amenities.includes(a)} onCheckedChange={() => handleAmenityToggle(a)} />
                <Label htmlFor={a} className="text-sm">{a}</Label>
              </div>
            ))}
          </div>
        </div>
        {formData.listing_intent === 'long_rent' && (
          <div>
            <Label>Lease terms</Label>
            <Textarea rows={2} value={formData.lease_terms}
              onChange={(e) => setFormData((p) => ({ ...p, lease_terms: e.target.value }))} />
          </div>
        )}
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">What are you listing?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                ['residential', Home, 'House, flat, backrooms'],
                ['land', Map, 'Plots & agricultural'],
                ['commercial', Building2, 'Office, retail, warehouse'],
              ] as const).map(([cat, Icon, desc]) => (
                <button key={cat} type="button" onClick={() => setCategory(cat)}
                  className={`rounded-xl border-2 p-4 text-left transition ${
                    formData.asset_category === cat ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}>
                  <Icon className="h-6 w-6 mb-2 text-primary" />
                  <p className="font-semibold">{ASSET_CATEGORY_LABELS[cat]}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </button>
              ))}
            </div>
            {formData.asset_category && (
              <>
                <div>
                  <Label className="mb-2 block">How is it offered? *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['sale', 'long_rent'] as ListingIntent[]).map((intent) => (
                      <Button key={intent} type="button" className="h-12"
                        variant={formData.listing_intent === intent ? 'default' : 'outline'}
                        onClick={() => setFormData((p) => ({ ...p, listing_intent: intent }))}>
                        {LISTING_INTENT_LABELS[intent]}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Subtype *</Label>
                  <Select value={formData.property_subtype}
                    onValueChange={(v) => setFormData((p) => ({ ...p, property_subtype: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {isResidential && RESIDENTIAL_SUBTYPES.map((s) => (
                        <SelectItem key={s} value={s}>{RESIDENTIAL_SUBTYPE_LABELS[s as ResidentialSubtype]}</SelectItem>
                      ))}
                      {isLand && LAND_SUBTYPES.map((s) => (
                        <SelectItem key={s} value={s}>{LAND_SUBTYPE_LABELS[s as LandSubtype]}</SelectItem>
                      ))}
                      {isCommercial && COMMERCIAL_SUBTYPES.map((s) => (
                        <SelectItem key={s} value={s}>{COMMERCIAL_SUBTYPE_LABELS[s as CommercialSubtype]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Basic information</h2>
            <div className="flex gap-2 flex-wrap">
              {formData.asset_category && <Badge variant="outline">{ASSET_CATEGORY_LABELS[formData.asset_category]}</Badge>}
              {formData.listing_intent && <Badge variant="outline">{LISTING_INTENT_LABELS[formData.listing_intent]}</Badge>}
            </div>
            <div><Label>Title *</Label><Input value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} /></div>
            <div>
              <Label>Tenure *</Label>
              <Select value={formData.tenure_type} onValueChange={(v) => setFormData((p) => ({ ...p, tenure_type: v as TenureType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TENURE_TYPES.map((t) => <SelectItem key={t} value={t}>{TENURE_CONFIG[t].label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="mt-2"><TenureBadge tenure={formData.tenure_type} size="md" /></div>
            </div>
            <div><Label>{priceLabel}</Label><Input type="number" min="1" value={formData.price} onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))} /></div>
            <div><Label>Description *</Label><Textarea rows={5} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} /></div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Location</h2>
            <div>
              <Label>City *</Label>
              <Select value={formData.city} onValueChange={(v) => setFormData((p) => ({ ...p, city: v }))}>
                <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
                <SelectContent>{ESWATINI_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Suburb *</Label><Input value={formData.suburb} onChange={(e) => setFormData((p) => ({ ...p, suburb: e.target.value }))} /></div>
            <div><Label>Address (optional)</Label><Input value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} /></div>
          </div>
        );
      case 4:
        return renderDetails();
      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Photos & contact</h2>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {photoPreviews.map((preview, i) => (
                <div key={i} className="relative aspect-square">
                  <Image src={preview} alt="" fill className="object-cover rounded-lg" />
                  <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => removePhoto(i)}><X className="h-3 w-3" /></Button>
                </div>
              ))}
              {photos.length < MAX_PHOTOS && (
                <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer">
                  <Upload className="h-5 w-5 mb-1" /><span className="text-xs">Upload</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
            {uploadProgress && <Progress value={(uploadProgress.current / uploadProgress.total) * 100} />}
            <div><Label>Phone *</Label><Input value={formData.contact_phone} onChange={(e) => setFormData((p) => ({ ...p, contact_phone: e.target.value.replace(/[^\d+]/g, '') }))} /></div>
            <div><Label>WhatsApp</Label><Input value={formData.contact_whatsapp} onChange={(e) => setFormData((p) => ({ ...p, contact_whatsapp: e.target.value.replace(/[^\d+]/g, '') }))} /></div>
            {!isPhoneVerified && (
              <Alert className="border-amber-500/30 bg-amber-500/10">
                <AlertDescription className="flex justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> Verify phone to publish</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPhoneDialogOpen(true)}>Verify</Button>
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
    return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }
  if (!isAuthorized) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Button variant="ghost" asChild className="mb-4"><Link href="/dashboard/landlord"><ChevronLeft className="h-4 w-4 mr-1" />Back</Link></Button>
      <h1 className="text-3xl font-bold mb-1">Add listing</h1>
      <p className="text-muted-foreground mb-6">Residential, land, or commercial</p>

      {!isLandlordVerified && (
        <Card className="border-amber-500/30 bg-amber-500/10 mb-6">
          <CardContent className="p-4 flex gap-3">
            {isLandlordPending ? <Clock className="h-6 w-6 text-amber-600" /> : <AlertCircle className="h-6 w-6 text-red-600" />}
            <p className="text-sm">Drafts allowed now. Publish needs verification + phone OTP.</p>
          </CardContent>
        </Card>
      )}

      <div className="mb-6 flex justify-between gap-1">
        {stepLabels.map((label, i) => (
          <div key={label} className={`flex-1 text-center text-xs ${i + 1 <= currentStep ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 ${
              i + 1 < currentStep ? 'bg-primary text-primary-foreground' : i + 1 === currentStep ? 'border-2 border-primary' : 'border-2 border-muted'
            }`}>{i + 1}</div>
            <span className="hidden sm:block">{label}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
        <Card><CardContent className="p-6">{renderStep()}</CardContent></Card>
        <div className="flex justify-between mt-6">
          <Button type="button" variant="outline" onClick={handlePrevious} disabled={currentStep === 1}><ChevronLeft className="h-4 w-4 mr-1" />Previous</Button>
          <div className="flex gap-2">
            {currentStep === TOTAL_STEPS && (
              <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={savingDraft}>
                {savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Draft
              </Button>
            )}
            {currentStep < TOTAL_STEPS ? (
              <Button type="button" onClick={handleNext}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            ) : isLandlordVerified ? (
              <Button type="submit" disabled={loading}>{loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}Submit</Button>
            ) : (
              <Button type="button" variant="secondary" disabled><Eye className="h-4 w-4 mr-1" />Verify to submit</Button>
            )}
          </div>
        </div>
      </form>

      <PhoneVerifyDialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}
        defaultPhone={formData.contact_phone}
        onVerified={() => { refreshPhone(); toast.success('Phone verified'); }} />
    </div>
  );
}
