// src/app/properties/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin, Home, Bed, Bath, Calendar, Phone, Mail, Share2, Heart,
  CheckCircle, MessageCircle, Navigation, ArrowLeft, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, X, Maximize2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PropertyPhoto, ExtendedProperty } from '@/types/property';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { TenureBadge } from '@/components/properties/TenureBadge';
import { ReportListingDialog, ReportReason } from '@/components/properties/ReportListingDialog';

const getPrimaryPhoto = (photos?: PropertyPhoto[]) => {
  if (!photos || photos.length === 0) return null;
  return [...photos].sort((a, b) => a.display_order - b.display_order)[0];
};

const transformPropertyData = (data: any): ExtendedProperty => {
  if (!data) throw new Error('No property data');
  const photos = Array.isArray(data.photos) ? data.photos : [];
  const landlord = data.landlord || {
    full_name: 'Property Owner',
    phone: data.contact_phone || '',
    is_verified: false,
    email: data.contact_email || '',
  };
  return {
    id: data.id,
    landlord_id: data.landlord_id || '',
    title: data.title || 'Unnamed Property',
    description: data.description || '',
    price: data.price || 0,
    property_type: data.property_type || 'other',
    listing_type: data.listing_type,
    location_city: data.location_city || '',
    location_suburb: data.location_suburb || '',
    location_address: data.location_address || '',
    area_id: data.area_id,
    latitude: data.latitude,
    longitude: data.longitude,
    bedrooms: data.bedrooms || 0,
    bathrooms: data.bathrooms || 0,
    size_sqm: data.size_sqm,
    is_furnished: data.is_furnished || false,
    amenities: data.amenities || [],
    lease_terms: data.lease_terms || '',
    tenure_type: data.tenure_type || 'unsure',
    status: data.status || 'active',
    is_featured: data.is_featured || false,
    views: data.views || 0,
    save_count: data.save_count,
    contact_count: data.contact_count,
    report_count: data.report_count,
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString(),
    published_at: data.published_at,
    expires_at: data.expires_at,
    contact_phone: data.contact_phone || '',
    contact_whatsapp: data.contact_whatsapp || '',
    country: data.country || 'Eswatini',
    landlord,
    photos,
  };
};

const formatEswatiniPhone = (phone: string): string => {
  if (!phone) return 'No phone number';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('268')) {
    const local = cleaned.slice(3);
    if (local.length === 8) return `+268 ${local.slice(0, 4)} ${local.slice(4)}`;
    if (local.length === 7) return `+268 ${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5)}`;
    return `+268 ${local}`;
  }
  if (cleaned.startsWith('0') && cleaned.length === 9) {
    const number = cleaned.slice(1);
    return `+268 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  }
  if (cleaned.length === 8) return `+268 ${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  return phone.startsWith('+') ? phone : `+${cleaned}`;
};

const ImageLightbox = ({
  images, initialIndex, onClose,
}: { images: string[]; initialIndex: number; onClose: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrentIndex((p) => Math.max(0, p - 1));
      if (e.key === 'ArrowRight') setCurrentIndex((p) => Math.min(images.length - 1, p + 1));
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
        <div className="relative w-full h-[85vh] flex items-center justify-center">
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-10 bg-black/50 text-white rounded-full" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
          <div className="relative w-full h-full">
            <Image src={images[currentIndex]} alt={`Property image ${currentIndex + 1}`} fill className="object-contain" priority />
          </div>
          {images.length > 1 && (
            <>
              <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full h-12 w-12" onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))} disabled={currentIndex === 0}>
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full h-12 w-12" onClick={() => setCurrentIndex((p) => Math.min(images.length - 1, p + 1))} disabled={currentIndex === images.length - 1}>
                <ChevronRight className="h-6 w-6" />
              </Button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-4 py-2 rounded-full">
                {currentIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Breadcrumb = memo(({ property }: { property: ExtendedProperty }) => (
  <nav className="text-sm text-gray-500" aria-label="Breadcrumb">
    <ol className="flex items-center space-x-2 flex-wrap">
      <li><Link href="/" className="hover:text-primary-600">Home</Link></li>
      <li><ChevronRight className="h-4 w-4" /></li>
      <li><Link href="/search" className="hover:text-primary-600">Search</Link></li>
      <li><ChevronRight className="h-4 w-4" /></li>
      <li className="text-gray-700 truncate max-w-[200px]">{property.title}</li>
    </ol>
  </nav>
));
Breadcrumb.displayName = 'Breadcrumb';

export default function PublicPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [property, setProperty] = useState<ExtendedProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [similarProperties, setSimilarProperties] = useState<ExtendedProperty[]>([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const viewRecordedRef = useRef(false);
  const fetchedRef = useRef(false);

  const photoUrls = useMemo(() => property?.photos?.map((p) => p.photo_url) || [], [property?.photos]);
  const displayPhone = useMemo(() => (property ? formatEswatiniPhone(property.contact_phone) : 'No phone number'), [property]);
  const landlordEmail = useMemo(() => property?.landlord?.email, [property?.landlord?.email]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchProperty = async () => {
      try {
        setLoading(true);
        const propertyId = params.id as string;
        const { data, error: propertyError } = await supabase
          .from('properties')
          .select(`*, landlord:profiles!properties_landlord_id_fkey (full_name, phone, is_verified, email), photos:property_photos (id, photo_url, caption, display_order, created_at)`)
          .eq('id', propertyId)
          .single();

        if (propertyError) {
          if (propertyError.code === 'PGRST116') setError('Property not found');
          else throw propertyError;
          return;
        }
        if (!data) { setError('Property not found'); return; }

        const status = data.status;
        if (status !== 'active' && status !== 'rented' && status !== 'taken') {
          setError('This property is not available');
          return;
        }

        const propertyData = transformPropertyData(data);
        setProperty(propertyData);

        if (user) {
          try {
            const { data: savedData } = await supabase
              .from('saved_properties')
              .select('id')
              .eq('renter_id', user.id)
              .eq('property_id', propertyId)
              .maybeSingle();
            setIsSaved(!!savedData);
          } catch { /* ignore */ }
        }

        const { data: similar } = await supabase
          .from('properties')
          .select(`*, landlord:profiles!properties_landlord_id_fkey (full_name, phone, is_verified, email), photos:property_photos (id, photo_url, display_order)`)
          .eq('status', 'active')
          .eq('location_city', propertyData.location_city)
          .eq('property_type', propertyData.property_type)
          .neq('id', propertyData.id)
          .limit(3)
          .order('created_at', { ascending: false });
        if (similar) setSimilarProperties(similar.map((item: any) => transformPropertyData(item)));

        if (!viewRecordedRef.current) {
          viewRecordedRef.current = true;
          try {
            const { error: rpcError } = await supabase.rpc('increment_property_view', { property_id: propertyId });
            if (rpcError) {
              const { data: cur } = await supabase.from('properties').select('views').eq('id', propertyId).single();
              await supabase.from('properties').update({ views: (cur?.views || 0) + 1 }).eq('id', propertyId);
            }
          } catch { /* ignore */ }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) fetchProperty();
    return () => { fetchedRef.current = false; };
  }, [params.id, user]);

  const handleContact = useCallback((method: 'phone' | 'whatsapp' | 'email') => {
    if (!property) return;
    if (method === 'phone') {
      window.location.href = `tel:${property.contact_phone.replace(/\D/g, '')}`;
    } else if (method === 'whatsapp') {
      const msg = encodeURIComponent(`Hi, I saw your property on Ekhaya: ${property.title} (E${property.price}/month) — ${window.location.href}`);
      const phone = (property.contact_whatsapp || property.contact_phone).replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    } else if (method === 'email') {
      const email = property.landlord?.email;
      if (email) {
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Property Inquiry: ${property.title}`)}&body=${encodeURIComponent(`Hello,\n\nI'm interested in "${property.title}" at E${property.price}/month.\n\nThank you.`)}`;
      } else {
        toast.info('Email not available');
      }
    }
  }, [property]);

  const handleShare = useCallback(async () => {
    if (!property) return;
    if (navigator.share) {
      try { await navigator.share({ title: property.title, text: `Check out this property in ${property.location_city}`, url: window.location.href }); } catch { /* */ }
    } else {
      try { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied!'); } catch { toast.error('Failed to copy'); }
    }
  }, [property]);

  const handleSave = useCallback(async () => {
    if (!user) { router.push('/auth/login'); return; }
    if (!property) return;
    setIsSaving(true);
    try {
      if (isSaved) {
        await supabase.from('saved_properties').delete().eq('renter_id', user.id).eq('property_id', property.id);
        setIsSaved(false);
        toast.success('Removed from saved');
      } else {
        await supabase.from('saved_properties').insert([{ renter_id: user.id, property_id: property.id }]);
        setIsSaved(true);
        toast.success('Property saved!');
      }
    } catch { toast.error('Failed to save'); }
    finally { setIsSaving(false); }
  }, [user, property, isSaved, router]);

  const handleReported = useCallback((reason: ReportReason) => {
    if (reason === 'already_taken' && property) {
      setProperty({ ...property, status: 'taken' });
    }
  }, [property]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Property Not Found</h2>
            <p className="text-gray-600 mb-6">{error || 'This property is not available.'}</p>
            <Button asChild><Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <Breadcrumb property={property} />
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleShare}><Share2 className="h-4 w-4 mr-2" />Share</Button>
            <Button variant="ghost" size="sm" onClick={handleSave} disabled={isSaving}>
              <Heart className={`h-4 w-4 mr-2 ${isSaved ? 'fill-red-500 text-red-500' : ''}`} />
              {isSaved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-hidden">
              <CardContent className="p-3 md:p-4">
                <div
                  className="relative h-64 sm:h-80 md:h-96 lg:h-[500px] mb-4 bg-gray-100 rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => photoUrls.length > 0 && setIsLightboxOpen(true)}
                >
                  {photoUrls.length > 0 ? (
                    <Image src={photoUrls[selectedImage] || photoUrls[0]} alt={property.title} fill className="object-cover" priority />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Home className="h-16 w-16 text-gray-400" /></div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                    {property.landlord?.is_verified && <Badge className="bg-emerald-500 text-white border-0"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>}
                    <TenureBadge tenure={property.tenure_type} size="md" />
                    {property.status === 'active' && <Badge className="bg-primary-600 text-white border-0">Available Now</Badge>}
                    {(property.status === 'rented' || property.status === 'taken') && <Badge className="bg-gray-500 text-white border-0">Taken</Badge>}
                    {property.is_featured && <Badge className="bg-amber-500 text-white border-0">Featured</Badge>}
                  </div>
                </div>
                {photoUrls.length > 1 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {photoUrls.slice(0, 8).map((photo, index) => (
                      <button key={index} onClick={() => setSelectedImage(index)} className={`relative h-16 sm:h-20 rounded-lg overflow-hidden border-2 ${selectedImage === index ? 'border-primary-600' : 'border-transparent'}`}>
                        <Image src={photo} alt="" fill className="object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold mb-2">{property.title}</h1>
                    <div className="flex items-center text-gray-500"><MapPin className="h-5 w-5 mr-1" />{property.location_suburb}, {property.location_city}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-primary-600">E{property.price.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">per month</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"><Bed className="h-5 w-5 mx-auto mb-1 text-primary-600" /><div className="font-semibold">{property.bedrooms || 'N/A'}</div><div className="text-sm text-gray-500">Bedrooms</div></div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"><Bath className="h-5 w-5 mx-auto mb-1 text-primary-600" /><div className="font-semibold">{property.bathrooms || 'N/A'}</div><div className="text-sm text-gray-500">Bathrooms</div></div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"><Home className="h-5 w-5 mx-auto mb-1 text-primary-600" /><div className="font-semibold capitalize">{property.property_type}</div><div className="text-sm text-gray-500">Type</div></div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"><Calendar className="h-5 w-5 mx-auto mb-1 text-primary-600" /><div className="font-semibold">{new Date(property.created_at).toLocaleDateString()}</div><div className="text-sm text-gray-500">Listed</div></div>
                </div>
                <Tabs defaultValue="description">
                  <TabsList className="w-full grid grid-cols-3 mb-4"><TabsTrigger value="description">Description</TabsTrigger><TabsTrigger value="features">Features</TabsTrigger><TabsTrigger value="nearby">Nearby</TabsTrigger></TabsList>
                  <TabsContent value="description"><p className="text-gray-600 whitespace-pre-line">{property.description || 'No description.'}</p></TabsContent>
                  <TabsContent value="features">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {property.amenities?.length ? property.amenities.map((a, i) => (
                        <div key={i} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /><span>{a}</span></div>
                      )) : <p className="text-gray-500">No amenities listed.</p>}
                    </div>
                  </TabsContent>
                  <TabsContent value="nearby">
                    <p className="text-gray-500 mb-3">Nearby points of interest coming soon.</p>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"><MapPin className="h-5 w-5 text-gray-400" /><div><div className="font-medium">{property.location_city}</div><div className="text-sm text-gray-500">{property.location_suburb}</div></div></div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              <Card>
                <CardContent className="p-4 md:p-6">
                  <h2 className="text-xl font-semibold mb-4">Contact Landlord</h2>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center"><Home className="h-6 w-6 text-primary-600" /></div>
                    <div>
                      <div className="font-semibold">{property.landlord?.full_name || 'Property Owner'}</div>
                      {property.landlord?.is_verified && <div className="flex items-center text-sm text-gray-500"><CheckCircle className="h-3 w-3 text-emerald-500 mr-1" />Verified</div>}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleContact('whatsapp')}><MessageCircle className="mr-2 h-5 w-5" />WhatsApp</Button>
                    <Button variant="outline" className="w-full h-12" onClick={() => handleContact('phone')}><Phone className="mr-2 h-5 w-5" />Call {displayPhone}</Button>
                    <Button variant="outline" className="w-full h-12" onClick={() => handleContact('email')}><Mail className="mr-2 h-5 w-5" />Send Email</Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:p-6">
                  <h3 className="font-semibold mb-3">Listing Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className="capitalize">{property.status}</span></div>
                    <div className="flex justify-between items-center"><span className="text-gray-500">Tenure:</span><TenureBadge tenure={property.tenure_type} /></div>
                    <div className="flex justify-between"><span className="text-gray-500">Views:</span><span>{property.views || 0}</span></div>
                  </div>
                  <div className="border-t my-4" />
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg text-sm border border-amber-200">
                    <p className="text-amber-800 font-medium mb-1">Safety Tips</p>
                    <p className="text-amber-700 text-xs">• View in person before paying<br />• Never send money via mobile transfer<br />• Report suspicious listings</p>
                    <Button variant="link" className="text-xs p-0 h-auto mt-2 text-amber-600" onClick={() => setReportOpen(true)}>
                      Report this listing
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {similarProperties.length > 0 && (
                <Card>
                  <CardContent className="p-4 md:p-6">
                    <h3 className="font-semibold mb-3">Similar Properties</h3>
                    <div className="space-y-3">
                      {similarProperties.map((s) => {
                        const photo = getPrimaryPhoto(s.photos);
                        return (
                          <Link key={s.id} href={`/properties/${s.id}`} className="flex gap-3 p-2 hover:bg-gray-50 rounded-lg">
                            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden relative shrink-0">
                              {photo ? <Image src={photo.photo_url} alt="" fill className="object-cover" /> : <Home className="h-6 w-6 m-auto text-gray-400" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{s.title}</div>
                              <div className="text-xs text-gray-500">{s.location_suburb}</div>
                              <div className="text-sm font-semibold text-primary-600">E{s.price}/mo</div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {isLightboxOpen && photoUrls.length > 0 && (
        <ImageLightbox images={photoUrls} initialIndex={selectedImage} onClose={() => setIsLightboxOpen(false)} />
      )}

      <ReportListingDialog
        propertyId={property.id}
        propertyTitle={property.title}
        open={reportOpen}
        onOpenChange={setReportOpen}
        onReported={handleReported}
      />
    </main>
  );
}
