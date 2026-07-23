// src/app/properties/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin,
  Home,
  Bed,
  Bath,
  Calendar,
  Phone,
  Mail,
  Share2,
  Heart,
  CheckCircle,
  MessageCircle,
  Navigation,
  ArrowLeft,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Property as PropertyType, PropertyPhoto, ExtendedProperty } from '@/types/property';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';

// Helper to get primary photo
const getPrimaryPhoto = (photos?: PropertyPhoto[]) => {
  if (!photos || photos.length === 0) return null;
  return [...photos].sort((a, b) => a.display_order - b.display_order)[0];
};

// Transform property data with proper typing
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
    location_city: data.location_city || '',
    location_suburb: data.location_suburb || '',
    location_address: data.location_address || '',
    latitude: data.latitude,
    longitude: data.longitude,
    bedrooms: data.bedrooms || 0,
    bathrooms: data.bathrooms || 0,
    is_furnished: data.is_furnished || false,
    amenities: data.amenities || [],
    lease_terms: data.lease_terms || '',
    status: data.status || 'active',
    is_featured: data.is_featured || false,
    views: data.views || 0,
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString(),
    contact_phone: data.contact_phone || '',
    contact_whatsapp: data.contact_whatsapp || '',
    country: data.country || 'Eswatini',
    landlord: landlord,
    photos: photos,
  };
};

// Format phone number for Eswatini
const formatEswatiniPhone = (phone: string): string => {
  if (!phone) return 'No phone number';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('268')) {
    const local = cleaned.slice(3);
    if (local.length === 8) {
      return `+268 ${local.slice(0, 4)} ${local.slice(4)}`;
    }
    if (local.length === 7) {
      return `+268 ${local.slice(0, 3)} ${local.slice(3, 5)} ${local.slice(5)}`;
    }
    return `+268 ${local}`;
  }
  
  if (cleaned.startsWith('0') && cleaned.length === 9) {
    const number = cleaned.slice(1);
    return `+268 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
  }
  
  if (cleaned.length === 8) {
    return `+268 ${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  }
  
  return phone.startsWith('+') ? phone : `+${cleaned}`;
};

// Image Lightbox Component
const ImageLightbox = ({ 
  images, 
  initialIndex, 
  onClose 
}: { 
  images: string[]; 
  initialIndex: number; 
  onClose: () => void;
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setCurrentIndex(prev => Math.max(0, prev - 1));
      if (e.key === 'ArrowRight') setCurrentIndex(prev => Math.min(images.length - 1, prev + 1));
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [images.length, onClose]);

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 dark:bg-black/95 border-none">
        <div className="relative w-full h-[85vh] flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full"
            onClick={onClose}
          >
            <X className="h-6 w-6" />
          </Button>
          
          <div className="relative w-full h-full">
            <Image
              src={images[currentIndex]}
              alt={`Property image ${currentIndex + 1}`}
              fill
              className="object-contain"
              priority
            />
          </div>
          
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-12 w-12"
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full h-12 w-12"
                onClick={() => setCurrentIndex(prev => Math.min(images.length - 1, prev + 1))}
                disabled={currentIndex === images.length - 1}
              >
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

// Breadcrumb Component - Memoized
const Breadcrumb = memo(({ property }: { property: ExtendedProperty }) => (
  <nav className="text-sm text-gray-500 dark:text-gray-400" aria-label="Breadcrumb">
    <ol className="flex items-center space-x-2 flex-wrap">
      <li>
        <Link href="/" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
          Home
        </Link>
      </li>
      <li><ChevronRight className="h-4 w-4" /></li>
      <li>
        <Link href="/search" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
          Search
        </Link>
      </li>
      <li><ChevronRight className="h-4 w-4" /></li>
      <li className="text-gray-700 dark:text-gray-300 truncate max-w-[150px] sm:max-w-[200px] md:max-w-[300px]">
        {property.title}
      </li>
    </ol>
  </nav>
));

Breadcrumb.displayName = 'Breadcrumb';

export default function PublicPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  // State
  const [property, setProperty] = useState<ExtendedProperty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [similarProperties, setSimilarProperties] = useState<ExtendedProperty[]>([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Refs to prevent unnecessary refetches
  const viewRecordedRef = useRef(false);
  const fetchedRef = useRef(false);

  // Memoized values
  const photoUrls = useMemo(() => 
    property?.photos?.map(p => p.photo_url) || [],
    [property?.photos]
  );

  const displayPhone = useMemo(() => 
    property ? formatEswatiniPhone(property.contact_phone) : 'No phone number',
    [property]
  );

  const landlordEmail = useMemo(() => 
    property?.landlord?.email,
    [property?.landlord?.email]
  );

  const primaryPhoto = useMemo(() => 
    property ? getPrimaryPhoto(property.photos) : null,
    [property]
  );

  // Fetch property data
  useEffect(() => {
    // Prevent double fetching in strict mode
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const fetchProperty = async () => {
      try {
        setLoading(true);
        const propertyId = params.id as string;

        const { data, error: propertyError } = await supabase
          .from('properties')
          .select(`
            *,
            landlord:profiles!properties_landlord_id_fkey (
              full_name,
              phone,
              is_verified,
              email
            ),
            photos:property_photos (
              id,
              photo_url,
              caption,
              display_order,
              created_at
            )
          `)
          .eq('id', propertyId)
          .single();

        if (propertyError) {
          if (propertyError.code === 'PGRST116') {
            setError('Property not found');
          } else {
            console.error('Property fetch error:', propertyError);
            throw propertyError;
          }
          return;
        }

        if (!data) {
          setError('Property not found');
          return;
        }

        const status = data.status;
        if (status !== 'active' && status !== 'rented') {
          setError('This property is not available');
          return;
        }

        const propertyData = transformPropertyData(data);
        setProperty(propertyData);

        // Check if user has saved this property
        if (user) {
          try {
            const { data: savedData } = await supabase
              .from('saved_properties')
              .select('id')
              .eq('renter_id', user.id)
              .eq('property_id', propertyId)
              .maybeSingle();

            setIsSaved(!!savedData);
          } catch (saveError) {
            console.error('Error checking saved status:', saveError);
          }
        }

        // Fetch similar properties
        await fetchSimilarProperties(propertyData);
        
        // Record view
        await recordView(propertyId);

      } catch (err) {
        console.error('Error fetching property:', err);
        setError('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    const fetchSimilarProperties = async (currentProperty: ExtendedProperty) => {
      try {
        const { data, error } = await supabase
          .from('properties')
          .select(`
            *,
            landlord:profiles!properties_landlord_id_fkey (
              full_name,
              phone,
              is_verified,
              email
            ),
            photos:property_photos (
              id,
              photo_url,
              display_order
            )
          `)
          .eq('status', 'active')
          .eq('location_city', currentProperty.location_city)
          .eq('property_type', currentProperty.property_type)
          .neq('id', currentProperty.id)
          .limit(3)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching similar properties:', error);
          return;
        }
        
        if (data) {
          const transformed = data.map((item: any) => transformPropertyData(item));
          setSimilarProperties(transformed);
        }
      } catch (error) {
        console.error('Error fetching similar properties:', error);
      }
    };

    const recordView = async (propertyId: string) => {
      // Prevent duplicate view recordings
      if (viewRecordedRef.current) return;
      viewRecordedRef.current = true;
      
      try {
        // Try RPC first
        const { error: rpcError } = await supabase.rpc('increment_property_view', {
          property_id: propertyId,
        });

        if (rpcError) {
          console.warn('RPC function not available:', rpcError.message);
          // Fallback: manual increment
          const { data: currentData } = await supabase
            .from('properties')
            .select('views')
            .eq('id', propertyId)
            .single();

          const currentViews = currentData?.views || 0;
          await supabase
            .from('properties')
            .update({ views: currentViews + 1 })
            .eq('id', propertyId);
        }
      } catch (error) {
        console.error('Error recording view:', error);
      }
    };

    if (params.id) {
      fetchProperty();
    }

    // Cleanup
    return () => {
      fetchedRef.current = false;
    };
  }, [params.id, user]); // Only re-run if id or user changes

  // Contact handlers - Memoized
  const handleContact = useCallback((method: 'phone' | 'whatsapp' | 'email') => {
    if (!property) return;

    if (method === 'phone') {
      const phoneNumber = property.contact_phone.replace(/\D/g, '');
      window.location.href = `tel:${phoneNumber}`;
    } else if (method === 'whatsapp') {
      const message = encodeURIComponent(
        `Hello, I'm interested in your property: ${property.title} (E${property.price}/month)`,
      );
      const phone = property.contact_whatsapp || property.contact_phone;
      const formattedPhone = phone.replace(/\D/g, '');
      window.open(
        `https://wa.me/${formattedPhone}?text=${message}`,
        '_blank',
      );
    } else if (method === 'email') {
      const landlordEmail = property.landlord?.email;
      if (landlordEmail) {
        const subject = encodeURIComponent(`Property Inquiry: ${property.title}`);
        const body = encodeURIComponent(
          `Hello,\n\nI'm interested in your property "${property.title}" listed at E${property.price}/month.\n\nCould you provide more information?\n\nThank you.`,
        );
        window.location.href = `mailto:${landlordEmail}?subject=${subject}&body=${body}`;
      } else {
        toast.info('Email not available', {
          description: 'Please use WhatsApp or phone to contact the landlord.',
          duration: 5000,
        });
      }
    }
  }, [property]);

  const handleShare = useCallback(async () => {
    if (!property) return;

    const url = window.location.href;
    const title = property.title;

    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: `Check out this property in ${property.location_city}`,
          url: url,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Link copied to clipboard!');
      } catch {
        toast.error('Failed to copy link');
      }
    }
  }, [property]);

  const handleSave = useCallback(async () => {
    if (!user) {
      router.push('/auth/login');
      return;
    }

    if (!property) return;

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
    } catch (error) {
      console.error('Error saving property:', error);
      toast.error('Failed to save property');
    } finally {
      setIsSaving(false);
    }
  }, [user, property, isSaved, router]);

  const openLightbox = useCallback((index: number) => {
    setLightboxIndex(index);
    setIsLightboxOpen(true);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary-600 dark:text-primary-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading property details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full dark:bg-gray-900">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Property Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || "The property you're looking for doesn't exist or has been removed."}
            </p>
            <Button asChild className="bg-primary-600 hover:bg-primary-700 text-white">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {/* Back Navigation - Sticky */}
      <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 transition-colors duration-300">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <Breadcrumb property={property} />
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleShare}
                className="flex-1 sm:flex-none text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 sm:flex-none text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400"
              >
                <Heart
                  className={`h-4 w-4 mr-2 ${isSaved ? 'fill-red-500 text-red-500' : ''}`}
                />
                {isSaved ? 'Saved' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
          {/* Left Column - Images and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card className="overflow-hidden dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <CardContent className="p-3 md:p-4">
                {/* Main Image */}
                <div 
                  className="relative h-64 sm:h-80 md:h-96 lg:h-[500px] mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer group"
                  onClick={() => photoUrls.length > 0 && openLightbox(selectedImage)}
                >
                  {photoUrls.length > 0 ? (
                    <>
                      <Image
                        src={photoUrls[selectedImage] || photoUrls[0]}
                        alt={property.title}
                        fill
                        className="object-cover"
                        priority
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 p-3 rounded-full">
                          <Maximize2 className="h-6 w-6 text-white" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                      <Home className="h-16 w-16 text-gray-400 dark:text-gray-500" />
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
                    {property.landlord?.is_verified && (
                      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white border-0">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {property.status === 'active' && (
                      <Badge className="bg-primary-600 hover:bg-primary-700 text-white border-0">
                        Available Now
                      </Badge>
                    )}
                    {property.status === 'rented' && (
                      <Badge variant="secondary" className="bg-gray-500 hover:bg-gray-600 text-white border-0">
                        Rented
                      </Badge>
                    )}
                    {property.is_featured && (
                      <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-0">
                        Featured
                      </Badge>
                    )}
                  </div>

                  {/* Image Counter */}
                  {photoUrls.length > 1 && (
                    <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                      {selectedImage + 1} / {photoUrls.length}
                    </div>
                  )}
                </div>

                {/* Thumbnail Gallery */}
                {photoUrls.length > 1 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                    {photoUrls.slice(0, 8).map((photo: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`relative h-16 sm:h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImage === index
                            ? 'border-primary-600 dark:border-primary-400 scale-105'
                            : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <Image
                          src={photo}
                          alt={`Thumbnail ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        {index === 7 && photoUrls.length > 8 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-medium">
                            +{photoUrls.length - 8}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Property Details Card */}
            <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <CardContent className="p-4 md:p-6">
                {/* Title and Price */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {property.title}
                    </h1>
                    <div className="flex items-center text-gray-500 dark:text-gray-400">
                      <MapPin className="h-5 w-5 mr-1 shrink-0" />
                      <span>
                        {property.location_suburb}, {property.location_city}
                      </span>
                    </div>
                  </div>
                  <div className="text-right w-full md:w-auto">
                    <div className="text-2xl sm:text-3xl font-bold text-primary-600 dark:text-primary-400">
                      E{property.price.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">per month</div>
                  </div>
                </div>

                {/* Key Features Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-6">
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Bed className="h-5 w-5 mx-auto mb-1 text-primary-600 dark:text-primary-400" />
                    <div className="font-semibold text-gray-900 dark:text-white">{property.bedrooms || 'N/A'}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Bedrooms</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Bath className="h-5 w-5 mx-auto mb-1 text-primary-600 dark:text-primary-400" />
                    <div className="font-semibold text-gray-900 dark:text-white">{property.bathrooms || 'N/A'}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Bathrooms</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Home className="h-5 w-5 mx-auto mb-1 text-primary-600 dark:text-primary-400" />
                    <div className="font-semibold capitalize text-gray-900 dark:text-white">{property.property_type}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Property Type</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <Calendar className="h-5 w-5 mx-auto mb-1 text-primary-600 dark:text-primary-400" />
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {new Date(property.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Listed</div>
                  </div>
                </div>

                {/* Tabs for Detailed Info */}
                <Tabs defaultValue="description" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 mb-4 bg-gray-100 dark:bg-gray-800">
                    <TabsTrigger 
                      value="description"
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900"
                    >
                      Description
                    </TabsTrigger>
                    <TabsTrigger 
                      value="features"
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900"
                    >
                      Features
                    </TabsTrigger>
                    <TabsTrigger 
                      value="nearby"
                      className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900"
                    >
                      Nearby
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="description" className="prose max-w-none dark:prose-invert">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                      {property.description || 'No description provided.'}
                    </p>
                  </TabsContent>

                  <TabsContent value="features">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {property.amenities && property.amenities.length > 0 ? (
                        property.amenities.map((amenity: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">{amenity}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 col-span-2">No amenities listed.</p>
                      )}
                    </div>

                    {property.is_furnished && (
                      <div className="mt-4">
                        <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                          Furnished
                        </Badge>
                      </div>
                    )}

                    {property.lease_terms && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Lease Terms</h3>
                        <p className="text-gray-700 dark:text-gray-300">{property.lease_terms}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="nearby">
                    <div className="space-y-3">
                      <p className="text-gray-500 dark:text-gray-400">
                        Nearby points of interest will be available soon.
                      </p>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <MapPin className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{property.location_city}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {property.location_suburb}
                            {property.location_address ? `, ${property.location_address}` : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Map Section */}
            <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
              <CardContent className="p-4 md:p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Location</h2>
                <div className="bg-gray-100 dark:bg-gray-800 h-64 rounded-lg flex items-center justify-center relative overflow-hidden">
                  <div className="text-center p-4">
                    <Navigation className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                    <p className="text-gray-600 dark:text-gray-400 mb-2">
                      {property.location_address || 'Address not provided'}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {property.location_suburb}, {property.location_city}
                    </p>
                    <Button
                      variant="link"
                      className="mt-2 text-primary-600 dark:text-primary-400"
                      onClick={() => {
                        const query = encodeURIComponent(
                          `${property.location_address || ''} ${property.location_suburb} ${property.location_city}`,
                        );
                        window.open(
                          `https://www.google.com/maps/search/?api=1&query=${query}`,
                          '_blank',
                        );
                      }}
                    >
                      View on Google Maps
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Contact & Actions */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              {/* Contact Card */}
              <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardContent className="p-4 md:p-6">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Contact Landlord</h2>

                  {/* Landlord Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center shrink-0">
                      <Home className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-white text-lg truncate">
                        {property.landlord?.full_name || 'Property Owner'}
                      </div>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        {property.landlord?.is_verified && (
                          <>
                            <CheckCircle className="h-3 w-3 text-emerald-500 mr-1 shrink-0" />
                            <span>Verified Landlord</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Buttons */}
                  <div className="space-y-3">
                    <Button
                      className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600"
                      onClick={() => handleContact('whatsapp')}
                    >
                      <MessageCircle className="mr-2 h-5 w-5" />
                      WhatsApp
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-12 text-base border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleContact('phone')}
                    >
                      <Phone className="mr-2 h-5 w-5" />
                      Call {displayPhone}
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-12 text-base border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleContact('email')}
                    >
                      <Mail className="mr-2 h-5 w-5" />
                      Send Email
                    </Button>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 text-sm text-gray-500 dark:text-gray-400">
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span className="truncate">{displayPhone}</span>
                    </p>
                    {property.contact_whatsapp && (
                      <p className="flex items-center gap-2 mt-1">
                        <MessageCircle className="h-4 w-4 shrink-0" />
                        <span>Also available on WhatsApp</span>
                      </p>
                    )}
                    {landlordEmail && (
                      <p className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4 shrink-0" />
                        <span className="truncate">{landlordEmail}</span>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Property Stats Card */}
              <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <CardContent className="p-4 md:p-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Listing Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Property ID:</span>
                      <span className="font-mono text-gray-900 dark:text-white">
                        {property.id.substring(0, 8)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Views:</span>
                      <span className="text-gray-900 dark:text-white">{property.views || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Listed:</span>
                      <span className="text-gray-900 dark:text-white">{new Date(property.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      <span className="capitalize text-gray-900 dark:text-white">{property.status}</span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-800 my-4"></div>

                  {/* Safety Notice */}
                  <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg text-sm border border-amber-200 dark:border-amber-800">
                    <p className="text-amber-800 dark:text-amber-300 font-medium mb-1">Safety Tips</p>
                    <p className="text-amber-700 dark:text-amber-400 text-xs">
                      • View property in person before paying<br />
                      • Never send money via mobile transfer<br />
                      • Report suspicious listings
                    </p>
                    <Button
                      variant="link"
                      className="text-xs p-0 h-auto mt-2 text-amber-600 dark:text-amber-400"
                      onClick={() => {
                        toast.info('Report feature coming soon', {
                          description: 'You can report this listing through the admin panel.',
                        });
                      }}
                    >
                      Report this listing
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Similar Properties */}
              {similarProperties.length > 0 && (
                <Card className="dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                  <CardContent className="p-4 md:p-6">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Similar Properties</h3>
                    <div className="space-y-3">
                      {similarProperties.map((similar) => {
                        const similarPhoto = getPrimaryPhoto(similar.photos);
                        return (
                          <Link
                            key={similar.id}
                            href={`/properties/${similar.id}`}
                            className="flex gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          >
                            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden relative shrink-0">
                              {similarPhoto ? (
                                <Image
                                  src={similarPhoto.photo_url}
                                  alt={similar.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Home className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                {similar.title}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {similar.location_suburb}, {similar.location_city}
                              </div>
                              <div className="text-sm font-semibold text-primary-600 dark:text-primary-400 mt-1">
                                E{similar.price}/mo
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                    <Button variant="link" className="w-full mt-2 text-primary-600 dark:text-primary-400" asChild>
                      <Link href="/search">
                        View more similar properties →
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image Lightbox */}
      {isLightboxOpen && photoUrls.length > 0 && (
        <ImageLightbox
          images={photoUrls}
          initialIndex={lightboxIndex}
          onClose={() => setIsLightboxOpen(false)}
        />
      )}
    </main>
  );
}
