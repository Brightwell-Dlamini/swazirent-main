// src/app/dashboard/landlord/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useVerification } from '@/hooks/useVerification';
import { supabase } from '@/lib/supabase';
import { Property, PropertyPhoto } from '@/types/property';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Home,
  Plus,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Building,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface PropertyWithPhotos extends Property {
  photos: PropertyPhoto[];
}

// Helper to get primary photo
const getPrimaryPhoto = (photos?: PropertyPhoto[]) => {
  if (!photos || photos.length === 0) return null;
  return [...photos].sort((a, b) => a.display_order - b.display_order)[0];
};

// Helper to extract file path from Supabase URL
const extractFilePathFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const publicIndex = pathParts.indexOf('public');
    if (publicIndex !== -1) {
      return pathParts.slice(publicIndex + 1).join('/');
    }
    const bucketIndex = pathParts.indexOf('property-photos');
    if (bucketIndex !== -1) {
      return pathParts.slice(bucketIndex + 1).join('/');
    }
    return null;
  } catch {
    return null;
  }
};

export default function LandlordDashboard() {
  const { user, userType, isLoading, isInitialized } = useAuth();
  const { status, isLandlordVerified, isLandlordPending, isLandlordRejected, refreshVerification } = useVerification();
  const router = useRouter();
  const [properties, setProperties] = useState<PropertyWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    rented: 0,
    pending: 0,
    rejected: 0,
    totalViews: 0,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(true);

  // REFS TO PREVENT INFINITE LOOPS AND RE-RUNS
  const hasCheckedVerification = useRef(false);
  const hasFetchedProperties = useRef(false);

  // Check verification status - ONLY ONCE
  useEffect(() => {
    if (!user || userType !== 'landlord') return;
    if (hasCheckedVerification.current) return;
    if (!isLandlordPending) return;
    
    hasCheckedVerification.current = true;
    refreshVerification();
  }, [user, userType, isLandlordPending]); // ← refreshVerification REMOVED from deps

  // Redirect if not authenticated or not a landlord
  useEffect(() => {
    // Only redirect after initialization is complete
    if (!isInitialized || isLoading) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }
    
    if (userType === 'renter') {
      router.push('/dashboard/renter');
      toast.info('This page is for landlords only', {
        description: 'Redirecting to your renter dashboard.',
      });
      return;
    }
    
    if (userType === 'admin') {
      router.push('/dashboard/admin');
      toast.info('This page is for landlords only', {
        description: 'Redirecting to your admin dashboard.',
      });
      return;
    }
  }, [user, userType, isLoading, isInitialized, router]);

  const fetchProperties = useCallback(async () => {
    if (!user || userType !== 'landlord') {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          landlord:profiles!properties_landlord_id_fkey (
            full_name,
            phone,
            is_verified
          ),
          photos:property_photos (
            id,
            photo_url,
            caption,
            display_order,
            created_at
          )
        `)
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedData: PropertyWithPhotos[] = (data || []).map((item: any) => ({
        ...item,
        landlord: item.landlord || undefined,
        photos: item.photos || [],
      }));

      setProperties(transformedData || []);

      const total = transformedData.length;
      const active = transformedData.filter((p) => p.status === 'active').length;
      const rented = transformedData.filter((p) => p.status === 'rented').length;
      const pending = transformedData.filter((p) => p.status === 'pending').length;
      const rejected = transformedData.filter((p) => p.status === 'rejected').length;
      const totalViews = transformedData.reduce((sum, p) => sum + (p.views || 0), 0);

      setStats({ total, active, rented, pending, rejected, totalViews });
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [user]); // ← ONLY user, NOT userType

  // Fetch properties - ONLY ONCE
  useEffect(() => {
    // Only proceed after initialization is complete
    if (!isInitialized) return;
    
    if (!user || userType !== 'landlord') {
      setLoading(false);
      return;
    }
    
    // Skip if already fetched
    if (hasFetchedProperties.current) return;
    
    hasFetchedProperties.current = true;
    fetchProperties();
  }, [user, userType, isInitialized]); // ← fetchProperties REMOVED from deps

  // Reset fetch flag when user changes (e.g., signs out and back in)
  useEffect(() => {
    if (!user) {
      hasFetchedProperties.current = false;
      hasCheckedVerification.current = false;
    }
  }, [user]);

  async function deletePropertyWithPhotos(propertyId: string) {
    try {
      const { data: photos, error: fetchError } = await supabase
        .from('property_photos')
        .select('photo_url')
        .eq('property_id', propertyId);

      if (fetchError) throw fetchError;

      if (photos && photos.length > 0) {
        const filePaths = photos
          .map((p) => extractFilePathFromUrl(p.photo_url))
          .filter((path): path is string => path !== null);

        if (filePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('property-photos')
            .remove(filePaths);

          if (storageError) {
            console.error('Error deleting photos from storage:', storageError);
            toast.warning('Some photos could not be deleted from storage');
          }
        }
      }

      const { error: dbPhotosError } = await supabase
        .from('property_photos')
        .delete()
        .eq('property_id', propertyId);

      if (dbPhotosError) throw dbPhotosError;

      const { error: propertyError } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (propertyError) throw propertyError;

      return true;
    } catch (error) {
      console.error('Error deleting property and photos:', error);
      throw error;
    }
  }

  async function handleDeleteProperty() {
    if (!propertyToDelete) return;

    setDeleting(true);
    try {
      await deletePropertyWithPhotos(propertyToDelete);
      
      setProperties(properties.filter((p) => p.id !== propertyToDelete));
      toast.success('Property deleted successfully');
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
      
      // Update stats
      await fetchProperties();
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    } finally {
      setDeleting(false);
    }
  }

  async function handleStatusChange(
    propertyId: string,
    newStatus: 'active' | 'rented'
  ) {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus })
        .eq('id', propertyId);

      if (error) throw error;

      setProperties(
        properties.map((p) =>
          p.id === propertyId ? { ...p, status: newStatus } : p
        )
      );

      toast.success(`Property marked as ${newStatus}`);
      await fetchProperties();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  }

  // Loading state - only show if not initialized yet
  if (!isInitialized || isLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-100">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Show pending verification message if landlord is not verified
  if (userType === 'landlord' && isLandlordPending) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Landlord Dashboard</h1>
            <p className="text-gray-600">Manage your properties and track performance</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-8 w-8 text-amber-600 animate-pulse" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Verification Pending</h2>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              Your landlord account is being verified. You will be able to manage properties once approved.
              This typically takes 1-2 business days.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={refreshVerification} variant="outline">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Check Status
              </Button>
              <Button asChild>
                <Link href="/dashboard/landlord/verify">
                  <Shield className="mr-2 h-4 w-4" />
                  View Status
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show rejected verification message
  if (userType === 'landlord' && isLandlordRejected) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Landlord Dashboard</h1>
            <p className="text-gray-600">Manage your properties and track performance</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2 text-red-600">Verification Rejected</h2>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              Your verification was not approved. Please submit new documents for review.
            </p>
            <Button asChild>
              <Link href="/dashboard/landlord/verify">
                <Shield className="mr-2 h-4 w-4" />
                Submit New Documents
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if user is not a landlord
  if (userType !== 'landlord') {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Landlord Dashboard</h1>
          <p className="text-gray-600">
            Manage your properties and track performance
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/dashboard/landlord/add-property">
              <Plus className="mr-2 h-4 w-4" />
              Add New Property
            </Link>
          </Button>
        </div>
      </div>

      {/* Verification Banner */}
      {isLandlordVerified && showVerificationBanner && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-6 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">
                ✓ Account Verified
              </p>
              <p className="text-sm text-green-600 dark:text-green-300">
                Your landlord account is verified. You can now list properties.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowVerificationBanner(false)}
            className="text-green-600 hover:text-green-800"
          >
            ×
          </button>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Properties</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Home className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Listings</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.active}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rented</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.rented}
                </p>
              </div>
              <Home className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Approval</p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.pending}
                </p>
              </div>
              <Clock className="h-8 w-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Views</p>
                <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
              </div>
              <Eye className="h-8 w-8 text-purple-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Properties Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Properties</CardTitle>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Showing {properties.length} properties</span>
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            {properties.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
                <p className="text-gray-500 mb-4">
                  Start by adding your first property listing.
                </p>
                <Button asChild>
                  <Link href="/dashboard/landlord/add-property">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Property
                  </Link>
                </Button>
              </motion.div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Listed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.map((property) => {
                    const primaryPhoto = getPrimaryPhoto(property.photos);

                    return (
                      <TableRow key={property.id}>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden relative shrink-0">
                              {primaryPhoto ? (
                                <Image
                                  src={primaryPhoto.photo_url}
                                  alt={property.title}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Home className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/dashboard/landlord/properties/${property.id}`}
                                className="font-medium hover:text-primary hover:underline truncate block"
                              >
                                {property.title}
                              </Link>
                              <div className="text-sm text-gray-500 truncate">
                                {property.location_suburb},{' '}
                                {property.location_city}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>E{property.price.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              property.status === 'active'
                                ? 'default'
                                : property.status === 'pending'
                                ? 'secondary'
                                : property.status === 'rejected'
                                ? 'destructive'
                                : 'outline'
                            }
                            className={
                              property.status === 'active' ? 'bg-green-600' : ''
                            }
                          >
                            {property.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{property.views || 0}</TableCell>
                        <TableCell>
                          {new Date(property.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />

                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/properties/${property.id}`}
                                  target="_blank"
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View on Site
                                </Link>
                              </DropdownMenuItem>

                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/landlord/properties/${property.id}`}
                                >
                                  <Home className="mr-2 h-4 w-4" />
                                  Manage Property
                                </Link>
                              </DropdownMenuItem>

                              <DropdownMenuItem asChild>
                                <Link
                                  href={`/dashboard/landlord/edit-property/${property.id}`}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Details
                                </Link>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {property.status === 'active' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(property.id, 'rented')
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                  Mark as Rented
                                </DropdownMenuItem>
                              )}
                              {property.status === 'rented' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusChange(property.id, 'active')
                                  }
                                >
                                  <XCircle className="mr-2 h-4 w-4 text-amber-600" />
                                  Mark as Available
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => {
                                  setPropertyToDelete(property.id);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Property
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this property? This action cannot
              be undone. All photos associated with this property will also be
              permanently removed from storage.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
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
                'Delete Property & Photos'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

