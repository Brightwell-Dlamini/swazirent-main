// src/app/dashboard/admin/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Loader2,
  Users,
  Home,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  MoreVertical,
  Trash2,
  Edit,
  Plus,
  Search,
  Filter,
  RefreshCw,
  UserCheck,
  UserX,
  Shield,
  Flag,
} from 'lucide-react';

// Types
interface AdminStats {
  totalUsers: number;
  totalLandlords: number;
  totalRenters: number;
  totalProperties: number;
  activeProperties: number;
  pendingProperties: number;
  reportedProperties: number;
  pendingReports: number;
  totalViews: number;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  user_type: 'renter' | 'landlord' | 'admin';
  is_verified: boolean;
  phone: string;
  created_at: string;
}

interface PropertyReport {
  id: string;
  property_id: string;
  reporter_id: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  resolved_at?: string;
  resolved_by?: string;
  property: {
    id: string;
    title: string;
    price: number;
    location_city: string;
    location_suburb: string;
    landlord_id: string;
    landlord?: {
      full_name: string;
      email: string;
    };
    status: string;
  };
  reporter?: {
    full_name: string;
    email: string;
  };
}

interface PropertyListing {
  id: string;
  title: string;
  price: number;
  location_city: string;
  location_suburb: string;
  property_type: string;
  status: string;
  created_at: string;
  landlord: {
    full_name: string;
    email: string;
  };
  photos: {
    id: string;
    photo_url: string;
  }[];
  views: number;
}

// Admin only page
export default function AdminDashboard() {
  const { user, userType, isLoading: authLoading, isInitialized } = useAuth();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [reports, setReports] = useState<PropertyReport[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [amenities, setAmenities] = useState<string[]>([]);

  // UI State
  const [selectedReport, setSelectedReport] = useState<PropertyReport | null>(null);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isEditCityDialogOpen, setIsEditCityDialogOpen] = useState(false);
  const [isEditAmenityDialogOpen, setIsEditAmenityDialogOpen] = useState(false);
  const [newCity, setNewCity] = useState('');
  const [newAmenity, setNewAmenity] = useState('');
  const [editingCity, setEditingCity] = useState<string | null>(null);
  const [editingAmenity, setEditingAmenity] = useState<string | null>(null);
  const [reportActionLoading, setReportActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Refs
  const isMounted = useRef(true);
  const hasFetchedData = useRef(false);

  // Auth check
  useEffect(() => {
    if (!isInitialized || authLoading) return;
    
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (userType !== 'admin') {
      router.push('/dashboard');
      toast.error('Access denied. Admin only.');
      return;
    }
  }, [user, userType, authLoading, isInitialized, router]);

  // Fetch dashboard data - ONLY ONCE
  const fetchDashboardData = useCallback(async () => {
    if (!user || userType !== 'admin') return;
    if (hasFetchedData.current) return;

    setLoading(true);
    try {
      // Fetch cities from properties
      const { data: cityData } = await supabase
        .from('properties')
        .select('location_city')
        .not('location_city', 'is', null);

      const uniqueCities = [...new Set(cityData?.map(p => p.location_city).filter(Boolean))];
      setCities(uniqueCities);

      // Fetch amenities from properties
      const { data: amenityData } = await supabase
        .from('properties')
        .select('amenities')
        .not('amenities', 'is', null);

      const allAmenities = amenityData?.flatMap(p => p.amenities || []) || [];
      const uniqueAmenities = [...new Set(allAmenities)].filter(Boolean);
      setAmenities(uniqueAmenities);

      // Fetch stats
      const [
        { count: totalUsers },
        { count: totalLandlords },
        { count: totalRenters },
        { count: totalProperties },
        { count: activeProperties },
        { count: pendingProperties },
        { count: reportedProperties },
        { count: pendingReports },
        { data: viewData },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'landlord'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'renter'),
        supabase.from('properties').select('*', { count: 'exact', head: true }),
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'reported'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('properties').select('views'),
      ]);

      const totalViews = viewData?.reduce((sum, p) => sum + (p.views || 0), 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        totalLandlords: totalLandlords || 0,
        totalRenters: totalRenters || 0,
        totalProperties: totalProperties || 0,
        activeProperties: activeProperties || 0,
        pendingProperties: pendingProperties || 0,
        reportedProperties: reportedProperties || 0,
        pendingReports: pendingReports || 0,
        totalViews,
      });

      // Fetch recent properties
      const { data: propertiesData } = await supabase
        .from('properties')
        .select(`
          *,
          landlord:profiles!properties_landlord_id_fkey (
            full_name,
            email
          ),
          photos:property_photos (
            id,
            photo_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      setProperties(propertiesData || []);

      // Fetch pending reports
      const { data: reportsData } = await supabase
        .from('reports')
        .select(`
          *,
          property:properties!property_id (
            id,
            title,
            price,
            location_city,
            location_suburb,
            landlord_id,
            status,
            landlord:profiles!properties_landlord_id_fkey (
              full_name,
              email
            )
          ),
          reporter:profiles!reporter_id (
            full_name,
            email
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      setReports(reportsData || []);
      hasFetchedData.current = true;

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user, userType]);

  useEffect(() => {
    if (user && userType === 'admin' && isInitialized && !hasFetchedData.current) {
      fetchDashboardData();
    }
  }, [user, userType, isInitialized, fetchDashboardData]);

  // Cleanup
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Report actions
  const handleResolveReport = async (reportId: string) => {
    setReportActionLoading(true);
    try {
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .select('property_id, status')
        .eq('id', reportId)
        .single();

      if (reportError) throw reportError;

      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      setReports(reports.filter(r => r.id !== reportId));
      toast.success('Report resolved successfully');

      await fetchDashboardData();
    } catch (error) {
      console.error('Error resolving report:', error);
      toast.error('Failed to resolve report');
    } finally {
      setReportActionLoading(false);
      setIsReportDialogOpen(false);
    }
  };

  const handleDismissReport = async (reportId: string) => {
    setReportActionLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          status: 'dismissed',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
        })
        .eq('id', reportId);

      if (updateError) throw updateError;

      setReports(reports.filter(r => r.id !== reportId));
      toast.success('Report dismissed');

      await fetchDashboardData();
    } catch (error) {
      console.error('Error dismissing report:', error);
      toast.error('Failed to dismiss report');
    } finally {
      setReportActionLoading(false);
      setIsReportDialogOpen(false);
    }
  };

  const handleRejectListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'rejected' })
        .eq('id', listingId);

      if (error) throw error;

      setProperties(properties.filter(p => p.id !== listingId));
      toast.success('Listing rejected');
      await fetchDashboardData();
    } catch (error) {
      console.error('Error rejecting listing:', error);
      toast.error('Failed to reject listing');
    }
  };

  const handleApproveListing = async (listingId: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'active' })
        .eq('id', listingId);

      if (error) throw error;

      setProperties(properties.map(p =>
        p.id === listingId ? { ...p, status: 'active' } : p
      ));
      toast.success('Listing approved');
      await fetchDashboardData();
    } catch (error) {
      console.error('Error approving listing:', error);
      toast.error('Failed to approve listing');
    }
  };

  // City management
  const handleAddCity = async () => {
    if (!newCity.trim()) return;

    try {
      setCities([...cities, newCity.trim()]);
      toast.success('City added (UI only - will appear when properties are listed)');
      setNewCity('');
      setIsEditCityDialogOpen(false);
    } catch (error) {
      console.error('Error adding city:', error);
      toast.error('Failed to add city');
    }
  };

  const handleDeleteCity = async (city: string) => {
    try {
      const { count } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true })
        .eq('location_city', city);

      if (count && count > 0) {
        toast.error(`Cannot delete city "${city}" - ${count} properties use it`);
        return;
      }

      setCities(cities.filter(c => c !== city));
      toast.success('City removed');
    } catch (error) {
      console.error('Error deleting city:', error);
      toast.error('Failed to delete city');
    }
  };

  // Amenity management
  const handleAddAmenity = async () => {
    if (!newAmenity.trim()) return;

    try {
      setAmenities([...amenities, newAmenity.trim()]);
      toast.success('Amenity added (UI only - will appear when properties use it)');
      setNewAmenity('');
      setIsEditAmenityDialogOpen(false);
    } catch (error) {
      console.error('Error adding amenity:', error);
      toast.error('Failed to add amenity');
    }
  };

  const handleDeleteAmenity = async (amenity: string) => {
    try {
      const { data } = await supabase
        .from('properties')
        .select('id')
        .contains('amenities', [amenity])
        .limit(1);

      if (data && data.length > 0) {
        toast.error(`Cannot delete amenity "${amenity}" - properties use it`);
        return;
      }

      setAmenities(amenities.filter(a => a !== amenity));
      toast.success('Amenity removed');
    } catch (error) {
      console.error('Error deleting amenity:', error);
      toast.error('Failed to delete amenity');
    }
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

  // Access denied
  if (userType !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-500">You do not have permission to view this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600">Manage users, properties, and platform settings</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Landlords</p>
                  <p className="text-2xl font-bold">{stats.totalLandlords}</p>
                </div>
                <Building className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Renters</p>
                  <p className="text-2xl font-bold">{stats.totalRenters}</p>
                </div>
                <Users className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Properties</p>
                  <p className="text-2xl font-bold">{stats.totalProperties}</p>
                </div>
                <Home className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Views</p>
                  <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                </div>
                <Eye className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="properties" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Properties
            {stats && stats.pendingProperties > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.pendingProperties}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Reports
            {stats && stats.pendingReports > 0 && (
              <Badge variant="destructive" className="ml-1">
                {stats.pendingReports}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Active Properties</span>
                  <span className="font-semibold text-green-600">{stats?.activeProperties}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pending Approval</span>
                  <span className="font-semibold text-yellow-600">{stats?.pendingProperties}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reported Listings</span>
                  <span className="font-semibold text-red-600">{stats?.reportedProperties}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pending Reports</span>
                  <span className="font-semibold text-orange-600">{stats?.pendingReports}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Views</span>
                  <span className="font-semibold">{stats?.totalViews.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {properties.slice(0, 5).map((property) => (
                    <div key={property.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{property.title}</p>
                        <p className="text-xs text-gray-500">
                          {property.location_city} • {new Date(property.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={
                          property.status === 'active' ? 'default' :
                          property.status === 'pending' ? 'secondary' :
                          property.status === 'reported' ? 'destructive' :
                          'outline'
                        }
                      >
                        {property.status}
                      </Badge>
                    </div>
                  ))}
                  {properties.length === 0 && (
                    <p className="text-gray-500 text-sm">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <CardTitle>Manage Properties</CardTitle>
              <CardDescription>
                Review and manage all property listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {properties.length === 0 ? (
                <div className="text-center py-8">
                  <Home className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No properties found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Landlord</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {properties.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{property.title}</p>
                            <p className="text-sm text-gray-500">
                              {property.location_suburb}, {property.location_city}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{property.landlord?.full_name || 'Unknown'}</TableCell>
                        <TableCell>E{property.price.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              property.status === 'active' ? 'default' :
                              property.status === 'pending' ? 'secondary' :
                              property.status === 'reported' ? 'destructive' :
                              'outline'
                            }
                          >
                            {property.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{property.views || 0}</TableCell>
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
                                <Link href={`/properties/${property.id}`} target="_blank">
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              {property.status === 'pending' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleApproveListing(property.id)}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRejectListing(property.id)}>
                                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              {property.status === 'reported' && (
                                <DropdownMenuItem asChild>
                                  <Link href="#reports">
                                    <Flag className="mr-2 h-4 w-4 text-red-600" />
                                    View Reports
                                  </Link>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Property Reports</CardTitle>
              <CardDescription>
                Review and resolve reported listings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reports.length === 0 ? (
                <div className="text-center py-8">
                  <Flag className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">No pending reports</p>
                  <p className="text-sm text-gray-400">All reports have been resolved</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Reported By</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div>
                            <Link
                              href={`/properties/${report.property_id}`}
                              target="_blank"
                              className="font-medium hover:text-primary hover:underline"
                            >
                              {report.property?.title || 'Unknown Property'}
                            </Link>
                            <p className="text-sm text-gray-500">
                              {report.property?.location_city}, {report.property?.location_suburb}
                            </p>
                            {report.property?.landlord && (
                              <p className="text-xs text-gray-400">
                                Landlord: {report.property.landlord.full_name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {report.reporter?.full_name || 'Unknown User'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="destructive" className="mb-1">
                              {report.reason}
                            </Badge>
                            {report.description && (
                              <p className="text-xs text-gray-500 line-clamp-2">
                                {report.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(report.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50"
                              onClick={() => {
                                setSelectedReport(report);
                                setIsReportDialogOpen(true);
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-600 border-orange-200 hover:bg-orange-50"
                              onClick={() => handleDismissReport(report.id)}
                              disabled={reportActionLoading}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="space-y-6">
            {/* Cities Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Manage Cities</span>
                  <Button size="sm" onClick={() => setIsEditCityDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add City
                  </Button>
                </CardTitle>
                <CardDescription>
                  Cities that appear in property listings (dynamically from properties)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {cities.map((city) => (
                    <Badge key={city} variant="secondary" className="px-3 py-1 text-sm">
                      {city}
                      <button
                        className="ml-2 text-gray-400 hover:text-red-500"
                        onClick={() => handleDeleteCity(city)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  {cities.length === 0 && (
                    <p className="text-gray-500">No cities found</p>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-4">
                  Note: Cities are automatically populated from property listings.
                  Deleting a city only removes it from this list if no properties use it.
                </p>
              </CardContent>
            </Card>

            {/* Amenities Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Manage Amenities</span>
                  <Button size="sm" onClick={() => setIsEditAmenityDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Amenity
                  </Button>
                </CardTitle>
                <CardDescription>
                  Amenities that appear in property listings (dynamically from properties)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {amenities.map((amenity) => (
                    <Badge key={amenity} variant="secondary" className="px-3 py-1 text-sm">
                      {amenity}
                      <button
                        className="ml-2 text-gray-400 hover:text-red-500"
                        onClick={() => handleDeleteAmenity(amenity)}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                  {amenities.length === 0 && (
                    <p className="text-gray-500">No amenities found</p>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-4">
                  Note: Amenities are automatically populated from property listings.
                  Deleting an amenity only removes it from this list if no properties use it.
                </p>
              </CardContent>
            </Card>

            {/* Admin Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Admin Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4 flex-wrap">
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Data
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/admin/users">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Users
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/dashboard/admin/analytics">
                      <Eye className="mr-2 h-4 w-4" />
                      View Analytics
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Resolve Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Report</DialogTitle>
            <DialogDescription>
              Review the report details before resolving.
            </DialogDescription>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div>
                <Label>Property</Label>
                <p className="font-medium">{selectedReport.property?.title}</p>
                <p className="text-sm text-gray-500">
                  {selectedReport.property?.location_city}, {selectedReport.property?.location_suburb}
                </p>
              </div>
              <div>
                <Label>Reported By</Label>
                <p>{selectedReport.reporter?.full_name || 'Unknown'}</p>
              </div>
              <div>
                <Label>Reason</Label>
                <Badge variant="destructive">{selectedReport.reason}</Badge>
              </div>
              {selectedReport.description && (
                <div>
                  <Label>Description</Label>
                  <p className="text-sm text-gray-600">{selectedReport.description}</p>
                </div>
              )}
              <div>
                <Label>Current Property Status</Label>
                <Badge variant="outline">{selectedReport.property?.status || 'Unknown'}</Badge>
              </div>
              <Alert>
                <AlertDescription>
                  Resolving this report will mark it as resolved. The property status will remain unchanged.
                  If the property needs to be removed, please reject it from the Properties tab.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedReport && handleDismissReport(selectedReport.id)}
              disabled={reportActionLoading}
            >
              {reportActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Dismiss
            </Button>
            <Button
              onClick={() => selectedReport && handleResolveReport(selectedReport.id)}
              disabled={reportActionLoading}
            >
              {reportActionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add City Dialog */}
      <Dialog open={isEditCityDialogOpen} onOpenChange={setIsEditCityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add City</DialogTitle>
            <DialogDescription>
              Add a new city to the platform. Cities are automatically populated from property listings.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="city-name">City Name</Label>
            <Input
              id="city-name"
              placeholder="e.g., Mbabane"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCity} disabled={!newCity.trim()}>
              Add City
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Amenity Dialog */}
      <Dialog open={isEditAmenityDialogOpen} onOpenChange={setIsEditAmenityDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Amenity</DialogTitle>
            <DialogDescription>
              Add a new amenity to the platform. Amenities are automatically populated from property listings.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="amenity-name">Amenity Name</Label>
            <Input
              id="amenity-name"
              placeholder="e.g., Solar Power"
              value={newAmenity}
              onChange={(e) => setNewAmenity(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditAmenityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAmenity} disabled={!newAmenity.trim()}>
              Add Amenity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
