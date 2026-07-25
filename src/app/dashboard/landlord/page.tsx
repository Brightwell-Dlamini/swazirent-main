// src/app/dashboard/landlord/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useVerification } from '@/hooks/useVerification';
import { canPostListings } from '@/types/user';
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
  Building,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { StatsSkeleton, PropertyTableSkeleton } from '@/components/landlord/PropertySkeleton';
import { supabase } from '@/lib/supabase';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import { PropertyPhoto } from '@/types/property';

const PAGE_SIZE = 10;

const getPrimaryPhoto = (photos?: PropertyPhoto[]) => {
  if (!photos || photos.length === 0) return null;
  return [...photos].sort((a, b) => a.display_order - b.display_order)[0];
};

export default function LandlordDashboard() {
  const { user, userType, isLoading, isInitialized } = useAuth();
  const { isLandlordVerified, isLandlordPending, refreshVerification } = useVerification();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ref, inView } = useInView();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showVerificationBanner, setShowVerificationBanner] = useState(true);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, any>>({});

  const verificationChecked = useRef(false);
  const isPoster = canPostListings(userType);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: propertiesLoading,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['landlord-properties', user?.id],
    queryFn: async ({ pageParam = null }) => {
      if (!user) return { properties: [], nextCursor: null };

      let query = supabase
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
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE + 1);

      if (pageParam) {
        query = query.lt('created_at', pageParam);
      }

      const { data, error } = await query;
      if (error) throw error;

      const hasMore = data && data.length > PAGE_SIZE;
      const properties = hasMore ? data.slice(0, PAGE_SIZE) : data || [];
      const nextCursor = hasMore ? data[PAGE_SIZE - 1]?.created_at : null;

      return { properties, nextCursor };
    },
    initialPageParam: null as null | string,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!user && isPoster,
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!user || !isPoster) return;
    if (verificationChecked.current) return;
    verificationChecked.current = true;
    if (isLandlordPending) {
      refreshVerification();
    }
  }, [user, isPoster, isLandlordPending, refreshVerification]);

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Seekers / renters → renter dashboard
    if (userType === 'seeker' || userType === 'renter') {
      router.push('/dashboard/renter');
      toast.info('This page is for property posters only');
      return;
    }

    if (userType === 'admin') {
      router.push('/dashboard/admin');
      return;
    }
  }, [user, userType, isLoading, isInitialized, router]);

  const allProperties = data?.pages.flatMap((page) => page.properties) || [];
  const displayedProperties = allProperties.map((prop) => ({
    ...prop,
    ...(optimisticUpdates[prop.id] || {}),
  }));

  const stats = {
    total: displayedProperties.length,
    active: displayedProperties.filter((p) => p.status === 'active').length,
    rented: displayedProperties.filter((p) => p.status === 'rented').length,
    pending: displayedProperties.filter(
      (p) => p.status === 'pending' || p.status === 'draft'
    ).length,
    totalViews: displayedProperties.reduce((sum, p) => sum + (p.views || 0), 0),
  };

  const handleDeleteClick = (propertyId: string) => {
    setPropertyToDelete(propertyId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteProperty = async () => {
    if (!propertyToDelete) return;
    setDeleting(true);
    try {
      queryClient.setQueryData(['landlord-properties', user?.id], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            properties: page.properties.filter((p: any) => p.id !== propertyToDelete),
          })),
        };
      });

      const { error } = await supabase.from('properties').delete().eq('id', propertyToDelete);
      if (error) throw error;

      toast.success('Property deleted successfully');
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete property');
      refetch();
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (propertyId: string, newStatus: string) => {
    setOptimisticUpdates((prev) => ({
      ...prev,
      [propertyId]: { status: newStatus },
    }));

    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', propertyId);

      if (error) throw error;
      toast.success(`Property marked as ${newStatus}`);
      setOptimisticUpdates((prev) => {
        const next = { ...prev };
        delete next[propertyId];
        return next;
      });
      refetch();
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('Failed to update status');
      setOptimisticUpdates((prev) => {
        const next = { ...prev };
        delete next[propertyId];
        return next;
      });
    }
  };

  if (!isInitialized || isLoading || (isPoster && propertiesLoading)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Listings</h1>
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

  // Not a poster role → empty (redirect effect handles navigation)
  if (!isPoster) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">My Listings</h1>
          <p className="text-gray-600">Manage your properties and track performance</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/landlord/add-property">
            <Plus className="mr-2 h-4 w-4" />
            Add New Property
          </Link>
        </Button>
      </div>

      {isLandlordPending && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Clock className="h-8 w-8 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-amber-800">Verification Pending</h3>
                <p className="text-amber-700 text-sm">
                  You can create drafts now. Publish requires verification.
                </p>
                <div className="mt-3 flex gap-3">
                  <Button onClick={refreshVerification} variant="outline" size="sm">
                    Check Status
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/landlord/verify">
                      <Shield className="mr-2 h-4 w-4" />
                      View Status
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLandlordVerified && showVerificationBanner && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">Account Verified</p>
              <p className="text-sm text-green-600 dark:text-green-300">
                You can list properties on Ekhaya.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowVerificationBanner(false)}
            className="text-green-600 hover:text-green-800"
            aria-label="Dismiss"
          >
            ×
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Rented</p>
            <p className="text-2xl font-bold text-blue-600">{stats.rented}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-500">Views</p>
            <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your Properties</CardTitle>
          <span className="text-sm text-gray-500">{displayedProperties.length} shown</span>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            {displayedProperties.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
                <p className="text-gray-500 mb-4">Add your first listing on Ekhaya.</p>
                <Button asChild>
                  <Link href="/dashboard/landlord/add-property">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Property
                  </Link>
                </Button>
              </motion.div>
            ) : (
              <>
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
                    {displayedProperties.map((property) => (
                      <PropertyRow
                        key={property.id}
                        property={property}
                        onDelete={handleDeleteClick}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </TableBody>
                </Table>
                {hasNextPage && (
                  <div ref={ref} className="flex justify-center py-4">
                    {isFetchingNextPage ? (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : (
                      <Button variant="outline" onClick={() => fetchNextPage()}>
                        Load More
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Property
            </DialogTitle>
            <DialogDescription>
              This cannot be undone. Photos will be removed as well.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProperty} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PropertyRow({ property, onDelete, onStatusChange }: any) {
  const primaryPhoto = getPrimaryPhoto(property.photos);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden relative shrink-0">
            {primaryPhoto ? (
              <Image src={primaryPhoto.photo_url} alt={property.title} fill className="object-cover" />
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
      <TableCell>E{property.price?.toLocaleString?.() ?? property.price}</TableCell>
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
          className={property.status === 'active' ? 'bg-green-600' : ''}
        >
          {property.status === 'draft' ? 'Draft' : property.status}
        </Badge>
      </TableCell>
      <TableCell>{property.views || 0}</TableCell>
      <TableCell>{new Date(property.created_at).toLocaleDateString()}</TableCell>
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
            {property.status !== 'draft' && (
              <DropdownMenuItem asChild>
                <Link href={`/properties/${property.id}`} target="_blank">
                  <Eye className="mr-2 h-4 w-4" />
                  View on Site
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/landlord/properties/${property.id}`}>
                <Home className="mr-2 h-4 w-4" />
                Manage
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/landlord/edit-property/${property.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            {property.status === 'active' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onStatusChange(property.id, 'rented')}>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                  Mark as Rented
                </DropdownMenuItem>
              </>
            )}
            {property.status === 'rented' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onStatusChange(property.id, 'active')}>
                  <XCircle className="mr-2 h-4 w-4 text-amber-600" />
                  Mark as Available
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={() => onDelete(property.id)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
