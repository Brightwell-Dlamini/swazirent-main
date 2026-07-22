// src/hooks/useLandlordProperties.ts
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Property, PropertyPhoto } from '@/types/property';
import { toast } from 'sonner';

interface PropertyWithPhotos extends Property {
  photos: PropertyPhoto[];
}

interface UseLandlordPropertiesOptions {
  autoFetch?: boolean;
  userId?: string;
}

export function useLandlordProperties(options: UseLandlordPropertiesOptions = {}) {
  const { autoFetch = true, userId } = options;
  
  const [properties, setProperties] = useState<PropertyWithPhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    rented: 0,
    pending: 0,
    rejected: 0,
    totalViews: 0,
  });
  
  const fetchRef = useRef(false);

  const fetchProperties = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          landlord:profiles!properties_landlord_id_fkey (
            full_name,
            phone,
            is_verified
          ),
          photos:property_photos (
            id,
            photo_url,
            caption,
            display_order,
            created_at
          )
        `)
        .eq('landlord_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformedData: PropertyWithPhotos[] = (data || []).map((item: any) => ({
        ...item,
        landlord: item.landlord || undefined,
        photos: item.photos || [],
      }));

      setProperties(transformedData);

      // Calculate stats in single pass
      const newStats = transformedData.reduce((acc, p) => {
        acc.total++;
        if (p.status === 'active') acc.active++;
        else if (p.status === 'rented') acc.rented++;
        else if (p.status === 'pending') acc.pending++;
        else if (p.status === 'rejected') acc.rejected++;
        acc.totalViews += p.views || 0;
        return acc;
      }, { total: 0, active: 0, rented: 0, pending: 0, rejected: 0, totalViews: 0 });

      setStats(newStats);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setError(error instanceof Error ? error.message : 'Failed to load properties');
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && userId && !fetchRef.current) {
      fetchRef.current = true;
      fetchProperties();
    }
  }, [autoFetch, userId, fetchProperties]);

  const updateStatus = useCallback(async (propertyId: string, newStatus: 'active' | 'rented') => {
    // Find property for optimistic update
    const property = properties.find(p => p.id === propertyId);
    if (!property) return false;

    const previousStatus = property.status;
    
    // Optimistic update
    setProperties(prev => prev.map(p => 
      p.id === propertyId ? { ...p, status: newStatus } : p
    ));

    try {
      const { error } = await supabase
        .from('properties')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', propertyId);

      if (error) throw error;
      
      toast.success(`Property marked as ${newStatus}`);
      await fetchProperties(); // Refresh stats
      return true;
    } catch (error) {
      // Rollback
      setProperties(prev => prev.map(p => 
        p.id === propertyId ? { ...p, status: previousStatus } : p
      ));
      toast.error('Failed to update property status');
      return false;
    }
  }, [properties, fetchProperties]);

  const deleteProperty = useCallback(async (propertyId: string) => {
    // Store the property for potential rollback
    const deletedProperty = properties.find(p => p.id === propertyId);
    
    // Remove from UI immediately (optimistic)
    setProperties(prev => prev.filter(p => p.id !== propertyId));

    try {
      // Get photos for storage deletion
      const { data: photos } = await supabase
        .from('property_photos')
        .select('photo_url')
        .eq('property_id', propertyId);

      // Extract file paths
      const filePaths = photos?.map(p => {
        try {
          const url = new URL(p.photo_url);
          const parts = url.pathname.split('/');
          const publicIndex = parts.indexOf('public');
          if (publicIndex !== -1) {
            return parts.slice(publicIndex + 1).join('/');
          }
          const bucketIndex = parts.indexOf('property-photos');
          if (bucketIndex !== -1) {
            return parts.slice(bucketIndex + 1).join('/');
          }
          return null;
        } catch {
          return null;
        }
      }).filter((path): path is string => path !== null) || [];

      // Delete from storage
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('property-photos')
          .remove(filePaths);
        
        if (storageError) {
          console.error('Storage deletion error:', storageError);
          // Continue with DB deletion even if storage fails
        }
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (dbError) throw dbError;

      toast.success('Property deleted successfully');
      await fetchProperties(); // Refresh stats
      return true;
    } catch (error) {
      // Restore on error
      if (deletedProperty) {
        setProperties(prev => [...prev, deletedProperty]);
      }
      toast.error('Failed to delete property');
      return false;
    }
  }, [properties, fetchProperties]);

  return {
    properties,
    loading,
    error,
    stats,
    fetchProperties,
    updateStatus,
    deleteProperty,
    setProperties,
  };
}
