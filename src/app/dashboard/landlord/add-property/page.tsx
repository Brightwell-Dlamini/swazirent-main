// src/app/dashboard/landlord/add-property/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useVerification } from '@/hooks/useVerification';
import { usePhoneVerification } from '@/hooks/usePhoneVerification';
import { supabase } from '@/lib/supabase';
import { PropertyType, TenureType, TENURE_CONFIG } from '@/types/property';
import { canPostListings, normalizeUserType } from '@/types/user';
import {
  ESWATINI_CITIES,
  PROPERTY_TYPES,
  TENURE_TYPES,
  ESWATINI_AMENITIES,
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
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TenureBadge } from '@/components/properties/TenureBadge';
import { PhoneVerifyDialog } from '@/components/auth/PhoneVerifyDialog';

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
    title: '',
    description: '',
    property_type: '' as PropertyType | '',
    tenure_type: 'unsure' as TenureType,
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
    if (currentStep < totalSteps) setCurrentStep((p) => p + 1);
  }, [currentStep]);

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
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed`);
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

  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, contact_phone: e.target.value.replace(/[^\d+]/g, '') }));
  }, []);

  const validateForm = useCallback((): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!formData.title.trim()) errors.push('Please enter a listing title');
    if (!formData.description.trim()) errors.push('Please enter a description');
    if (!formData.property_type) errors.push('Please select a property type');
    if (!formData.tenure_type) errors.push('Please select land tenure');
    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price) || price <= 0) errors.push('Please enter a valid price greater than 0');
    if (!formData.city) errors.push('Please select a city in Eswatini');
    if (!formData.suburb.trim()) errors.push('Please enter a suburb');
    if (!formData.contact_phone.trim()) errors.push('Please enter a contact phone number');
    else if (!isValidEswatiniPhone(formData.contact_phone))
      errors.push('Please enter a valid Eswatini phone number (e.g., +268 7600 0000)');
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
      const { error: uploadError } = await supabase.storage.from('property-photos').upload(fileName, photo);
      if (uploadError) throw new Error(`Failed to upload photo ${i + 1}: ${uploadError.message}`);
      const { data: { publicUrl } } = supabase.storage.from('property-photos').getPublicUrl(fileName);
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
        setError('Please verify your phone number before publishing a listing.');
        setPhoneDialogOpen(true);
        return false;
      }
      if (!isLandlordVerified) {
        setError('Your account must be verified before you can publish properties.');
        return false;
      }
    }

    if (!user) {
      setError('You must be logged in to list a property');
      return false;
    }

    try {
      const propertyData = {
        landlord_id: user.id,
        title: formData.title.trim() || 'Untitled Property',
        description: formData.description.trim() || 'No description provided',
        property_type: formData.property_type || 'other',
        tenure_type: formData.tenure_type || 'unsure',
        price: parseFloat(formData.price) || 0,
        location_city: formData.city || 'Unknown',
        location_suburb: formData.suburb.trim() || 'Unknown',
        location_address: formData.address.trim() || null,
        bedrooms: formData.bedrooms !== '0' ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms !== '0' ? parseFloat(formData.bathrooms) : null,
        is_furnished: formData.is_furnished,
        amenities: formData.amenities,
        lease_terms: formData.lease_terms.trim() || null,
        contact_whatsapp: formData.contact_whatsapp.trim() || null,
        contact_phone: formData.contact_phone ? normalizeEswatiniPhone(formData.contact_phone.trim()) : '',
        status,
        views: 0,
        is_featured: false,
      };

      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert([propertyData])
        .select()
        .single();

      if (propertyError) throw new Error(`Failed to create property: ${propertyError.message}`);
      if (!property) throw new Error('Property was created but no data was returned');

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
            if (photosError) toast.warning('Property created but some photos failed to save');
          }
        } catch {
          toast.warning('Property created but photos failed to upload.');
        }
      }

      return property.id;
    } catch (error: unknown) {
      console.error('Save error:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhoneVerified) {
      setPhoneDialogOpen(true);
      toast.info('Verify your phone to publish listings');
      return;
    }
    setLoading(true);
    const propertyId = await saveProperty('pending');
    if (propertyId) {
      toast.success('Property submitted for review!');
      router.push('/dashboard/landlord');
    }
    setLoading(false);
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    const propertyId = await saveProperty('draft');
    if (propertyId) {
      toast.success('Draft saved successfully');
      router.push('/dashboard/landlord');
    }
    setSavingDraft(false);
  };

  useEffect(() => {
    return () => {
      photoPreviews.forEach((p) => URL.revokeObjectURL(p));
    };
  }, [photoPreviews]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Listing Title *</Label>
                <Input id="title" placeholder="e.g., Spacious 2-Bedroom in Ngwane Park" value={formData.title} onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))} required />
              </div>
              <div>
                <Label>Property Type *</Label>
                <Select value={formData.property_type} onValueChange={(v) => setFormData((p) => ({ ...p, property_type: v as PropertyType }))}>
                  <SelectTrigger><SelectValue placeholder="Select property type" /></SelectTrigger>
                  <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Land Tenure *</Label>
                <Select value={formData.tenure_type} onValueChange={(v) => setFormData((p) => ({ ...p, tenure_type: v as TenureType }))}>
                  <SelectTrigger><SelectValue placeholder="Select land tenure" /></SelectTrigger>
                  <SelectContent>{TENURE_TYPES.map((t) => <SelectItem key={t} value={t}>{TENURE_CONFIG[t].label}</SelectItem>)}</SelectContent>
                </Select>
                <div className="mt-2"><TenureBadge tenure={formData.tenure_type} size="md" /></div>
              </div>
              <div>
                <Label htmlFor="price">Monthly Rent (E) *</Label>
                <Input id="price" type="number" min="1" placeholder="3500" value={formData.price} onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))} required />
              </div>
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea id="description" rows={6} value={formData.description} onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))} required />
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
                <Label>City/Town *</Label>
                <Select value={formData.city} onValueChange={(v) => setFormData((p) => ({ ...p, city: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>{ESWATINI_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="suburb">Suburb/Area *</Label>
                <Input id="suburb" value={formData.suburb} onChange={(e) => setFormData((p) => ({ ...p, suburb: e.target.value }))} required />
              </div>
              <div>
                <Label htmlFor="address">Street Address (Optional)</Label>
                <Input id="address" value={formData.address} onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))} />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Property Details & Amenities</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bedrooms</Label>
                <Select value={formData.bedrooms} onValueChange={(v) => setFormData((p) => ({ ...p, bedrooms: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROOM_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n === '0' ? 'None' : n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bathrooms</Label>
                <Select value={formData.bathrooms} onValueChange={(v) => setFormData((p) => ({ ...p, bathrooms: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{BATH_OPTIONS.map((n) => <SelectItem key={n} value={n}>{n === '0' ? 'None' : n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="furnished" checked={formData.is_furnished} onCheckedChange={(c) => setFormData((p) => ({ ...p, is_furnished: c as boolean }))} />
              <Label htmlFor="furnished">Furnished</Label>
            </div>
            <div>
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                {ESWATINI_AMENITIES.map((a) => (
                  <div key={a} className="flex items-center space-x-2">
                    <Checkbox id={a} checked={formData.amenities.includes(a)} onCheckedChange={() => handleAmenityToggle(a)} />
                    <Label htmlFor={a} className="text-sm">{a}</Label>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="lease_terms">Lease Terms</Label>
              <Textarea id="lease_terms" rows={3} value={formData.lease_terms} onChange={(e) => setFormData((p) => ({ ...p, lease_terms: e.target.value }))} />
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Photos & Contact</h2>
            <div>
              <Label>Property Photos (Max {MAX_PHOTOS})</Label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4 mt-2 mb-4">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative aspect-square">
                    <Image src={preview} alt="" fill className="object-cover rounded-lg" />
                    <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => removePhoto(index)}><X className="h-3 w-3" /></Button>
                    {index === 0 && <Badge className="absolute bottom-2 left-2 bg-primary">Cover</Badge>}
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <label className="aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary">
                    <Upload className="h-6 w-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">Upload</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                  </label>
                )}
              </div>
            </div>
            {uploadProgress && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span>Uploading...</span><span>{uploadProgress.current}/{uploadProgress.total}</span></div>
                <Progress value={(uploadProgress.current / uploadProgress.total) * 100} />
              </div>
            )}
            <div className="space-y-4">
              <h3 className="font-medium">Contact Information</h3>
              <div>
                <Label htmlFor="contact_phone">Phone Number *</Label>
                <Input id="contact_phone" type="tel" placeholder="+268 7600 0000" value={formData.contact_phone} onChange={handlePhoneChange} required />
              </div>
              <div>
                <Label htmlFor="contact_whatsapp">WhatsApp (Optional)</Label>
                <Input id="contact_whatsapp" type="tel" value={formData.contact_whatsapp} onChange={(e) => setFormData((p) => ({ ...p, contact_whatsapp: e.target.value.replace(/[^\d+]/g, '') }))} />
              </div>
            </div>
            {!isPhoneVerified && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertDescription className="text-amber-800 flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex items-center gap-2"><Smartphone className="h-4 w-4" /> Phone verification required to publish.</span>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPhoneDialogOpen(true)}>Verify phone</Button>
                </AlertDescription>
              </Alert>
            )}
            {isPhoneVerified && (
              <Alert className="bg-emerald-50 border-emerald-200">
                <AlertDescription className="text-emerald-800">Phone verified — you can publish listings.</AlertDescription>
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
          <Link href="/dashboard/landlord"><ChevronLeft className="h-4 w-4 mr-1" />Back to Dashboard</Link>
        </Button>
        <h1 className="text-3xl font-bold">Add New Property</h1>
        <p className="text-gray-600">List your property on Ekhaya</p>
      </div>

      {!isLandlordVerified && (
        <Card className="border-amber-200 bg-amber-50 mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {isLandlordPending ? <Clock className="h-8 w-8 text-amber-600" /> : <AlertCircle className="h-8 w-8 text-red-600" />}
              <div>
                <h3 className="font-semibold">{isLandlordPending ? 'Verification Pending' : 'Verification Required'}</h3>
                <p className="text-sm text-muted-foreground">You can save drafts now. Publish requires account verification and phone OTP.</p>
                {!isLandlordPending && (
                  <Button asChild className="mt-3" size="sm"><Link href="/dashboard/landlord/verify"><Shield className="mr-2 h-4 w-4" />Start Verification</Link></Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-8 flex justify-between">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className={`flex-1 text-center ${step <= currentStep ? 'text-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center mb-2 ${step < currentStep ? 'bg-primary text-white' : step === currentStep ? 'border-2 border-primary' : 'border-2 border-gray-300'}`}>{step}</div>
            <span className="text-sm hidden md:block">{step === 1 ? 'Basic Info' : step === 2 ? 'Location' : step === 3 ? 'Details' : 'Photos'}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {error && <Alert variant="destructive" className="mb-6"><AlertDescription>{error}</AlertDescription></Alert>}
        <Card><CardContent className="p-6">{renderStep()}</CardContent></Card>
        <div className="flex justify-between mt-6">
          <Button type="button" variant="outline" onClick={handlePrevious} disabled={currentStep === 1}>
            <ChevronLeft className="h-4 w-4 mr-2" />Previous
          </Button>
          <div className="flex gap-2">
            {currentStep === totalSteps && (
              <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={savingDraft}>
                {savingDraft ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Draft
              </Button>
            )}
            {currentStep < totalSteps ? (
              <Button type="button" onClick={handleNext}>Next<ChevronRight className="h-4 w-4 ml-2" /></Button>
            ) : isLandlordVerified ? (
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit for Review
              </Button>
            ) : (
              <Button type="button" variant="secondary" disabled><Eye className="mr-2 h-4 w-4" />Verify to Submit</Button>
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
          toast.success('Phone verified — you can publish now');
        }}
      />
    </div>
  );
}
