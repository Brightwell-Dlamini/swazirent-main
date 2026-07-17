// src/app/properties/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
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
  Square,
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
  Wifi,
  Droplets,
  Zap,
  Car,
  Shield,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Property, PropertyPhoto } from '@/types/property';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Helper to get primary photo
const getPrimaryPhoto = (photos?: PropertyPhoto[]) => {
  if (!photos || photos.length === 0) return null;
  return [...photos].sort((a, b) => a.display_order - b.display_order)[0];
};

// Helper to format phone number for WhatsApp
const formatWhatsAppNumber = (phone: string): string => {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // If number starts with 0, assume it's a local number without country code
  if (cleaned.startsWith('0')) {
    // Remove leading 0 and add Eswatini country code
    return `268${cleaned.substring(1)}`;
  }
  
  // If number already has country code (starts with 268)
  if (cleaned.startsWith('268')) {
    return cleaned;
  }
  
  // If number is 8 digits (local format without 0), add country code
  if (cleaned.length === 8) {
    return `268${cleaned}`;
  }
  
  // Return as-is if we can't determine
  return cleaned;
};

// Helper to format phone number for display
const formatPhoneForDisplay = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  // If it's an Eswatini number with country code
  if (cleaned.startsWith('268') && cleaned.length === 11) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  
  // If it's a local number without country code
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
  }
  
  // Return as-is
  return phone;
};

export default function PublicPropertyPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [similarProperties, setSimilarProperties] = useState<Property[]>([]);
  const [viewRecorded, setViewRecorded] = useState(false);

  // Fetch property data
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const propertyId = params.id as string;

        // Fetch property with landlord and photos
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

        // Check if property is active or rented (visible to public)
        const status = (data as any)?.status;
        if (status !== 'active' && status !== 'rented') {
          setError('This property is not available');
          return;
        }

        // Transform data
        const propertyData: Property = {
          ...(data as any),
          landlord: (data as any).landlord || undefined,
          photos: (data as any).photos || [],
        };

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

        // Increment view count
        await recordView(propertyId);

      } catch (err) {
        console.error('Error fetching property:', err);
        setError('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProperty();
    }
  }, [params.id, user]);

  // Atomic view counter using RPC
  const recordView = async (propertyId: string) => {
    if (viewRecorded) return;
    
    try {
      // Try to use the RPC function first
      const { error: rpcError } = await supabase.rpc('increment_property_view', {
        property_id: propertyId,
      });

      if (rpcError) {
        console.warn('RPC function not available, using fallback:', rpcError.message);
        // Fallback: try direct update or use separate table
        await recordViewWithFallback(propertyId);
      } else {
        setViewRecorded(true);
      }
    } catch (error) {
      console.error('Error recording view:', error);
      // Try fallback on any error
      await recordViewWithFallback(propertyId);
    }
  };

  // Fallback method for recording views
  const recordViewWithFallback = async (propertyId: string) => {
    try {
      // Try direct update first
      const { error: updateError } = await supabase
        .from('properties')
        .update({ views: supabase.rpc('increment', { row_count: 1 }) })
        .eq('id', propertyId);

      if (updateError) {
        // If that fails, try with a separate views table
        const { error: insertError } = await supabase
          .from('property_views')
          .insert([{
            property_id: propertyId,
            viewed_at: new Date().toISOString(),
            viewer_id: user?.id || null,
          }]);

        if (insertError) {
          console.error('Error inserting view record:', insertError);
          // Final fallback: just mark as viewed without persisting
          setViewRecorded(true);
          return;
        }
      }

      setViewRecorded(true);
    } catch (error) {
      console.error('Error in fallback view recording:', error);
      // Mark as viewed anyway to prevent repeated attempts
      setViewRecorded(true);
    }
  };

  const fetchSimilarProperties = async (currentProperty: Property) => {
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
      setSimilarProperties(data || []);
    } catch (error) {
      console.error('Error fetching similar properties:', error);
    }
  };

  const handleContact = (method: 'phone' | 'whatsapp' | 'email') => {
    if (!property) return;

    if (method === 'phone') {
      const phoneNumber = property.contact_phone.replace(/\s/g, '');
      window.location.href = `tel:${phoneNumber}`;
    } else if (method === 'whatsapp') {
      const message = encodeURIComponent(
        `Hello, I'm interested in your property: ${property.title} (E${property.price}/month)`,
      );
      const phone = property.contact_whatsapp || property.contact_phone;
      const formattedPhone = formatWhatsAppNumber(phone);
      window.open(
        `https://wa.me/${formattedPhone}?text=${message}`,
        '_blank',
      );
    } else if (method === 'email') {
      const landlordEmail = (property.landlord as any)?.email;
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
  };

  const handleShare = async () => {
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
  };

  const handleSave = async () => {
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
  };

  const handleReport = () => {
    toast.info('Report feature coming soon', {
      description: 'You can report this listing through the admin panel.',
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Property Not Found</h2>
            <p className="text-gray-600 mb-6">
              {error || "The property you're looking for doesn't exist or has been removed."}
            </p>
            <Button asChild>
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

  const primaryPhoto = getPrimaryPhoto(property.photos);
  const photoUrls = property.photos?.map(p => p.photo_url) || [];
  const displayPhone = formatPhoneForDisplay(property.contact_phone);
  const landlordEmail = (property.landlord as { email?: string } | undefined)?.email;

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Back Navigation - Sticky */}
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Link
              href="/search"
              className="flex items-center text-gray-600 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Search
            </Link>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleSave}
                disabled={isSaving}
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

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Images and Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                {/* Main Image */}
                <div className="relative h-96 md:h-[500px] mb-4 bg-gray-100 rounded-lg overflow-hidden">
                  {photoUrls.length > 0 ? (
                    <Image
                      src={photoUrls[selectedImage] || photoUrls[0]}
                      alt={property.title}
                      fill
                      className="object-cover"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200">
                      <Home className="h-16 w-16 text-gray-400" />
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                    {property.landlord?.is_verified && (
                      <Badge className="bg-green-500 hover:bg-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {property.status === 'active' && (
                      <Badge variant="default">Available Now</Badge>
                    )}
                    {property.status === 'rented' && (
                      <Badge variant="secondary">Rented</Badge>
                    )}
                    {property.is_featured && (
                      <Badge className="bg-yellow-500 hover:bg-yellow-600">
                        Featured
                      </Badge>
                    )}
                  </div>

                  {/* Image Counter */}
                  {photoUrls.length > 1 && (
                    <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                      {selectedImage + 1} / {photoUrls.length}
                    </div>
                  )}
                </div>

                {/* Thumbnail Gallery */}
                {photoUrls.length > 1 && (
                  <div className="grid grid-cols-4 gap-2">
                    {photoUrls.map((photo: string, index: number) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`relative h-20 rounded-lg overflow-hidden border-2 transition-all ${
                          selectedImage === index
                            ? 'border-primary scale-105'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                      >
                        <Image
                          src={photo}
                          alt={`Thumbnail ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Property Details Card */}
            <Card>
              <CardContent className="p-6">
                {/* Title and Price */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                  <div>
                    <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
                    <div className="flex items-center text-gray-500">
                      <MapPin className="h-5 w-5 mr-1 shrink-0" />
                      <span>
                        {property.location_suburb}, {property.location_city}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-primary">
                      E{property.price.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-500">per month</div>
                  </div>
                </div>

                {/* Key Features Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Bed className="h-6 w-6 mx-auto mb-1 text-primary" />
                    <div className="font-semibold">{property.bedrooms || 'N/A'}</div>
                    <div className="text-sm text-gray-500">Bedrooms</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Bath className="h-6 w-6 mx-auto mb-1 text-primary" />
                    <div className="font-semibold">{property.bathrooms || 'N/A'}</div>
                    <div className="text-sm text-gray-500">Bathrooms</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Home className="h-6 w-6 mx-auto mb-1 text-primary" />
                    <div className="font-semibold capitalize">{property.property_type}</div>
                    <div className="text-sm text-gray-500">Property Type</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Calendar className="h-6 w-6 mx-auto mb-1 text-primary" />
                    <div className="font-semibold">
                      {new Date(property.created_at).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">Listed</div>
                  </div>
                </div>

                {/* Tabs for Detailed Info */}
                <Tabs defaultValue="description" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 mb-4">
                    <TabsTrigger value="description">Description</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                    <TabsTrigger value="nearby">Nearby</TabsTrigger>
                  </TabsList>

                  <TabsContent value="description" className="prose max-w-none">
                    <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                      {property.description || 'No description provided.'}
                    </p>
                  </TabsContent>

                  <TabsContent value="features">
                    <div className="grid grid-cols-2 gap-3">
                      {property.amenities && property.amenities.length > 0 ? (
                        property.amenities.map((amenity: string, index: number) => (
                          <div key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                            <span className="text-gray-700">{amenity}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 col-span-2">No amenities listed.</p>
                      )}
                    </div>

                    {property.is_furnished && (
                      <div className="mt-4">
                        <Badge variant="outline" className="bg-gray-50">
                          Furnished
                        </Badge>
                      </div>
                    )}

                    {property.lease_terms && (
                      <div className="mt-4 pt-4 border-t">
                        <h3 className="font-semibold mb-2">Lease Terms</h3>
                        <p className="text-gray-700">{property.lease_terms}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="nearby">
                    <div className="space-y-3">
                      <p className="text-gray-500">
                        Nearby points of interest will be available soon.
                      </p>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <MapPin className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-medium">{property.location_city}</div>
                          <div className="text-sm text-gray-500">
                            {property.location_suburb}, {property.location_address || ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Map Section */}
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">Location</h2>
                <div className="bg-gray-200 h-64 rounded-lg flex items-center justify-center relative overflow-hidden">
                  <div className="text-center">
                    <Navigation className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-500 mb-2">
                      {property.location_address || 'Address not provided'}
                    </p>
                    <p className="text-gray-500">
                      {property.location_suburb}, {property.location_city}
                    </p>
                    <Button
                      variant="link"
                      className="mt-2"
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
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Contact Landlord</h2>

                  {/* Landlord Info */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                      <Home className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold text-lg">
                        {property.landlord?.full_name || 'Property Owner'}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        {property.landlord?.is_verified && (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
                            <span>Verified Landlord</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Buttons */}
                  <div className="space-y-3">
                    <Button
                      className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleContact('whatsapp')}
                    >
                      <MessageCircle className="mr-2 h-5 w-5" />
                      WhatsApp
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-12 text-base"
                      onClick={() => handleContact('phone')}
                    >
                      <Phone className="mr-2 h-5 w-5" />
                      Call {displayPhone}
                    </Button>

y                    <Button
                      variant="outline"
                      className="w-full h-12 text-base"
                      onClick={() => handleContact('email')}
                    >
                      <Mail className="mr-2 h-5 w-5" />
                      Send Email
                    </Button>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span>{displayPhone}</span>
                    </p>
                    {property.contact_whatsapp && (
                      <p className="flex items-center gap-2 mt-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>Also available on WhatsApp</span>
                      </p>
                    )}
                    {landlordEmail && (
                      <p className="flex items-center gap-2 mt-1">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{landlordEmail}</span>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Property Stats Card */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-3">Listing Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Property ID:</span>
                      <span className="font-mono">
                        {property.id.substring(0, 8)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Views:</span>
                      <span>{property.views || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Listed:</span>
                      <span>{new Date(property.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className="capitalize">{property.status}</span>
                    </div>
                  </div>

                  <div className="border-t my-4"></div>

                  {/* Safety Notice */}
                  <div className="bg-yellow-50 p-3 rounded-lg text-sm">
                    <p className="text-yellow-800 font-medium mb-1">Safety Tips</p>
                    <p className="text-yellow-600 text-xs">
                      • View property in person before paying • Never send money
                      via mobile transfer • Report suspicious listings
                    </p>
                    <Button
                      variant="link"
                      className="text-xs p-0 h-auto mt-2"
                      onClick={handleReport}
                    >
                      Report this listing
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Similar Properties */}
              {similarProperties.length > 0 && (
                <Card>
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-3">Similar Properties</h3>
                    <div className="space-y-3">
                      {similarProperties.map((similar) => {
                        const similarPhoto = getPrimaryPhoto(similar.photos);
                        return (
                          <Link
                            key={similar.id}
                            href={`/properties/${similar.id}`}
                            className="flex gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden relative shrink-0">
                              {similarPhoto ? (
                                <Image
                                  src={similarPhoto.photo_url}
                                  alt={similar.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Home className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {similar.title}
                              </div>
                              <div className="text-xs text-gray-500">
                                {similar.location_suburb}, {similar.location_city}
                              </div>
                              <div className="text-sm font-semibold text-primary mt-1">
                                E{similar.price}/mo
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                    <Button variant="link" className="w-full mt-2" asChild>
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
    </main>
  );
}
