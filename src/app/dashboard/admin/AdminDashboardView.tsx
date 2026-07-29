'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { hideUserListings } from '@/lib/adminModeration';
import {
  ASSIGNABLE_ROLES,
  ADMIN_USER_TYPE_FILTERS,
  getUserTypeLabel,
  isPosterRole,
  UserType,
} from '@/types/user';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Loader2, Users, Home, CheckCircle, XCircle, Clock, Eye, RefreshCw,
  UserCheck, Flag, Ban, Activity,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { UserActionsMenu, PropertyActionsMenu } from '@/components/admin/AdminActionMenus';
import {
  AdminUserMobileCard,
  AdminPropertyMobileCard,
} from '@/components/admin/AdminFullPowerCards';

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  user_type: string;
  is_verified: boolean;
  verification_level: string | null;
  created_at: string;
  is_banned: boolean;
  ban_reason: string | null;
  property_count?: number;
}

interface PropertyRow {
  id: string;
  title: string;
  price: number;
  location_city: string;
  location_suburb: string | null;
  status: string;
  is_featured: boolean;
  views: number;
  created_at: string;
  landlord_id: string;
  landlord?: { id: string; full_name: string | null; email: string; is_verified?: boolean } | null;
}

interface ReportRow {
  id: string;
  reason: string;
  details?: string | null;
  description?: string | null;
  status: string;
  created_at: string;
  property?: { id: string; title: string } | null;
  reporter?: { id: string; full_name: string | null; email: string } | null;
}

interface AdminStats {
  totalUsers: number;
  totalProperties: number;
  pendingProperties: number;
  activeProperties: number;
  pendingReports: number;
  pendingVerifications: number;
  totalViews: number;
  bannedUsers: number;
}

interface ActivityRow {
  id: string;
  action: string;
  target_type: string;
  created_at: string;
  admin?: { full_name: string | null } | null;
}

function formatDate(date: string | null) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function StatCard({
  label, value, icon: Icon, tone,
}: {
  label: string; value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'amber' | 'purple' | 'red' | 'green' | 'blue';
}) {
  const shell =
    tone === 'amber' ? 'border-amber-500/30 bg-amber-500/10'
    : tone === 'purple' ? 'border-purple-500/30 bg-purple-500/10'
    : tone === 'red' ? 'border-red-500/30 bg-red-500/10'
    : tone === 'green' ? 'border-green-500/30 bg-green-500/10'
    : tone === 'blue' ? 'border-blue-500/30 bg-blue-500/10'
    : 'bg-card border-border';
  const valueClass =
    tone === 'amber' ? 'text-amber-700 dark:text-amber-300'
    : tone === 'purple' ? 'text-purple-700 dark:text-purple-300'
    : tone === 'red' ? 'text-red-700 dark:text-red-300'
    : tone === 'green' ? 'text-green-700 dark:text-green-300'
    : tone === 'blue' ? 'text-blue-700 dark:text-blue-300'
    : '';
  return (
    <Card className={shell}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
            <p className={`text-xl sm:text-2xl font-bold ${valueClass}`}>{value.toLocaleString()}</p>
          </div>
          <Icon className="h-7 w-7 opacity-40 shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboardView() {
  const { user, userType, isLoading: authLoading, isInitialized } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityRow[]>([]);

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyRow | null>(null);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  const [isDeletePropertyDialogOpen, setIsDeletePropertyDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [verifyAction, setVerifyAction] = useState<'verify' | 'reject' | null>(null);
  const [banReason, setBanReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [newRole, setNewRole] = useState<UserType>('seeker');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (!isInitialized || authLoading) return;
    if (!user) { router.push('/auth/login'); return; }
    if (userType !== 'admin') { router.push('/dashboard'); return; }
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchData();
    }
  }, [user, userType, isInitialized, authLoading, router]);

  const logAdminAction = async (action: string, targetType: string, targetId: string | null, details?: Record<string, unknown>) => {
    try {
      await supabase.from('admin_activity_log').insert({
        admin_id: user?.id, action, target_type: targetType, target_id: targetId, details: details || null,
      });
    } catch (e) { console.warn('log failed', e); }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, propsRes, reportsRes, activityRes, counts] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('properties').select('*, landlord:profiles!properties_landlord_id_fkey(id, full_name, email, is_verified)').order('created_at', { ascending: false }).limit(200),
        supabase.from('reports').select('*, property:properties(id, title), reporter:profiles!reports_reporter_id_fkey(id, full_name, email)').order('created_at', { ascending: false }).limit(50),
        supabase.from('admin_activity_log').select('*, admin:profiles!admin_activity_log_admin_id_fkey(full_name)').order('created_at', { ascending: false }).limit(40),
        Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('properties').select('*', { count: 'exact', head: true }),
          supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_verified', false).in('user_type', ['landlord', 'broker', 'agent']),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
        ]),
      ]);

      const mappedUsers: UserProfile[] = (usersRes.data || []).map((p: any) => ({
        id: p.id, full_name: p.full_name, email: p.email, phone: p.phone,
        user_type: p.user_type, is_verified: !!p.is_verified, verification_level: p.verification_level,
        created_at: p.created_at, is_banned: !!p.is_banned, ban_reason: p.ban_reason, property_count: 0,
      }));
      const mappedProps: PropertyRow[] = (propsRes.data || []).map((p: any) => ({
        id: p.id, title: p.title, price: p.price, location_city: p.location_city,
        location_suburb: p.location_suburb, status: p.status, is_featured: !!p.is_featured,
        views: p.views || 0, created_at: p.created_at, landlord_id: p.landlord_id, landlord: p.landlord,
      }));

      const [totalUsers, totalProperties, pendingProperties, activeProperties, pendingReports, pendingVerifications, bannedUsers] =
        counts.map((r) => r.count || 0);
      const totalViews = mappedProps.reduce((s, p) => s + (p.views || 0), 0);

      setStats({ totalUsers, totalProperties, pendingProperties, activeProperties, pendingReports, pendingVerifications, totalViews, bannedUsers });
      setUsers(mappedUsers);
      setProperties(mappedProps);
      setReports((reportsRes.data || []) as ReportRow[]);
      setActivityLog((activityRes.data || []) as ActivityRow[]);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerifyUser = async (userId: string, action: 'verify' | 'reject') => {
    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      const updateData = action === 'verify'
        ? { is_verified: true, verification_level: 'verified', verified_by: user?.id, verified_at: now, updated_at: now }
        : { is_verified: false, verification_level: 'rejected', verified_by: user?.id, verified_at: now, updated_at: now };
      const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
      if (error) throw error;

      let hiddenCount = 0;
      if (action === 'reject') {
        const listingResult = await hideUserListings(userId);
        if (listingResult.error) console.warn('hide listings after revoke:', listingResult.error);
        hiddenCount = listingResult.hiddenCount;
      }

      await logAdminAction(action === 'verify' ? 'user_verified' : 'user_rejected', 'user', userId, {
        action,
        listings_hidden: hiddenCount,
      });
      toast.success(
        action === 'verify'
          ? 'Account verified'
          : hiddenCount > 0
            ? `Verification revoked · ${hiddenCount} listing(s) hidden`
            : 'Verification revoked'
      );
      setIsVerifyDialogOpen(false); setSelectedUser(null); setVerifyAction(null);
      await fetchData();
    } catch (e: any) { toast.error(e.message || 'Verification failed'); }
    finally { setIsProcessing(false); }
  };

  const handleBanUser = async (userId: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('profiles').update({
        is_banned: true, ban_reason: banReason || 'Banned by admin', updated_at: new Date().toISOString(),
      }).eq('id', userId);
      if (error) throw error;

      const listingResult = await hideUserListings(userId);
      if (listingResult.error) console.warn('hide listings after ban:', listingResult.error);

      await logAdminAction('user_banned', 'user', userId, {
        reason: banReason,
        listings_hidden: listingResult.hiddenCount,
      });
      toast.success(
        listingResult.hiddenCount > 0
          ? `User banned · ${listingResult.hiddenCount} listing(s) hidden`
          : 'User banned'
      );
      setIsBanDialogOpen(false); setBanReason(''); setSelectedUser(null);
      await fetchData();
    } catch (e: any) { toast.error(e.message || 'Ban failed'); }
    finally { setIsProcessing(false); }
  };

  const handleUnbanUser = async (userId: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('profiles').update({
        is_banned: false, ban_reason: null, updated_at: new Date().toISOString(),
      }).eq('id', userId);
      if (error) throw error;
      await logAdminAction('user_unbanned', 'user', userId);
      toast.success('User unbanned — listings stay hidden until you or the owner reactivate them');
      await fetchData();
    } catch (e: any) { toast.error(e.message || 'Unban failed'); }
    finally { setIsProcessing(false); }
  };

  const handleDeleteUser = async (userId: string) => {
    setIsProcessing(true);
    try {
      // Hide inventory first so nothing stays public if delete is partial
      await hideUserListings(userId);
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (error) throw error;
      await logAdminAction('user_deleted', 'user', userId);
      toast.success('User deleted');
      setIsDeleteUserDialogOpen(false); setSelectedUser(null);
      await fetchData();
    } catch (e: any) { toast.error(e.message || 'Delete failed — user may own listings'); }
    finally { setIsProcessing(false); }
  };

  const handleChangeRole = async (userId: string, role: UserType) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('profiles').update({
        user_type: role, updated_at: new Date().toISOString(),
      }).eq('id', userId);
      if (error) throw error;
      await logAdminAction('user_role_changed', 'user', userId, { role });
      toast.success(`Role set to ${getUserTypeLabel(role)}`);
      setIsRoleDialogOpen(false); setSelectedUser(null);
      await fetchData();
    } catch (e: any) { toast.error(e.message || 'Role change failed'); }
    finally { setIsProcessing(false); }
  };

  const handleSetPropertyStatus = async (propertyId: string, status: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('properties').update({
        status, updated_at: new Date().toISOString(),
      }).eq('id', propertyId);
      if (error) throw error;
      await logAdminAction('property_status_changed', 'property', propertyId, { status });
      toast.success(`Listing set to ${status}`);
      await fetchData();
    } catch (e: any) { toast.error(e.message || 'Status update failed'); }
    finally { setIsProcessing(false); }
  };

  const handleFeatureProperty = async (propertyId: string, currentlyFeatured: boolean) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('properties').update({
        is_featured: !currentlyFeatured, updated_at: new Date().toISOString(),
      }).eq('id', propertyId);
      if (error) throw error;
      await logAdminAction(currentlyFeatured ? 'property_unfeatured' : 'property_featured', 'property', propertyId);
      toast.success(currentlyFeatured ? 'Unfeatured' : 'Featured');
      await fetchData();
    } catch (e: any) { toast.error(e.message || 'Feature toggle failed'); }
    finally { setIsProcessing(false); }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('properties').delete().eq('id', propertyId);
      if (error) throw error;
      await logAdminAction('property_deleted', 'property', propertyId);
      toast.success('Listing deleted');
      setIsDeletePropertyDialogOpen(false); setSelectedProperty(null);
      await fetchData();
    } catch (e: any) { toast.error(e.message || 'Delete failed'); }
    finally { setIsProcessing(false); }
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.from('reports').update({ status }).eq('id', reportId);
      if (error) throw error;
      await logAdminAction('report_' + status, 'report', reportId);
      toast.success(`Report ${status}`);
      await fetchData();
    } catch (e: any) { toast.error(e.message || 'Report update failed'); }
    finally { setIsProcessing(false); }
  };

  const filteredUsers = users.filter((u) => {
    if (filterType !== 'all' && u.user_type !== filterType) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (u.full_name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q) || (u.phone || '').toLowerCase().includes(q);
  });

  const filteredProperties = properties.filter((p) => {
    if (propertyFilter === 'all') return true;
    if (propertyFilter === 'featured') return p.is_featured;
    return p.status === propertyFilter;
  });

  if (!isInitialized || authLoading || (loading && !stats)) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">Full control over users and listings</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Total Users" value={stats?.totalUsers || 0} icon={Users} tone="blue" />
        <StatCard label="Properties" value={stats?.totalProperties || 0} icon={Home} />
        <StatCard label="Pending Listings" value={stats?.pendingProperties || 0} icon={Clock} tone="amber" />
        <StatCard label="Pending Reports" value={stats?.pendingReports || 0} icon={Flag} tone="red" />
        <StatCard label="Unverified Posters" value={stats?.pendingVerifications || 0} icon={UserCheck} tone="purple" />
        <StatCard label="Banned" value={stats?.bannedUsers || 0} icon={Ban} tone="red" />
        <StatCard label="Active Listings" value={stats?.activeProperties || 0} icon={CheckCircle} tone="green" />
        <StatCard label="Total Views" value={stats?.totalViews || 0} icon={Eye} />
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="w-full h-auto flex flex-wrap gap-1 justify-start">
          <TabsTrigger value="users" className="text-xs sm:text-sm">
            Users
            {(stats?.pendingVerifications || 0) > 0 && (
              <Badge className="ml-1 bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px]">
                {stats?.pendingVerifications}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="properties" className="text-xs sm:text-sm">
            Properties
            {(stats?.pendingProperties || 0) > 0 && (
              <Badge className="ml-1 bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px]">
                {stats?.pendingProperties}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="verifications" className="text-xs sm:text-sm">Verifications</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm">
            Reports
            {(stats?.pendingReports || 0) > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px]">
                {stats?.pendingReports}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs sm:text-sm">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="Search name, email, phone…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="sm:max-w-xs" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="sm:w-44"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                {ADMIN_USER_TYPE_FILTERS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:hidden space-y-3">
            {filteredUsers.map((u) => (
              <AdminUserMobileCard
                key={u.id}
                user={u}
                selected={false}
                onToggleSelect={() => {}}
                onVerify={() => { setSelectedUser(u); setVerifyAction('verify'); setIsVerifyDialogOpen(true); }}
                onReject={() => { setSelectedUser(u); setVerifyAction('reject'); setIsVerifyDialogOpen(true); }}
                onRole={() => { setSelectedUser(u); setNewRole((u.user_type as UserType) || 'seeker'); setIsRoleDialogOpen(true); }}
                onBan={() => { setSelectedUser(u); setIsBanDialogOpen(true); }}
                onUnban={() => handleUnbanUser(u.id)}
                onDelete={() => { setSelectedUser(u); setIsDeleteUserDialogOpen(true); }}
              />
            ))}
            {filteredUsers.length === 0 && <p className="text-center text-muted-foreground py-8">No users match</p>}
          </div>

          <div className="hidden md:block rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id} className={u.is_banned ? 'bg-red-500/5' : undefined}>
                    <TableCell>
                      <div className="font-medium">{u.full_name || '—'}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{getUserTypeLabel(u.user_type as UserType)}</Badge></TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.is_banned && <Badge variant="destructive">Banned</Badge>}
                        {u.is_verified
                          ? <Badge className="bg-green-500/15 text-green-700 dark:text-green-300">Verified</Badge>
                          : <Badge variant="outline">Unverified</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <UserActionsMenu
                        user={u}
                        onVerify={() => { setSelectedUser(u); setVerifyAction('verify'); setIsVerifyDialogOpen(true); }}
                        onReject={() => { setSelectedUser(u); setVerifyAction('reject'); setIsVerifyDialogOpen(true); }}
                        onRole={() => { setSelectedUser(u); setNewRole((u.user_type as UserType) || 'seeker'); setIsRoleDialogOpen(true); }}
                        onBan={() => { setSelectedUser(u); setIsBanDialogOpen(true); }}
                        onUnban={() => handleUnbanUser(u.id)}
                        onDelete={() => { setSelectedUser(u); setIsDeleteUserDialogOpen(true); }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="properties" className="space-y-3">
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="hidden">Hidden</SelectItem>
              <SelectItem value="taken">Taken</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
            </SelectContent>
          </Select>

          <div className="md:hidden space-y-3">
            {filteredProperties.map((p) => (
              <AdminPropertyMobileCard
                key={p.id}
                property={p}
                onApprove={() => handleSetPropertyStatus(p.id, 'active')}
                onReject={() => handleSetPropertyStatus(p.id, 'rejected')}
                onFeature={() => handleFeatureProperty(p.id, p.is_featured)}
                onDelete={() => { setSelectedProperty(p); setIsDeletePropertyDialogOpen(true); }}
                onSetStatus={(s) => handleSetPropertyStatus(p.id, s)}
              />
            ))}
            {filteredProperties.length === 0 && <p className="text-center text-muted-foreground py-8">No listings match</p>}
          </div>

          <div className="hidden md:block rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProperties.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium max-w-[200px] truncate">{p.title}</div>
                      <div className="text-xs text-muted-foreground">{p.location_suburb}, {p.location_city}</div>
                    </TableCell>
                    <TableCell className="text-sm">{p.landlord?.full_name || '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Badge variant="outline">{p.status}</Badge>
                        {p.is_featured && <Badge className="bg-purple-500/15 text-purple-700">Featured</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>E{(p.price || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <PropertyActionsMenu
                        property={p}
                        onApprove={() => handleSetPropertyStatus(p.id, 'active')}
                        onReject={() => handleSetPropertyStatus(p.id, 'rejected')}
                        onFeature={() => handleFeatureProperty(p.id, p.is_featured)}
                        onDelete={() => { setSelectedProperty(p); setIsDeletePropertyDialogOpen(true); }}
                        onSetStatus={(s) => handleSetPropertyStatus(p.id, s)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="verifications" className="space-y-3">
          <p className="text-sm text-muted-foreground">Posters awaiting verification (landlord / broker / agent)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {users.filter((u) => isPosterRole(u.user_type) && !u.is_verified && u.verification_level !== 'rejected').map((u) => (
              <Card key={u.id} className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4 flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{u.full_name || u.email}</p>
                    <p className="text-sm text-muted-foreground">{getUserTypeLabel(u.user_type as UserType)}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(u.created_at)}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 items-end">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => { setSelectedUser(u); setVerifyAction('verify'); setIsVerifyDialogOpen(true); }}>
                      <CheckCircle className="h-3 w-3 mr-1" /> Verify
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => { setSelectedUser(u); setVerifyAction('reject'); setIsVerifyDialogOpen(true); }}>
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                    <UserActionsMenu
                      user={u}
                      onVerify={() => { setSelectedUser(u); setVerifyAction('verify'); setIsVerifyDialogOpen(true); }}
                      onReject={() => { setSelectedUser(u); setVerifyAction('reject'); setIsVerifyDialogOpen(true); }}
                      onRole={() => { setSelectedUser(u); setNewRole((u.user_type as UserType) || 'seeker'); setIsRoleDialogOpen(true); }}
                      onBan={() => { setSelectedUser(u); setIsBanDialogOpen(true); }}
                      onUnban={() => handleUnbanUser(u.id)}
                      onDelete={() => { setSelectedUser(u); setIsDeleteUserDialogOpen(true); }}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-3">
          {reports.length === 0 && <p className="text-center text-muted-foreground py-8">No reports</p>}
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.reason}</p>
                    <p className="text-sm text-muted-foreground">{r.property?.title || 'Unknown'} · by {r.reporter?.full_name || 'anon'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                  </div>
                  <Badge variant={r.status === 'pending' ? 'default' : 'outline'}>{r.status}</Badge>
                </div>
                {(r.details || r.description) && <p className="text-sm bg-muted/50 rounded p-2">{r.details || r.description}</p>}
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleResolveReport(r.id, 'resolved')}>Resolve</Button>
                    <Button size="sm" variant="outline" onClick={() => handleResolveReport(r.id, 'dismissed')}>Dismiss</Button>
                    {r.property?.id && (
                      <Button size="sm" variant="ghost" asChild>
                        <Link href={`/properties/${r.property.id}`} target="_blank">View listing</Link>
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="activity" className="space-y-2">
          {activityLog.length === 0 && <p className="text-center text-muted-foreground py-8">No activity yet</p>}
          {activityLog.map((a) => (
            <div key={a.id} className="flex gap-3 text-sm border-b border-border/50 py-2">
              <Activity className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p>
                  <span className="font-medium">{a.admin?.full_name || 'Admin'}</span>
                  {' · '}<span className="text-muted-foreground">{a.action}</span>
                  {a.target_type && <span className="text-muted-foreground"> · {a.target_type}</span>}
                </p>
                <p className="text-xs text-muted-foreground">{formatDate(a.created_at)}</p>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{verifyAction === 'verify' ? 'Verify poster' : 'Reject / revoke verification'}</DialogTitle>
            <DialogDescription>
              {selectedUser?.full_name || selectedUser?.email} · {selectedUser && getUserTypeLabel(selectedUser.user_type as UserType)}
              {verifyAction === 'reject' && (
                <span className="block mt-2 text-amber-700 dark:text-amber-400">
                  Their active/pending listings will be hidden from the public site.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVerifyDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={isProcessing}
              className={verifyAction === 'verify' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={verifyAction === 'reject' ? 'destructive' : 'default'}
              onClick={() => selectedUser && verifyAction && handleVerifyUser(selectedUser.id, verifyAction)}
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {verifyAction === 'verify' ? 'Verify' : 'Revoke & hide listings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban user</DialogTitle>
            <DialogDescription>
              {selectedUser?.full_name || selectedUser?.email} will lose access.
              <span className="block mt-2 text-amber-700 dark:text-amber-400">
                All their active/pending listings will be hidden automatically.
              </span>
            </DialogDescription>
          </DialogHeader>
          <Textarea placeholder="Reason (optional)" value={banReason} onChange={(e) => setBanReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBanDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={isProcessing} onClick={() => selectedUser && handleBanUser(selectedUser.id)}>
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Ban & hide listings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>Permanently delete {selectedUser?.full_name || selectedUser?.email}? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteUserDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={isProcessing} onClick={() => selectedUser && handleDeleteUser(selectedUser.id)}>
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeletePropertyDialogOpen} onOpenChange={setIsDeletePropertyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete listing</DialogTitle>
            <DialogDescription>Permanently delete “{selectedProperty?.title}”? This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeletePropertyDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={isProcessing} onClick={() => selectedProperty && handleDeleteProperty(selectedProperty.id)}>
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>{selectedUser?.full_name || selectedUser?.email}</DialogDescription>
          </DialogHeader>
          <Select value={newRole} onValueChange={(v) => setNewRole(v as UserType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
            <Button disabled={isProcessing} onClick={() => selectedUser && handleChangeRole(selectedUser.id, newRole)}>
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
