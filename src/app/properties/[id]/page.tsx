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
  CheckCircle, MessageCircle, ArrowLeft, Loader2, AlertCircle,
  ChevronLeft, ChevronRight, X, Ruler, Building2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  PropertyPhoto, ExtendedProperty,
  formatPricePeriod, inferAssetCategory, inferListingIntent,
  subtypeLabel, ASSET_CATEGORY_LABELS, LISTING_INTENT_LABELS, FIT_OUT_LABELS,
} from '@/types/property';
import { mapPropertyRow } from '@/lib/mapProperty';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { TenureBadge } from '@/components/properties/TenureBadge';
import { ReportListingDialog, ReportReason } from '@/components/properties/ReportListingDialog';

const getPrimaryPhoto = (photos?: PropertyPhoto[]) => {
  if (!photos?.length) return null;
  return [...photos].sort((a, b) => a.display_order - b.display_order)[0];
};

const formatEswatiniPhone = (phone: string): string => {
  if (!phone) return 'No phone';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('268') && cleaned.length >= 11) {
    const local = cleaned.slice(3);
    return `+268 ${local.slice(0, 4)} ${local.slice(4)}`;
  }
  if (cleaned.length === 8) return `+268 ${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  return phone.startsWith('+') ? phone : `+${cleaned}`;
};

const ImageLightbox = ({
  images, initialIndex, onClose,
}: { images: string[]; initialIndex: number; onClose: () => void }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrentIndex((p) => Math.max(0, p - 1));
      if (e.key === 'ArrowRight') setCurrentIndex((p) => Math.min(images.length - 1, p + 1));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [images.length, onClose]);
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-none">
        <div className="relative w-full h-[85vh] flex items-center justify-center">
          <Button variant="ghost" size="icon" className="absolute top-4 right-4 z-10 text-white" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
          <div className="relative w-full h-full">
            <Image src={images[currentIndex]} alt="" fill className="object-contain" priority />
          </div>
          {images.length > 1 && (
            <>
              <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-white h-12 w-12"
                onClick={() => setCurrentIndex((p) => Math.max(0, p - 1))} disabled={currentIndex === 0}>
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 text-white h-12 w-12"
                onClick={() => setCurrentIndex((p) => Math.min(images.length - 1, p + 1))}
                disabled={currentIndex === images.length - 1}>
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

const Breadcrumb = memo(({ title }: { title: string }) => (
  <nav className="text-sm text-muted-foreground" aria-label="Breadcrumb">
    <ol className="flex items-center space-x-2 flex-wrap">
      <li><Link href="/" className="hover:text-primary">Home</Link></li>
      <li><ChevronRight className="h-4 w-4" /></li>
      <li><Link href="/search" className="hover:text-primary">Search</Link></li>
      <li><ChevronRight className="h-4 w-4" /></li>
      <li className="text-foreground truncate max-w-[200px]">{title}</li>
    </ol>
  </nav>
));
Breadcrumb.displayName = 'Breadcrumb';

function SpecsGrid({ property }: { property: ExtendedProperty }) {
  const category = inferAssetCategory(property);
  const intent = inferListingIntent(property);

  if (category === 'land') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="text-center p-3 bg-muted rounded-lg">
          <Ruler className="h-5 w-5 mx-auto mb-1 text-primary" />
          <div className="font-semibold">{property.land_size_ha ?? '—'} ha</div>
          <div className="text-sm text-muted-foreground">Size</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <Home className="h-5 w-5 mx-auto mb-1 text-primary" />
          <div className="font-semibold text-sm">{property.is_fenced ? 'Yes' : 'No'}</div>
          <div className="text-sm text-muted-foreground">Fenced</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <MapPin className="h-5 w-5 mx-auto mb-1 text-primary" />
          <div className="font-semibold text-sm">{subtypeLabel(property.property_subtype)}</div>
          <div className="text-sm text-muted-foreground">Type</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <Calendar className="h-5 w-5 mx-auto mb-1 text-primary" />
          <div className="font-semibold text-sm">{LISTING_INTENT_LABELS[intent]}</div>
          <div className="text-sm text-muted-foreground">Offer</div>
        </div>
      </div>
    );
  }

  if (category === 'commercial') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="text-center p-3 bg-muted rounded-lg">
          <Building2 className="h-5 w-5 mx-auto mb-1 text-primary" />
          <div className="font-semibold">{property.floor_area_sqm ?? '—'} m²</div>
          <div className="text-sm text-muted-foreground">Floor area</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <Home className="h-5 w-5 mx-auto mb-1 text-primary" />
          <div className="font-semibold text-sm">{subtypeLabel(property.property_subtype)}</div>
          <div className="text-sm text-muted-foreground">Type</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="font-semibold">{property.parking_bays ?? '—'}</div>
          <div className="text-sm text-muted-foreground">Parking</div>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <div className="font-semibold text-sm">
            {property.fit_out ? FIT_OUT_LABELS[property.fit_out] : '—'}
          </div>
          <div className="text-sm text-muted-foreground">Fit-out</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div className="text-center p-3 bg-muted rounded-lg">
        <Bed className="h-5 w-5 mx-auto mb-1 text-primary" />
        <div className="font-semibold">{property.bedrooms ?? '—'}</div>
        <div className="text-sm text-muted-foreground">Bedrooms</div>
      </div>
      <div className="text-center p-3 bg-muted rounded-lg">
        <Bath className="h-5 w-5 mx-auto mb-1 text-primary" />
        <div className="font-semibold">{property.bathrooms ?? '—'}</div>
        <div className="text-sm text-muted-foreground">Bathrooms</div>
      </div>
      <div className="text-center p-3 bg-muted rounded-lg">
        <Home className="h-5 w-5 mx-auto mb-1 text-primary" />
        <div className="font-semibold text-sm">{subtypeLabel(property.property_subtype || property.property_type)}</div>
        <div className="text-sm text-muted-foreground">Type</div>
      </div>
      <div className="text-center p-3 bg-muted rounded-lg">
        <Calendar className="h-5 w-5 mx-auto mb-1 text-primary" />
        <div className="font-semibold text-sm">{new Date(property.created_at).toLocaleDateString()}</div>
        <div className="text-sm text-muted-foreground">Listed</div>
      </div>
    </div>
  );
}

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
  const [reportOpen, setReportOpen] = useState(false);
  const viewRecordedRef = useRef(false);
  const fetchedRef = useRef(false);

  const photoUrls = useMemo(() => property?.photos?.map((p) => p.photo_url) || [], [property?.photos]);
  const displayPhone = useMemo(() => (property ? formatEswatiniPhone(property.contact_phone) : ''), [property]);

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

        const mapped = mapPropertyRow(data) as ExtendedProperty;
        mapped.landlord = data.landlord || mapped.landlord;
        mapped.photos = data.photos || [];
        setProperty(mapped);

        if (user) {
          try {
            const { data: savedData } = await supabase
              .from('saved_properties').select('id')
              .eq('renter_id', user.id).eq('property_id', propertyId).maybeSingle();
            setIsSaved(!!savedData);
          } catch { /* ignore */ }
        }

        const category = inferAssetCategory(mapped);
        let similarQuery = supabase
          .from('properties')
          .select(`*, landlord:profiles!properties_landlord_id_fkey (full_name, phone, is_verified, email), photos:property_photos (id, photo_url, display_order, created_at)`)
          .eq('status', 'active')
          .eq('location_city', mapped.location_city)
          .neq('id', mapped.id)
          .limit(3)
          .order('created_at', { ascending: false });

        if (mapped.asset_category) {
          similarQuery = similarQuery.eq('asset_category', mapped.asset_category);
        }

        const { data: similar } = await similarQuery;
        if (similar) {
          setSimilarProperties(
            similar.map((item: any) => {
              const m = mapPropertyRow(item) as ExtendedProperty;
              m.landlord = item.landlord || m.landlord;
              m.photos = item.photos || [];
              return m;
            })
          );
        }

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
        setError('Failed to load property');
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
      const msg = encodeURIComponent(`Hi, I saw your listing on Ekhaya: ${property.title} — ${window.location.href}`);
      const phone = (property.contact_whatsapp || property.contact_phone).replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    } else {
      const email = property.landlord?.email;
      if (email) {
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(`Inquiry: ${property.title}`)}`;
      } else toast.info('Email not available');
    }
  }, [property]);

  const handleShare = useCallback(async () => {
    if (!property) return;
    if (navigator.share) {
      try { await navigator.share({ title: property.title, url: window.location.href }); } catch { /* */ }
    } else {
      try { await navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); } catch { toast.error('Copy failed'); }
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
        toast.success('Saved');
      }
    } catch { toast.error('Failed to save'); }
    finally { setIsSaving(false); }
  }, [user, property, isSaved, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Not found</h2>
            <p className="text-muted-foreground mb-6">{error || 'This listing is not available.'}</p>
            <Button asChild><Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Home</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const intent = inferListingIntent(property);
  const category = inferAssetCategory(property);
  const period = property.price_period || (intent === 'sale' ? 'once' : 'month');

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <Breadcrumb title={property.title} />
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
                  className="relative h-64 sm:h-80 md:h-96 lg:h-[500px] mb-4 bg-muted rounded-lg overflow-hidden cursor-pointer"
                  onClick={() => photoUrls.length > 0 && setIsLightboxOpen(true)}
                >
                  {photoUrls.length > 0 ? (
                    <Image src={photoUrls[selectedImage] || photoUrls[0]} alt={property.title} fill className="object-cover" priority />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Home className="h-16 w-16 text-muted-foreground" /></div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                    {property.landlord?.is_verified && (
                      <Badge className="bg-emerald-600 text-white border-0"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>
                    )}
                    <TenureBadge tenure={property.tenure_type} size="md" />
                    <Badge variant="secondary">{ASSET_CATEGORY_LABELS[category]}</Badge>
                    {property.status === 'active' && <Badge className="bg-primary text-primary-foreground border-0">Available</Badge>}
                    {(property.status === 'rented' || property.status === 'taken') && <Badge variant="secondary">Taken</Badge>}
                  </div>
                </div>
                {photoUrls.length > 1 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {photoUrls.slice(0, 8).map((photo, index) => (
                      <button key={index} type="button" onClick={() => setSelectedImage(index)}
                        className={`relative h-16 sm:h-20 rounded-lg overflow-hidden border-2 ${
                          selectedImage === index ? 'border-primary' : 'border-transparent'
                        }`}>
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
                    <div className="flex items-center text-muted-foreground">
                      <MapPin className="h-5 w-5 mr-1" />
                      {property.location_suburb}, {property.location_city}
                    </div>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      <Badge variant="outline">{LISTING_INTENT_LABELS[intent]}</Badge>
                      <Badge variant="outline">{subtypeLabel(property.property_subtype || property.property_type)}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-bold text-primary">
                      E{property.price.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground">{formatPricePeriod(period)}</span>
                    </div>
                  </div>
                </div>

                <SpecsGrid property={property} />

                {category === 'land' && (
                  <div className="grid sm:grid-cols-2 gap-2 mb-6 text-sm">
                    {property.has_road_access != null && <div>Road access: <strong>{property.has_road_access ? 'Yes' : 'No'}</strong></div>}
                    {property.has_water != null && <div>Water: <strong>{property.has_water ? 'Yes' : 'No'}</strong></div>}
                    {property.has_electricity != null && <div>Electricity: <strong>{property.has_electricity ? 'Yes' : 'No'}</strong></div>}
                    {property.has_sewer != null && <div>Sewer: <strong>{property.has_sewer ? 'Yes' : 'No'}</strong></div>}
                    {property.zoning_notes && <div className="sm:col-span-2">Notes: {property.zoning_notes}</div>}
                  </div>
                )}

                {category === 'commercial' && (
                  <div className="grid sm:grid-cols-2 gap-2 mb-6 text-sm">
                    {property.floors != null && <div>Floors: <strong>{property.floors}</strong></div>}
                    {property.has_loading_bay != null && <div>Loading bay: <strong>{property.has_loading_bay ? 'Yes' : 'No'}</strong></div>}
                    {property.has_street_frontage != null && <div>Street frontage: <strong>{property.has_street_frontage ? 'Yes' : 'No'}</strong></div>}
                    {property.power_notes && <div className="sm:col-span-2">Power: {property.power_notes}</div>}
                  </div>
                )}

                <Tabs defaultValue="description">
                  <TabsList className="w-full grid grid-cols-3 mb-4">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                    <TabsTrigger value="nearby">Location</TabsTrigger>
                  </TabsList>
                  <TabsContent value="description">
                    <p className="text-muted-foreground whitespace-pre-line">{property.description || 'No description.'}</p>
                    {property.lease_terms && (
                      <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                        <strong>Lease terms:</strong> {property.lease_terms}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="features">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {property.amenities?.length ? property.amenities.map((a, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-emerald-500" /><span>{a}</span>
                        </div>
                      )) : <p className="text-muted-foreground">No features listed.</p>}
                      {property.is_furnished && category === 'residential' && (
                        <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-500" /><span>Furnished</span></div>
                      )}
                    </div>
                  </TabsContent>
                  <TabsContent value="nearby">
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{property.location_city}</div>
                        <div className="text-sm text-muted-foreground">{property.location_suburb}</div>
                        {property.location_address && (
                          <div className="text-sm text-muted-foreground">{property.location_address}</div>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              <Card>
                <CardContent className="p-4 md:p-6">
                  <h2 className="text-xl font-semibold mb-4">Contact</h2>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <Home className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold">{property.landlord?.full_name || 'Owner'}</div>
                      {property.landlord?.is_verified && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <CheckCircle className="h-3 w-3 text-emerald-500 mr-1" />Verified
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleContact('whatsapp')}>
                      <MessageCircle className="mr-2 h-5 w-5" />WhatsApp
                    </Button>
                    <Button variant="outline" className="w-full h-12" onClick={() => handleContact('phone')}>
                      <Phone className="mr-2 h-5 w-5" />Call {displayPhone}
                    </Button>
                    <Button variant="outline" className="w-full h-12" onClick={() => handleContact('email')}>
                      <Mail className="mr-2 h-5 w-5" />Email
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4 md:p-6">
                  <h3 className="font-semibold mb-3">Listing details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="capitalize">{property.status}</span></div>
                    <div className="flex justify-between items-center"><span className="text-muted-foreground">Tenure</span><TenureBadge tenure={property.tenure_type} /></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Category</span><span>{ASSET_CATEGORY_LABELS[category]}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Views</span><span>{property.views || 0}</span></div>
                  </div>
                  <div className="border-t my-4" />
                  <div className="bg-amber-500/10 p-3 rounded-lg text-sm border border-amber-500/20">
                    <p className="font-medium mb-1 text-amber-900 dark:text-amber-200">Safety tips</p>
                    <p className="text-xs text-amber-800 dark:text-amber-300">View in person before paying. Never send money via mobile transfer first.</p>
                    <Button variant="link" className="text-xs p-0 h-auto mt-2" onClick={() => setReportOpen(true)}>
                      Report this listing
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {similarProperties.length > 0 && (
                <Card>
                  <CardContent className="p-4 md:p-6">
                    <h3 className="font-semibold mb-3">Similar listings</h3>
                    <div className="space-y-3">
                      {similarProperties.map((s) => {
                        const photo = getPrimaryPhoto(s.photos);
                        return (
                          <Link key={s.id} href={`/properties/${s.id}`} className="flex gap-3 p-2 hover:bg-muted rounded-lg">
                            <div className="w-16 h-16 bg-muted rounded-lg overflow-hidden relative shrink-0">
                              {photo ? <Image src={photo.photo_url} alt="" fill className="object-cover" /> : <Home className="h-6 w-6 m-auto text-muted-foreground" />}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{s.title}</div>
                              <div className="text-xs text-muted-foreground">{s.location_suburb}</div>
                              <div className="text-sm font-semibold text-primary">E{s.price.toLocaleString()}</div>
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
        onReported={(reason: ReportReason) => {
          if (reason === 'already_taken') setProperty({ ...property, status: 'taken' });
        }}
      />
    </main>
  );
}
