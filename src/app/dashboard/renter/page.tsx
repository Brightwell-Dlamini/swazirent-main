// src/app/dashboard/renter/page.tsx — Seeker dashboard (route path kept for compatibility)
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { canPostListings, getUserTypeLabel, isSeekerRole } from '@/types/user';
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

export default function SeekerDashboard() {
  const { user, userType, isLoading: authLoading, isInitialized } = useAuth();
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
      return;
    }
    // Posters belong on the listings dashboard
    if (!authLoading && user && canPostListings(userType) && userType !== 'admin') {
      router.replace('/dashboard/landlord');
    }
  }, [user, userType, authLoading, router]);

  const fetchSavedProperties = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('saved_properties')
        .select(
          `
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
        `
        )
        .eq('renter_id', user.id);

      if (error) throw error;

      setSavedProperties(
        (data || []).map((item: any) => ({
          id: item.id,
          property_id: item.property_id,
          properties: item.properties,
        }))
      );
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

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  async function removeSavedProperty(id: string) {
    try {
      const { error } = await supabase.from('saved_properties').delete().eq('id', id);
      if (error) throw error;
      setSavedProperties((prev) => prev.filter((p) => p.id !== id));
      toast.success('Property removed from saved');
    } catch {
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
      setSearchAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_active: !currentStatus } : a))
      );
      toast.success(`Alert ${!currentStatus ? 'activated' : 'paused'}`);
    } catch {
      toast.error('Failed to update alert');
    }
  }

  async function deleteAlert(alertId: string) {
    try {
      const { error } = await supabase.from('search_alerts').delete().eq('id', alertId);
      if (error) throw error;
      setSearchAlerts((prev) => prev.filter((a) => a.id !== alertId));
      toast.success('Alert deleted');
    } catch {
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
      setSearchAlerts((prev) =>
        prev.map((a) => (a.id === editingAlert.id ? { ...a, name: alertName.trim() } : a))
      );
      toast.success('Alert renamed');
      setIsEditDialogOpen(false);
    } catch {
      toast.error('Failed to rename alert');
    }
  };

  const formatAlertCriteria = (criteria: SearchAlert['criteria']) => {
    const parts: string[] = [];
    if (criteria.keyword) parts.push(`"${criteria.keyword}"`);
    if (criteria.city) parts.push(criteria.city);
    if (criteria.minPrice && criteria.maxPrice) parts.push(`E${criteria.minPrice}-E${criteria.maxPrice}`);
    else if (criteria.minPrice) parts.push(`E${criteria.minPrice}+`);
    else if (criteria.maxPrice) parts.push(`Under E${criteria.maxPrice}`);
    if (criteria.bedrooms) parts.push(`${criteria.bedrooms}+ beds`);
    if (criteria.propertyType?.length) parts.push(criteria.propertyType.join('/'));
    return parts.join(' • ') || 'All properties';
  };

  const getPrimaryPhoto = (photos?: any[]) => {
    if (!photos?.length) return null;
    return [...photos].sort((a, b) => a.display_order - b.display_order)[0];
  };

  if (!isInitialized || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center min-h-[400px] items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center min-h-[400px] items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Seeker dashboard</h1>
        <p className="text-gray-600">Saved properties and search alerts</p>
      </div>

      <Tabs defaultValue="saved" className="space-y-6">
        <TabsList>
          <TabsTrigger value="saved" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Saved
            {savedProperties.length > 0 && (
              <Badge variant="secondary">{savedProperties.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="saved">
          {savedProperties.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Heart className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No saved properties yet</h3>
                <p className="text-gray-500 mb-4">Save listings while you browse.</p>
                <Button asChild>
                  <Link href="/search">Browse properties</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {savedProperties.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/properties/${item.properties.id}`}
                          className="font-semibold hover:text-primary truncate block"
                        >
                          {item.properties.title}
                        </Link>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.properties.location_suburb}, {item.properties.location_city}
                        </p>
                      </div>
                      <Badge variant={item.properties.status === 'active' ? 'default' : 'secondary'}>
                        {item.properties.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="font-bold text-primary">
                        E{item.properties.price?.toLocaleString()}/mo
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/properties/${item.properties.id}`}>View</Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => removeSavedProperty(item.id)}
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

        <TabsContent value="alerts">
          {searchAlerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No search alerts</h3>
                <Button asChild>
                  <Link href="/search">Create from search</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {searchAlerts.map((alert) => (
                <Card key={alert.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{alert.name || 'Untitled alert'}</h3>
                        <Badge variant={alert.is_active ? 'default' : 'secondary'}>
                          {alert.is_active ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <Search className="h-3 w-3" />
                        {formatAlertCriteria(alert.criteria)}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(alert.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(alert)}>
                        Rename
                      </Button>
                      <Button
                        size="sm"
                        variant={alert.is_active ? 'default' : 'outline'}
                        onClick={() => toggleAlert(alert.id, alert.is_active)}
                      >
                        {alert.is_active ? 'Pause' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500"
                        onClick={() => deleteAlert(alert.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Email</label>
                <p className="text-gray-600">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Account type</label>
                <p className="text-gray-600">{getUserTypeLabel(userType)}</p>
              </div>
              <div className="flex gap-3 flex-wrap">
                <Button variant="outline" asChild>
                  <Link href="/profile">Edit profile</Link>
                </Button>
                {isSeekerRole(userType) && (
                  <Button variant="outline" asChild>
                    <Link href="/auth/upgrade">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      List properties (broker)
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename alert</DialogTitle>
            <DialogDescription>Give this alert a clear name.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="alert-name">Name</Label>
            <Input
              id="alert-name"
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
