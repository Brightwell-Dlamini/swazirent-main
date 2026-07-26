// src/app/dashboard/admin/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  ASSIGNABLE_ROLES,
  ADMIN_USER_TYPE_FILTERS,
  getUserTypeLabel,
  isPosterRole,
  UserType,
} from '@/types/user';
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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Loader2,
  Users,
  Home,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MoreVertical,
  Trash2,
  RefreshCw,
  UserCheck,
  UserX,
  Shield,
  Flag,
  Ban,
  UserCog,
  Crown,
  UserMinus,
  Activity,
  Zap,
  Globe,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';

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
  saved_count?: number;
}

interface PropertyWithDetails {
  id: string;
  title: string;
  price: number;
  location_city: string;
  location_suburb: string | null;
  status: string;
  is_featured: boolean;
  views: number;
  created_at: string;
  reported_count?: number | null;
  report_count?: number | null;
  landlord_id: string;
  landlord?: {
    id: string;
    full_name: string | null;
    email: string;
    is_verified: boolean;
  } | null;
}

interface ReportWithDetails {
  id: string;
  reason: string;
  details?: string | null;
  description?: string | null;
  status: string;
  created_at: string;
  property?: {
    id: string;
    title: string;
    landlord?: { id: string; full_name: string | null; email: string } | null;
  } | null;
  reporter?: { id: string; full_name: string | null; email: string } | null;
}

interface AdminStats {
  totalUsers: number;
  totalSeekers: number;
  totalLandlords: number;
  totalBrokers: number;
  totalAgents: number;
  totalAdmins: number;
  totalProperties: number;
  pendingProperties: number;
  activeProperties: number;
  pendingReports: number;
  pendingVerifications: number;
  totalViews: number;
  totalSaves: number;
  bannedUsers: number;
}

interface ActivityLogEntry {
  id: string;
  action: string;
  target_type: string;
  created_at: string;
  admin?: { full_name: string | null; email: string } | null;
}

const CACHE_DURATION = 30_000;
let cache: {
  stats: AdminStats | null;
  users: UserProfile[];
  properties: PropertyWithDetails[];
  reports: ReportWithDetails[];
  activityLog: ActivityLogEntry[];
  timestamp: number;
} | null = null;
let isFetching = false;

function isCacheValid() {
  return !!cache && Date.now() - cache.timestamp < CACHE_DURATION;
}
function clearCache() {
  cache = null;
}

const POSTER_TYPES = ['landlord', 'broker', 'agent'] as const;

export default function AdminDashboard() {
  const { user, userType, isLoading: authLoading, isInitialized } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(!isCacheValid());
  const [stats, setStats] = useState<AdminStats | null>(cache?.stats || null);
  const [properties, setProperties] = useState<PropertyWithDetails[]>(cache?.properties || []);
  const [reports, setReports] = useState<ReportWithDetails[]>(cache?.reports || []);
  const [users, setUsers] = useState<UserProfile[]>(cache?.users || []);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(cache?.activityLog || []);

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithDetails | null>(null);

  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  const [isDeletePropertyDialogOpen, setIsDeletePropertyDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);

  const [verifyAction, setVerifyAction] = useState<'verify' | 'reject' | null>(null);
  const [banReason, setBanReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [newRole, setNewRole] = useState<UserType>('seeker');
  const [bulkAction, setBulkAction] = useState<
    'delete' | 'ban' | 'verify' | 'approve' | 'reject' | null
  >(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [userPage, setUserPage] = useState(0);
  const USERS_PER_PAGE = 20;

  const abortControllerRef = useRef<AbortController | null>(null);
  const initialFetchDone = useRef(false);

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const togglePropertySelection = (propertyId: string) => {
    setSelectedProperties((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  useEffect(() => {
    if (!isInitialized || authLoading) return;
    if (!user) {
      router.push('/auth/login');
      return;
    }
    if (userType !== 'admin') {
      router.push('/dashboard');
      toast.error('Access denied. Admin only.');
    }
  }, [user, userType, authLoading, isInitialized, router]);

  const fetchData = useCallback(
    async (force = false) => {
      if (!force && isCacheValid()) return;
      if (isFetching) return;
      if (!user || userType !== 'admin') return;

      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      isFetching = true;
      setLoading(true);

      try {
        const [
          usersRes,
          landlordsRes,
          brokersRes,
          agentsRes,
          seekersRes,
          adminsRes,
          propsRes,
          pendingPropsRes,
          activePropsRes,
          pendingReportsRes,
          openReportsRes,
          pendingVerifyRes,
          viewsRes,
          savesRes,
          bannedRes,
        ] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'landlord'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'broker'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'agent'),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).in('user_type', ['seeker', 'renter']),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'admin'),
          supabase.from('properties').select('*', { count: 'exact', head: true }),
          supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
          supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
          supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .in('user_type', [...POSTER_TYPES])
            .eq('is_verified', false),
          supabase.from('properties').select('views'),
          supabase.from('saved_properties').select('*', { count: 'exact', head: true }),
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
        ]);

        const totalViewsSum = (viewsRes.data || []).reduce(
          (sum: number, row: { views?: number | null }) => sum + (row.views || 0),
          0
        );

        const statsData: AdminStats = {
          totalUsers: usersRes.count || 0,
          totalLandlords: landlordsRes.count || 0,
          totalBrokers: brokersRes.count || 0,
          totalAgents: agentsRes.count || 0,
          totalSeekers: seekersRes.count || 0,
          totalAdmins: adminsRes.count || 0,
          totalProperties: propsRes.count || 0,
          pendingProperties: pendingPropsRes.count || 0,
          activeProperties: activePropsRes.count || 0,
          pendingReports: (pendingReportsRes.count || 0) + (openReportsRes.count || 0),
          pendingVerifications: pendingVerifyRes.count || 0,
          totalViews: totalViewsSum,
          totalSaves: savesRes.count || 0,
          bannedUsers: bannedRes.count || 0,
        };
        setStats(statsData);

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (profilesError) throw profilesError;

        let formattedUsers: UserProfile[] = [];
        if (profilesData?.length) {
          const posterIds = profilesData
            .filter((p) => isPosterRole(p.user_type))
            .map((p) => p.id);

          let propertyCounts: Record<string, number> = {};
          if (posterIds.length > 0) {
            const { data: propertyData } = await supabase
              .from('properties')
              .select('landlord_id')
              .in('landlord_id', posterIds);
            propertyCounts = (propertyData || []).reduce((acc: Record<string, number>, curr) => {
              acc[curr.landlord_id] = (acc[curr.landlord_id] || 0) + 1;
              return acc;
            }, {});
          }

          const seekerIds = profilesData
            .filter((p) => p.user_type === 'seeker' || p.user_type === 'renter')
            .map((p) => p.id);
          let savedCounts: Record<string, number> = {};
          if (seekerIds.length > 0) {
            const { data: savedData } = await supabase
              .from('saved_properties')
              .select('renter_id')
              .in('renter_id', seekerIds);
            savedCounts = (savedData || []).reduce((acc: Record<string, number>, curr) => {
              acc[curr.renter_id] = (acc[curr.renter_id] || 0) + 1;
              return acc;
            }, {});
          }

          formattedUsers = profilesData.map((profile: any) => ({
            id: profile.id,
            email: profile.email || '',
            full_name: profile.full_name || null,
            phone: profile.phone || null,
            user_type: profile.user_type || 'seeker',
            is_verified: profile.is_verified || false,
            verification_level: profile.verification_level || 'unverified',
            created_at: profile.created_at || new Date().toISOString(),
            is_banned: profile.is_banned || false,
            ban_reason: profile.ban_reason || null,
            property_count: propertyCounts[profile.id] || 0,
            saved_count: savedCounts[profile.id] || 0,
          }));
        }
        setUsers(formattedUsers);

        const { data: propertiesData, error: propertiesError } = await supabase
          .from('properties')
          .select(
            `*,
            landlord:profiles!properties_landlord_id_fkey (id, full_name, email, is_verified),
            photos:property_photos (id, photo_url, display_order)`
          )
          .order('created_at', { ascending: false });
        if (propertiesError) throw propertiesError;
        setProperties(propertiesData || []);

        const { data: reportsData } = await supabase
          .from('reports')
          .select(
            `*,
            property:properties!property_id (
              id, title,
              landlord:profiles!properties_landlord_id_fkey (id, full_name, email)
            ),
            reporter:profiles!reporter_id (id, full_name, email)`
          )
          .order('created_at', { ascending: false })
          .limit(100);
        setReports(reportsData || []);

        const { data: logData } = await supabase
          .from('admin_activity_log')
          .select(`*, admin:profiles!admin_activity_log_admin_id_fkey (full_name, email)`)
          .order('created_at', { ascending: false })
          .limit(100);
        setActivityLog(logData || []);

        cache = {
          stats: statsData,
          users: formattedUsers,
          properties: propertiesData || [],
          reports: reportsData || [],
          activityLog: logData || [],
          timestamp: Date.now(),
        };
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        console.error('Error fetching admin data:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
        isFetching = false;
      }
    },
    [user, userType]
  );

  useEffect(() => {
    if (user && userType === 'admin' && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchData(false);
    }
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [user, userType, fetchData]);

  const logAdminAction = async (
    action: string,
    targetType: string,
    targetId: string,
    details: Record<string, unknown> = {}
  ) => {
    try {
      await supabase.from('admin_activity_log').insert([
        {
          admin_id: user?.id,
          action,
          target_type: targetType,
          target_id: targetId,
          details,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      console.warn('Failed to log admin action:', e);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30',
      pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      rejected: 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30',
      reported: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
      rented: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
      taken: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
      open: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    };
    return colors[status] || 'bg-muted text-muted-foreground';
  };

  const getVerificationBadge = (u: UserProfile) => {
    if (u.is_verified) {
      return (
        <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30">
          Verified
        </Badge>
      );
    }
    if (u.verification_level === 'pending') {
      return (
        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
          Pending
        </Badge>
      );
    }
    if (u.verification_level === 'rejected') {
      return (
        <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30">
          Rejected
        </Badge>
      );
    }
    return <Badge variant="outline">Unverified</Badge>;
  };

  const getActionIcon = (action: string) => {
    if (action.includes('delete')) return <Trash2 className="h-4 w-4 text-red-500" />;
    if (action.includes('verify') || action.includes('approve'))
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (action.includes('ban')) return <Ban className="h-4 w-4 text-red-500" />;
    if (action.includes('feature')) return <Crown className="h-4 w-4 text-amber-500" />;
    if (action.includes('role')) return <UserCog className="h-4 w-4 text-blue-500" />;
    return <Zap className="h-4 w-4 text-blue-500" />;
  };

  const extractStoragePath = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const publicIndex = pathParts.indexOf('public');
      if (publicIndex !== -1 && publicIndex < pathParts.length - 1) {
        return pathParts.slice(publicIndex + 1).join('/');
      }
      const bucketIndex = pathParts.indexOf('property-photos');
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        return pathParts.slice(bucketIndex + 1).join('/');
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleVerifyUser = async (userId: string, action: 'verify' | 'reject') => {
    if (!userId) {
      toast.error('No user selected');
      return;
    }
    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      const updateData =
        action === 'verify'
          ? {
              is_verified: true,
              verification_level: 'verified',
              verified_by: user?.id,
              verified_at: now,
              updated_at: now,
            }
          : {
              is_verified: false,
              verification_level: 'rejected',
              verified_by: user?.id,
              verified_at: now,
              updated_at: now,
            };

      const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
      if (error) throw error;

      await logAdminAction(
        action === 'verify' ? 'user_verified' : 'user_rejected',
        'user',
        userId,
        { action }
      );

      toast.success(`Account ${action === 'verify' ? 'verified' : 'rejected'} successfully`);
      setIsVerifyDialogOpen(false);
      setSelectedUser(null);
      setVerifyAction(null);
      clearCache();
      await fetchData(true);
    } catch (error: any) {
      console.error('Error updating verification:', error);
      toast.error(`Failed to ${action}: ${error.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!banReason.trim()) {
      toast.error('Please provide a reason for banning');
      return;
    }
    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: true,
          ban_reason: banReason,
          banned_at: now,
          banned_by: user?.id,
          updated_at: now,
        })
        .eq('id', userId);
      if (error) throw error;
      await logAdminAction('user_banned', 'user', userId, { reason: banReason });
      toast.success('User banned');
      setIsBanDialogOpen(false);
      setBanReason('');
      setSelectedUser(null);
      clearCache();
      await fetchData(true);
    } catch {
      toast.error('Failed to ban user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnbanUser = async (userId: string) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          is_banned: false,
          ban_reason: null,
          banned_at: null,
          banned_by: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
      if (error) throw error;
      await logAdminAction('user_unbanned', 'user', userId, {});
      toast.success('User unbanned');
      clearCache();
      await fetchData(true);
    } catch {
      toast.error('Failed to unban user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find((u) => u.id === userId);
    if (userToDelete?.user_type === 'admin') {
      toast.error('Cannot delete admin users');
      return;
    }
    setIsProcessing(true);
    try {
      const { data: userProperties } = await supabase
        .from('properties')
        .select('id')
        .eq('landlord_id', userId);

      if (userProperties?.length) {
        const propertyIds = userProperties.map((p) => p.id);
        const { data: photos } = await supabase
          .from('property_photos')
          .select('photo_url')
          .in('property_id', propertyIds);
        if (photos?.length) {
          for (const photo of photos) {
            const path = extractStoragePath(photo.photo_url);
            if (path) {
              await supabase.storage.from('property-photos').remove([path]).catch(() => {});
            }
          }
        }
        await supabase.from('properties').delete().in('id', propertyIds);
      }

      await supabase.from('saved_properties').delete().eq('renter_id', userId);
      await supabase.from('search_alerts').delete().eq('renter_id', userId);
      await supabase.from('profiles').delete().eq('id', userId);

      await logAdminAction('user_deleted', 'user', userId, {
        properties_deleted: userProperties?.length || 0,
      });
      toast.success('User deleted');
      setIsDeleteUserDialogOpen(false);
      setSelectedUser(null);
      clearCache();
      await fetchData(true);
    } catch {
      toast.error('Failed to delete user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeRole = async (userId: string, role: UserType) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ user_type: role, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      await logAdminAction('user_role_changed', 'user', userId, { new_role: role });
      toast.success(`Role changed to ${getUserTypeLabel(role)}`);
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
      clearCache();
      await fetchData(true);
    } catch {
      toast.error('Failed to change role');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveProperty = async (propertyId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('properties')
        .update({ status: 'active', approved_at: now, approved_by: user?.id, updated_at: now })
        .eq('id', propertyId);
      if (error) throw error;
      await logAdminAction('property_approved', 'property', propertyId, {});
      toast.success('Property approved');
      clearCache();
      await fetchData(true);
    } catch {
      toast.error('Failed to approve property');
    }
  };

  const handleRejectProperty = async (propertyId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('properties')
        .update({ status: 'rejected', rejected_at: now, updated_at: now })
        .eq('id', propertyId);
      if (error) throw error;
      await logAdminAction('property_rejected', 'property', propertyId, {});
      toast.success('Property rejected');
      clearCache();
      await fetchData(true);
    } catch {
      toast.error('Failed to reject property');
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    setIsProcessing(true);
    try {
      const { data: photos } = await supabase
        .from('property_photos')
        .select('photo_url')
        .eq('property_id', propertyId);
      if (photos?.length) {
        for (const photo of photos) {
          const path = extractStoragePath(photo.photo_url);
          if (path) await supabase.storage.from('property-photos').remove([path]).catch(() => {});
        }
      }
      const { error } = await supabase.from('properties').delete().eq('id', propertyId);
      if (error) throw error;
      await logAdminAction('property_deleted', 'property', propertyId, {});
      toast.success('Property deleted');
      setIsDeletePropertyDialogOpen(false);
      setSelectedProperty(null);
      clearCache();
      await fetchData(true);
    } catch {
      toast.error('Failed to delete property');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFeatureProperty = async (propertyId: string, isFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ is_featured: isFeatured, updated_at: new Date().toISOString() })
        .eq('id', propertyId);
      if (error) throw error;
      await logAdminAction(
        isFeatured ? 'property_featured' : 'property_unfeatured',
        'property',
        propertyId,
        { is_featured: isFeatured }
      );
      toast.success(isFeatured ? 'Property featured' : 'Property unfeatured');
      clearCache();
      await fetchData(true);
    } catch {
      toast.error('Failed to update featured status');
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('reports')
        .update({ status: 'resolved', resolved_at: now, resolved_by: user?.id })
        .eq('id', reportId);
      if (error) throw error;
      await logAdminAction('report_resolved', 'report', reportId, {});
      toast.success('Report resolved');
      clearCache();
      await fetchData(true);
    } catch {
      toast.error('Failed to resolve report');
    }
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('reports')
        .update({ status: 'dismissed', resolved_at: now, resolved_by: user?.id })
        .eq('id', reportId);
      if (error) throw error;
      await logAdminAction('report_dismissed', 'report', reportId, {});
      toast.success('Report dismissed');
      clearCache();
      await fetchData(true);
    } catch {
      toast.error('Failed to dismiss report');
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction) return;
    setIsProcessing(true);
    try {
      if (bulkAction === 'verify' && selectedUsers.length) {
        const now = new Date().toISOString();
        for (const userId of selectedUsers) {
          await supabase
            .from('profiles')
            .update({
              is_verified: true,
              verification_level: 'verified',
              verified_by: user?.id,
              verified_at: now,
              updated_at: now,
            })
            .eq('id', userId);
        }
        toast.success(`${selectedUsers.length} account(s) verified`);
        setSelectedUsers([]);
      }
      if (bulkAction === 'approve' && selectedProperties.length) {
        const now = new Date().toISOString();
        for (const propId of selectedProperties) {
          await supabase
            .from('properties')
            .update({ status: 'active', approved_at: now, approved_by: user?.id, updated_at: now })
            .eq('id', propId);
        }
        toast.success(`${selectedProperties.length} propert(y/ies) approved`);
        setSelectedProperties([]);
      }
      if (bulkAction === 'reject' && selectedProperties.length) {
        const now = new Date().toISOString();
        for (const propId of selectedProperties) {
          await supabase
            .from('properties')
            .update({ status: 'rejected', rejected_at: now, updated_at: now })
            .eq('id', propId);
        }
        toast.success(`${selectedProperties.length} propert(y/ies) rejected`);
        setSelectedProperties([]);
      }
      setIsBulkActionDialogOpen(false);
      clearCache();
      await fetchData(true);
    } catch {
      toast.error('Failed to perform bulk action');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchesType =
      filterType === 'all' ||
      u.user_type === filterType ||
      (filterType === 'seeker' && u.user_type === 'renter');
    return matchesSearch && matchesType;
  });

  const paginatedUsers = filteredUsers.slice(0, (userPage + 1) * USERS_PER_PAGE);
  const hasMoreUsers = filteredUsers.length > (userPage + 1) * USERS_PER_PAGE;

  const filteredProperties = properties.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.location_city.toLowerCase().includes(q);
    const matchesStatus = propertyFilter === 'all' || p.status === propertyFilter;
    return matchesSearch && matchesStatus;
  });

  const unverifiedPosters = users.filter(
    (u) => isPosterRole(u.user_type) && !u.is_verified && u.verification_level !== 'rejected'
  );
  const pendingVerificationCount = unverifiedPosters.length;

  const pendingReportsList = reports.filter(
    (r) => r.status === 'pending' || r.status === 'open'
  );

  if (!isInitialized || authLoading) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-8 flex justify-center min-h-[400px] items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userType !== 'admin') {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-8">
        <Card>
          <CardContent className="p-8 sm:p-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Access denied</h2>
            <p className="text-muted-foreground">Admin only.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading && !cache) {
    return (
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
        <Skeleton className="h-10 w-48 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-6 w-12 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            Admin dashboard
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Users, listings, verification, and reports
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchData(true)} disabled={loading} className="self-start">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6 sm:mb-8">
          <StatCard label="Total users" value={stats.totalUsers} icon={Users} />
          <StatCard
            label="Properties"
            value={stats.totalProperties}
            sub={`${stats.activeProperties} active`}
            icon={Home}
            tone="blue"
          />
          <StatCard label="Pending listings" value={stats.pendingProperties} icon={Clock} tone="amber" />
          <StatCard
            label="Unverified posters"
            value={pendingVerificationCount}
            icon={UserCheck}
            tone="purple"
          />
          <StatCard label="Pending reports" value={stats.pendingReports} icon={Flag} tone="red" />
          <StatCard label="Total views" value={stats.totalViews} icon={Eye} tone="green" />
        </div>
      )}

      <Tabs defaultValue="users" className="space-y-4 sm:space-y-6">
        <TabsList className="w-full h-auto flex flex-wrap gap-1 justify-start">
          <TabsTrigger value="users" className="text-xs sm:text-sm">
            Users
            {pendingVerificationCount > 0 && (
              <Badge className="ml-1 bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px]">
                {pendingVerificationCount}
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
          <TabsTrigger value="verifications" className="text-xs sm:text-sm">
            Verifications
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs sm:text-sm">
            Reports
            {(stats?.pendingReports || 0) > 0 && (
              <Badge variant="destructive" className="ml-1 text-[10px]">
                {stats?.pendingReports}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs sm:text-sm">
            Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="bg-card">
            <CardHeader className="space-y-3">
              <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>Verify, ban, change role, or delete accounts</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Filter role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ADMIN_USER_TYPE_FILTERS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Search name or email…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-56"
                />
              </div>
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{selectedUsers.length} selected</Badge>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      setBulkAction('verify');
                      setIsBulkActionDialogOpen(true);
                    }}
                  >
                    <UserCheck className="h-4 w-4 mr-1" /> Verify
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedUsers([])}>
                    Clear
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {pendingVerificationCount > 0 && (
                <Alert className="mb-4 border-purple-500/30 bg-purple-500/10">
                  <UserCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <AlertDescription className="text-purple-800 dark:text-purple-200">
                    <strong>{pendingVerificationCount}</strong> poster(s) need verification
                    (landlord / broker / agent).
                  </AlertDescription>
                </Alert>
              )}

              <div className="md:hidden space-y-3">
                {paginatedUsers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No users found</p>
                ) : (
                  paginatedUsers.map((u) => {
                    const canVerify = isPosterRole(u.user_type) && !u.is_verified;
                    return (
                      <Card
                        key={u.id}
                        className={canVerify ? 'border-purple-500/40 bg-purple-500/5' : 'bg-card'}
                      >
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedUsers.includes(u.id)}
                              onCheckedChange={() => toggleUserSelection(u.id)}
                              disabled={u.user_type === 'admin'}
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{u.full_name || 'Unnamed'}</p>
                              <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                <Badge variant="outline">{getUserTypeLabel(u.user_type)}</Badge>
                                {getVerificationBadge(u)}
                                {u.is_banned && <Badge variant="destructive">Banned</Badge>}
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                Joined {formatDate(u.created_at)}
                                {isPosterRole(u.user_type) ? ` · ${u.property_count || 0} listings` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {canVerify && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setVerifyAction('verify');
                                    setIsVerifyDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" /> Verify
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedUser(u);
                                    setVerifyAction('reject');
                                    setIsVerifyDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-3 w-3 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            {u.user_type !== 'admin' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setNewRole((u.user_type as UserType) || 'seeker');
                                  setIsRoleDialogOpen(true);
                                }}
                              >
                                Role
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            paginatedUsers.length > 0 &&
                            paginatedUsers.every((u) => selectedUsers.includes(u.id))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedUsers(paginatedUsers.map((u) => u.id));
                            else setSelectedUsers([]);
                          }}
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Listings</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUsers.map((u) => {
                        const canVerify = isPosterRole(u.user_type) && !u.is_verified;
                        return (
                          <TableRow key={u.id} className={canVerify ? 'bg-purple-500/5' : ''}>
                            <TableCell>
                              <Checkbox
                                checked={selectedUsers.includes(u.id)}
                                onCheckedChange={() => toggleUserSelection(u.id)}
                                disabled={u.user_type === 'admin'}
                              />
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{u.full_name || 'Unnamed'}</p>
                              <p className="text-sm text-muted-foreground">{u.email}</p>
                              {u.is_banned && (
                                <Badge variant="destructive" className="mt-1">
                                  Banned
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{getUserTypeLabel(u.user_type)}</Badge>
                            </TableCell>
                            <TableCell>
                              {getVerificationBadge(u)}
                              {canVerify && (
                                <div className="flex gap-1 mt-1">
                                  <Button
                                    size="sm"
                                    className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => {
                                      setSelectedUser(u);
                                      setVerifyAction('verify');
                                      setIsVerifyDialogOpen(true);
                                    }}
                                  >
                                    Verify
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => {
                                      setSelectedUser(u);
                                      setVerifyAction('reject');
                                      setIsVerifyDialogOpen(true);
                                    }}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {isPosterRole(u.user_type) ? u.property_count || 0 : '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(u.created_at)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  {u.user_type !== 'admin' && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedUser(u);
                                          setNewRole((u.user_type as UserType) || 'seeker');
                                          setIsRoleDialogOpen(true);
                                        }}
                                      >
                                        <UserCog className="mr-2 h-4 w-4" /> Change role
                                      </DropdownMenuItem>
                                      {isPosterRole(u.user_type) && !u.is_verified && (
                                        <DropdownMenuItem
                                          className="text-green-600"
                                          onClick={() => {
                                            setSelectedUser(u);
                                            setVerifyAction('verify');
                                            setIsVerifyDialogOpen(true);
                                          }}
                                        >
                                          <UserCheck className="mr-2 h-4 w-4" /> Verify
                                        </DropdownMenuItem>
                                      )}
                                      {isPosterRole(u.user_type) && u.is_verified && (
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={() => {
                                            setSelectedUser(u);
                                            setVerifyAction('reject');
                                            setIsVerifyDialogOpen(true);
                                          }}
                                        >
                                          <UserX className="mr-2 h-4 w-4" /> Revoke verification
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSeparator />
                                      {u.is_banned ? (
                                        <DropdownMenuItem
                                          className="text-green-600"
                                          onClick={() => handleUnbanUser(u.id)}
                                        >
                                          <UserCheck className="mr-2 h-4 w-4" /> Unban
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem
                                          className="text-red-600"
                                          onClick={() => {
                                            setSelectedUser(u);
                                            setIsBanDialogOpen(true);
                                          }}
                                        >
                                          <Ban className="mr-2 h-4 w-4" /> Ban
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem
                                        className="text-red-600 font-semibold"
                                        onClick={() => {
                                          setSelectedUser(u);
                                          setIsDeleteUserDialogOpen(true);
                                        }}
                                      >
                                        <UserMinus className="mr-2 h-4 w-4" /> Delete account
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {hasMoreUsers && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={() => setUserPage((p) => p + 1)}>
                    Load more
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties">
          <Card className="bg-card">
            <CardHeader className="space-y-3">
              <div>
                <CardTitle>Properties</CardTitle>
                <CardDescription>Approve, reject, feature, or delete listings</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={propertyFilter} onValueChange={setPropertyFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All properties</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="rented">Rented</SelectItem>
                    <SelectItem value="taken">Taken</SelectItem>
                    <SelectItem value="reported">Reported</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Search listings…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-56"
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="md:hidden space-y-3">
                {filteredProperties.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No properties found</p>
                ) : (
                  filteredProperties.map((p) => (
                    <Card
                      key={p.id}
                      className={p.status === 'pending' ? 'border-amber-500/40 bg-amber-500/5' : 'bg-card'}
                    >
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{p.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {p.location_suburb}, {p.location_city}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              by {p.landlord?.full_name || 'Unknown'}
                            </p>
                          </div>
                          <Badge className={getStatusColor(p.status)}>{p.status}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold">E{p.price?.toLocaleString()}</span>
                          <span className="text-muted-foreground">{p.views || 0} views</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {p.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApproveProperty(p.id)}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRejectProperty(p.id)}
                              >
                                Reject
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/properties/${p.id}`} target="_blank">
                              View
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10" />
                      <TableHead>Property</TableHead>
                      <TableHead>Poster</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Views</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProperties.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No properties found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProperties.map((property) => (
                        <TableRow
                          key={property.id}
                          className={property.status === 'pending' ? 'bg-amber-500/5' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedProperties.includes(property.id)}
                              onCheckedChange={() => togglePropertySelection(property.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{property.title}</p>
                            {property.is_featured && (
                              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300">
                                Featured
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <p className="font-medium">{property.landlord?.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{property.landlord?.email}</p>
                          </TableCell>
                          <TableCell>E{property.price?.toLocaleString()}</TableCell>
                          <TableCell className="text-sm">
                            {property.location_suburb}, {property.location_city}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(property.status)}>{property.status}</Badge>
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
                                <DropdownMenuItem asChild>
                                  <a href={`/properties/${property.id}`} target="_blank" rel="noreferrer">
                                    <Globe className="mr-2 h-4 w-4" /> Public view
                                  </a>
                                </DropdownMenuItem>
                                {property.status === 'pending' && (
                                  <>
                                    <DropdownMenuItem
                                      className="text-green-600"
                                      onClick={() => handleApproveProperty(property.id)}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" /> Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => handleRejectProperty(property.id)}
                                    >
                                      <XCircle className="mr-2 h-4 w-4" /> Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem
                                  onClick={() => handleFeatureProperty(property.id, !property.is_featured)}
                                >
                                  <Crown className="mr-2 h-4 w-4" />
                                  {property.is_featured ? 'Unfeature' : 'Feature'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => {
                                    setSelectedProperty(property);
                                    setIsDeletePropertyDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verifications">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Poster verification
              </CardTitle>
              <CardDescription>
                Verify landlords, brokers, and agents before they publish
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unverifiedPosters.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All posters verified</h3>
                  <p className="text-muted-foreground">No pending verification requests.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {unverifiedPosters.map((poster) => (
                    <Card key={poster.id} className="border-purple-500/40 bg-purple-500/5">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row justify-between gap-4">
                          <div className="min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{poster.full_name || 'Unnamed'}</h3>
                              <Badge variant="outline">{getUserTypeLabel(poster.user_type)}</Badge>
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                Pending
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{poster.email}</p>
                            {poster.phone && (
                              <p className="text-sm text-muted-foreground">{poster.phone}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Joined {formatDate(poster.created_at)} · {poster.property_count || 0}{' '}
                              listing(s)
                            </p>
                          </div>
                          <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                            <Button
                              size="sm"
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => {
                                setSelectedUser(poster);
                                setVerifyAction('verify');
                                setIsVerifyDialogOpen(true);
                              }}
                              disabled={isProcessing}
                            >
                              <CheckCircle className="mr-1 h-4 w-4" /> Verify
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="flex-1"
                              onClick={() => {
                                setSelectedUser(poster);
                                setVerifyAction('reject');
                                setIsVerifyDialogOpen(true);
                              }}
                              disabled={isProcessing}
                            >
                              <XCircle className="mr-1 h-4 w-4" /> Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Reports
              </CardTitle>
              <CardDescription>Review and resolve reported listings</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingReportsList.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All clear</h3>
                  <p className="text-muted-foreground">No pending reports.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReportsList.map((report) => (
                    <Card key={report.id} className="border-red-500/30 bg-red-500/5">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {report.property?.title || 'Unknown listing'}
                            </p>
                            <p className="text-sm text-muted-foreground">Reason: {report.reason}</p>
                            <p className="text-xs text-muted-foreground">
                              by {report.reporter?.full_name || 'Anonymous'} · {formatDate(report.created_at)}
                            </p>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleResolveReport(report.id)}
                            >
                              Resolve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDismissReport(report.id)}>
                              Dismiss
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Activity log
              </CardTitle>
              <CardDescription>Recent admin actions</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLog.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No activity logged yet</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {activityLog.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <div className="shrink-0 mt-0.5">{getActionIcon(log.action)}</div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                          <span className="text-muted-foreground"> · {log.target_type}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.admin?.full_name || log.admin?.email || 'Admin'} · {formatDate(log.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {verifyAction === 'verify' ? 'Verify account' : 'Reject verification'}
            </DialogTitle>
            <DialogDescription>
              {verifyAction === 'verify'
                ? 'Mark this poster as verified so they can publish listings.'
                : 'Reject verification for this account.'}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-2">
              <p className="font-medium">{selectedUser.full_name || 'Unnamed'}</p>
              <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              <Badge variant="outline">{getUserTypeLabel(selectedUser.user_type)}</Badge>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsVerifyDialogOpen(false);
                setSelectedUser(null);
                setVerifyAction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className={verifyAction === 'verify' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
              variant={verifyAction === 'verify' ? 'default' : 'destructive'}
              disabled={isProcessing}
              onClick={() => {
                if (selectedUser && verifyAction) handleVerifyUser(selectedUser.id, verifyAction);
              }}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change role</DialogTitle>
            <DialogDescription>
              Update account type for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <Select value={newRole} onValueChange={(v) => setNewRole(v as UserType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSIGNABLE_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={isProcessing}
              onClick={() => selectedUser && handleChangeRole(selectedUser.id, newRole)}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">Ban user</DialogTitle>
            <DialogDescription>
              Ban {selectedUser?.full_name || selectedUser?.email} from the platform.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for ban…"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
          />
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsBanDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!banReason.trim() || isProcessing}
              onClick={() => selectedUser && handleBanUser(selectedUser.id)}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm ban'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">Delete account</DialogTitle>
            <DialogDescription>
              Permanently delete {selectedUser?.full_name || selectedUser?.email} and related data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDeleteUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isProcessing}
              onClick={() => selectedUser && handleDeleteUser(selectedUser.id)}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeletePropertyDialogOpen} onOpenChange={setIsDeletePropertyDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">Delete property</DialogTitle>
            <DialogDescription>Delete “{selectedProperty?.title}” and its photos.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsDeletePropertyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={isProcessing}
              onClick={() => selectedProperty && handleDeleteProperty(selectedProperty.id)}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkActionDialogOpen} onOpenChange={setIsBulkActionDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm bulk {bulkAction}</DialogTitle>
            <DialogDescription>
              {selectedUsers.length > 0 && `${selectedUsers.length} user(s)`}
              {selectedProperties.length > 0 && ` ${selectedProperties.length} propert(y/ies)`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsBulkActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={isProcessing} onClick={handleBulkAction}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'amber' | 'purple' | 'red' | 'green' | 'blue';
}) {
  const shell =
    tone === 'amber'
      ? 'border-amber-500/30 bg-amber-500/10'
      : tone === 'purple'
        ? 'border-purple-500/30 bg-purple-500/10'
        : tone === 'red'
          ? 'border-red-500/30 bg-red-500/10'
          : tone === 'green'
            ? 'border-green-500/30 bg-green-500/10'
            : tone === 'blue'
              ? 'border-blue-500/30 bg-blue-500/10'
              : 'bg-card border-border';
  const valueClass =
    tone === 'amber'
      ? 'text-amber-700 dark:text-amber-300'
      : tone === 'purple'
        ? 'text-purple-700 dark:text-purple-300'
        : tone === 'red'
          ? 'text-red-700 dark:text-red-300'
          : tone === 'green'
            ? 'text-green-700 dark:text-green-300'
            : tone === 'blue'
              ? 'text-blue-700 dark:text-blue-300'
              : '';
  return (
    <Card className={shell}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{label}</p>
            <p className={`text-xl sm:text-2xl font-bold ${valueClass}`}>{value.toLocaleString()}</p>
            {sub && <p className="text-[10px] sm:text-xs text-muted-foreground">{sub}</p>}
          </div>
          <Icon className="h-7 w-7 sm:h-8 sm:w-8 opacity-40 shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}
