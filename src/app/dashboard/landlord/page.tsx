// src/app/dashboard/landlord/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useVerification } from '@/hooks/useVerification';
import { useLandlordProperties } from '@/hooks/useLandlordProperties';
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
  Building,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { StatsSkeleton, PropertyTableSkeleton } from '@/components/landlord/PropertySkeleton';
import { Property, PropertyPhoto } from '@/types/property';

interface PropertyWithPhotos extends Property {
  photos: PropertyPhoto[];
}

const getPrimaryPhoto = (photos?: PropertyPhoto[]) => {
  if (!photos || photos.length === 0) return null;
  return [...photos].sort((a, b) => a.display_order - b.display_order)[0];
};

export default function LandlordDashboard() {
  const { user, userType, isLoading, isInitialized } = useAuth();
  const { status, isLandlordVerified, isLandlordPending, isLandlordRejected, refreshVerification } = useVerification();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(true);
  
  const verificationChecked = useRef(false);
  
  const { properties, loading, stats, deleteProperty, updateStatus, fetchProperties } = useLandlordProperties({
    autoFetch: false,
    userId: user?.id,
  });

  // Check verification status - only once
  useEffect(() => {
    if (!user || userType !== 'landlord') return;
    if (verificationChecked.current) return;
    if (!isLandlordPending) {
      verificationChecked.current = true;
      return;
    }
    
    verificationChecked.current = true;
    refreshVerification();
  }, [user, userType, isLandlordPending, refreshVerification]);

  // Fetch properties when user is ready
  useEffect(() => {
    if (!isInitialized) return;
    if (!user || userType !== 'landlord') {
      return;
    }
    fetchProperties();
  }, [user, userType, isInitialized, fetchProperties]);

  // Redirect if not authenticated or not a landlord
  useEffect(() => {
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

  const handleDeleteClick = (propertyId: string) => {
    setPropertyToDelete(propertyId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteProperty = async () => {
    if (!propertyToDelete) return;
    
    setDeleting(true);
    const success = await deleteProperty(propertyToDelete);
    setDeleting(false);
    
    if (success) {
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
    }
  };

  // Loading state
  if (!isInitialized || isLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Landlord Dashboard</h1>
            <p className="text-gray-600">Manage your properties and track performance</p>
          </div>
          <Button disabled>
            <Plus className="mr-2 h-4 w-4" />
            Add New Property
          </Button>
        </div>
        <StatsSkeleton />
        <PropertyTableSkeleton />
      </div>
    );
  }

  // Pending verification
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

  // Rejected verification
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

  // Not a landlord
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
                Your landlord account is verified. You can now list properties in Eswatini.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowVerificationBanner(false)}
            className="text-green-600 hover:text-green-800"
            aria-label="Dismiss banner"
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
                  Start by adding your first property listing in Eswatini.
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
                    <TableHead>Price (E)</TableHead>
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
                                {property.location_suburb}, {property.location_city}
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
                                    updateStatus(property.id, 'rented')
                                  }
                                >
                                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                  Mark as Rented
                                </DropdownMenuItem>
                              )}
                              {property.status === 'rented' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    updateStatus(property.id, 'active')
                                  }
                                >
                                  <XCircle className="mr-2 h-4 w-4 text-amber-600" />
                                  Mark as Available
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteClick(property.id)}
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
