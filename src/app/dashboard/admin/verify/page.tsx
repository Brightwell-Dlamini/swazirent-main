// src/app/dashboard/admin/verify/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
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
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface LandlordProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  is_verified: boolean;
  verification_level: string;
  created_at: string;
  property_count: number;
}

export default function AdminVerificationPage() {
  const { user, userType, isLoading } = useAuth();
  const router = useRouter();
  const [landlords, setLandlords] = useState<LandlordProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('pending');

  // ✅ FIXED: Use router.push instead of window.location.href
  useEffect(() => {
    if (!isLoading && userType !== 'admin') {
      router.push('/dashboard');
      toast.error('Access denied. Admin only.');
    }
  }, [userType, isLoading, router]);

  const fetchLandlords = async () => {
    setLoading(true);
    try {
      // ✅ FIXED: Show ALL landlords, with verification status
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          phone,
          is_verified,
          verification_level,
          created_at,
          properties:properties(count)
        `)
        .eq('user_type', 'landlord')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map((item: any) => ({
        ...item,
        property_count: item.properties?.[0]?.count || 0
      })) || [];

      setLandlords(formattedData);
    } catch (error) {
      console.error('Error fetching landlords:', error);
      toast.error('Failed to load landlords');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId: string, action: 'verify' | 'reject') => {
    setProcessing(userId);
    try {
      const now = new Date().toISOString();
      let updateData: any = {
        updated_at: now,
        verified_by: user?.id,
        verified_at: now,
      };

      if (action === 'verify') {
        updateData.is_verified = true;
        updateData.verification_level = 'verified';
      } else {
        updateData.is_verified = false;
        updateData.verification_level = 'rejected';
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', userId);

      if (error) throw error;

      toast.success(`Landlord ${action === 'verify' ? 'verified' : 'rejected'} successfully`);
      
      // Refresh the list
      await fetchLandlords();
    } catch (error) {
      console.error('Error updating verification:', error);
      toast.error('Failed to update verification status');
    } finally {
      setProcessing(null);
    }
  };

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

  // ✅ FIXED: Count unverified landlords properly
  const stats = {
    total: landlords.length,
    verified: landlords.filter(l => l.is_verified).length,
    unverified: landlords.filter(l => !l.is_verified).length,
    rejected: landlords.filter(l => l.verification_level === 'rejected').length,
  };

  const filteredLandlords = landlords.filter(l => {
    if (activeTab === 'verified') return l.is_verified;
    if (activeTab === 'unverified') return !l.is_verified && l.verification_level !== 'rejected';
    if (activeTab === 'rejected') return l.verification_level === 'rejected';
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Landlord Verification
          </h1>
          <p className="text-gray-600">Review and manage landlord account verifications</p>
        </div>
        <Button onClick={fetchLandlords} variant="outline" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Verified</p>
                <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Unverified</p>
                <p className="text-2xl font-bold text-amber-600">{stats.unverified}</p>
              </div>
              <Clock className="h-8 w-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-500">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
              </div>
              <UserX className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">
            All ({stats.total})
          </TabsTrigger>
          <TabsTrigger value="unverified">
            Unverified ({stats.unverified})
          </TabsTrigger>
          <TabsTrigger value="verified">
            Verified ({stats.verified})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({stats.rejected})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Landlord List */}
      {filteredLandlords.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Landlords Found</h2>
            <p className="text-gray-500">There are no landlords in this category.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredLandlords.map((landlord) => {
            const isVerified = landlord.is_verified;
            const level = landlord.verification_level;
            
            let statusColor = 'bg-amber-100 text-amber-800';
            let statusLabel = '⏳ Unverified';
            
            if (isVerified) {
              statusColor = 'bg-green-100 text-green-800';
              statusLabel = '✅ Verified';
            } else if (level === 'rejected') {
              statusColor = 'bg-red-100 text-red-800';
              statusLabel = '❌ Rejected';
            }

            return (
              <Card key={landlord.id} className={!isVerified && level !== 'rejected' ? 'border-amber-300 bg-amber-50/30' : ''}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">
                          {landlord.full_name || 'Unknown User'}
                        </h3>
                        <Badge className={statusColor}>
                          {statusLabel}
                        </Badge>
                        {landlord.property_count > 0 && (
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
                        Joined: {new Date(landlord.created_at).toLocaleDateString()}
                      </p>
                      {!isVerified && level !== 'rejected' && (
                        <p className="text-sm text-amber-600 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Awaiting verification
                        </p>
                      )}
                      {level === 'rejected' && (
                        <p className="text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Verification was rejected. Can be re-submitted.
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      {!isVerified && level !== 'rejected' ? (
                        <>
                          <Button
                            onClick={() => handleVerify(landlord.id, 'verify')}
                            disabled={processing === landlord.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {processing === landlord.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Verify
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => {
                              if (confirm(`Reject ${landlord.full_name || 'this landlord'}?`)) {
                                handleVerify(landlord.id, 'reject');
                              }
                            }}
                            disabled={processing === landlord.id}
                            variant="destructive"
                          >
                            {processing === landlord.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </>
                            )}
                          </Button>
                        </>
                      ) : isVerified ? (
                        <Button
                          onClick={() => {
                            if (confirm(`Remove verification for ${landlord.full_name || 'this landlord'}?`)) {
                              handleVerify(landlord.id, 'reject');
                            }
                          }}
                          disabled={processing === landlord.id}
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          {processing === landlord.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="mr-2 h-4 w-4" />
                              Revoke Verification
                            </>
                          )}
                        </Button>
                      ) : level === 'rejected' ? (
                        <Button
                          onClick={() => handleVerify(landlord.id, 'verify')}
                          disabled={processing === landlord.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processing === landlord.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Reconsider & Verify
                            </>
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
