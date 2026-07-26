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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Home, Plus, Eye, Edit, Trash2, MoreVertical, CheckCircle, XCircle, Loader2,
  Clock, Building, Shield,
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
  if (!photos?.length) return null;
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
  const [optimisticUpdates, setOptimisticUpdates] = useState<Record<string, { status?: string }>>({});

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
        .select(`*, photos:property_photos(id, property_id, photo_url, caption, display_order, created_at)`)
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE + 1);

      if (pageParam) query = query.lt('created_at', pageParam);

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
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => {
    if (!user || !isPoster) return;
    if (verificationChecked.current) return;
    verificationChecked.current = true;
    if (isLandlordPending) refreshVerification();
  }, [user, isPoster, isLandlordPending, refreshVerification]);

  useEffect(() => {
    if (!isInitialized || isLoading) return;
    if (!user) { router.push('/auth/login'); return; }
    if (userType === 'seeker' || userType === 'renter') {
      router.push('/dashboard/renter');
      toast.info('This page is for property posters only');
      return;
    }
    if (userType === 'admin') router.push('/dashboard/admin');
  }, [user, userType, isLoading, isInitialized, router]);

  const allProperties = data?.pages.flatMap((page) => page.properties) || [];
  const displayedProperties = allProperties.map((prop) => ({
    ...prop,
    ...(optimisticUpdates[prop.id] || {}),
  }));

  const stats = {
    total: displayedProperties.length,
    active: displayedProperties.filter((p) => p.status === 'active').length,
    rented: displayedProperties.filter((p) => p.status === 'rented' || p.status === 'taken').length,
    pending: displayedProperties.filter((p) => p.status === 'pending' || p.status === 'draft').length,
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
      queryClient.setQueryData(['landlord-properties', user?.id], (old: unknown) => {
        if (!old || typeof old !== 'object') return old;
        const o = old as { pages: { properties: { id: string }[] }[] };
        return {
          ...o,
          pages: o.pages.map((page) => ({
            ...page,
            properties: page.properties.filter((p) => p.id !== propertyToDelete),
          })),
        };
      });
      const { error } = await supabase.from('properties').delete().eq('id', propertyToDelete);
      if (error) throw error;
      toast.success('Listing deleted');
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
    } catch {
      toast.error('Failed to delete');
      refetch();
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (propertyId: string, newStatus: string) => {
    setOptimisticUpdates((prev) => ({ ...prev, [propertyId]: { status: newStatus } }));
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', propertyId);
      if (error) throw error;
      toast.success(`Marked as ${newStatus}`);
      setOptimisticUpdates((prev) => {
        const next = { ...prev };
        delete next[propertyId];
        return next;
      });
      refetch();
    } catch {
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
            <h1 className="text-3xl font-bold tracking-tight">My Listings</h1>
            <p className="text-muted-foreground">Manage your properties</p>
          </div>
          <Button disabled><Plus className="mr-2 h-4 w-4" />Add listing</Button>
        </div>
        <StatsSkeleton />
        <PropertyTableSkeleton />
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold tracking-tight">My Listings</h1>
          <p className="text-muted-foreground">Manage your properties and track performance</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/landlord/add-property">
            <Plus className="mr-2 h-4 w-4" />Add listing
          </Link>
        </Button>
      </div>

      {isLandlordPending && (
        <Card className="mb-6 border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Clock className="h-8 w-8 text-amber-600 shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-200">Verification pending</h3>
                <p className="text-amber-800 dark:text-amber-300 text-sm">
                  You can create drafts now. Publish requires verification.
                </p>
                <div className="mt-3 flex gap-3 flex-wrap">
                  <Button onClick={refreshVerification} variant="outline" size="sm">Check status</Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/landlord/verify"><Shield className="mr-2 h-4 w-4" />View status</Link>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLandlordVerified && showVerificationBanner && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-emerald-500/10 border border-emerald-500/25 rounded-lg p-4 flex items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-900 dark:text-emerald-200">Account verified</p>
              <p className="text-sm text-emerald-800 dark:text-emerald-300">You can publish listings on Ekhaya.</p>
            </div>
          </div>
          <button type="button" onClick={() => setShowVerificationBanner(false)} className="text-emerald-700 dark:text-emerald-300 text-lg leading-none" aria-label="Dismiss">×</button>
        </motion.div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Active', value: stats.active, className: 'text-emerald-600' },
          { label: 'Taken', value: stats.rented, className: 'text-blue-600' },
          { label: 'Pending', value: stats.pending, className: 'text-amber-600' },
          { label: 'Views', value: stats.totalViews.toLocaleString() },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 sm:p-6">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold tabular-nums ${s.className || ''}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Your properties</CardTitle>
          <span className="text-sm text-muted-foreground">{displayedProperties.length} shown</span>
        </CardHeader>
        <CardContent>
          <AnimatePresence>
            {displayedProperties.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <Building className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No properties yet</h3>
                <p className="text-muted-foreground mb-4">Add your first listing on Ekhaya.</p>
                <Button asChild>
                  <Link href="/dashboard/landlord/add-property"><Plus className="mr-2 h-4 w-4" />Add listing</Link>
                </Button>
              </motion.div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {displayedProperties.map((property) => (
                    <MobilePropertyCard
                      key={property.id}
                      property={property}
                      onDelete={handleDeleteClick}
                      onStatusChange={handleStatusChange}
                    />
                  ))}
                </div>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
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
                </div>
                {hasNextPage && (
                  <div ref={ref} className="flex justify-center py-4">
                    {isFetchingNextPage ? (
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    ) : (
                      <Button variant="outline" onClick={() => fetchNextPage()}>Load more</Button>
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
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />Delete listing
            </DialogTitle>
            <DialogDescription>This cannot be undone. Photos will be removed as well.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteProperty} disabled={deleting}>
              {deleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant={
        status === 'active' ? 'default'
          : status === 'pending' ? 'secondary'
            : status === 'rejected' ? 'destructive'
              : 'outline'
      }
      className={status === 'active' ? 'bg-emerald-600 hover:bg-emerald-600' : ''}
    >
      {status === 'draft' ? 'Draft' : status}
    </Badge>
  );
}

function ActionsMenu({ property, onDelete, onStatusChange }: {
  property: { id: string; status: string };
  onDelete: (id: string) => void;
  onStatusChange: (id: string, s: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {property.status !== 'draft' && (
          <DropdownMenuItem asChild>
            <Link href={`/properties/${property.id}`} target="_blank">
              <Eye className="mr-2 h-4 w-4" />View on site
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/landlord/properties/${property.id}`}>
            <Home className="mr-2 h-4 w-4" />Manage
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/landlord/edit-property/${property.id}`}>
            <Edit className="mr-2 h-4 w-4" />Edit
          </Link>
        </DropdownMenuItem>
        {property.status === 'active' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onStatusChange(property.id, 'rented')}>
              <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" />Mark as taken
            </DropdownMenuItem>
          </>
        )}
        {(property.status === 'rented' || property.status === 'taken') && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onStatusChange(property.id, 'active')}>
              <XCircle className="mr-2 h-4 w-4 text-amber-600" />Mark available
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(property.id)}>
          <Trash2 className="mr-2 h-4 w-4" />Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobilePropertyCard({ property, onDelete, onStatusChange }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  property: any;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, s: string) => void;
}) {
  const primaryPhoto = getPrimaryPhoto(property.photos);
  return (
    <div className="rounded-xl border border-border p-3 flex gap-3">
      <div className="w-16 h-16 rounded-lg overflow-hidden relative bg-muted shrink-0">
        {primaryPhoto ? (
          <Image src={primaryPhoto.photo_url} alt="" fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Home className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Link href={`/dashboard/landlord/properties/${property.id}`} className="font-medium hover:text-primary line-clamp-1">
          {property.title}
        </Link>
        <p className="text-xs text-muted-foreground truncate">
          {property.location_suburb}, {property.location_city}
        </p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-sm font-semibold tabular-nums">E{property.price?.toLocaleString?.() ?? property.price}</span>
          <StatusBadge status={property.status} />
          <span className="text-xs text-muted-foreground">{property.views || 0} views</span>
        </div>
      </div>
      <ActionsMenu property={property} onDelete={onDelete} onStatusChange={onStatusChange} />
    </div>
  );
}

function PropertyRow({ property, onDelete, onStatusChange }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  property: any;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, s: string) => void;
}) {
  const primaryPhoto = getPrimaryPhoto(property.photos);
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-muted rounded overflow-hidden relative shrink-0">
            {primaryPhoto ? (
              <Image src={primaryPhoto.photo_url} alt={property.title} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Home className="w-6 h-6 text-muted-foreground" />
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
            <div className="text-sm text-muted-foreground truncate">
              {property.location_suburb}, {property.location_city}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="tabular-nums">E{property.price?.toLocaleString?.() ?? property.price}</TableCell>
      <TableCell><StatusBadge status={property.status} /></TableCell>
      <TableCell className="tabular-nums">{property.views || 0}</TableCell>
      <TableCell>{new Date(property.created_at).toLocaleDateString()}</TableCell>
      <TableCell className="text-right">
        <ActionsMenu property={property} onDelete={onDelete} onStatusChange={onStatusChange} />
      </TableCell>
    </TableRow>
  );
}
