// src/app/dashboard/renter/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Property } from '@/types/property';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Bell, Settings, MapPin, Trash2, Loader2, Search, ArrowRight, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SavedProperty {
  id: string;
  property_id: string;
  properties: Property;
}

interface SearchAlert {
  id: string;
  name: string;
  criteria: {
    city?: string;
    keyword?: string;
    minPrice?: number;
    maxPrice?: number;
    bedrooms?: number;
    propertyType?: string[];
    amenities?: string[];
    furnished?: boolean;
  };
  is_active: boolean;
  created_at: string;
  last_notified_at?: string;
}

export default function RenterDashboard() {
  const { user, isLoading: authLoading, isInitialized } = useAuth();
  const router = useRouter();
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [searchAlerts, setSearchAlerts] = useState<SearchAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAlert, setEditingAlert] = useState<SearchAlert | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [alertName, setAlertName] = useState('');
  const isMounted = useRef(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const fetchSavedProperties = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('saved_properties')
        .select(`
          id,
          property_id,
          properties:property_id (
            id,
            title,
            price,
            location_city,
            location_suburb,
            bedrooms,
            bathrooms,
            status,
            photos:property_photos (
              id,
              photo_url,
              display_order
            )
          )
        `)
        .eq('renter_id', user.id);

      if (error) throw error;

      const transformedData: SavedProperty[] = (data || []).map((item: any) => ({
        id: item.id,
        property_id: item.property_id,
        properties: item.properties,
      }));

      setSavedProperties(transformedData);
    } catch (error) {
      console.error('Error fetching saved properties:', error);
      toast.error('Failed to load saved properties');
    }
  }, [user]);

  const fetchSearchAlerts = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('search_alerts')
        .select('*')
        .eq('renter_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSearchAlerts(data || []);
    } catch (error) {
      console.error('Error fetching search alerts:', error);
      toast.error('Failed to load search alerts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      Promise.all([fetchSavedProperties(), fetchSearchAlerts()]);
    }
  }, [user, fetchSavedProperties, fetchSearchAlerts]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  async function removeSavedProperty(id: string) {
    try {
      const { error } = await supabase
        .from('saved_properties')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSavedProperties(savedProperties.filter((p) => p.id !== id));
      toast.success('Property removed from saved');
    } catch (error) {
      console.error('Error removing saved property:', error);
      toast.error('Failed to remove property');
    }
  }

  async function toggleAlert(alertId: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('search_alerts')
        .update({ is_active: !currentStatus })
        .eq('id', alertId);

      if (error) throw error;
      setSearchAlerts(
        searchAlerts.map((alert) =>
          alert.id === alertId
            ? { ...alert, is_active: !currentStatus }
            : alert
        )
      );
      toast.success(`Alert ${!currentStatus ? 'activated' : 'paused'}`);
    } catch (error) {
      console.error('Error toggling alert:', error);
      toast.error('Failed to update alert');
    }
  }

  async function deleteAlert(alertId: string) {
    try {
      const { error } = await supabase
        .from('search_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;
      setSearchAlerts(searchAlerts.filter((a) => a.id !== alertId));
      toast.success('Alert deleted');
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Failed to delete alert');
    }
  }

  const openEditDialog = (alert: SearchAlert) => {
    setEditingAlert(alert);
    setAlertName(alert.name || '');
    setIsEditDialogOpen(true);
  };

  const handleRenameAlert = async () => {
    if (!editingAlert || !alertName.trim()) return;

    try {
      const { error } = await supabase
        .from('search_alerts')
        .update({ name: alertName.trim() })
        .eq('id', editingAlert.id);

      if (error) throw error;

      setSearchAlerts(
        searchAlerts.map((alert) =>
          alert.id === editingAlert.id
            ? { ...alert, name: alertName.trim() }
            : alert
        )
      );
      toast.success('Alert renamed successfully');
      setIsEditDialogOpen(false);
      setEditingAlert(null);
      setAlertName('');
    } catch (error) {
      console.error('Error renaming alert:', error);
      toast.error('Failed to rename alert');
    }
  };

  const formatAlertCriteria = (criteria: SearchAlert['criteria']) => {
    const parts = [];
    if (criteria.keyword) parts.push(`"${criteria.keyword}"`);
    if (criteria.city) parts.push(criteria.city);
    if (criteria.minPrice && criteria.maxPrice) {
      parts.push(`E${criteria.minPrice}-E${criteria.maxPrice}`);
    } else if (criteria.minPrice) {
      parts.push(`E${criteria.minPrice}+`);
    } else if (criteria.maxPrice) {
      parts.push(`Under E${criteria.maxPrice}`);
    }
    if (criteria.bedrooms) parts.push(`${criteria.bedrooms}+ beds`);
    if (criteria.propertyType?.length) {
      parts.push(criteria.propertyType.map(t => t).join('/'));
    }
    return parts.join(' • ') || 'All properties';
  };

  // Helper to get primary photo
  const getPrimaryPhoto = (photos?: any[]) => {
    if (!photos || photos.length === 0) return null;
    return [...photos].sort((a, b) => a.display_order - b.display_order)[0];
  };

  // Show loading state - only during initial load
  if (!isInitialized || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Show loading for data
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Renter Dashboard</h1>
        <p className="text-gray-600">
          Manage your saved properties and search alerts
        </p>
      </div>

      <Tabs defaultValue="saved" className="space-y-6">
        <TabsList>
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Saved Properties
            {savedProperties.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {savedProperties.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Search Alerts
            {searchAlerts.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {searchAlerts.filter(a => a.is_active).length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Profile Settings
          </TabsTrigger>
        </TabsList>

        {/* Saved Properties Tab */}
        <TabsContent value="saved">
          {savedProperties.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Heart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No saved properties yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Start saving properties you&apos;re interested in to compare
                  them later.
                </p>
                <Button asChild>
                  <Link href="/search">Browse Properties</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {savedProperties.map((item) => {
                const primaryPhoto = getPrimaryPhoto(item.properties.photos);
                return (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">
                            <Link
                              href={`/properties/${item.properties.id}`}
                              className="hover:text-primary"
                            >
                              {item.properties.title}
                            </Link>
                          </h3>
                          <div className="flex items-center text-gray-500 text-sm">
                            <MapPin className="h-3 w-3 mr-1 shrink-0" />
                            <span className="truncate">
                              {item.properties.location_suburb},{' '}
                              {item.properties.location_city}
                            </span>
                          </div>
                        </div>
                        <Badge
                          variant={
                            item.properties.status === 'active'
                              ? 'default'
                              : 'secondary'
                          }
                          className="shrink-0 ml-2"
                        >
                          {item.properties.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center mt-4">
                        <div>
                          <span className="text-xl font-bold text-primary">
                            E{item.properties.price.toLocaleString()}/month
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            {item.properties.bedrooms || 0} bed •{' '}
                            {item.properties.bathrooms || 0} bath
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/properties/${item.properties.id}`}>
                              View
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeSavedProperty(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Search Alerts Tab */}
        <TabsContent value="alerts">
          {searchAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No search alerts</h3>
                <p className="text-gray-500 mb-4">
                  Create alerts to get notified when new properties match your
                  criteria.
                </p>
                <Button asChild>
                  <Link href="/search">Create Alert</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {searchAlerts.map((alert) => (
                <Card key={alert.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">
                            {alert.name || 'Untitled Alert'}
                          </h3>
                          <Badge
                            variant={alert.is_active ? 'default' : 'secondary'}
                            className="shrink-0"
                          >
                            {alert.is_active ? 'Active' : 'Paused'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                          <Search className="h-3 w-3" />
                          {formatAlertCriteria(alert.criteria)}
                        </p>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Created: {new Date(alert.created_at).toLocaleDateString()}
                          </span>
                          {alert.last_notified_at && (
                            <span>
                              Last notified: {new Date(alert.last_notified_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(alert)}
                        >
                          Rename
                        </Button>
                        <Button
                          variant={alert.is_active ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleAlert(alert.id, alert.is_active)}
                        >
                          {alert.is_active ? 'Active' : 'Paused'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAlert(alert.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Profile Settings Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Manage your account information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <p className="text-gray-600">{user?.email}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Account Type</label>
                <p className="text-gray-600 capitalize">Renter</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" asChild>
                  <Link href="/profile">Edit Profile</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/auth/upgrade">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Become a Landlord
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rename Alert Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Alert</DialogTitle>
            <DialogDescription>
              Give your search alert a descriptive name to easily identify it.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="alert-name">Alert Name</Label>
            <Input
              id="alert-name"
              placeholder="e.g., Mbabane Apartments Under E2000"
              value={alertName}
              onChange={(e) => setAlertName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameAlert} disabled={!alertName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
