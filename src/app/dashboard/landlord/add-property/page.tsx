// src/app/dashboard/landlord/add-property/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useVerification } from '@/hooks/useVerification';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';
import { useListingPhotos } from '@/hooks/useListingPhotos';
import { supabase } from '@/lib/supabase';
import { saveListingRow } from '@/lib/saveListing';
import {
  AssetCategory, ListingIntent, TenureType, FitOut, TENURE_CONFIG,
  RESIDENTIAL_SUBTYPE_LABELS, LAND_SUBTYPE_LABELS, COMMERCIAL_SUBTYPE_LABELS,
  FIT_OUT_LABELS, LISTING_INTENT_LABELS, ASSET_CATEGORY_LABELS,
  ResidentialSubtype, LandSubtype, CommercialSubtype,
} from '@/types/property';
import { canPostListings, normalizeUserType } from '@/types/user';
import {
  ESWATINI_CITIES, TENURE_TYPES, RESIDENTIAL_SUBTYPES, LAND_SUBTYPES, COMMERCIAL_SUBTYPES,
  FIT_OUT_OPTIONS, RESIDENTIAL_AMENITIES, LAND_AMENITIES, COMMERCIAL_AMENITIES,
  ROOM_OPTIONS, BATH_OPTIONS, MAX_PHOTOS, MIN_PHOTOS_PUBLISH,
} from '@/utils/constants';
import { isValidEswatiniPhone } from '@/utils/phone';
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
  ChevronLeft, ChevronRight, Loader2, Save, Eye, AlertCircle, Clock,
  Home, Map, Building2,
} from 'lucide-react';
import { TenureBadge } from '@/components/properties/TenureBadge';
import { PhoneVerifyDialog } from '@/components/auth/PhoneVerifyDialog';
import { ContactPhoneFields } from '@/components/listings/ContactPhoneFields';
import { PhotoGrid } from '@/components/listings/PhotoGrid';
import { cn } from '@/lib/utils';

const TOTAL_STEPS = 5;
const STEP_LABELS = ['Category', 'Basics', 'Location', 'Details', 'Photos'];

function Field({
  label,
  htmlFor,
  error,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className={cn(error && 'text-destructive')}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default function AddPropertyPage() {
  const { user, userType, isLoading: authLoading } = useAuth();
  const { isLandlordVerified, isLandlordPending, refreshVerification } = useVerification();
  const { isPhoneVerified, phone: accountPhone, refresh: refreshPhone } = usePhoneVerification();
  const {
    photos, photoPreviews, compressing,
    handlePhotoUpload, handleDrop, removePhoto, movePhoto, setAsCover,
  } = useListingPhotos(MAX_PHOTOS);
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false);

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
    if (!accountPhone) return;
    setFormData((p) => (p.contact_phone ? p : { ...p, contact_phone: accountPhone }));
  }, [accountPhone]);

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

  /** Map field → wizard step */
  const fieldStep = (key: string): number => {
    if (['asset_category', 'listing_intent', 'property_subtype'].includes(key)) return 1;
    if (['title', 'description', 'price', 'tenure_type'].includes(key)) return 2;
    if (['city', 'suburb', 'address'].includes(key)) return 3;
    if (['land_size_ha', 'floor_area_sqm', 'bedrooms', 'bathrooms'].includes(key)) return 4;
    if (['photos', 'contact_phone'].includes(key)) return 5;
    return 1;
  };

  const validateForPublish = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (!formData.asset_category) e.asset_category = 'Choose a category';
    if (!formData.listing_intent) e.listing_intent = 'Sale or rent?';
    if (!formData.property_subtype) e.property_subtype = 'Choose a subtype';
    if (!formData.title.trim()) e.title = 'Title is required';
    if (!formData.description.trim()) e.description = 'Description is required';
    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price <= 0) e.price = 'Enter a valid price';
    if (!formData.city) e.city = 'City is required';
    if (!formData.suburb.trim()) e.suburb = 'Suburb is required';
    if (!formData.contact_phone.trim() || !isValidEswatiniPhone(formData.contact_phone))
      e.contact_phone = 'Valid Eswatini phone required';
    if (formData.asset_category === 'land') {
      const ha = parseFloat(formData.land_size_ha);
      if (!formData.land_size_ha || isNaN(ha) || ha <= 0) e.land_size_ha = 'Land size (ha) required';
    }
    if (formData.asset_category === 'commercial') {
      const area = parseFloat(formData.floor_area_sqm);
      if (!formData.floor_area_sqm || isNaN(area) || area <= 0) e.floor_area_sqm = 'Floor area required';
    }
    if (photos.length < MIN_PHOTOS_PUBLISH) {
      e.photos = 'At least one photo is required to publish';
    }
    return e;
  };

  const jumpToFirstError = (errs: Record<string, string>) => {
    const keys = Object.keys(errs);
    if (!keys.length) return;
    const step = Math.min(...keys.map(fieldStep));
    setCurrentStep(step);
    toast.error(errs[keys[0]]);
  };

  const handleNext = useCallback(() => {
    if (currentStep === 1) {
      const e: Record<string, string> = {};
      if (!formData.asset_category) e.asset_category = 'Choose a category';
      if (!formData.listing_intent) e.listing_intent = 'Sale or rent?';
      if (!formData.property_subtype) e.property_subtype = 'Choose a subtype';
      if (Object.keys(e).length) {
        setFieldErrors(e);
        setError(Object.values(e)[0]);
        return;
      }
    }
    setError(null);
    setFieldErrors({});
    if (currentStep < TOTAL_STEPS) setCurrentStep((p) => p + 1);
  }, [currentStep, formData.asset_category, formData.listing_intent, formData.property_subtype]);

  const handleAmenityToggle = useCallback((amenity: string) => {
    setFormData((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  }, []);

  const setCategory = (cat: AssetCategory) => {
    setFormData((p) => ({ ...p, asset_category: cat, property_subtype: '', amenities: [] }));
    setFieldErrors((fe) => ({ ...fe, asset_category: '' }));
  };

  const uploadPhotos = async (propertyId: string): Promise<void> => {
    if (!user || photos.length === 0) return;
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const ext = photo.name.split('.').pop() || 'jpg';
      const fileName = `${user.id}/${propertyId}/${Date.now()}-${i}.${ext}`;
      setUploadProgress({ current: i + 1, total: photos.length });
      const { error: upErr } = await supabase.storage.from('property-photos').upload(fileName, photo);
      if (upErr) throw new Error(upErr.message);
      const { data: { publicUrl } } = supabase.storage.from('property-photos').getPublicUrl(fileName);
      await supabase.from('property_photos').insert({
        property_id: propertyId,
        photo_url: publicUrl,
        display_order: i,
        caption: null,
      });
    }
    setUploadProgress(null);
  };

  const handleSaveDraft = async () => {
    if (!user) return;
    setError(null);
    setSavingDraft(true);
    try {
      const result = await saveListingRow({
        userId: user.id,
        form: formData,
        status: 'draft',
        contactPhoneFallback: accountPhone,
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      if (photos.length > 0) {
        try { await uploadPhotos(result.id); }
        catch { toast.warning('Draft saved, but some photos failed'); }
      }
      toast.success('Draft saved');
      router.push('/dashboard/landlord');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save draft';
      setError(msg);
      toast.error(msg);
    } finally {
      setSavingDraft(false);
      setUploadProgress(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!isPhoneVerified) {
      setPhoneDialogOpen(true);
      setError('Verify your phone once, then publish');
      setCurrentStep(5);
      return;
    }
    if (!isLandlordVerified) {
      setError('Account verification required to publish');
      return;
    }

    const errs = validateForPublish();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      setError(Object.values(errs)[0]);
      jumpToFirstError(errs);
      return;
    }

    setError(null);
    setFieldErrors({});
    setLoading(true);
    try {
      const result = await saveListingRow({
        userId: user.id,
        form: formData,
        status: 'pending',
        contactPhoneFallback: accountPhone,
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      try { await uploadPhotos(result.id); }
      catch { toast.warning('Submitted, but some photos failed'); }
      toast.success('Submitted for review');
      router.push('/dashboard/landlord');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submit failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  };

  const priceLabel = formData.listing_intent === 'sale' ? 'Sale price (E) *' : 'Monthly rent (E) *';
  const inputErr = (key: string) =>
    fieldErrors[key] ? 'border-destructive focus-visible:ring-destructive' : '';

  const renderDetails = () => {
    if (isLand) {
      return (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold tracking-tight">Land details</h2>
          <Field label="Size (hectares) *" error={fieldErrors.land_size_ha}>
            <Input type="number" min="0.01" step="0.01" value={formData.land_size_ha}
              className={inputErr('land_size_ha')}
              onChange={(e) => setFormData((p) => ({ ...p, land_size_ha: e.target.value }))} />
          </Field>
          <div className="flex items-center gap-2 pt-1">
            <Checkbox id="fenced" checked={formData.is_fenced}
              onCheckedChange={(c) => setFormData((p) => ({ ...p, is_fenced: !!c }))} />
            <Label htmlFor="fenced">Fenced</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {([['has_road_access', 'Road access'], ['has_water', 'Water'], ['has_electricity', 'Electricity'], ['has_sewer', 'Sewer']] as const).map(([k, l]) => (
              <div key={k} className="flex items-center gap-2">
                <Checkbox id={k} checked={formData[k]} onCheckedChange={(c) => setFormData((p) => ({ ...p, [k]: !!c }))} />
                <Label htmlFor={k}>{l}</Label>
              </div>
            ))}
          </div>
          <Field label="Features people look for">
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {LAND_AMENITIES.map((a) => (
                <div key={a} className="flex items-center gap-2">
                  <Checkbox id={a} checked={formData.amenities.includes(a)} onCheckedChange={() => handleAmenityToggle(a)} />
                  <Label htmlFor={a} className="text-sm font-normal">{a}</Label>
                </div>
              ))}
            </div>
          </Field>
          <Field label="Zoning notes">
            <Textarea rows={2} value={formData.zoning_notes}
              onChange={(e) => setFormData((p) => ({ ...p, zoning_notes: e.target.value }))} />
          </Field>
        </div>
      );
    }

    if (isCommercial) {
      return (
        <div className="space-y-5">
          <h2 className="text-xl font-semibold tracking-tight">Commercial details</h2>
          <Field label="Floor area (m²) *" error={fieldErrors.floor_area_sqm}>
            <Input type="number" min="1" value={formData.floor_area_sqm}
              className={inputErr('floor_area_sqm')}
              onChange={(e) => setFormData((p) => ({ ...p, floor_area_sqm: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Floors">
              <Input type="number" min="0" value={formData.floors}
                onChange={(e) => setFormData((p) => ({ ...p, floors: e.target.value }))} />
            </Field>
            <Field label="Parking bays">
              <Input type="number" min="0" value={formData.parking_bays}
                onChange={(e) => setFormData((p) => ({ ...p, parking_bays: e.target.value }))} />
            </Field>
          </div>
          <Field label="Fit-out">
            <Select value={formData.fit_out} onValueChange={(v) => setFormData((p) => ({ ...p, fit_out: v as FitOut }))}>
              <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                {FIT_OUT_OPTIONS.map((f) => (
                  <SelectItem key={f} value={f}>{FIT_OUT_LABELS[f]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Checkbox id="loading" checked={formData.has_loading_bay}
                onCheckedChange={(c) => setFormData((p) => ({ ...p, has_loading_bay: !!c }))} />
              <Label htmlFor="loading">Loading bay</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="frontage" checked={formData.has_street_frontage}
                onCheckedChange={(c) => setFormData((p) => ({ ...p, has_street_frontage: !!c }))} />
              <Label htmlFor="frontage">Street frontage</Label>
            </div>
          </div>
          <Field label="Power notes">
            <Input value={formData.power_notes} placeholder="e.g. 3-phase"
              onChange={(e) => setFormData((p) => ({ ...p, power_notes: e.target.value }))} />
          </Field>
          <Field label="Amenities">
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {COMMERCIAL_AMENITIES.map((a) => (
                <div key={a} className="flex items-center gap-2">
                  <Checkbox id={a} checked={formData.amenities.includes(a)} onCheckedChange={() => handleAmenityToggle(a)} />
                  <Label htmlFor={a} className="text-sm font-normal">{a}</Label>
                </div>
              ))}
            </div>
          </Field>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <h2 className="text-xl font-semibold tracking-tight">Property details</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bedrooms">
            <Select value={formData.bedrooms} onValueChange={(v) => setFormData((p) => ({ ...p, bedrooms: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROOM_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n === '0' ? 'Studio' : n}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Bathrooms">
            <Select value={formData.bathrooms} onValueChange={(v) => setFormData((p) => ({ ...p, bathrooms: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{BATH_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="furn" checked={formData.is_furnished}
            onCheckedChange={(c) => setFormData((p) => ({ ...p, is_furnished: !!c }))} />
          <Label htmlFor="furn">Furnished</Label>
        </div>
        <Field label="What seekers care about" hint="Common on local listings — keep it honest">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {RESIDENTIAL_AMENITIES.map((a) => (
              <div key={a} className="flex items-center gap-2">
                <Checkbox id={a} checked={formData.amenities.includes(a)} onCheckedChange={() => handleAmenityToggle(a)} />
                <Label htmlFor={a} className="text-sm font-normal">{a}</Label>
              </div>
            ))}
          </div>
        </Field>
        {formData.listing_intent === 'long_rent' && (
          <Field label="Lease terms">
            <Textarea rows={2} value={formData.lease_terms}
              onChange={(e) => setFormData((p) => ({ ...p, lease_terms: e.target.value }))} />
          </Field>
        )}
      </div>
    );
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold tracking-tight">What are you listing?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                ['residential', Home, 'House, flat, backrooms'],
                ['land', Map, 'Plots & agricultural'],
                ['commercial', Building2, 'Office, retail, warehouse'],
              ] as const).map(([cat, Icon, desc]) => (
                <button key={cat} type="button" onClick={() => setCategory(cat)}
                  className={cn(
                    'rounded-xl border-2 p-4 text-left transition',
                    formData.asset_category === cat ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                    fieldErrors.asset_category && !formData.asset_category && 'border-destructive'
                  )}>
                  <Icon className="h-6 w-6 mb-2 text-primary" />
                  <p className="font-semibold">{ASSET_CATEGORY_LABELS[cat]}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </button>
              ))}
            </div>
            {fieldErrors.asset_category && <p className="text-xs text-destructive">{fieldErrors.asset_category}</p>}
            {formData.asset_category && (
              <>
                <Field label="How is it offered? *" error={fieldErrors.listing_intent}>
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    {(['sale', 'long_rent'] as ListingIntent[]).map((intent) => (
                      <Button key={intent} type="button" className="h-12"
                        variant={formData.listing_intent === intent ? 'default' : 'outline'}
                        onClick={() => setFormData((p) => ({ ...p, listing_intent: intent }))}>
                        {LISTING_INTENT_LABELS[intent]}
                      </Button>
                    ))}
                  </div>
                </Field>
                <Field label="Subtype *" error={fieldErrors.property_subtype}>
                  <Select value={formData.property_subtype}
                    onValueChange={(v) => setFormData((p) => ({ ...p, property_subtype: v }))}>
                    <SelectTrigger className={inputErr('property_subtype')}><SelectValue placeholder="Select type" /></SelectTrigger>
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
                </Field>
              </>
            )}
          </div>
        );
      case 2:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold tracking-tight">Basic information</h2>
            <div className="flex gap-2 flex-wrap">
              {formData.asset_category && <Badge variant="outline">{ASSET_CATEGORY_LABELS[formData.asset_category]}</Badge>}
              {formData.listing_intent && <Badge variant="outline">{LISTING_INTENT_LABELS[formData.listing_intent]}</Badge>}
            </div>
            <Field label="Title *" error={fieldErrors.title}>
              <Input value={formData.title} className={inputErr('title')}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} />
            </Field>
            <Field label="Tenure *">
              <Select value={formData.tenure_type} onValueChange={(v) => setFormData((p) => ({ ...p, tenure_type: v as TenureType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TENURE_TYPES.map((t) => <SelectItem key={t} value={t}>{TENURE_CONFIG[t].label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="mt-2"><TenureBadge tenure={formData.tenure_type} size="md" /></div>
            </Field>
            <Field label={priceLabel} error={fieldErrors.price}>
              <Input type="number" min="1" value={formData.price} className={inputErr('price')}
                onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))} />
            </Field>
            <Field label="Description *" error={fieldErrors.description}>
              <Textarea rows={5} value={formData.description} className={inputErr('description')}
                onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} />
            </Field>
          </div>
        );
      case 3:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold tracking-tight">Location</h2>
            <Field label="City *" error={fieldErrors.city}>
              <Select value={formData.city} onValueChange={(v) => setFormData((p) => ({ ...p, city: v }))}>
                <SelectTrigger className={inputErr('city')}><SelectValue placeholder="City" /></SelectTrigger>
                <SelectContent>{ESWATINI_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Suburb *" error={fieldErrors.suburb}>
              <Input value={formData.suburb} className={inputErr('suburb')}
                onChange={(e) => setFormData((p) => ({ ...p, suburb: e.target.value }))} />
            </Field>
            <Field label="Address (optional)">
              <Input value={formData.address}
                onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} />
            </Field>
          </div>
        );
      case 4:
        return renderDetails();
      case 5:
        return (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold tracking-tight">Photos & contact</h2>
            <Field label="Photos *" error={fieldErrors.photos} hint="At least one photo required to publish. First = cover.">
              <PhotoGrid
                previews={photoPreviews}
                max={MAX_PHOTOS}
                compressing={compressing}
                onFileInput={handlePhotoUpload}
                onDrop={handleDrop}
                onRemove={removePhoto}
                onMove={movePhoto}
                onSetCover={setAsCover}
                error={!!fieldErrors.photos}
              />
            </Field>
            {uploadProgress && <Progress value={(uploadProgress.current / uploadProgress.total) * 100} />}
            <ContactPhoneFields
              contactPhone={formData.contact_phone}
              contactWhatsapp={formData.contact_whatsapp}
              onPhoneChange={(v) => setFormData((p) => ({ ...p, contact_phone: v }))}
              onWhatsappChange={(v) => setFormData((p) => ({ ...p, contact_whatsapp: v }))}
              isPhoneVerified={isPhoneVerified}
              onRequestVerify={() => setPhoneDialogOpen(true)}
            />
            {fieldErrors.contact_phone && (
              <p className="text-xs text-destructive">{fieldErrors.contact_phone}</p>
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
      <Button variant="ghost" asChild className="mb-4">
        <Link href="/dashboard/landlord"><ChevronLeft className="h-4 w-4 mr-1" />Back</Link>
      </Button>
      <h1 className="text-3xl font-bold mb-1 tracking-tight">Add listing</h1>
      <p className="text-muted-foreground mb-6">Residential, land, or commercial</p>

      {!isLandlordVerified && (
        <Card className="border-amber-500/30 bg-amber-500/10 mb-6">
          <CardContent className="p-4 flex gap-3">
            {isLandlordPending ? <Clock className="h-6 w-6 text-amber-600" /> : <AlertCircle className="h-6 w-6 text-red-600" />}
            <p className="text-sm">Drafts work anytime. Publish needs verification, phone, and at least one photo.</p>
          </CardContent>
        </Card>
      )}

      {/* Clickable steps */}
      <div className="mb-6 flex justify-between gap-1">
        {STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const active = step === currentStep;
          const done = step < currentStep;
          return (
            <button
              key={label}
              type="button"
              onClick={() => { setCurrentStep(step); setError(null); }}
              className={cn(
                'flex-1 text-center text-xs rounded-lg py-1 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-1 text-sm font-medium',
                done && 'bg-primary text-primary-foreground',
                active && 'border-2 border-primary',
                !done && !active && 'border-2 border-muted'
              )}>
                {step}
              </div>
              <span className="hidden sm:block">{label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit}>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Card>
          <CardContent className="p-6 sm:p-8">{renderStep()}</CardContent>
        </Card>
        <div className="flex justify-between mt-6 gap-2 flex-wrap">
          <Button type="button" variant="outline" onClick={() => setCurrentStep((s) => Math.max(1, s - 1))} disabled={currentStep === 1}>
            <ChevronLeft className="h-4 w-4 mr-1" />Previous
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={savingDraft || loading}>
              {savingDraft ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save draft
            </Button>
            {currentStep < TOTAL_STEPS ? (
              <Button type="button" onClick={handleNext}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : isLandlordVerified ? (
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Submit
              </Button>
            ) : (
              <Button type="button" variant="secondary" disabled>
                <Eye className="h-4 w-4 mr-1" />Verify to submit
              </Button>
            )}
          </div>
        </div>
      </form>

      <PhoneVerifyDialog
        open={phoneDialogOpen}
        onOpenChange={setPhoneDialogOpen}
        defaultPhone={formData.contact_phone || accountPhone || ''}
        onVerified={() => { refreshPhone(); toast.success('Phone verified'); }}
      />
    </div>
  );
}
