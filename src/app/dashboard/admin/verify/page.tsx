// src/app/dashboard/admin/verify/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { canPostListings, getUserTypeLabel, normalizeUserType, UserType } from '@/types/user';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Users,
  Clock,
  AlertCircle,
  Shield,
  UserCheck,
  UserX,
  RefreshCw,
  ChevronLeft,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PosterProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  user_type: string;
  is_verified: boolean;
  verification_level: string | null;
  created_at: string;
  property_count: number;
}

const POSTER_TYPES = ['landlord', 'broker', 'agent'] as const;

export default function AdminVerificationPage() {
  const { user, userType, isLoading } = useAuth();
  const router = useRouter();
  const [posters, setPosters] = useState<PosterProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (!isLoading && userType !== 'admin') {
      router.push('/dashboard');
      toast.error('Access denied. Admin only.');
    }
  }, [userType, isLoading, router]);

  const fetchPosters = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          id,
          email,
          full_name,
          phone,
          user_type,
          is_verified,
          verification_level,
          created_at,
          properties:properties(count)
        `
        )
        .in('user_type', [...POSTER_TYPES])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData =
        data?.map((item: any) => ({
          ...item,
          property_count: item.properties?.[0]?.count || 0,
        })) || [];

      setPosters(formattedData);
    } catch (error) {
      console.error('Error fetching posters:', error);
      toast.error('Failed to load accounts for verification');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerify = async (userId: string, action: 'verify' | 'reject') => {
    setProcessing(userId);
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

      toast.success(`Account ${action === 'verify' ? 'verified' : 'rejected'} successfully`);
      await fetchPosters();
    } catch (error) {
      console.error('Error updating verification:', error);
      toast.error('Failed to update verification status');
    } finally {
      setProcessing(null);
    }
  };

  const fetchPosters = fetchLandlords;

  useEffect(() => {
    if (userType === 'admin') {
      fetchLandlords();
    }
  }, [userType]);

  if (isLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const stats = {
    total: landlords.length,
    verified: landlords.filter((l) => l.is_verified).length,
    unverified: landlords.filter((l) => !l.is_verified && l.verification_level !== 'rejected').length,
    rejected: landlords.filter((l) => l.verification_level === 'rejected').length,
  };

  const filteredLandlords = landlords.filter((l) => {
    if (activeTab === 'verified') return l.is_verified;
    if (activeTab === 'unverified') return !l.is_verified && l.verification_level !== 'rejected';
    if (activeTab === 'rejected') return l.verification_level === 'rejected';
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
            <a href="/dashboard/admin">← Back to admin</a>
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Shield className="h-7 w-7 text-primary" />
            Poster verification
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Verify landlords, brokers, and agents before they publish
          </p>
        </div>
        <Button onClick={fetchLandlords} variant="outline" disabled={loading} className="self-start">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card className="bg-card">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Total posters</p>
            <p className="text-xl sm:text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30 bg-green-500/10">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Verified</p>
            <p className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{stats.verified}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
            <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.unverified}</p>
          </CardContent>
        </Card>
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-muted-foreground">Rejected</p>
            <p className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="w-full flex flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="flex-1 min-w-[4.5rem]">All ({stats.total})</TabsTrigger>
          <TabsTrigger value="unverified" className="flex-1 min-w-[4.5rem]">Pending ({stats.unverified})</TabsTrigger>
          <TabsTrigger value="verified" className="flex-1 min-w-[4.5rem]">Verified ({stats.verified})</TabsTrigger>
          <TabsTrigger value="rejected" className="flex-1 min-w-[4.5rem]">Rejected ({stats.rejected})</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredLandlords.length === 0 ? (
        <Card>
          <CardContent className="p-8 sm:p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">No accounts found</h2>
            <p className="text-muted-foreground">Nothing in this category.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLandlords.map((landlord) => {
            const isVerified = landlord.is_verified;
            const level = landlord.verification_level;
            let statusColor =
              'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
            let statusLabel = 'Pending';
            if (isVerified) {
              statusColor = 'bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30';
              statusLabel = 'Verified';
            } else if (level === 'rejected') {
              statusColor = 'bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30';
              statusLabel = 'Rejected';
            }

            return (
              <Card
                key={landlord.id}
                className={
                  !isVerified && level !== 'rejected'
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'bg-card'
                }
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base sm:text-lg truncate">
                          {landlord.full_name || 'Unknown'}
                        </h3>
                        <Badge className={statusColor}>{statusLabel}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{landlord.email}</p>
                      {landlord.phone && (
                        <p className="text-sm text-muted-foreground">{landlord.phone}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(landlord.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex flex-row sm:flex-col gap-2 shrink-0">
                      {!isVerified && level !== 'rejected' && (
                        <>
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleVerify(landlord.id, 'verify')}
                            disabled={processing === landlord.id}
                          >
                            {processing === landlord.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="mr-1 h-4 w-4" /> Verify
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => {
                              if (confirm(`Reject ${landlord.full_name || 'this account'}?`)) {
                                handleVerify(landlord.id, 'reject');
                              }
                            }}
                            disabled={processing === landlord.id}
                          >
                            <XCircle className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </>
                      )}
                      {isVerified && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 dark:text-red-400"
                          onClick={() => {
                            if (confirm(`Revoke verification for ${landlord.full_name || 'this account'}?`)) {
                              handleVerify(landlord.id, 'reject');
                            }
                          }}
                          disabled={processing === landlord.id}
                        >
                          <XCircle className="mr-1 h-4 w-4" /> Revoke
                        </Button>
                      )}
                      {level === 'rejected' && !isVerified && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleVerify(landlord.id, 'verify')}
                          disabled={processing === landlord.id}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" /> Verify
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
                  );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
    </div>
  );
}
