// src/app/dashboard/admin/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  MoreVertical,
  Trash2,
  Search,
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

// ============================================================
// TYPES
// ============================================================

interface UserProfile {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  user_type: 'admin' | 'landlord' | 'renter';
  is_verified: boolean;
  verification_level: 'unverified' | 'pending' | 'verified' | 'rejected';
  created_at: string;
  updated_at: string;
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
  banned_by: string | null;
  verified_by: string | null;
  verified_at: string | null;
  last_active: string | null;
  subscription_tier: string;
  referral_count: number;
  property_count?: number;
  saved_count?: number;
  alert_count?: number;
}

interface PropertyWithDetails {
  id: string;
  title: string;
  description: string | null;
  property_type: string;
  price: number;
  location_city: string;
  location_suburb: string | null;
  location_address: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  is_furnished: boolean;
  amenities: string[];
  lease_terms: string | null;
  status: 'pending' | 'active' | 'rented' | 'reported' | 'rejected';
  is_featured: boolean;
  views: number;
  contact_phone: string;
  contact_whatsapp: string | null;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejected_reason: string | null;
  reported_count: number | null;
  landlord_id: string;
  landlord?: {
    id: string;
    full_name: string | null;
    email: string;
    is_verified: boolean;
  };
  photos?: {
    id: string;
    photo_url: string;
    display_order: number;
  }[];
}

interface ReportWithDetails {
  id: string;
  property_id: string;
  reporter_id: string;
  reason: string;
  description: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  property?: {
    id: string;
    title: string;
    landlord: {
      id: string;
      full_name: string | null;
      email: string;
    };
  };
  reporter?: {
    id: string;
    full_name: string | null;
    email: string;
  };
  resolver?: {
    id: string;
    full_name: string | null;
    email: string;
  };
}

interface AdminStats {
  totalUsers: number;
  totalLandlords: number;
  totalRenters: number;
  totalAdmins: number;
  totalProperties: number;
  pendingProperties: number;
  reportedProperties: number;
  pendingReports: number;
  pendingVerifications: number;
  totalViews: number;
  totalSaves: number;
  bannedUsers: number;
  activeProperties: number;
}

interface ActivityLogEntry {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  admin?: {
    full_name: string | null;
    email: string;
  };
}

// ============================================================
// CACHE HELPER
// ============================================================

interface CacheData {
  stats: AdminStats | null;
  users: UserProfile[];
  properties: PropertyWithDetails[];
  reports: ReportWithDetails[];
  activityLog: ActivityLogEntry[];
  timestamp: number;
}

const CACHE_DURATION = 30 * 1000; // 30 seconds (reduced from 60)
let cache: CacheData | null = null;
let isFetching = false;

function isCacheValid(): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < CACHE_DURATION;
}

function clearCache() {
  cache = null;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AdminDashboard() {
  const { user, userType, isLoading: authLoading, isInitialized } = useAuth();
  const router = useRouter();

  // ===== STATE =====
  const [loading, setLoading] = useState(!isCacheValid());
  const [stats, setStats] = useState<AdminStats | null>(cache?.stats || null);
  const [properties, setProperties] = useState<PropertyWithDetails[]>(cache?.properties || []);
  const [reports, setReports] = useState<ReportWithDetails[]>(cache?.reports || []);
  const [users, setUsers] = useState<UserProfile[]>(cache?.users || []);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(cache?.activityLog || []);
  
  // Selection state
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  
  // Dialog state
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithDetails | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isPropertyDialogOpen, setIsPropertyDialogOpen] = useState(false);
  const [isBanDialogOpen, setIsBanDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  const [isDeletePropertyDialogOpen, setIsDeletePropertyDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isFeatureDialogOpen, setIsFeatureDialogOpen] = useState(false);
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);
  
  // Form state
  const [verifyAction, setVerifyAction] = useState<'verify' | 'reject' | null>(null);
  const [banReason, setBanReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [newRole, setNewRole] = useState<'admin' | 'landlord' | 'renter'>('renter');
  const [bulkAction, setBulkAction] = useState<'delete' | 'ban' | 'verify' | 'approve' | 'reject' | null>(null);
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  
  // Pagination for users
  const [userPage, setUserPage] = useState(0);
  const USERS_PER_PAGE = 20;
  
  // Abort controller for cleanup
  const abortControllerRef = useRef<AbortController | null>(null);
  const initialFetchDone = useRef(false);

  // ============================================================
  // AUTH CHECK
  // ============================================================

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

  // ============================================================
  // FETCH DATA - WITH CACHING
  // ============================================================

  const fetchData = useCallback(async (force: boolean = false) => {
    // If cache is valid and not forced, skip fetch
    if (!force && isCacheValid()) {
      console.log('📦 Using cached admin data');
      return;
    }

    // Prevent concurrent fetches
    if (isFetching) {
      console.log('⏳ Fetch already in progress');
      return;
    }

    if (!user || userType !== 'admin') return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    isFetching = true;
    setLoading(true);

    try {
      console.log('🔄 Fetching fresh admin data...');

      // ===== 1. STATS =====
      const [
        { count: totalUsers },
        { count: totalLandlords },
        { count: totalRenters },
        { count: totalAdmins },
        { count: totalProperties },
        { count: pendingProperties },
        { count: reportedProperties },
        { count: pendingReports },
        { count: pendingVerifications },
        { count: totalViews },
        { count: totalSaves },
        { count: bannedUsers },
        { count: activeProperties },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'landlord'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'renter'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'admin'),
        supabase.from('properties').select('*', { count: 'exact', head: true }),
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'reported'),
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        // ✅ FIXED: Count ALL unverified landlords, not just 'pending'
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .eq('user_type', 'landlord')
          .eq('is_verified', false),
        supabase.from('properties').select('views', { count: 'exact', head: true }),
        supabase.from('saved_properties').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_banned', true),
        supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      ]);

      const statsData: AdminStats = {
        totalUsers: totalUsers || 0,
        totalLandlords: totalLandlords || 0,
        totalRenters: totalRenters || 0,
        totalAdmins: totalAdmins || 0,
        totalProperties: totalProperties || 0,
        pendingProperties: pendingProperties || 0,
        reportedProperties: reportedProperties || 0,
        pendingReports: pendingReports || 0,
        pendingVerifications: pendingVerifications || 0,
        totalViews: totalViews || 0,
        totalSaves: totalSaves || 0,
        bannedUsers: bannedUsers || 0,
        activeProperties: activeProperties || 0,
      };

      setStats(statsData);

      // ===== 2. USERS =====
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      let formattedUsers: UserProfile[] = [];
      if (profilesData && profilesData.length > 0) {
        // Get property counts for landlords
        const landlordIds = profilesData
          .filter(p => p.user_type === 'landlord')
          .map(p => p.id);

        let propertyCounts: Record<string, number> = {};
        if (landlordIds.length > 0) {
          // ✅ FIXED: Use aggregate count
          const { data: propertyData } = await supabase
            .from('properties')
            .select('landlord_id')
            .in('landlord_id', landlordIds);

          if (propertyData) {
            propertyCounts = propertyData.reduce((acc: Record<string, number>, curr) => {
              acc[curr.landlord_id] = (acc[curr.landlord_id] || 0) + 1;
              return acc;
            }, {});
          }
        }

        // Get saved counts for renters
        const renterIds = profilesData
          .filter(p => p.user_type === 'renter')
          .map(p => p.id);

        let savedCounts: Record<string, number> = {};
        if (renterIds.length > 0) {
          const { data: savedData } = await supabase
            .from('saved_properties')
            .select('renter_id')
            .in('renter_id', renterIds);

          if (savedData) {
            savedCounts = savedData.reduce((acc: Record<string, number>, curr) => {
              acc[curr.renter_id] = (acc[curr.renter_id] || 0) + 1;
              return acc;
            }, {});
          }
        }

        formattedUsers = profilesData.map((profile: any) => ({
          id: profile.id,
          email: profile.email || '',
          full_name: profile.full_name || null,
          phone: profile.phone || null,
          user_type: profile.user_type || 'renter',
          is_verified: profile.is_verified || false,
          verification_level: profile.verification_level || 'unverified',
          created_at: profile.created_at || new Date().toISOString(),
          updated_at: profile.updated_at || new Date().toISOString(),
          is_banned: profile.is_banned || false,
          ban_reason: profile.ban_reason || null,
          banned_at: profile.banned_at || null,
          banned_by: profile.banned_by || null,
          verified_by: profile.verified_by || null,
          verified_at: profile.verified_at || null,
          last_active: profile.last_active || null,
          subscription_tier: profile.subscription_tier || 'free',
          referral_count: profile.referral_count || 0,
          property_count: propertyCounts[profile.id] || 0,
          saved_count: savedCounts[profile.id] || 0,
          alert_count: 0,
        }));
      }

      setUsers(formattedUsers);

      // ===== 3. PROPERTIES =====
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          *,
          landlord:profiles!properties_landlord_id_fkey (
            id,
            full_name,
            email,
            is_verified
          ),
          photos:property_photos (
            id,
            photo_url,
            display_order
          )
        `)
        .order('created_at', { ascending: false });

      if (propertiesError) throw propertiesError;
      setProperties(propertiesData || []);

      // ===== 4. REPORTS =====
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select(`
          *,
          property:properties!property_id (
            id,
            title,
            landlord:profiles!properties_landlord_id_fkey (
              id,
              full_name,
              email
            )
          ),
          reporter:profiles!reporter_id (
            id,
            full_name,
            email
          ),
          resolver:profiles!resolved_by (
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (reportsError) throw reportsError;
      setReports(reportsData || []);

      // ===== 5. ACTIVITY LOG =====
      const { data: logData, error: logError } = await supabase
        .from('admin_activity_log')
        .select(`
          *,
          admin:profiles!admin_activity_log_admin_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logError) throw logError;
      setActivityLog(logData || []);

      // ===== UPDATE CACHE =====
      cache = {
        stats: statsData,
        users: formattedUsers,
        properties: propertiesData || [],
        reports: reportsData || [],
        activityLog: logData || [],
        timestamp: Date.now(),
      };

      console.log('✅ Admin data cached successfully');

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('❌ Error fetching data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      isFetching = false;
    }
  }, [user, userType]);

  // ===== INITIAL FETCH =====
  useEffect(() => {
    if (user && userType === 'admin' && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchData(false);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user, userType, fetchData]);

  // ============================================================
  // HELPERS
  // ============================================================

  const logAdminAction = async (
    action: string,
    targetType: string,
    targetId: string,
    details: any = {}
  ) => {
    try {
      await supabase
        .from('admin_activity_log')
        .insert([{
          admin_id: user?.id,
          action,
          target_type: targetType,
          target_id: targetId,
          details,
          created_at: new Date().toISOString(),
        }]);
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
      active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      reported: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      rented: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      draft: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  };

  const getVerificationBadge = (user: UserProfile) => {
    if (user.is_verified) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">✅ Verified</Badge>;
    }
    if (user.verification_level === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">⏳ Pending</Badge>;
    }
    if (user.verification_level === 'rejected') {
      return <Badge className="bg-red-100 text-red-800 border-red-200">❌ Rejected</Badge>;
    }
    return <Badge variant="outline">⬜ Unverified</Badge>;
  };

  const getActionIcon = (action: string) => {
    if (action.includes('delete')) return <Trash2 className="h-4 w-4 text-red-500" />;
    if (action.includes('verify') || action.includes('approve')) return <CheckCircle className="h-4 w-4 text-green-500" />;
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

  // ============================================================
  // USER MANAGEMENT ACTIONS
  // ============================================================

  const handleVerifyUser = async (userId: string, action: 'verify' | 'reject') => {
    if (!userId) {
      toast.error('No user selected');
      return;
    }

    setIsProcessing(true);
    try {
      const now = new Date().toISOString();
      const updateData: any = {
        updated_at: now,
      };

      if (action === 'verify') {
        updateData.is_verified = true;
        updateData.verification_level = 'verified';
        updateData.verified_by = user?.id;
        updateData.verified_at = now;
      } else {
        updateData.is_verified = false;
        updateData.verification_level = 'rejected';
        updateData.verified_by = user?.id;
        updateData.verified_at = now;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      await logAdminAction(
        action === 'verify' ? 'user_verified' : 'user_rejected',
        'user',
        userId,
        { action, user_id: userId }
      );

      toast.success(`User ${action === 'verify' ? 'verified' : 'rejected'} successfully!`);
      
      setIsVerifyDialogOpen(false);
      setSelectedUser(null);
      setVerifyAction(null);
      
      // ✅ FIXED: Clear cache and force refresh
      clearCache();
      await fetchData(true);
      
    } catch (error: any) {
      console.error('Error updating verification:', error);
      toast.error(`Failed to ${action} user: ${error.message || 'Unknown error'}`);
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

      toast.success('User banned successfully');
      setIsBanDialogOpen(false);
      setBanReason('');
      setSelectedUser(null);
      
      // ✅ FIXED: Clear cache and force refresh
      clearCache();
      await fetchData(true);
    } catch (error) {
      console.error('Error banning user:', error);
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

      toast.success('User unbanned successfully');
      
      // ✅ FIXED: Clear cache and force refresh
      clearCache();
      await fetchData(true);
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // ✅ FIXED: Prevent deleting admin users
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete?.user_type === 'admin') {
      toast.error('Cannot delete admin users');
      return;
    }

    setIsProcessing(true);
    try {
      const { data: userProperties } = await supabase
        .from('properties')
        .select('id, title')
        .eq('landlord_id', userId);

      if (userProperties && userProperties.length > 0) {
        const propertyIds = userProperties.map(p => p.id);
        
        const { data: photos } = await supabase
          .from('property_photos')
          .select('photo_url')
          .in('property_id', propertyIds);

        if (photos && photos.length > 0) {
          for (const photo of photos) {
            const path = extractStoragePath(photo.photo_url);
            if (path) {
              await supabase.storage
                .from('property-photos')
                .remove([path])
                .catch(e => console.warn('Failed to delete photo:', e));
            }
          }
        }

        const { error: propDeleteError } = await supabase
          .from('properties')
          .delete()
          .in('id', propertyIds);
        
        if (propDeleteError) throw propDeleteError;
      }

      await supabase
        .from('saved_properties')
        .delete()
        .eq('renter_id', userId);

      await supabase
        .from('search_alerts')
        .delete()
        .eq('renter_id', userId);

      await supabase
        .from('reports')
        .delete()
        .or(`reporter_id.eq.${userId},resolved_by.eq.${userId}`);

      await supabase
        .from('inquiries')
        .delete()
        .eq('renter_id', userId);

      await supabase
        .from('property_views')
        .delete()
        .eq('viewer_id', userId);

      const { error: userDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (userDeleteError) throw userDeleteError;

      await logAdminAction('user_deleted', 'user', userId, { 
        full_delete: true,
        properties_deleted: userProperties?.length || 0 
      });

      toast.success('User and all associated data deleted successfully');
      setIsDeleteUserDialogOpen(false);
      setSelectedUser(null);
      
      // ✅ FIXED: Clear cache and force refresh
      clearCache();
      await fetchData(true);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'admin' | 'landlord' | 'renter') => {
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          user_type: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      await logAdminAction('user_role_changed', 'user', userId, { new_role: newRole });

      toast.success(`User role changed to ${newRole}`);
      setIsRoleDialogOpen(false);
      setSelectedUser(null);
      
      // ✅ FIXED: Clear cache and force refresh
      clearCache();
      await fetchData(true);
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Failed to change user role');
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================
  // PROPERTY MANAGEMENT ACTIONS
  // ============================================================

  const handleApproveProperty = async (propertyId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('properties')
        .update({ 
          status: 'active',
          approved_at: now,
          approved_by: user?.id,
          updated_at: now,
        })
        .eq('id', propertyId);
      
      if (error) throw error;

      await logAdminAction('property_approved', 'property', propertyId, {});

      toast.success('Property approved successfully');
      
      // ✅ FIXED: Clear cache and force refresh
      clearCache();
      await fetchData(true);
    } catch (error) {
      console.error('Error approving property:', error);
      toast.error('Failed to approve property');
    }
  };

  const handleRejectProperty = async (propertyId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('properties')
        .update({ 
          status: 'rejected',
          rejected_at: now,
          updated_at: now,
        })
        .eq('id', propertyId);
      
      if (error) throw error;

      await logAdminAction('property_rejected', 'property', propertyId, {});

      toast.success('Property rejected successfully');
      
      // ✅ FIXED: Clear cache and force refresh
      clearCache();
      await fetchData(true);
    } catch (error) {
      console.error('Error rejecting property:', error);
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

      if (photos && photos.length > 0) {
        for (const photo of photos) {
          const path = extractStoragePath(photo.photo_url);
          if (path) {
            await supabase.storage
              .from('property-photos')
              .remove([path])
              .catch(e => console.warn('Failed to delete photo:', e));
          }
        }
      }

      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) throw error;

      await logAdminAction('property_deleted', 'property', propertyId, {});

      toast.success('Property deleted successfully');
      setIsDeletePropertyDialogOpen(false);
      setSelectedProperty(null);
      
      // ✅ FIXED: Clear cache and force refresh
      clearCache();
      await fetchData(true);
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFeatureProperty = async (propertyId: string, isFeatured: boolean) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ 
          is_featured: isFeatured,
          updated_at: new Date().toISOString()
        })
        .eq('id', propertyId);
      
      if (error) throw error;

      await logAdminAction(
        isFeatured ? 'property_featured' : 'property_unfeatured',
        'property',
        propertyId,
        { is_featured: isFeatured }
      );

      toast.success(isFeatured ? 'Property featured successfully' : 'Property unfeatured');
      
      // ✅ FIXED: Clear cache and force refresh
      clearCache();
      await fetchData(true);
    } catch (error) {
      console.error('Error featuring property:', error);
      toast.error('Failed to update featured status');
    }
  };

  // ============================================================
  // REPORT ACTIONS
  // ============================================================

  const handleResolveReport = async (reportId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('reports')
        .update({ 
          status: 'resolved',
          resolved_at: now,
          resolved_by: user?.id,
          updated_at: now,
        })
        .eq('id', reportId);
      
      if (error) throw error;

      await logAdminAction('report_resolved', 'report', reportId, {});

      toast.success('Report resolved successfully');
      
      // ✅ FIXED: Clear cache and force refresh
      clearCache();
      await fetchData(true);
    } catch (error) {
      console.error('Error resolving report:', error);
      toast.error('Failed to resolve report');
    }
  };

  const handleDismissReport = async (reportId: string) => {
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('reports')
        .update({ 
          status: 'dismissed',
          resolved_at: now,
          resolved_by: user?.id,
          updated_at: now,
        })
        .eq('id', reportId);
      
      if (error) throw error;

      await logAdminAction('report_dismissed', 'report', reportId, {});

      toast.success('Report dismissed');
      
      // ✅ FIXED: Clear cache and force refresh
      clearCache();
      await fetchData(true);
    } catch (error) {
      console.error('Error dismissing report:', error);
      toast.error('Failed to dismiss report');
    }
  };

  // ============================================================
  // BULK ACTIONS
  // ============================================================

  const handleBulkAction = async () => {
    if (!bulkAction) return;

    setIsProcessing(true);
    try {
      // ✅ FIXED: Prevent admin users from being bulk deleted
      if (bulkAction === 'delete' && selectedUsers.length > 0) {
        const adminUsers = selectedUsers.filter(id => {
          const user = users.find(u => u.id === id);
          return user?.user_type === 'admin';
        });
        if (adminUsers.length > 0) {
          toast.error('Cannot delete admin users');
          setIsBulkActionDialogOpen(false);
          setIsProcessing(false);
          return;
        }
      }

      if (selectedUsers.length > 0) {
        if (bulkAction === 'delete') {
          for (const userId of selectedUsers) {
            await handleDeleteUser(userId);
          }
        } else if (bulkAction === 'ban') {
          const now = new Date().toISOString();
          for (const userId of selectedUsers) {
            await supabase
              .from('profiles')
              .update({ 
                is_banned: true, 
                banned_at: now, 
                banned_by: user?.id,
                updated_at: now,
              })
              .eq('id', userId);
          }
          toast.success(`${selectedUsers.length} users banned`);
        } else if (bulkAction === 'verify') {
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
          toast.success(`${selectedUsers.length} users verified`);
        }
        setSelectedUsers([]);
      }

      if (selectedProperties.length > 0) {
        if (bulkAction === 'delete') {
          for (const propId of selectedProperties) {
            await handleDeleteProperty(propId);
          }
        } else if (bulkAction === 'approve') {
          const now = new Date().toISOString();
          for (const propId of selectedProperties) {
            await supabase
              .from('properties')
              .update({ 
                status: 'active', 
                approved_at: now, 
                approved_by: user?.id,
                updated_at: now,
              })
              .eq('id', propId);
          }
          toast.success(`${selectedProperties.length} properties approved`);
        } else if (bulkAction === 'reject') {
          const now = new Date().toISOString();
          for (const propId of selectedProperties) {
            await supabase
              .from('properties')
              .update({ 
                status: 'rejected', 
                rejected_at: now,
                updated_at: now,
              })
              .eq('id', propId);
          }
          toast.success(`${selectedProperties.length} properties rejected`);
        }
        setSelectedProperties([]);
      }

      setIsBulkActionDialogOpen(false);
      
      // ✅ FIXED: Clear cache and force refresh
      clearCache();
      await fetchData(true);
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error('Failed to perform bulk action');
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================
  // RENDER HELPERS
  // ============================================================

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const togglePropertySelection = (propertyId: string) => {
    setSelectedProperties(prev =>
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  // ============================================================
  // FILTERED DATA
  // ============================================================

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || u.user_type === filterType;
    return matchesSearch && matchesType;
  });

  // Paginated users
  const paginatedUsers = filteredUsers.slice(0, (userPage + 1) * USERS_PER_PAGE);
  const hasMoreUsers = filteredUsers.length > (userPage + 1) * USERS_PER_PAGE;

  const filteredProperties = properties.filter(p => {
    const matchesSearch = 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location_city.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = propertyFilter === 'all' || p.status === propertyFilter;
    return matchesSearch && matchesStatus;
  });

  // ✅ FIXED: Show ALL unverified landlords (signing up IS the verification request)
  const unverifiedLandlords = users.filter(
    u => u.user_type === 'landlord' && !u.is_verified
  );
  const pendingVerificationCount = unverifiedLandlords.length;

  // ============================================================
  // RENDER
  // ============================================================

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

  // Loading state with skeletons
  if (loading && !cache) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-6 w-12 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-16 ml-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ===== HEADER ===== */}
      <div className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-gray-600">Full control over users, properties, and platform content</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => fetchData(true)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* ===== STATS CARDS ===== */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
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
                  <p className="text-xs text-green-600">{stats.activeProperties} active</p>
                </div>
                <Home className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending Properties</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pendingProperties}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          {/* ✅ FIXED: Shows ALL unverified landlords */}
          <Card className="border-purple-200 bg-purple-50/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Unverified Landlords</p>
                  <p className="text-2xl font-bold text-purple-600">{pendingVerificationCount}</p>
                </div>
                <UserCheck className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
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

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Views</p>
                  <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                </div>
                <Eye className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== MAIN TABS ===== */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
            {pendingVerificationCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-800">
                {pendingVerificationCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="properties" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            Properties
            {stats && stats.pendingProperties > 0 && (
              <Badge variant="secondary" className="ml-1 bg-yellow-100 text-yellow-800">
                {stats.pendingProperties}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="verifications" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Verifications
            {pendingVerificationCount > 0 && (
              <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-800">
                {pendingVerificationCount}
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
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        {/* ===== USERS TAB ===== */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Full control over all platform users - verify, ban, delete, or change roles
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                  {selectedUsers.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{selectedUsers.length} selected</Badge>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setBulkAction('delete');
                          setIsBulkActionDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBulkAction('ban');
                          setIsBulkActionDialogOpen(true);
                        }}
                      >
                        <Ban className="h-4 w-4 mr-1" />
                        Ban
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600"
                        onClick={() => {
                          setBulkAction('verify');
                          setIsBulkActionDialogOpen(true);
                        }}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedUsers([])}
                      >
                        Clear
                      </Button>
                    </div>
                  )}
                  <select
                    className="border rounded-md px-3 py-2 w-full sm:w-auto"
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
                    className="w-full sm:w-48"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* ✅ FIXED: Show unverified landlords banner */}
              {unverifiedLandlords.length > 0 && (
                <Alert className="mb-4 border-purple-200 bg-purple-50">
                  <UserCheck className="h-4 w-4 text-purple-600" />
                  <AlertDescription className="text-purple-700">
                    <span className="font-semibold">{unverifiedLandlords.length}</span> landlord(s) need verification. 
                    Signing up is their verification request.
                  </AlertDescription>
                </Alert>
              )}

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsers.includes(u.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers(paginatedUsers.map(u => u.id));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Properties</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUsers.map((user) => {
                        // ✅ FIXED: Show verify button for ALL unverified landlords
                        const showVerifyButtons = user.user_type === 'landlord' && !user.is_verified;
                        
                        return (
                          <TableRow 
                            key={user.id} 
                            className={showVerifyButtons ? 'bg-purple-50/50' : ''}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedUsers.includes(user.id)}
                                onCheckedChange={() => toggleUserSelection(user.id)}
                                disabled={user.user_type === 'admin'}
                              />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user.full_name || 'Unnamed'}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                                {user.is_banned && (
                                  <Badge variant="destructive" className="mt-1">Banned</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                user.user_type === 'admin' ? 'default' :
                                user.user_type === 'landlord' ? 'secondary' : 'outline'
                              }>
                                {user.user_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {getVerificationBadge(user)}
                              
                              {/* ✅ FIXED: Show verify buttons for ALL unverified landlords */}
                              {showVerifyButtons && (
                                <div className="flex gap-1 mt-1">
                                  <Button
                                    size="sm"
                                    className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setVerifyAction('verify');
                                      setIsVerifyDialogOpen(true);
                                    }}
                                    disabled={isProcessing}
                                  >
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Verify
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-6 px-2 text-xs"
                                    onClick={() => {
                                      setSelectedUser(user);
                                      setVerifyAction('reject');
                                      setIsVerifyDialogOpen(true);
                                    }}
                                    disabled={isProcessing}
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.user_type === 'landlord' ? (user.property_count || 0) : '-'}
                            </TableCell>
                            <TableCell>{formatDate(user.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" disabled={isProcessing}>
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuLabel>User Actions</DropdownMenuLabel>
                                  <DropdownMenuSeparator />
                                  
                                  <DropdownMenuItem onClick={() => {
                                    setSelectedUser(user);
                                    setIsUserDialogOpen(true);
                                  }}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  
                                  {user.user_type !== 'admin' && (
                                    <>
                                      <DropdownMenuItem onClick={() => {
                                        setSelectedUser(user);
                                        setIsRoleDialogOpen(true);
                                      }}>
                                        <UserCog className="mr-2 h-4 w-4" />
                                        Change Role
                                      </DropdownMenuItem>
                                      
                                      {user.user_type === 'landlord' && (
                                        <>
                                          <DropdownMenuSeparator />
                                          {!user.is_verified && (
                                            <DropdownMenuItem 
                                              className="text-green-600"
                                              onClick={() => {
                                                setSelectedUser(user);
                                                setVerifyAction('verify');
                                                setIsVerifyDialogOpen(true);
                                              }}
                                            >
                                              <UserCheck className="mr-2 h-4 w-4" />
                                              Verify User
                                            </DropdownMenuItem>
                                          )}
                                          {user.is_verified && (
                                            <DropdownMenuItem 
                                              className="text-red-600"
                                              onClick={() => {
                                                setSelectedUser(user);
                                                setVerifyAction('reject');
                                                setIsVerifyDialogOpen(true);
                                              }}
                                            >
                                              <UserX className="mr-2 h-4 w-4" />
                                              Revoke Verification
                                            </DropdownMenuItem>
                                          )}
                                        </>
                                      )}
                                      
                                      <DropdownMenuSeparator />
                                      
                                      {user.is_banned ? (
                                        <DropdownMenuItem 
                                          className="text-green-600"
                                          onClick={() => handleUnbanUser(user.id)}
                                          disabled={isProcessing}
                                        >
                                          <UserCheck className="mr-2 h-4 w-4" />
                                          Unban User
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem 
                                          className="text-red-600"
                                          onClick={() => {
                                            setSelectedUser(user);
                                            setIsBanDialogOpen(true);
                                          }}
                                          disabled={isProcessing}
                                        >
                                          <Ban className="mr-2 h-4 w-4" />
                                          Ban User
                                        </DropdownMenuItem>
                                      )}
                                      
                                      <DropdownMenuSeparator />
                                      
                                      <DropdownMenuItem 
                                        className="text-red-600 font-semibold"
                                        onClick={() => {
                                          setSelectedUser(user);
                                          setIsDeleteUserDialogOpen(true);
                                        }}
                                        disabled={isProcessing}
                                      >
                                        <UserMinus className="mr-2 h-4 w-4" />
                                        Delete Account
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

              {/* Load more users */}
              {hasMoreUsers && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setUserPage(prev => prev + 1)}
                    disabled={loading}
                  >
                    Load More Users
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== PROPERTIES TAB ===== */}
        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Property Management</CardTitle>
                  <CardDescription>
                    Approve, reject, feature, or delete any property listing
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                  {selectedProperties.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{selectedProperties.length} selected</Badge>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setBulkAction('delete');
                          setIsBulkActionDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-green-600"
                        onClick={() => {
                          setBulkAction('approve');
                          setIsBulkActionDialogOpen(true);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                        onClick={() => {
                          setBulkAction('reject');
                          setIsBulkActionDialogOpen(true);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                      </Button>
                    </div>
                  )}
                  <select
                    className="border rounded-md px-3 py-2 w-full sm:w-auto"
                    value={propertyFilter}
                    onChange={(e) => setPropertyFilter(e.target.value)}
                  >
                    <option value="all">All Properties</option>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="rejected">Rejected</option>
                    <option value="rented">Rented</option>
                    <option value="reported">Reported</option>
                  </select>
                  <Input
                    placeholder="Search properties..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-48"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={filteredProperties.length > 0 && filteredProperties.every(p => selectedProperties.includes(p.id))}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedProperties(filteredProperties.map(p => p.id));
                            } else {
                              setSelectedProperties([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Property</TableHead>
                      <TableHead>Landlord</TableHead>
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
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No properties found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProperties.map((property) => (
                        <TableRow key={property.id} className={property.status === 'pending' ? 'bg-yellow-50/50' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={selectedProperties.includes(property.id)}
                              onCheckedChange={() => togglePropertySelection(property.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{property.title}</p>
                              <p className="text-sm text-gray-500">ID: {property.id.slice(0, 8)}</p>
                              {property.is_featured && (
                                <Badge className="bg-amber-500 text-white">⭐ Featured</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{property.landlord?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-gray-500">{property.landlord?.email || ''}</p>
                            </div>
                          </TableCell>
                          <TableCell>E{property.price.toLocaleString()}</TableCell>
                          <TableCell>
                            {property.location_suburb}, {property.location_city}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(property.status)}>
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
                              <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Property Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                
                                <DropdownMenuItem onClick={() => {
                                  setSelectedProperty(property);
                                  setIsPropertyDialogOpen(true);
                                }}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                
                                <DropdownMenuItem asChild>
                                  <a href={`/properties/${property.id}`} target="_blank" rel="noopener noreferrer">
                                    <Globe className="mr-2 h-4 w-4" />
                                    Public View
                                  </a>
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                
                                {property.status === 'pending' && (
                                  <>
                                    <DropdownMenuItem 
                                      className="text-green-600"
                                      onClick={() => handleApproveProperty(property.id)}
                                    >
                                      <CheckCircle className="mr-2 h-4 w-4" />
                                      Approve
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onClick={() => handleRejectProperty(property.id)}
                                    >
                                      <XCircle className="mr-2 h-4 w-4" />
                                      Reject
                                    </DropdownMenuItem>
                                  </>
                                )}
                                
                                <DropdownMenuItem onClick={() => {
                                  setSelectedProperty(property);
                                  setIsFeatureDialogOpen(true);
                                }}>
                                  <Crown className="mr-2 h-4 w-4" />
                                  {property.is_featured ? 'Unfeature' : 'Feature'}
                                </DropdownMenuItem>
                                
                                <DropdownMenuSeparator />
                                
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => {
                                    setSelectedProperty(property);
                                    setIsDeletePropertyDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Property
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

        {/* ===== VERIFICATIONS TAB - NEW ===== */}
        <TabsContent value="verifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-purple-600" />
                Landlord Verifications
              </CardTitle>
              <CardDescription>
                Review and verify landlord accounts. Signing up is their verification request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unverifiedLandlords.length === 0 ? (
                <div className="text-center py-12">
                  <UserCheck className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All Landlords Verified</h3>
                  <p className="text-gray-500">No pending verification requests.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {unverifiedLandlords.map((landlord) => (
                    <Card key={landlord.id} className="border-purple-200 bg-purple-50/30">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">
                                {landlord.full_name || 'Unnamed Landlord'}
                              </h3>
                              <Badge className="bg-purple-100 text-purple-800">
                                ⏳ Awaiting Verification
                              </Badge>
                              {landlord.property_count && landlord.property_count > 0 && (
                                <Badge variant="outline">
                                  {landlord.property_count} {landlord.property_count === 1 ? 'property' : 'properties'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{landlord.email}</p>
                            {landlord.phone && (
                              <p className="text-sm text-gray-600">📞 {landlord.phone}</p>
                            )}
                            <p className="text-sm text-gray-500">
                              Joined: {formatDate(landlord.created_at)}
                            </p>
                            {landlord.verification_level === 'rejected' && (
                              <p className="text-sm text-red-600 flex items-center gap-1">
                                <XCircle className="h-3 w-3" />
                                Previously rejected. Reconsider or verify.
                              </p>
                            )}
                          </div>
                          
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              onClick={() => {
                                setSelectedUser(landlord);
                                setVerifyAction('verify');
                                setIsVerifyDialogOpen(true);
                              }}
                              disabled={isProcessing}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Verify Landlord
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => {
                                setSelectedUser(landlord);
                                setVerifyAction('reject');
                                setIsVerifyDialogOpen(true);
                              }}
                              disabled={isProcessing}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(landlord);
                                setIsUserDialogOpen(true);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
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

        {/* ===== REPORTS TAB ===== */}
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
              {reports.filter(r => r.status === 'pending').length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All Clear</h3>
                  <p className="text-gray-500">No pending reports to review.</p>
                </div>
              ) : (
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
                    {reports.filter(r => r.status === 'pending').map((report) => (
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
                          <div className="flex justify-end gap-2 flex-wrap">
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
                              onClick={() => handleDismissReport(report.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Dismiss
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

        {/* ===== ACTIVITY LOG TAB ===== */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Admin Activity Log
              </CardTitle>
              <CardDescription>
                Audit trail of all admin actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activityLog.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No activity logged yet
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {activityLog.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg">
                      <div className="shrink-0 mt-0.5">
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                          <span className="text-gray-500"> • {log.target_type}</span>
                          {log.admin && (
                            <span className="text-gray-400 text-xs ml-2">
                              by {log.admin.full_name || log.admin.email}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">{formatDate(log.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ============================================================
          DIALOGS
          ============================================================ */}

      {/* User Details Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="max-w-2xl">
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
                  <Label>Verification</Label>
                  {getVerificationBadge(selectedUser)}
                </div>
                <div>
                  <Label>Joined</Label>
                  <p>{formatDate(selectedUser.created_at)}</p>
                </div>
                <div>
                  <Label>Properties</Label>
                  <p>{selectedUser.property_count || 0}</p>
                </div>
                {selectedUser.phone && (
                  <div>
                    <Label>Phone</Label>
                    <p>{selectedUser.phone}</p>
                  </div>
                )}
                {selectedUser.last_active && (
                  <div>
                    <Label>Last Active</Label>
                    <p>{formatDate(selectedUser.last_active)}</p>
                  </div>
                )}
                {selectedUser.is_banned && (
                  <div className="col-span-2">
                    <Label className="text-red-600">Ban Reason</Label>
                    <p className="text-red-600">{selectedUser.ban_reason || 'No reason provided'}</p>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                  Close
                </Button>
                
                {selectedUser.user_type !== 'admin' && (
                  <>
                    {selectedUser.user_type === 'landlord' && !selectedUser.is_verified && (
                      <Button 
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => {
                          setIsUserDialogOpen(false);
                          setVerifyAction('verify');
                          setIsVerifyDialogOpen(true);
                        }}
                        disabled={isProcessing}
                      >
                        <UserCheck className="mr-2 h-4 w-4" />
                        Verify User
                      </Button>
                    )}
                    
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setIsUserDialogOpen(false);
                        setIsRoleDialogOpen(true);
                      }}
                      disabled={isProcessing}
                    >
                      <UserCog className="mr-2 h-4 w-4" />
                      Change Role
                    </Button>
                    
                    <Button 
                      variant={selectedUser.is_banned ? "default" : "destructive"}
                      className={selectedUser.is_banned ? "bg-green-600 hover:bg-green-700" : ""}
                      onClick={() => {
                        setIsUserDialogOpen(false);
                        if (selectedUser.is_banned) {
                          handleUnbanUser(selectedUser.id);
                        } else {
                          setIsBanDialogOpen(true);
                        }
                      }}
                      disabled={isProcessing}
                    >
                      {selectedUser.is_banned ? (
                        <>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Unban User
                        </>
                      ) : (
                        <>
                          <Ban className="mr-2 h-4 w-4" />
                          Ban User
                        </>
                      )}
                    </Button>
                    
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        setIsUserDialogOpen(false);
                        setIsDeleteUserDialogOpen(true);
                      }}
                      disabled={isProcessing}
                    >
                      <UserMinus className="mr-2 h-4 w-4" />
                      Delete Account
                    </Button>
                  </>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Property Details Dialog */}
      <Dialog open={isPropertyDialogOpen} onOpenChange={setIsPropertyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Property Details</DialogTitle>
          </DialogHeader>
          {selectedProperty && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Title</Label>
                  <p className="font-medium">{selectedProperty.title}</p>
                </div>
                <div>
                  <Label>Price</Label>
                  <p className="font-medium">E{selectedProperty.price.toLocaleString()}/month</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge className={getStatusColor(selectedProperty.status)}>
                    {selectedProperty.status}
                  </Badge>
                </div>
                <div>
                  <Label>Landlord</Label>
                  <p>{selectedProperty.landlord?.full_name || 'Unknown'}</p>
                </div>
                <div>
                  <Label>Email</Label>
                  <p className="text-sm">{selectedProperty.landlord?.email || 'N/A'}</p>
                </div>
                <div>
                  <Label>Location</Label>
                  <p>{selectedProperty.location_suburb}, {selectedProperty.location_city}</p>
                </div>
                <div>
                  <Label>Views</Label>
                  <p>{selectedProperty.views || 0}</p>
                </div>
                <div>
                  <Label>Listed</Label>
                  <p>{formatDate(selectedProperty.created_at)}</p>
                </div>
                {selectedProperty.is_featured && (
                  <div className="col-span-2">
                    <Badge className="bg-amber-500 text-white">⭐ Featured</Badge>
                  </div>
                )}
                {selectedProperty.reported_count && selectedProperty.reported_count > 0 && (
                  <div className="col-span-2">
                    <Badge variant="destructive">⚠️ {selectedProperty.reported_count} reports</Badge>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="outline" onClick={() => setIsPropertyDialogOpen(false)}>
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPropertyDialogOpen(false);
                    setIsFeatureDialogOpen(true);
                  }}
                >
                  <Crown className="mr-2 h-4 w-4" />
                  {selectedProperty.is_featured ? 'Unfeature' : 'Feature'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setIsPropertyDialogOpen(false);
                    setIsDeletePropertyDialogOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
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
              disabled={!banReason.trim() || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Ban'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Verify User Dialog */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {verifyAction === 'verify' ? (
                <>
                  <UserCheck className="h-5 w-5 text-green-600" />
                  Verify Landlord
                </>
              ) : (
                <>
                  <UserX className="h-5 w-5 text-red-600" />
                  Reject Verification
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {verifyAction === 'verify' 
                ? 'This will set is_verified = true and verification_level = "verified" for this landlord.'
                : 'This will set is_verified = false and verification_level = "rejected" for this landlord.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <p className="font-medium">{selectedUser?.full_name} ({selectedUser?.email})</p>
            </div>
            <div>
              <Label>Current Status</Label>
              {selectedUser && getVerificationBadge(selectedUser)}
            </div>
            {verifyAction === 'reject' && (
              <Alert variant="destructive">
                <AlertDescription>
                  The user will be notified and will need to submit a new verification request.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsVerifyDialogOpen(false);
              setSelectedUser(null);
              setVerifyAction(null);
            }}>
              Cancel
            </Button>
            <Button 
              variant={verifyAction === 'verify' ? 'default' : 'destructive'}
              className={verifyAction === 'verify' ? 'bg-green-600 hover:bg-green-700' : ''}
              onClick={() => {
                if (selectedUser && verifyAction) {
                  handleVerifyUser(selectedUser.id, verifyAction);
                }
              }}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                verifyAction === 'verify' ? (
                  <>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Confirm Verify
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Confirm Reject
                  </>
                )
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteUserDialogOpen} onOpenChange={setIsDeleteUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserMinus className="h-5 w-5" />
              Delete User Account
            </DialogTitle>
            <DialogDescription>
              This action will permanently delete the user and all associated data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <p className="font-medium">{selectedUser?.full_name} ({selectedUser?.email})</p>
            </div>
            <div>
              <Label>Data to be deleted</Label>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>{selectedUser?.property_count || 0} properties and all photos</li>
                <li>All saved properties and search alerts</li>
                <li>User profile and authentication</li>
              </ul>
            </div>
            <Alert variant="destructive">
              <AlertDescription>
                ⚠️ This action is IRREVERSIBLE. All data will be permanently lost.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedUser && handleDeleteUser(selectedUser.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Permanently Delete Account'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Property Dialog */}
      <Dialog open={isDeletePropertyDialogOpen} onOpenChange={setIsDeletePropertyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Property
            </DialogTitle>
            <DialogDescription>
              This will permanently delete this property and all associated photos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Property</Label>
              <p className="font-medium">{selectedProperty?.title}</p>
            </div>
            <Alert variant="destructive">
              <AlertDescription>
                ⚠️ This action cannot be undone.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeletePropertyDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedProperty && handleDeleteProperty(selectedProperty.id)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Property'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Change User Role
            </DialogTitle>
            <DialogDescription>
              Change the user's account type. This affects their permissions and dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <p className="font-medium">{selectedUser?.full_name} ({selectedUser?.email})</p>
            </div>
            <div>
              <Label>Current Role</Label>
              <Badge>{selectedUser?.user_type}</Badge>
            </div>
            <div>
              <Label>New Role</Label>
              <Select
                value={newRole}
                onValueChange={(value: 'admin' | 'landlord' | 'renter') => setNewRole(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="renter">Renter</SelectItem>
                  <SelectItem value="landlord">Landlord</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newRole === 'admin' && (
              <Alert>
                <AlertDescription>
                  ⚠️ Granting admin access gives full control over the platform.
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedUser && handleChangeRole(selectedUser.id, newRole)}
              disabled={isProcessing || newRole === selectedUser?.user_type}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Change Role'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feature Property Dialog */}
      <Dialog open={isFeatureDialogOpen} onOpenChange={setIsFeatureDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              {selectedProperty?.is_featured ? 'Unfeature' : 'Feature'} Property
            </DialogTitle>
            <DialogDescription>
              {selectedProperty?.is_featured 
                ? 'Remove the featured status from this property.' 
                : 'Mark this property as featured to give it premium visibility.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Property</Label>
              <p className="font-medium">{selectedProperty?.title}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFeatureDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant={selectedProperty?.is_featured ? 'outline' : 'default'}
              className={!selectedProperty?.is_featured ? 'bg-amber-500 hover:bg-amber-600' : ''}
              onClick={() => {
                if (selectedProperty) {
                  handleFeatureProperty(selectedProperty.id, !selectedProperty.is_featured);
                  setIsFeatureDialogOpen(false);
                }
              }}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                selectedProperty?.is_featured ? 'Remove Featured' : 'Feature Property'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={isBulkActionDialogOpen} onOpenChange={setIsBulkActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {bulkAction === 'delete' && <Trash2 className="h-5 w-5 text-red-600" />}
              {bulkAction === 'ban' && <Ban className="h-5 w-5 text-red-600" />}
              {bulkAction === 'verify' && <UserCheck className="h-5 w-5 text-green-600" />}
              {bulkAction === 'approve' && <CheckCircle className="h-5 w-5 text-green-600" />}
              {bulkAction === 'reject' && <XCircle className="h-5 w-5 text-red-600" />}
              Bulk Action: {bulkAction?.toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'delete' && 'This will permanently delete all selected items.'}
              {bulkAction === 'ban' && 'This will ban all selected users.'}
              {bulkAction === 'verify' && 'This will verify all selected users.'}
              {bulkAction === 'approve' && 'This will approve all selected properties.'}
              {bulkAction === 'reject' && 'This will reject all selected properties.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Selected Items</Label>
              <p className="font-medium">
                {selectedUsers.length > 0 && `${selectedUsers.length} user(s)`}
                {selectedUsers.length > 0 && selectedProperties.length > 0 && ' and '}
                {selectedProperties.length > 0 && `${selectedProperties.length} property(s)`}
              </p>
            </div>
            <Alert variant={bulkAction === 'delete' || bulkAction === 'ban' ? 'destructive' : 'default'}>
              <AlertDescription>
                {bulkAction === 'delete' && '⚠️ This action is IRREVERSIBLE.'}
                {bulkAction === 'ban' && '⚠️ Users will lose access to all features.'}
                {bulkAction === 'verify' && '✅ Users will be verified immediately.'}
                {bulkAction === 'approve' && '✅ Properties will be published immediately.'}
                {bulkAction === 'reject' && '❌ Properties will be rejected.'}
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant={bulkAction === 'delete' || bulkAction === 'ban' ? 'destructive' : 'default'}
              className={
                bulkAction === 'verify' ? 'bg-green-600 hover:bg-green-700' :
                bulkAction === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                bulkAction === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                ''
              }
              onClick={handleBulkAction}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                `Confirm ${bulkAction}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
