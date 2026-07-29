// src/app/dashboard/landlord/properties/[id]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Property, PropertyPhoto, inferAssetCategory, formatPricePeriod, inferListingIntent } from '@/types/property';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Edit, Eye, Trash2, Calendar, Loader2, MapPin, CheckCircle,
  XCircle, BarChart, Camera, AlertCircle, Clock, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLandlordProperties } from '@/hooks/useLandlordProperties';

interface PropertyWithPhotos extends Property {
  photos: PropertyPhoto[];
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['pending'],
  pending: ['active', 'rejected'],
  active: ['rented', 'taken', 'pending', 'paused', 'hidden'],
  rented: ['active'],
  taken: ['active'],
  rejected: ['pending'],
  paused: ['active'],
  hidden: ['active'],
};

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
> = {
  draft: { label: 'Draft', variant: 'outline', className: 'border-dashed' },
  pending: { label: 'Pending review', variant: 'secondary' },
  active: { label: 'Active', variant: 'default', className: 'bg-emerald-600 hover:bg-emerald-600 text-white' },
  rented: { label: 'Rented', variant: 'outline' },
  taken: { label: 'Taken', variant: 'outline' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  paused: { label: 'Paused', variant: 'outline' },
  hidden: { label: 'Hidden', variant: 'outline' },
};

export default function LandlordPropertyManagePage() {
  const { user, userType, isLoading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;
  const isAdmin = userType === 'admin';

  const [property, setProperty] = useState<PropertyWithPhotos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { deleteProperty } = useLandlordProperties({ autoFetch: false, userId: user?.id });

  useEffect(() => {
    if (!authLoading && !user) router.push('/auth/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchPropertyData = async () => {
      if (!user || !propertyId) return;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();

      try {
        setLoading(true);
        setError(null);

        // Admins can manage any listing; owners only their own
        let query = supabase
          .from('properties')
          .select(`*, photos:property_photos(id, property_id, photo_url, caption, display_order, created_at)`)
          .eq('id', propertyId);

        if (!isAdmin) {
          query = query.eq('landlord_id', user.id);
        }

        const { data: propertyData, error: propertyError } = await query.order(
          'display_order',
          { foreignTable: 'photos', ascending: true }
        );

        if (propertyError) throw propertyError;
        if (!propertyData?.length) {
          setError('Property not found or you do not have permission');
          setProperty(null);
          return;
        }
        setProperty(propertyData[0] as PropertyWithPhotos);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load property');
      } finally {
        setLoading(false);
      }
    };

    if (user && propertyId) fetchPropertyData();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [user, propertyId, isAdmin]);

  const handleStatusChange = async (newStatus: string) => {
    if (!property) return;
    // Admins can set any status; owners follow transition rules
    if (!isAdmin) {
      const allowed = STATUS_TRANSITIONS[property.status] || [];
      if (!allowed.includes(newStatus)) {
        toast.error(`Cannot change from "${property.status}" to "${newStatus}"`);
        return;
      }
    }
    setIsUpdatingStatus(true);
    try {
      const { error: upErr } = await supabase
        .from('properties')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', property.id);
      if (upErr) throw upErr;
      setProperty({ ...property, status: newStatus as Property['status'] });
      toast.success(`Status → ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
    } catch {
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteProperty = async () => {
    if (!property) return;
    setDeleting(true);
    try {
      if (isAdmin) {
        const { error: delErr } = await supabase.from('properties').delete().eq('id', property.id);
        if (delErr) throw delErr;
        toast.success('Listing deleted');
        setDeleteDialogOpen(false);
        router.push('/dashboard/admin');
      } else {
        const success = await deleteProperty(property.id);
        if (success) {
          setDeleteDialogOpen(false);
          router.push('/dashboard/landlord');
        }
      }
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const getAvailableActions = () => {
    if (!property) return [];
    const actions: {
      label: string;
      icon: typeof CheckCircle;
      action: () => void;
      variant: 'default' | 'outline';
      className?: string;
    }[] = [];

    if (isAdmin) {
      // Full control for admin
      if (property.status !== 'active') {
        actions.push({
          label: 'Set active',
          icon: CheckCircle,
          action: () => handleStatusChange('active'),
          variant: 'default',
          className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        });
      }
      if (property.status === 'active') {
        actions.push({
          label: 'Pause',
          icon: XCircle,
          action: () => handleStatusChange('paused'),
          variant: 'outline',
        });
        actions.push({
          label: 'Mark taken',
          icon: CheckCircle,
          action: () => handleStatusChange('taken'),
          variant: 'outline',
          className: 'text-blue-600 dark:text-blue-400 border-blue-600/40',
        });
      }
      if (property.status === 'pending') {
        actions.push({
          label: 'Reject',
          icon: XCircle,
          action: () => handleStatusChange('rejected'),
          variant: 'outline',
          className: 'text-destructive',
        });
      }
      return actions;
    }

    const allowed = STATUS_TRANSITIONS[property.status] || [];

    if (allowed.includes('pending')) {
      actions.push({
        label: property.status === 'rejected' ? 'Resubmit' : 'Submit for review',
        icon: CheckCircle,
        action: () => handleStatusChange('pending'),
        variant: 'outline',
        className: 'text-emerald-600 dark:text-emerald-400 border-emerald-600/40',
      });
    }
    if (allowed.includes('active') && property.status !== 'rented' && property.status !== 'taken') {
      actions.push({
        label: 'Publish',
        icon: CheckCircle,
        action: () => handleStatusChange('active'),
        variant: 'default',
        className: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      });
    }
    if (allowed.includes('rented') || allowed.includes('taken')) {
      actions.push({
        label: 'Mark taken',
        icon: CheckCircle,
        action: () => handleStatusChange('taken'),
        variant: 'outline',
        className: 'text-blue-600 dark:text-blue-400 border-blue-600/40',
      });
    }
    if ((property.status === 'rented' || property.status === 'taken') && allowed.includes('active')) {
      actions.push({
        label: 'Mark available',
        icon: XCircle,
        action: () => handleStatusChange('active'),
        variant: 'outline',
        className: 'text-amber-600 dark:text-amber-400 border-amber-600/40',
      });
    }
    return actions;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <h2 className="text-xl font-bold mb-2">Not found</h2>
            <p className="text-muted-foreground mb-4 text-sm">{error || 'No access to this listing.'}</p>
            <Button asChild>
              <Link href={isAdmin ? '/dashboard/admin' : '/dashboard/landlord'}>
                <ArrowLeft className="mr-2 h-4 w-4" />Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[property.status] || STATUS_CONFIG.draft;
  const availableActions = getAvailableActions();
  const statusString = String(property.status);
  const intent = inferListingIntent(property);
  const period = property.price_period || (intent === 'sale' ? 'once' : 'month');
  const category = inferAssetCategory(property);
  const backHref = isAdmin ? '/dashboard/admin' : '/dashboard/landlord';

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <Button variant="ghost" size="icon" asChild className="shrink-0">
                <Link href={backHref}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div className="min-w-0">
                <h1 className="text-lg font-semibold truncate text-foreground">{property.title}</h1>
                <div className="flex items-center text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3 mr-1 shrink-0" />
                  <span className="truncate">
                    {property.location_suburb}, {property.location_city}
                  </span>
                </div>
                {isAdmin && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Managing as admin</p>
                )}
              </div>
              <Badge variant={statusConfig.variant} className={statusConfig.className}>
                {statusConfig.label}
              </Badge>
            </div>
            <div className="flex gap-2 flex-wrap">
              {statusString !== 'draft' && statusString !== 'rejected' && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/properties/${property.id}`} target="_blank">
                    <Eye className="mr-2 h-4 w-4" />
                    Public
                  </Link>
                </Button>
              )}
              <Button size="sm" asChild>
                <Link href={`/dashboard/landlord/edit-property/${property.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {[
            { label: 'Views', value: property.views || 0, icon: Eye, color: 'text-blue-500' },
            {
              label: 'Listed',
              value: new Date(property.created_at).toLocaleDateString(),
              icon: Calendar,
              color: 'text-violet-500',
            },
            {
              label: 'Price',
              value: `E${property.price.toLocaleString()}${formatPricePeriod(period)}`,
              icon: FileText,
              color: 'text-emerald-500',
            },
            { label: 'Status', value: property.status, icon: FileText, color: 'text-muted-foreground' },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-lg font-bold text-foreground truncate capitalize">{s.value}</p>
                  </div>
                  <s.icon className={`h-7 w-7 opacity-40 shrink-0 ${s.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="font-semibold text-foreground">
                          E{property.price.toLocaleString()}
                          <span className="text-sm font-normal text-muted-foreground">
                            {formatPricePeriod(period)}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Category</p>
                        <p className="font-semibold text-foreground capitalize">{category}</p>
                      </div>
                      {category === 'residential' && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">Bedrooms</p>
                            <p className="font-semibold text-foreground">{property.bedrooms ?? '—'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Bathrooms</p>
                            <p className="font-semibold text-foreground">{property.bathrooms ?? '—'}</p>
                          </div>
                        </>
                      )}
                      {category === 'land' && (
                        <div>
                          <p className="text-sm text-muted-foreground">Size</p>
                          <p className="font-semibold text-foreground">{property.land_size_ha ?? '—'} ha</p>
                        </div>
                      )}
                      {category === 'commercial' && (
                        <div>
                          <p className="text-sm text-muted-foreground">Floor area</p>
                          <p className="font-semibold text-foreground">{property.floor_area_sqm ?? '—'} m²</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Description</p>
                      <p className="text-foreground/90 whitespace-pre-line">{property.description}</p>
                    </div>

                    {property.amenities?.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Features</p>
                        <div className="flex flex-wrap gap-2">
                          {property.amenities.map((a) => (
                            <Badge key={a} variant="outline">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Location</p>
                      <p className="text-foreground/90">
                        {property.location_address && (
                          <>
                            {property.location_address}
                            <br />
                          </>
                        )}
                        {property.location_suburb}, {property.location_city}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Contact</p>
                      <p className="text-foreground/90">{property.contact_phone}</p>
                      {property.contact_whatsapp && (
                        <p className="text-foreground/90">WhatsApp: {property.contact_whatsapp}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={statusConfig.variant} className={`mb-4 ${statusConfig.className}`}>
                      {statusConfig.label}
                    </Badge>
                    {availableActions.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {availableActions.map((action, i) => (
                          <Button
                            key={i}
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Button variant="outline" className="flex-col h-auto py-4" asChild>
                        <Link href={`/dashboard/landlord/edit-property/${property.id}`}>
                          <Edit className="h-5 w-5 mb-2" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-col h-auto py-4"
                        onClick={() => setActiveTab('photos')}
                      >
                        <Camera className="h-5 w-5 mb-2" />
                        Photos
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-col h-auto py-4 text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="h-5 w-5 mb-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Views</span>
                      <span className="font-semibold text-foreground">{property.views || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm items-center">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant="outline" className="capitalize">
                        {property.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="photos">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Photos</CardTitle>
                <Button size="sm" asChild>
                  <Link href={`/dashboard/landlord/edit-property/${property.id}`}>
                    <Camera className="mr-2 h-4 w-4" />
                    Manage
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {property.photos?.length ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {property.photos.map((photo) => (
                      <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                        <Image src={photo.photo_url} alt="" fill className="object-cover" />
                        {photo.display_order === 0 && (
                          <Badge className="absolute top-2 left-2">Cover</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Camera className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground mb-4">No photos yet</p>
                    <Button asChild>
                      <Link href={`/dashboard/landlord/edit-property/${property.id}`}>Upload</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <Card>
              <CardContent className="py-16 text-center">
                <BarChart className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-1 text-foreground">Analytics soon</h3>
                <p className="text-sm text-muted-foreground">
                  Views over time and engagement for this listing.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {deleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2 text-foreground">Delete listing?</h3>
              <p className="text-muted-foreground text-sm mb-4">This cannot be undone.</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDeleteProperty} disabled={deleting}>
                  {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
