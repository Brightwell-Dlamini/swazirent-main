// src/hooks/usePriceInsight.ts
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { CURRENCY_SYMBOL } from '@/utils/constants';

export interface PriceInsight {
  average: number;
  min: number;
  max: number;
  count: number;
  suggestion: 'low' | 'good' | 'high' | null;
  message: string;
}

interface UsePriceInsightParams {
  price: number | string;
  city: string;
  propertyType: string;
  bedrooms: number | string;
  excludePropertyId?: string;
  debounceDelay?: number;
}

export function usePriceInsight({
  price,
  city,
  propertyType,
  bedrooms,
  excludePropertyId,
  debounceDelay = 800,
}: UsePriceInsightParams) {
  const [priceInsight, setPriceInsight] = useState<PriceInsight | null>(null);
  const [checkingPrice, setCheckingPrice] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const checkPrice = useCallback(async () => {
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;
    const bedroomsNum = typeof bedrooms === 'string' ? parseInt(bedrooms) : bedrooms;

    if (
      !priceNum ||
      isNaN(priceNum) ||
      priceNum <= 0 ||
      !city ||
      !propertyType ||
      !bedroomsNum ||
      isNaN(bedroomsNum)
    ) {
      setPriceInsight(null);
      return;
    }

    setCheckingPrice(true);
    try {
      let query = supabase
        .from('properties')
        .select('price')
        .eq('location_city', city)
        .eq('property_type', propertyType)
        .eq('bedrooms', bedroomsNum)
        .eq('status', 'active')
        .not('price', 'is', null);

      if (excludePropertyId) {
        query = query.neq('id', excludePropertyId);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (!data || data.length === 0) {
        setPriceInsight({
          average: 0,
          min: 0,
          max: 0,
          count: 0,
          suggestion: null,
          message: 'Not enough similar properties to compare pricing.',
        });
        return;
      }

      const prices = data.map((p) => p.price);
      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const min = Math.min(...prices);
      const max = Math.max(...prices);

      let suggestion: 'low' | 'good' | 'high' | null = null;
      let message = '';

      if (priceNum < min * 0.9) {
        suggestion = 'low';
        message = `Your price is below market average (${CURRENCY_SYMBOL}${avg.toLocaleString()}). You might get interest quickly but could be leaving money on the table.`;
      } else if (priceNum > max * 1.1) {
        suggestion = 'high';
        message = `Your price is above market average (${CURRENCY_SYMBOL}${avg.toLocaleString()}). This might take longer to rent. Consider ${CURRENCY_SYMBOL}${min.toLocaleString()} - ${CURRENCY_SYMBOL}${max.toLocaleString()}`;
      } else {
        suggestion = 'good';
        message = `Your price is within market range (${CURRENCY_SYMBOL}${min.toLocaleString()} - ${CURRENCY_SYMBOL}${max.toLocaleString()}). Good job!`;
      }

      setPriceInsight({
        average: avg,
        min,
        max,
        count: data.length,
        suggestion,
        message,
      });
    } catch (error) {
      console.error('Error checking price:', error);
      setPriceInsight(null);
    } finally {
      setCheckingPrice(false);
    }
  }, [price, city, propertyType, bedrooms, excludePropertyId]);

  // Debounced price check
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(checkPrice, debounceDelay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [checkPrice, debounceDelay]);

  const applySuggestedPrice = useCallback(() => {
    if (priceInsight && priceInsight.count > 0) {
      const suggestedPrice = Math.round(
        (priceInsight.min + priceInsight.max) / 2,
      );
      return suggestedPrice;
    }
    return null;
  }, [priceInsight]);

  return {
    priceInsight,
    checkingPrice,
    applySuggestedPrice,
  };
}
