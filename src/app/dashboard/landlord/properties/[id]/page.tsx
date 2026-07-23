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
  Clock,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLandlordProperties } from '@/hooks/useLandlordProperties';

interface PropertyWithPhotos extends Property {
  photos: PropertyPhoto[];
}

// Status transition rules
const STATUS_TRANSITIONS: Record<string, string[]> = {
  'draft': ['pending'],
  'pending': ['active', 'rejected'],
  'active': ['rented', 'pending'],
  'rented': ['active'],
  'rejected': ['pending'],
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  'draft': { label: '📄 Draft', variant: 'outline', className: 'border-dashed' },
  'pending': { label: '⏳ Pending Review', variant: 'secondary' },
  'active': { label: '✓ Active', variant: 'default', className: 'bg-green-600' },
  'rented': { label: '🏠 Rented', variant: 'outline' },
  'rejected': { label: '✗ Rejected', variant: 'destructive' },
};

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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const { deleteProperty, updateStatus } = useLandlordProperties({
    autoFetch: false,
    userId: user?.id,
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

  const handleStatusChange = async (newStatus: 'active' | 'rented' | 'pending' | 'rejected') => {
    if (!property) return;

    // Validate status transition
    const allowedTransitions = STATUS_TRANSITIONS[property.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      toast.error(`Cannot change status from "${property.status}" to "${newStatus}"`);
      return;
    }

    setIsUpdatingStatus(true);

    try {
      const success = await updateStatus(property.id, newStatus);
      if (success) {
        setProperty({ ...property, status: newStatus });
        toast.success(`Property status updated to ${STATUS_CONFIG[newStatus].label}`);
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
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

  // Get available actions based on current status
  const getAvailableActions = () => {
    if (!property) return [];

    const actions = [];
    const allowedTransitions = STATUS_TRANSITIONS[property.status] || [];

    if (allowedTransitions.includes('pending')) {
      actions.push({
        label: 'Submit for Review',
        icon: CheckCircle,
        action: () => handleStatusChange('pending'),
        variant: 'outline' as const,
        className: 'text-green-600 border-green-600 hover:bg-green-50',
      });
    }

    if (allowedTransitions.includes('active')) {
      actions.push({
        label: 'Publish Listing',
        icon: CheckCircle,
        action: () => handleStatusChange('active'),
        variant: 'default' as const,
        className: 'bg-green-600 hover:bg-green-700',
      });
    }

    if (allowedTransitions.includes('rented')) {
      actions.push({
        label: 'Mark as Rented',
        icon: CheckCircle,
        action: () => handleStatusChange('rented'),
        variant: 'outline' as const,
        className: 'text-blue-600 border-blue-600 hover:bg-blue-50',
      });
    }

    if (allowedTransitions.includes('active') && property.status === 'rented') {
      actions.push({
        label: 'Mark as Available',
        icon: XCircle,
        action: () => handleStatusChange('active'),
        variant: 'outline' as const,
        className: 'text-amber-600 border-amber-600 hover:bg-amber-50',
      });
    }

    if (allowedTransitions.includes('rejected')) {
      actions.push({
        label: 'Reject',
        icon: XCircle,
        action: () => handleStatusChange('rejected'),
        variant: 'outline' as const,
        className: 'text-red-600 border-red-600 hover:bg-red-50',
      });
    }

    // If status is rejected, allow resubmit
    if (property.status === 'rejected' && allowedTransitions.includes('pending')) {
      actions.push({
        label: 'Resubmit for Review',
        icon: AlertCircle,
        action: () => handleStatusChange('pending'),
        variant: 'outline' as const,
        className: 'text-orange-600 border-orange-600 hover:bg-orange-50',
      });
    }

    return actions;
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

  const statusConfig = STATUS_CONFIG[property.status] || STATUS_CONFIG['draft'];
  const availableActions = getAvailableActions();

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
                variant={statusConfig.variant}
                className={statusConfig.className}
              >
                {statusConfig.label}
              </Badge>
            </div>
            <div className="flex gap-2">
              {property.status !== 'draft' && property.status !== 'rejected' && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/properties/${property.id}`} target="_blank">
                    <Eye className="mr-2 h-4 w-4" />
                    Public View
                  </Link>
                </Button>
              )}
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="text-2xl font-bold capitalize">
                    {property.status}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-gray-500 opacity-50" />
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

                {/* Status Management Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Status Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <p className="text-sm text-gray-500">Current Status</p>
                      <Badge
                        variant={statusConfig.variant}
                        className={`text-base ${statusConfig.className}`}
                      >
                        {statusConfig.label}
                      </Badge>
                    </div>

                    {availableActions.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {availableActions.map((action, index) => (
                          <Button
                            key={index}
                            variant={action.variant}
                            className={`flex-col h-auto py-4 ${action.className || ''}`}
                            onClick={action.action}
                            disabled={isUpdatingStatus}
                          >
                            {isUpdatingStatus ? (
                              <Loader2 className="h-5 w-5 mb-2 animate-spin" />
                            ) : (
                              <action.icon className="h-5 w-5 mb-2" />
                            )}
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}

                    {property.status === 'pending' && (
                      <p className="text-sm text-amber-600 mt-4 flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Your property is being reviewed. You will be notified once approved.
                      </p>
                    )}

                    {property.status === 'rejected' && (
                      <p className="text-sm text-red-600 mt-4 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Your property was rejected. Please review and resubmit.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
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
                    <CardTitle>Listing Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Views</span>
                        <span className="font-semibold">{property.views || 0}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Status</span>
                        <Badge variant="outline">{property.status}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Listed</span>
                        <span className="text-sm">
                          {new Date(property.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {property.status === 'active' && (
                        <div className="mt-4 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-700">
                            ✓ This property is live and visible to renters
                          </p>
                        </div>
                      )}
                      {property.status === 'draft' && (
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            📄 This is a draft. Submit for review to make it live.
                          </p>
                        </div>
                      )}
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
                    href={`/dashboard/landlord/edit-property/${property.id}`}
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
                        href={`/dashboard/landlord/edit-property/${property.id}`}
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
                    We're working on bringing you detailed insights about
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
