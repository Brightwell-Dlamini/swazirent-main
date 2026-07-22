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
  RefreshCw,
  UserCheck,
  UserX,
  Shield,
  Flag,
  Ban,
  Crown,
  Mail,
  Send,
  Filter,
} from 'lucide-react';

// ===== TYPES =====

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  user_type: 'admin' | 'landlord' | 'renter';
  is_verified: boolean;
  created_at: string;
  phone?: string;
}

interface PropertyListing {
  id: string;
  title: string;
  price: number;
  status: string;
  views: number;
  location_city: string;
  location_suburb: string;
  landlord_id: string;
  created_at: string;
  landlord?: {
    full_name: string;
    email: string;
  };
  photos?: Array<{ id: string; photo_url: string }>;
}

interface PropertyReport {
  id: string;
  property_id: string;
  reporter_id: string;
  reason: string;
  status: string;
  created_at: string;
  property?: {
    title: string;
    landlord: { full_name: string; email: string };
  };
  reporter?: { full_name: string; email: string };
}

interface AdminStats {
  totalUsers: number;
  totalLandlords: number;
  totalRenters: number;
  totalProperties: number;
  pendingProperties: number;
  reportedProperties: number;
  pendingReports: number;
}

// ===== MAIN COMPONENT =====
export default function AdminDashboard() {
  const { user, userType, isLoading: authLoading, isInitialized } = useAuth();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [reports, setReports] = useState<PropertyReport[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  // Dialogs
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState('');
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

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

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!user || userType !== 'admin') return;

    setLoading(true);
    try {
      // Get user stats
      const [
        { count: totalUsers },
        { count: totalLandlords },
        { count: totalRenters },
        { count: totalProperties },
        { count: pendingProperties },
        { count: reportedProperties },
        { count: pendingReports },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'landlord'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'renter'),
        supabase.from('properties').select('*', { count: 'exact', head: true }),
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'reported'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      setStats({
        totalUsers: totalUsers || 0,
        totalLandlords: totalLandlords || 0,
        totalRenters: totalRenters || 0,
        totalProperties: totalProperties || 0,
        pendingProperties: pendingProperties || 0,
        reportedProperties: reportedProperties || 0,
        pendingReports: pendingReports || 0,
      });

      // Get users list
      const { data: usersData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      setUsers(usersData || []);

      // Get properties list
      const { data: propertiesData } = await supabase
        .from('properties')
        .select(`
          *,
          landlord:profiles!properties_landlord_id_fkey (full_name, email),
          photos:property_photos (id, photo_url)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      setProperties(propertiesData || []);

      // Get reports
      const { data: reportsData } = await supabase
        .from('reports')
        .select(`
          *,
          property:properties!property_id (title, landlord:profiles!properties_landlord_id_fkey (full_name, email)),
          reporter:profiles!reporter_id (full_name, email)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(50);

      setReports(reportsData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user, userType]);

  useEffect(() => {
    if (user && userType === 'admin') {
      fetchData();
    }
  }, [user, userType, fetchData]);

  // ===== ACTIONS =====

  const handleApproveProperty = async (propertyId: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'active' })
        .eq('id', propertyId);
      
      if (error) throw error;
      toast.success('Property approved successfully');
      await fetchData();
    } catch (error) {
      console.error('Error approving property:', error);
      toast.error('Failed to approve property');
    }
  };

  const handleRejectProperty = async (propertyId: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'rejected' })
        .eq('id', propertyId);
      
      if (error) throw error;
      toast.success('Property rejected successfully');
      await fetchData();
    } catch (error) {
      console.error('Error rejecting property:', error);
      toast.error('Failed to reject property');
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);
      
      if (error) throw error;
      toast.success('Property deleted successfully');
      await fetchData();
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!banReason.trim()) {
      toast.error('Please provide a reason for banning');
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_banned: true, 
          ban_reason: banReason,
          banned_at: new Date().toISOString() 
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User banned successfully');
      setIsBanDialogOpen(false);
      setBanReason('');
      await fetchData();
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_banned: false, 
          ban_reason: null,
          banned_at: null 
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User unbanned successfully');
      await fetchData();
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'resolved' })
        .eq('id', reportId);
      
      if (error) throw error;
      toast.success('Report resolved successfully');
      await fetchData();
    } catch (error) {
      console.error('Error resolving report:', error);
      toast.error('Failed to resolve report');
    }
  };

  const handleRejectReport = async (reportId: string) => {
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status: 'rejected' })
        .eq('id', reportId);
      
      if (error) throw error;
      toast.success('Report rejected');
      await fetchData();
    } catch (error) {
      console.error('Error rejecting report:', error);
      toast.error('Failed to reject report');
    }
  };

  // ===== HELPERS =====

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      reported: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      rented: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  // ===== RENDER =====

  if (!isInitialized || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-gray-600">Manage users, properties, and reports</p>
          </div>
          <Button variant="outline" onClick={() => fetchData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
                  <p className="text-sm text-gray-500">Properties</p>
                  <p className="text-2xl font-bold">{stats.totalProperties}</p>
                </div>
                <Home className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Approval</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingProperties}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Reports</p>
                  <p className="text-2xl font-bold text-red-600">{stats.pendingReports}</p>
                </div>
                <Flag className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="properties" className="space-y-6">
        <TabsList>
          <TabsTrigger value="properties" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Properties
            {stats && stats.pendingProperties > 0 && (
              <Badge variant="secondary" className="ml-1">
                {stats.pendingProperties}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
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
        </TabsList>

        {/* Properties Tab */}
        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Property Management</CardTitle>
                  <CardDescription>
                    Approve, reject, or delete property listings
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search properties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48"
                  />
                  <Button variant="outline" size="icon">
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Landlord</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {properties.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No properties found
                      </TableCell>
                    </TableRow>
                  ) : (
                    properties.map((property) => (
                      <TableRow key={property.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{property.title}</p>
                            <p className="text-sm text-gray-500">
                              ID: {property.id.slice(0, 8)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{property.landlord?.full_name || 'Unknown'}</TableCell>
                        <TableCell>E{property.price.toLocaleString()}</TableCell>
                        <TableCell>
                          {property.location_suburb}, {property.location_city}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(property.status)}>
                            {property.status}
                          </Badge>
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
                              {property.status === 'pending' && (
                                <>
                                  <DropdownMenuItem onClick={() => handleApproveProperty(property.id)}>
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleRejectProperty(property.id)}>
                                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeleteProperty(property.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    View and manage platform users
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="border rounded-md px-3 py-2"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All Users</option>
                    <option value="landlord">Landlords</option>
                    <option value="renter">Renters</option>
                    <option value="admin">Admins</option>
                  </select>
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-48"
                  />
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.full_name || 'Unnamed'}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            user.user_type === 'admin' ? 'default' :
                            user.user_type === 'landlord' ? 'secondary' :
                            'outline'
                          }>
                            {user.user_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.is_verified ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-gray-400" />
                          )}
                        </TableCell>
                        <TableCell>{formatDate(user.created_at)}</TableCell>
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
                              <DropdownMenuItem onClick={() => {
                                setSelectedUser(user);
                                setIsUserDialogOpen(true);
                              }}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              {user.user_type !== 'admin' && (
                                <DropdownMenuItem 
                                  className="text-red-600"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsBanDialogOpen(true);
                                  }}
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Ban User
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Reports & Moderation
              </CardTitle>
              <CardDescription>
                Review and resolve reported content
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reported Property</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No pending reports
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{report.property?.title || 'Unknown'}</p>
                            <p className="text-sm text-gray-500">
                              by {report.property?.landlord?.full_name || 'Unknown'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{report.reason}</TableCell>
                        <TableCell>{report.reporter?.full_name || 'Anonymous'}</TableCell>
                        <TableCell>{formatDate(report.created_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600"
                              onClick={() => handleResolveReport(report.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600"
                              onClick={() => handleRejectReport(report.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Details Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name</Label>
                  <p className="font-medium">{selectedUser.full_name || 'N/A'}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <Label>Type</Label>
                  <Badge>{selectedUser.user_type}</Badge>
                </div>
                <div>
                  <Label>Verified</Label>
                  {selectedUser.is_verified ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-1" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-400 mt-1" />
                  )}
                </div>
                <div>
                  <Label>Joined</Label>
                  <p>{formatDate(selectedUser.created_at)}</p>
                </div>
                {selectedUser.phone && (
                  <div>
                    <Label>Phone</Label>
                    <p>{selectedUser.phone}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                  Close
                </Button>
                {selectedUser.user_type !== 'admin' && (
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      setIsUserDialogOpen(false);
                      setIsBanDialogOpen(true);
                    }}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Ban User
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="h-5 w-5" />
              Ban User
            </DialogTitle>
            <DialogDescription>
              This action will permanently ban the user from the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <p className="font-medium">{selectedUser?.full_name} ({selectedUser?.email})</p>
            </div>
            <div>
              <Label htmlFor="ban-reason">Reason for banning *</Label>
              <Textarea
                id="ban-reason"
                placeholder="Please provide a reason for this ban..."
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="mt-1"
              />
            </div>
            <Alert variant="destructive">
              <AlertDescription>
                This action cannot be undone. The user will lose access to all features.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsBanDialogOpen(false);
              setBanReason('');
            }}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedUser && handleBanUser(selectedUser.id)}
              disabled={!banReason.trim()}
            >
              Confirm Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
