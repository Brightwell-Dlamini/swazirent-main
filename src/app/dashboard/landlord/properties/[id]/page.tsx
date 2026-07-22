// src/app/dashboard/landlord/properties/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Property, PropertyPhoto } from '@/types/property';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Edit,
  Eye,
  Trash2,
  Calendar,
  Loader2,
  MapPin,
  CheckCircle,
  XCircle,
  BarChart,
  Camera,
  AlertCircle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLandlordProperties } from '@/hooks/useLandlordProperties';
import { usePriceInsight } from '@/hooks/usePriceInsight';

interface PropertyWithPhotos extends Property {
  photos: PropertyPhoto[];
}

export default function LandlordPropertyManagePage() {
  const { user, isLoading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<PropertyWithPhotos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const { deleteProperty, updateStatus } = useLandlordProperties({
    autoFetch: false,
    userId: user?.id,
  });

  // Use price insight hook
  const { priceInsight, checkingPrice } = usePriceInsight({
    price: property?.price || 0,
    city: property?.location_city || '',
    propertyType: property?.property_type || '',
    bedrooms: property?.bedrooms || 0,
    excludePropertyId: propertyId,
  });

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  // Fetch property data with abort controller
  useEffect(() => {
    const fetchPropertyData = async () => {
      if (!user || !propertyId) return;

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();

      try {
        setLoading(true);
        setError(null);

        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select(
            `
            *,
            photos:property_photos(
              id,
              property_id,
              photo_url,
              caption,
              display_order,
              created_at
            )
          `
          )
          .eq('id', propertyId)
          .eq('landlord_id', user.id)
          .order('display_order', { foreignTable: 'photos', ascending: true });

        if (propertyError) throw propertyError;

        if (!propertyData || propertyData.length === 0) {
          setError(
            'Property not found or you do not have permission to view it'
          );
          setProperty(null);
          return;
        }

        const property = propertyData[0] as PropertyWithPhotos;
        setProperty(property);
      } catch (err) {
        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load property';
        setError(errorMessage);
        console.error('Error fetching property:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user && propertyId) {
      fetchPropertyData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user, propertyId]);

  const handleStatusChange = async (newStatus: 'active' | 'rented') => {
    if (!property) return;
    
    const success = await updateStatus(property.id, newStatus);
    if (success) {
      setProperty({ ...property, status: newStatus });
    }
  };

  const handleDeleteProperty = async () => {
    if (!property) return;

    setDeleting(true);
    const success = await deleteProperty(property.id);
    setDeleting(false);
    
    if (success) {
      setDeleteDialogOpen(false);
      router.push('/dashboard/landlord');
    }
  };

  // Loading state
  if (authLoading || loading) {
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
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Property Not Found</h2>
            <p className="text-gray-500 mb-4">
              {error ||
                "The property you're looking for doesn't exist or you don't have permission to view it."}
            </p>
            <Button asChild>
              <Link href="/dashboard/landlord">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/dashboard/landlord">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-semibold">{property.title}</h1>
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="h-3 w-3 mr-1" />
                  {property.location_suburb}, {property.location_city}, Eswatini
                </div>
              </div>
              <Badge
                variant={property.status === 'active' ? 'default' : 'outline'}
                className={property.status === 'active' ? 'bg-green-600' : ''}
              >
                {property.status}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/properties/${property.id}`} target="_blank">
                  <Eye className="mr-2 h-4 w-4" />
                  Public View
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link href={`/dashboard/landlord/edit-property/${property.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Property
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Views</p>
                  <p className="text-2xl font-bold">{property.views || 0}</p>
                </div>
                <Eye className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Listed</p>
                  <p className="text-2xl font-bold">
                    {new Date(property.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Price</p>
                  <p className="text-2xl font-bold text-green-600">
                    E{property.price.toLocaleString()}
                  </p>
                </div>
                {priceInsight && !checkingPrice && priceInsight.position !== 'average' && (
                  <div
                    className={`text-xs ${
                      priceInsight.position === 'below'
                        ? 'text-blue-600'
                        : 'text-yellow-600'
                    }`}
                  >
                    {priceInsight.position === 'below' ? (
                      <TrendingDown className="h-5 w-5" />
                    ) : (
                      <TrendingUp className="h-5 w-5" />
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Property Details */}
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Property Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Price</p>
                        <p className="font-semibold text-lg">
                          E{property.price.toLocaleString()}/month
                        </p>
                        {priceInsight && !checkingPrice && (
                          <div
                            className={`text-sm mt-1 ${
                              priceInsight.position === 'below'
                                ? 'text-blue-600'
                                : priceInsight.position === 'above'
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}
                          >
                            {priceInsight.position === 'below' && (
                              <span>
                                ↓ {priceInsight.diff}% below Eswatini market average
                              </span>
                            )}
                            {priceInsight.position === 'above' && (
                              <span>
                                ↑ {priceInsight.diff}% above Eswatini market average
                              </span>
                            )}
                            {priceInsight.position === 'average' && (
                              <span>✓ Within Eswatini market range</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Property Type</p>
                        <p className="font-semibold capitalize">
                          {property.property_type}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Bedrooms</p>
                        <p className="font-semibold">
                          {property.bedrooms || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Bathrooms</p>
                        <p className="font-semibold">
                          {property.bathrooms || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {property.is_furnished && (
                      <Badge variant="outline" className="bg-gray-50">
                        Furnished
                      </Badge>
                    )}

                    <div>
                      <p className="text-sm text-gray-500 mb-1">Description</p>
                      <p className="text-gray-700">{property.description}</p>
                    </div>

                    {property.amenities && property.amenities.length > 0 && (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">Amenities</p>
                        <div className="flex flex-wrap gap-2">
                          {property.amenities.map((amenity) => (
                            <Badge
                              key={amenity}
                              variant="outline"
                              className="bg-gray-50"
                            >
                              {amenity}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {property.lease_terms && (
                      <div>
                        <p className="text-sm text-gray-500 mb-1">
                          Lease Terms
                        </p>
                        <p className="text-gray-700">{property.lease_terms}</p>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-gray-500 mb-1">Address</p>
                      <p className="text-gray-700">
                        {property.location_address || 'Address not provided'}
                        <br />
                        {property.location_suburb}, {property.location_city}, Eswatini
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500 mb-1">Contact</p>
                      <p className="text-gray-700">
                        Phone: {property.contact_phone}
                      </p>
                      {property.contact_whatsapp && (
                        <p className="text-gray-700">
                          WhatsApp: {property.contact_whatsapp}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Button
                        variant="outline"
                        className="flex-col h-auto py-4"
                        asChild
                      >
                        <Link
                          href={`/dashboard/landlord/edit-property/${property.id}`}
                        >
                          <Edit className="h-5 w-5 mb-2" />
                          Edit Details
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-col h-auto py-4"
                        onClick={() => setActiveTab('photos')}
                      >
                        <Camera className="h-5 w-5 mb-2" />
                        Manage Photos
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-col h-auto py-4"
                        onClick={() =>
                          handleStatusChange(
                            property.status === 'active' ? 'rented' : 'active'
                          )
                        }
                      >
                        {property.status === 'active' ? (
                          <>
                            <CheckCircle className="h-5 w-5 mb-2 text-green-600" />
                            Mark as Rented
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 mb-2 text-yellow-600" />
                            Mark as Available
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-col h-auto py-4 text-red-600 hover:text-red-700"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-5 w-5 mb-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Market Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {priceInsight && !checkingPrice ? (
                      <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                          Based on {priceInsight.count} similar {property.property_type}s in {property.location_city}, Eswatini
                        </p>

                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Market range:</span>
                            <span className="font-medium">
                              E{priceInsight.min.toLocaleString()} - E
                              {priceInsight.max.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Average:</span>
                            <span className="font-medium">
                              E
                              {Math.round(
                                priceInsight.average
                              ).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Your price:</span>
                            <span
                              className={`font-medium ${
                                priceInsight.position === 'below'
                                  ? 'text-blue-600'
                                  : priceInsight.position === 'above'
                                  ? 'text-yellow-600'
                                  : 'text-green-600'
                              }`}
                            >
                              E{property.price.toLocaleString()}
                              {priceInsight.position !== 'average' && (
                                <span className="ml-1">
                                  (
                                  {priceInsight.position === 'below'
                                    ? '-'
                                    : '+'}
                                  {priceInsight.diff}%)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="pt-2">
                          <Button
                            variant="link"
                            className="p-0 h-auto text-sm"
                            asChild
                          >
                            <Link
                              href={`/dashboard/landlord/edit-property/${property.id}`}
                            >
                              Adjust pricing →
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Not enough similar properties in Eswatini to compare pricing.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Listing Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-500">Views this week</span>
                          <span className="font-semibold">+0%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: '0%' }}
                          ></div>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Analytics will update as views come in.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Property Photos</CardTitle>
                <Button size="sm" asChild>
                  <Link
                    href={`/dashboard/landlord/edit-property/${property.id}/photos`}
                  >
                    <Camera className="mr-2 h-4 w-4" />
                    Manage Photos
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {property.photos && property.photos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {property.photos.map((photo) => {
                      const isPrimary = photo.display_order === 0;
                      return (
                        <div
                          key={photo.id}
                          className="relative aspect-square rounded-lg overflow-hidden group"
                        >
                          <Image
                            src={photo.photo_url}
                            alt="Property"
                            fill
                            className="object-cover"
                          />
                          {isPrimary && (
                            <Badge className="absolute top-2 left-2 bg-primary">
                              Cover Photo
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Camera className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No photos yet
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Add photos to make your property stand out.
                    </p>
                    <Button asChild>
                      <Link
                        href={`/dashboard/landlord/edit-property/${property.id}/photos`}
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Upload Photos
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    Analytics Coming Soon
                  </h3>
                  <p className="text-gray-500">
                    We&apos;re working on bringing you detailed insights about
                    your listing performance in Eswatini.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Delete Property</h3>
              <p className="text-gray-500 mb-4">
                Are you sure you want to delete this property? This action
                cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteProperty}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Property'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
