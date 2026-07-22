// src/app/dashboard/admin/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Settings,
  Mail,
  MessageSquare,
  Award,
  BarChart3,
  PieChart,
  Download,
  Upload,
  Lock,
  Unlock,
  Crown,
  Star,
  Heart,
  AlertTriangle,
  Ban,
  UserMinus,
  UserPlus,
  Calendar,
  Clock as ClockIcon,
  MapPin,
  Phone,
  Globe,
  FileText,
  Image,
  Video,
  Newspaper,
  Gift,
  Sparkles,
  Bell,
  Megaphone,
  Database,
  Server,
  Cloud,
  ShieldCheck,
  Key,
  Fingerprint,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Wifi,
  Bluetooth,
  Zap as ZapIcon,
  Coffee,
  Sun,
  Moon,
  CloudRain,
  Snowflake,
  Wind,
  Thermometer,
  Droplets,
  Umbrella,
  Leaf,
  Tree,
  Flower,
  Mountain,
  Waves,
  Flame,
  Compass,
  Map as MapIcon,
  Navigation,
  Target,
  Crosshair,
  Radar,
  Satellite,
  Send,
} from 'lucide-react';

// ===== TYPES =====

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  user_type: 'admin' | 'landlord' | 'renter';
  is_verified: boolean;
  created_at: string;
  last_active?: string;
  avatar_url?: string;
  phone?: string;
  location?: string;
  bio?: string;
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
  description?: string;
  property_type?: string;
  bedrooms?: number;
  bathrooms?: number;
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
  description?: string;
  property?: PropertyListing & { landlord: { full_name: string; email: string } };
  reporter?: { full_name: string; email: string };
}

interface AdminStats {
  // Basic stats
  totalUsers: number;
  totalLandlords: number;
  totalRenters: number;
  totalProperties: number;
  activeProperties: number;
  pendingProperties: number;
  reportedProperties: number;
  pendingReports: number;
  totalViews: number;
  
  // Advanced stats
  totalRevenue: number;
  monthlyRevenue: number;
  revenueGrowth: number;
  totalBookings: number;
  pendingBookings: number;
  completedBookings: number;
  averageRating: number;
  totalReviews: number;
  userGrowthRate: number;
  propertyGrowthRate: number;
  activeUsersLast30Days: number;
  bounceRate: number;
  avgSessionDuration: number;
  conversionRate: number;
  topPerformingCities: { city: string; count: number; revenue: number }[];
  propertyTypeDistribution: { type: string; count: number }[];
  userActivityHeatmap: { date: string; active: number }[];
  platformHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    responseTime: number;
    errorRate: number;
  };
}

interface EnhancedUser extends UserProfile {
  last_active: string;
  total_properties: number;
  total_reviews: number;
  average_rating: number;
  report_count: number;
  is_banned: boolean;
  is_featured: boolean;
  subscription_tier: 'free' | 'premium' | 'enterprise';
  subscription_end: string;
  verification_level: 'unverified' | 'verified' | 'premium_verified';
  referral_code: string;
  referral_count: number;
}

// ===== MAIN COMPONENT =====
export default function SuperAdminDashboard() {
  const { user, userType, isLoading: authLoading, isInitialized } = useAuth();
  const router = useRouter();

  // State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [properties, setProperties] = useState<PropertyListing[]>([]);
  const [reports, setReports] = useState<PropertyReport[]>([]);
  const [users, setUsers] = useState<EnhancedUser[]>([]);
  
  // Advanced state
  const [selectedUser, setSelectedUser] = useState<EnhancedUser | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isBanUserDialogOpen, setIsBanUserDialogOpen] = useState(false);
  const [isPromoteDialogOpen, setIsPromoteDialogOpen] = useState(false);
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Bulk actions
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState('');

  // Real-time updates
  const [isRealtime, setIsRealtime] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const realtimeChannel = useRef<any>(null);

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

  // ===== FETCH SUPER DATA =====
  const fetchSuperData = useCallback(async (forceRefresh = false) => {
    if (!user || userType !== 'admin') return;

    setLoading(true);
    try {
      // Fetch all stats in parallel
      const [
        userStats,
        propertyStats,
        bookingStats,
        revenueStats,
        analyticsStats,
        platformHealth,
        topCities,
        propertyTypes,
        activityHeatmap,
        usersList,
        propertiesList,
        reportsList,
      ] = await Promise.all([
        fetchUserStats(),
        fetchPropertyStats(),
        fetchBookingStats(),
        fetchRevenueStats(),
        fetchAnalyticsStats(),
        fetchPlatformHealth(),
        fetchTopCities(),
        fetchPropertyTypeDistribution(),
        fetchUserActivityHeatmap(),
        fetchUsersList(),
        fetchPropertiesList(),
        fetchReportsList(),
      ]);

      setStats({
        ...userStats,
        ...propertyStats,
        ...bookingStats,
        ...revenueStats,
        ...analyticsStats,
        platformHealth,
        topPerformingCities: topCities,
        propertyTypeDistribution: propertyTypes,
        userActivityHeatmap: activityHeatmap,
      });

      setUsers(usersList);
      setProperties(propertiesList);
      setReports(reportsList);
      setLastUpdated(new Date());

    } catch (error) {
      console.error('Error fetching super data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user, userType]);

  // ===== ADVANCED FETCH FUNCTIONS =====
  
  const fetchUserStats = async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const [
      { count: totalUsers },
      { count: totalLandlords },
      { count: totalRenters },
      { count: activeUsers },
      { data: growthData },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'landlord'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'renter'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gt('last_active', thirtyDaysAgo),
      supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true }),
    ]);

    const previousMonthUsers = growthData?.length || 0;
    const growthRate = previousMonthUsers > 0 
      ? ((activeUsers || 0) / previousMonthUsers) * 100 
      : 0;

    return {
      totalUsers: totalUsers || 0,
      totalLandlords: totalLandlords || 0,
      totalRenters: totalRenters || 0,
      activeUsersLast30Days: activeUsers || 0,
      userGrowthRate: growthRate,
    };
  };

  const fetchPropertyStats = async () => {
    const [
      { count: totalProperties },
      { count: activeProperties },
      { count: pendingProperties },
      { count: reportedProperties },
      { data: viewData },
      { data: growthData },
    ] = await Promise.all([
      supabase.from('properties').select('*', { count: 'exact', head: true }),
      supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('properties').select('*', { count: 'exact', head: true }).eq('status', 'reported'),
      supabase.from('properties').select('views'),
      supabase.from('properties').select('created_at').gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    ]);

    const totalViews = viewData?.reduce((sum, p) => sum + (p.views || 0), 0) || 0;
    const growthRate = ((growthData?.length || 0) / (totalProperties || 1)) * 100;

    return {
      totalProperties: totalProperties || 0,
      activeProperties: activeProperties || 0,
      pendingProperties: pendingProperties || 0,
      reportedProperties: reportedProperties || 0,
      totalViews,
      propertyGrowthRate: growthRate,
    };
  };

  const fetchBookingStats = async () => {
    const [
      { count: totalBookings },
      { count: pendingBookings },
      { count: completedBookings },
      { data: ratingData },
    ] = await Promise.all([
      supabase.from('bookings').select('*', { count: 'exact', head: true }),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('reviews').select('rating'),
    ]);

    const averageRating = ratingData?.reduce((sum, r) => sum + r.rating, 0) / (ratingData?.length || 1) || 0;

    return {
      totalBookings: totalBookings || 0,
      pendingBookings: pendingBookings || 0,
      completedBookings: completedBookings || 0,
      averageRating,
      totalReviews: ratingData?.length || 0,
    };
  };

  const fetchRevenueStats = async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const [
      { data: allRevenue },
      { data: monthlyRevenue },
    ] = await Promise.all([
      supabase.from('payments').select('amount'),
      supabase.from('payments').select('amount').gte('created_at', thirtyDaysAgo),
    ]);

    const totalRevenue = allRevenue?.reduce((sum, p) => sum + p.amount, 0) || 0;
    const monthRevenue = monthlyRevenue?.reduce((sum, p) => sum + p.amount, 0) || 0;
    
    // Calculate growth (compare to previous month)
    const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const { data: previousMonthRevenue } = await supabase
      .from('payments')
      .select('amount')
      .gte('created_at', twoMonthsAgo)
      .lt('created_at', thirtyDaysAgo);
    
    const prevRevenue = previousMonthRevenue?.reduce((sum, p) => sum + p.amount, 0) || 1;
    const growth = ((monthRevenue - prevRevenue) / prevRevenue) * 100;

    return {
      totalRevenue,
      monthlyRevenue: monthRevenue,
      revenueGrowth: growth,
    };
  };

  const fetchAnalyticsStats = async () => {
    // In a real app, this would come from an analytics service
    return {
      bounceRate: 23.5,
      avgSessionDuration: 184, // seconds
      conversionRate: 3.2,
    };
  };

  const fetchPlatformHealth = async () => {
    // Check Supabase health
    const startTime = Date.now();
    try {
      await supabase.from('properties').select('id', { count: 'exact', head: true });
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 200 ? 'healthy' : responseTime < 500 ? 'warning' : 'critical',
        uptime: 99.95,
        responseTime,
        errorRate: 0.5,
      };
    } catch {
      return {
        status: 'critical',
        uptime: 99.9,
        responseTime: 1000,
        errorRate: 2.5,
      };
    }
  };

  const fetchTopCities = async () => {
    const { data } = await supabase
      .from('properties')
      .select('location_city, price')
      .eq('status', 'active');

    const cityMap = new Map<string, { count: number; revenue: number }>();
    data?.forEach(p => {
      if (p.location_city) {
        const existing = cityMap.get(p.location_city) || { count: 0, revenue: 0 };
        cityMap.set(p.location_city, {
          count: existing.count + 1,
          revenue: existing.revenue + (p.price || 0),
        });
      }
    });

    return Array.from(cityMap.entries())
      .map(([city, data]) => ({ city, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const fetchPropertyTypeDistribution = async () => {
    const { data } = await supabase
      .from('properties')
      .select('property_type')
      .eq('status', 'active');

    const typeMap = new Map<string, number>();
    data?.forEach(p => {
      if (p.property_type) {
        typeMap.set(p.property_type, (typeMap.get(p.property_type) || 0) + 1);
      }
    });

    return Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  };

  const fetchUserActivityHeatmap = async () => {
    // Get last 30 days of activity
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split('T')[0]);
    }

    // In a real app, fetch from activity logs
    return days.map(date => ({
      date,
      active: Math.floor(Math.random() * 100) + 20,
    }));
  };

  const fetchUsersList = async () => {
    const { data } = await supabase
      .from('profiles')
      .select(`
        *,
        properties:properties(count),
        reviews:reviews(count),
        reports:reports(count)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    return (data || []).map(user => ({
      ...user,
      total_properties: user.properties?.[0]?.count || 0,
      total_reviews: user.reviews?.[0]?.count || 0,
      report_count: user.reports?.[0]?.count || 0,
      is_banned: false,
      is_featured: false,
      subscription_tier: 'free' as const,
      subscription_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      verification_level: user.is_verified ? 'verified' : 'unverified',
      referral_code: `REF${user.id.slice(0, 8)}`,
      referral_count: Math.floor(Math.random() * 10),
      last_active: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    }));
  };

  const fetchPropertiesList = async () => {
    const { data } = await supabase
      .from('properties')
      .select(`
        *,
        landlord:profiles!properties_landlord_id_fkey (full_name, email),
        photos:property_photos (id, photo_url)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    return data || [];
  };

  const fetchReportsList = async () => {
    const { data } = await supabase
      .from('reports')
      .select(`
        *,
        property:properties!property_id (id, title, price, location_city, location_suburb, landlord_id, status, landlord:profiles!properties_landlord_id_fkey (full_name, email)),
        reporter:profiles!reporter_id (full_name, email)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    return data || [];
  };

  // ===== REAL-TIME SUBSCRIPTION =====
  useEffect(() => {
    if (!isRealtime || !user || userType !== 'admin') return;

    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'properties' },
        () => fetchSuperData(true)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        () => fetchSuperData(true)
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchSuperData(true)
      )
      .subscribe();

    realtimeChannel.current = channel;

    return () => {
      if (realtimeChannel.current) {
        supabase.removeChannel(realtimeChannel.current);
      }
    };
  }, [isRealtime, user, userType, fetchSuperData]);

  // Initial data fetch
  useEffect(() => {
    if (user && userType === 'admin') {
      fetchSuperData();
    }
  }, [user, userType, fetchSuperData]);

  // ===== SUPER ACTIONS =====

  // User Management
  const handleBanUser = async (userId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: true, ban_reason: reason, banned_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_banned: true } : u
      ));
      toast.success('User banned successfully');
      setIsBanUserDialogOpen(false);
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: false, ban_reason: null, banned_at: null })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, is_banned: false } : u
      ));
      toast.success('User unbanned successfully');
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    }
  };

  const handlePromoteUser = async (userId: string, tier: 'premium' | 'enterprise') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          subscription_tier: tier,
          is_featured: true,
          verification_level: 'premium_verified',
        })
        .eq('id', userId);

      if (error) throw error;

      setUsers(users.map(u => 
        u.id === userId ? { ...u, subscription_tier: tier, is_featured: true, verification_level: 'premium_verified' } : u
      ));
      toast.success(`User promoted to ${tier} tier`);
      setIsPromoteDialogOpen(false);
    } catch (error) {
      console.error('Error promoting user:', error);
      toast.error('Failed to promote user');
    }
  };

  const handleSendMassEmail = async (subject: string, content: string, userFilter: string) => {
    try {
      // In a real app, this would call an email service API
      toast.success(`Mass email sent to ${userFilter} users`);
      setIsEmailDialogOpen(false);
    } catch (error) {
      console.error('Error sending mass email:', error);
      toast.error('Failed to send emails');
    }
  };

  // Property Management
  const handleApproveListing = async (propertyId: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'active' })
        .eq('id', propertyId);
      
      if (error) throw error;
      toast.success('Property approved successfully');
      await fetchSuperData(true);
    } catch (error) {
      console.error('Error approving property:', error);
      toast.error('Failed to approve property');
    }
  };

  const handleRejectListing = async (propertyId: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: 'rejected' })
        .eq('id', propertyId);
      
      if (error) throw error;
      toast.success('Property rejected successfully');
      await fetchSuperData(true);
    } catch (error) {
      console.error('Error rejecting property:', error);
      toast.error('Failed to reject property');
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);
      
      if (error) throw error;
      toast.success('Property deleted successfully');
      await fetchSuperData(true);
    } catch (error) {
      console.error('Error deleting property:', error);
      toast.error('Failed to delete property');
    }
  };

  // Bulk Actions
  const handleBulkAction = async () => {
    if (selectedItems.length === 0) {
      toast.error('No items selected');
      return;
    }

    try {
      switch (bulkAction) {
        case 'delete':
          await supabase
            .from('properties')
            .delete()
            .in('id', selectedItems);
          toast.success(`Deleted ${selectedItems.length} properties`);
          break;
        case 'approve':
          await supabase
            .from('properties')
            .update({ status: 'active' })
            .in('id', selectedItems);
          toast.success(`Approved ${selectedItems.length} properties`);
          break;
        case 'reject':
          await supabase
            .from('properties')
            .update({ status: 'rejected' })
            .in('id', selectedItems);
          toast.success(`Rejected ${selectedItems.length} properties`);
          break;
        case 'feature':
          await supabase
            .from('properties')
            .update({ is_featured: true })
            .in('id', selectedItems);
          toast.success(`Featured ${selectedItems.length} properties`);
          break;
        default:
          toast.error('Invalid bulk action');
      }
      setSelectedItems([]);
      await fetchSuperData(true);
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    }
  };

  // Export Data
  const handleExportData = async (format: 'csv' | 'excel' | 'pdf', dataType: string) => {
    try {
      toast.loading(`Exporting ${dataType} as ${format}...`);
      // In a real app, generate and download file
      toast.success(`${dataType} exported successfully`);
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  // ===== UI HELPERS =====

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      healthy: 'text-green-600 bg-green-50',
      warning: 'text-yellow-600 bg-yellow-50',
      critical: 'text-red-600 bg-red-50',
      active: 'text-green-600 bg-green-50',
      pending: 'text-yellow-600 bg-yellow-50',
      reported: 'text-red-600 bg-red-50',
      rejected: 'text-gray-600 bg-gray-50',
    };
    return colors[status] || 'text-gray-600 bg-gray-50';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      {/* Header with Super Powers */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-yellow-500" />
            Admin Super Dashboard
            <Badge variant="outline" className="ml-2 text-xs">
              v2.0
            </Badge>
          </h1>
          <p className="text-gray-600 flex items-center gap-2 mt-1">
            <Activity className="h-4 w-4" />
            System Status: {stats?.platformHealth.status === 'healthy' ? (
              <span className="text-green-600">✅ Healthy</span>
            ) : stats?.platformHealth.status === 'warning' ? (
              <span className="text-yellow-600">⚠️ Warning</span>
            ) : (
              <span className="text-red-600">🚨 Critical</span>
            )}
            <span className="text-xs text-gray-400 ml-2">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={isRealtime ? 'default' : 'outline'}
            onClick={() => setIsRealtime(!isRealtime)}
          >
            <Activity className="h-4 w-4 mr-2" />
            {isRealtime ? 'Live' : 'Paused'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => fetchSuperData(true)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExportDialogOpen(true)}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* SUPER STATS GRID */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                  <p className="text-xs text-green-600">+{stats.userGrowthRate.toFixed(1)}%</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Revenue</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                  <p className={`text-xs ${stats.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {stats.revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(stats.revenueGrowth).toFixed(1)}%
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Properties</p>
                  <p className="text-2xl font-bold">{stats.totalProperties.toLocaleString()}</p>
                  <p className="text-xs text-blue-600">+{stats.propertyGrowthRate.toFixed(1)}%</p>
                </div>
                <Home className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Bookings</p>
                  <p className="text-2xl font-bold">{stats.totalBookings.toLocaleString()}</p>
                  <p className="text-xs text-purple-600">{stats.pendingBookings} pending</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Rating</p>
                  <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)} ⭐</p>
                  <p className="text-xs text-gray-500">{stats.totalReviews} reviews</p>
                </div>
                <Star className="h-8 w-8 text-yellow-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Reports</p>
                  <p className="text-2xl font-bold">{stats.pendingReports}</p>
                  <p className="text-xs text-red-600">Needs attention</p>
                </div>
                <Flag className="h-8 w-8 text-red-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ADVANCED STATS ROW */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.conversionRate}%</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span>+0.8% this month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Session Duration</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{Math.floor(stats.avgSessionDuration / 60)}m {stats.avgSessionDuration % 60}s</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <ClockIcon className="h-3 w-3" />
                <span>Bounce rate: {stats.bounceRate}%</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Users (30d)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stats.activeUsersLast30Days.toLocaleString()}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Users className="h-3 w-3" />
                <span>{((stats.activeUsersLast30Days / stats.totalUsers) * 100).toFixed(1)}% of total</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TOP CITIES */}
      {stats && stats.topPerformingCities.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Top Performing Cities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {stats.topPerformingCities.map((city) => (
                <div key={city.city} className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold">{city.city}</p>
                  <p className="text-sm text-gray-500">{city.count} properties</p>
                  <p className="text-sm font-medium text-green-600">{formatCurrency(city.revenue)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* MAIN TABS */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
            <Badge variant="secondary" className="ml-1">
              {stats?.totalUsers || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="properties" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
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
          <TabsTrigger value="moderation" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Moderation
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* ===== OVERVIEW TAB ===== */}
        <TabsContent value="overview">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Platform Health
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <Badge className={getStatusColor(stats?.platformHealth.status || 'healthy')}>
                    {stats?.platformHealth.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Uptime</span>
                  <span className="font-semibold">{stats?.platformHealth.uptime}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Response Time</span>
                  <span className="font-semibold">{stats?.platformHealth.responseTime}ms</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Error Rate</span>
                  <span className="font-semibold text-red-600">{stats?.platformHealth.errorRate}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="justify-start" onClick={() => setIsEmailDialogOpen(true)}>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Newsletter
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Megaphone className="mr-2 h-4 w-4" />
                    Announcement
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Gift className="mr-2 h-4 w-4" />
                    Promotions
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Bell className="mr-2 h-4 w-4" />
                    Notifications
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== USERS TAB ===== */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    Manage users, promote, ban, and view details
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setIsEmailDialogOpen(true)}>
                    <Mail className="h-4 w-4 mr-2" />
                    Mass Email
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
                <select
                  className="border rounded-md px-3 py-2"
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Users</option>
                  <option value="landlord">Landlords</option>
                  <option value="renter">Renters</option>
                  <option value="admin">Admins</option>
                  <option value="banned">Banned</option>
                  <option value="premium">Premium</option>
                </select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Properties</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
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
                      <TableCell>{user.total_properties}</TableCell>
                      <TableCell>
                        {user.average_rating ? (
                          <span className="flex items-center gap-1">
                            {user.average_rating.toFixed(1)} ⭐
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        {user.is_banned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : user.verification_level === 'premium_verified' ? (
                          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                            <Crown className="h-3 w-3 mr-1" />
                            Premium
                          </Badge>
                        ) : user.is_verified ? (
                          <Badge variant="default">Verified</Badge>
                        ) : (
                          <Badge variant="outline">Unverified</Badge>
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
                            {!user.is_banned ? (
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsBanUserDialogOpen(true);
                                }}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Ban User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                className="text-green-600"
                                onClick={() => handleUnbanUser(user.id)}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Unban User
                              </DropdownMenuItem>
                            )}
                            {user.user_type !== 'admin' && (
                              <DropdownMenuItem onClick={() => {
                                setSelectedUser(user);
                                setIsPromoteDialogOpen(true);
                              }}>
                                <Crown className="mr-2 h-4 w-4" />
                                Promote User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== PROPERTIES TAB ===== */}
        <TabsContent value="properties">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Property Management
                  </CardTitle>
                  <CardDescription>
                    Manage all property listings with bulk actions
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setIsBulkActionDialogOpen(true)}
                    disabled={selectedItems.length === 0}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Bulk Action ({selectedItems.length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(properties.map(p => p.id));
                          } else {
                            setSelectedItems([]);
                          }
                        }}
                      />
                    </TableHead>
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
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(property.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems([...selectedItems, property.id]);
                            } else {
                              setSelectedItems(selectedItems.filter(id => id !== property.id));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{property.title}</p>
                          <p className="text-sm text-gray-500">
                            {property.location_suburb}, {property.location_city}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{property.landlord?.full_name || 'Unknown'}</TableCell>
                      <TableCell>{formatCurrency(property.price)}</TableCell>
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
                  ))}
                </TableBody>
              </Table>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reported Property</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
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
                      <TableCell>
                        <Badge variant={report.status === 'pending' ? 'outline' : 'default'}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(report.created_at)}</TableCell>
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
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-green-600">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Resolve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject Report
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {reports.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No pending reports
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== MODERATION TAB ===== */}
        <TabsContent value="moderation">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Moderation Queue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Content pending review</p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">Suspicious listing</p>
                      <p className="text-sm text-gray-500">2 hours ago</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-green-600">Approve</Button>
                      <Button size="sm" variant="outline" className="text-red-600">Reject</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">Inappropriate content</p>
                      <p className="text-sm text-gray-500">5 hours ago</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-green-600">Approve</Button>
                      <Button size="sm" variant="outline" className="text-red-600">Reject</Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">Duplicate listing</p>
                      <p className="text-sm text-gray-500">1 day ago</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-green-600">Approve</Button>
                      <Button size="sm" variant="outline" className="text-red-600">Reject</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  Trust & Safety
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Reported Users</span>
                    <Badge variant="destructive">3</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Flagged Content</span>
                    <Badge variant="outline">12</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Trust Score Avg</span>
                    <span className="font-semibold text-green-600">87%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Reviews</span>
                    <Badge variant="secondary">8</Badge>
                  </div>
                </div>
                <div className="mt-4">
                  <Button variant="outline" className="w-full">
                    <Shield className="mr-2 h-4 w-4" />
                    Review All Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== ANALYTICS TAB ===== */}
        <TabsContent value="analytics">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  User Activity (30 Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 flex items-end gap-1">
                  {stats?.userActivityHeatmap.map((day, i) => (
                    <div
                      key={day.date}
                      className="flex-1 bg-blue-500 rounded-t"
                      style={{
                        height: `${(day.active / Math.max(...stats.userActivityHeatmap.map(d => d.active))) * 100}%`,
                        opacity: 0.3 + (day.active / Math.max(...stats.userActivityHeatmap.map(d => d.active))) * 0.7,
                      }}
                      title={`${day.date}: ${day.active} users`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>{stats?.userActivityHeatmap[0]?.date}</span>
                  <span>{stats?.userActivityHeatmap[stats?.userActivityHeatmap.length - 1]?.date}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Property Type Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.propertyTypeDistribution.map((type) => (
                  <div key={type.type} className="flex items-center justify-between py-1">
                    <span>{type.type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${(type.count / stats.totalProperties) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm">{type.count}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ===== SETTINGS TAB ===== */}
        <TabsContent value="settings">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  System Configuration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Platform Name</Label>
                    <Input defaultValue="Rental Platform" className="mt-1" />
                  </div>
                  <div>
                    <Label>Default Currency</Label>
                    <select className="w-full border rounded-md px-3 py-2 mt-1">
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="CAD">CAD</option>
                    </select>
                  </div>
                  <div>
                    <Label>Commission Rate</Label>
                    <Input type="number" defaultValue="5" className="mt-1" />
                  </div>
                  <div>
                    <Label>Max Listing Duration</Label>
                    <Input type="number" defaultValue="30" className="mt-1" />
                  </div>
                </div>
                <div className="mt-4">
                  <Button>Save Settings</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Maintenance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-wrap">
                  <Button variant="outline" onClick={() => {
                    toast.info('Clearing cache...');
                    setTimeout(() => toast.success('Cache cleared'), 2000);
                  }}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Clear Cache
                  </Button>
                  <Button variant="outline" className="text-red-600">
                    <Database className="mr-2 h-4 w-4" />
                    Backup Database
                  </Button>
                  <Button variant="outline" className="text-yellow-600">
                    <Cloud className="mr-2 h-4 w-4" />
                    Run Migration
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ===== DIALOGS ===== */}

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
                  <p className="font-medium">{selectedUser.full_name}</p>
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
                  <Label>Status</Label>
                  {selectedUser.is_banned ? (
                    <Badge variant="destructive">Banned</Badge>
                  ) : (
                    <Badge variant="default">Active</Badge>
                  )}
                </div>
                <div>
                  <Label>Joined</Label>
                  <p>{formatDate(selectedUser.created_at)}</p>
                </div>
                <div>
                  <Label>Properties</Label>
                  <p>{selectedUser.total_properties}</p>
                </div>
                <div>
                  <Label>Subscription</Label>
                  <Badge variant="outline">{selectedUser.subscription_tier}</Badge>
                </div>
                <div>
                  <Label>Verification</Label>
                  <Badge>{selectedUser.verification_level}</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsUserDialogOpen(false)}>
                  Close
                </Button>
                {!selectedUser.is_banned && (
                  <Button 
                    variant="destructive"
                    onClick={() => {
                      setIsUserDialogOpen(false);
                      setIsBanUserDialogOpen(true);
                    }}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Ban User
                  </Button>
                )}
                <Button onClick={() => {
                  setSelectedUser(selectedUser);
                  setIsPromoteDialogOpen(true);
                  setIsUserDialogOpen(false);
                }}>
                  <Crown className="mr-2 h-4 w-4" />
                  Promote
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ban User Dialog */}
      <Dialog open={isBanUserDialogOpen} onOpenChange={setIsBanUserDialogOpen}>
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
              <Label>Reason for banning</Label>
              <Textarea
                placeholder="Please provide a reason for this ban..."
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
            <Button variant="outline" onClick={() => setIsBanUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => selectedUser && handleBanUser(selectedUser.id, 'Violation of terms')}
            >
              Confirm Ban
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promote User Dialog */}
      <Dialog open={isPromoteDialogOpen} onOpenChange={setIsPromoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Promote User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <p className="font-medium">{selectedUser?.full_name}</p>
            </div>
            <div>
              <Label>Select Tier</Label>
              <select className="w-full border rounded-md px-3 py-2">
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPromoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => selectedUser && handlePromoteUser(selectedUser.id, 'premium')}>
              <Crown className="mr-2 h-4 w-4" />
              Promote
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mass Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Mass Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Target Audience</Label>
              <select className="w-full border rounded-md px-3 py-2">
                <option value="all">All Users</option>
                <option value="landlords">Landlords</option>
                <option value="renters">Renters</option>
                <option value="premium">Premium Users</option>
                <option value="inactive">Inactive Users (30d)</option>
              </select>
            </div>
            <div>
              <Label>Subject</Label>
              <Input placeholder="Email subject..." />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea rows={5} placeholder="Write your email content..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleSendMassEmail('Test', 'Content', 'all')}>
              <Send className="mr-2 h-4 w-4" />
              Send to 1,234 users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={isBulkActionDialogOpen} onOpenChange={setIsBulkActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Bulk Actions
            </DialogTitle>
            <DialogDescription>
              Apply actions to {selectedItems.length} selected properties
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>Action</Label>
            <select 
              className="w-full border rounded-md px-3 py-2"
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
            >
              <option value="">Select action...</option>
              <option value="approve">Approve All</option>
              <option value="reject">Reject All</option>
              <option value="feature">Feature All</option>
              <option value="delete">Delete All</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkAction}
              disabled={!bulkAction}
            >
              Apply to {selectedItems.length} items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Data
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Data Type</Label>
              <select className="w-full border rounded-md px-3 py-2">
                <option value="users">Users</option>
                <option value="properties">Properties</option>
                <option value="bookings">Bookings</option>
                <option value="reports">Reports</option>
                <option value="all">Everything</option>
              </select>
            </div>
            <div>
              <Label>Format</Label>
              <select className="w-full border rounded-md px-3 py-2">
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
            </div>
            <div>
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Input type="date" />
                <Input type="date" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleExportData('csv', 'users')}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
