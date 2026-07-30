// src/lib/saveListing.ts
import { supabase } from '@/lib/supabase';
import {
  AssetCategory,
  ListingIntent,
  TenureType,
  FitOut,
  defaultPricePeriod,
  subtypeToLegacyPropertyType,
} from '@/types/property';
import { BETA_AUTO_PUBLISH } from '@/lib/featureFlags';

export type ListingFormPayload = {
  asset_category: AssetCategory | '';
  listing_intent: ListingIntent | '';
  property_subtype: string;
  title: string;
  description: string;
  tenure_type: TenureType;
  price: string;
  city: string;
  suburb: string;
  address: string;
  bedrooms: string;
  bathrooms: string;
  is_furnished: boolean;
  land_size_ha: string;
  is_fenced: boolean;
  has_road_access: boolean;
  has_water: boolean;
  has_electricity: boolean;
  has_sewer: boolean;
  zoning_notes: string;
  floor_area_sqm: string;
  floors: string;
  parking_bays: string;
  fit_out: FitOut | '';
  has_loading_bay: boolean;
  has_street_frontage: boolean;
  power_notes: string;
  amenities: string[];
  lease_terms: string;
  contact_whatsapp: string;
  contact_phone: string;
};

export type SaveListingResult =
  | { ok: true; id: string; status: string }
  | { ok: false; error: string };

/**
 * Insert a property row. Drafts allow incomplete data.
 * During beta, publish requests become `active` immediately.
 */
export async function saveListingRow(opts: {
  userId: string;
  form: ListingFormPayload;
  status: 'draft' | 'pending' | 'active';
  contactPhoneFallback?: string | null;
}): Promise<SaveListingResult> {
  const { userId, form, contactPhoneFallback } = opts;
  let status = opts.status;

  // Pre-launch: skip pending queue so testers see listings live
  if (status === 'pending' && BETA_AUTO_PUBLISH) {
    status = 'active';
  }

  const isDraft = status === 'draft';

  const intent = (form.listing_intent || 'long_rent') as ListingIntent;
  const category = (form.asset_category || 'residential') as AssetCategory;
  const subtype =
    form.property_subtype ||
    (category === 'land'
      ? 'residential_plot'
      : category === 'commercial'
        ? 'office'
        : 'house');

  let contactPhone =
    form.contact_phone.trim() ||
    contactPhoneFallback?.trim() ||
    '';

  if (!contactPhone && isDraft) {
    contactPhone = '+26800000000';
  }

  const propertyData: Record<string, unknown> = {
    landlord_id: userId,
    title: form.title.trim() || (isDraft ? 'Untitled draft' : 'Untitled'),
    description: form.description.trim() || (isDraft ? '' : ''),
    listing_intent: intent,
    asset_category: category,
    property_subtype: subtype,
    property_type: subtypeToLegacyPropertyType(subtype),
    listing_type: category === 'land' ? 'land' : intent === 'sale' ? 'buy' : 'rent',
    price_period: defaultPricePeriod(intent),
    tenure_type: form.tenure_type || 'unsure',
    price: parseFloat(form.price) || 0,
    location_city: form.city || (isDraft ? 'Manzini' : form.city),
    location_suburb: form.suburb.trim() || (isDraft ? 'TBD' : form.suburb.trim()),
    location_address: form.address.trim() || null,
    amenities: form.amenities || [],
    lease_terms: form.lease_terms.trim() || null,
    contact_whatsapp: form.contact_whatsapp.trim() || null,
    contact_phone: contactPhone,
    status,
    views: 0,
    is_featured: false,
  };

  if (category === 'residential') {
    propertyData.bedrooms = parseInt(form.bedrooms, 10) || null;
    propertyData.bathrooms = parseFloat(form.bathrooms) || null;
    propertyData.is_furnished = form.is_furnished;
  } else if (category === 'land') {
    propertyData.land_size_ha = form.land_size_ha
      ? parseFloat(form.land_size_ha)
      : null;
    propertyData.is_fenced = form.is_fenced;
    propertyData.has_road_access = form.has_road_access;
    propertyData.has_water = form.has_water;
    propertyData.has_electricity = form.has_electricity;
    propertyData.has_sewer = form.has_sewer;
    propertyData.zoning_notes = form.zoning_notes.trim() || null;
  } else if (category === 'commercial') {
    propertyData.floor_area_sqm = form.floor_area_sqm
      ? parseFloat(form.floor_area_sqm)
      : null;
    propertyData.floors = form.floors ? parseInt(form.floors, 10) : null;
    propertyData.parking_bays = form.parking_bays
      ? parseInt(form.parking_bays, 10)
      : null;
    propertyData.fit_out = form.fit_out || null;
    propertyData.has_loading_bay = form.has_loading_bay;
    propertyData.has_street_frontage = form.has_street_frontage;
    propertyData.power_notes = form.power_notes.trim() || null;
  }

  try {
    const { data, error } = await supabase
      .from('properties')
      .insert([propertyData])
      .select('id')
      .single();

    if (error) {
      return { ok: false, error: error.message || 'Database rejected the listing' };
    }
    if (!data?.id) {
      return { ok: false, error: 'No listing id returned' };
    }
    return { ok: true, id: data.id, status };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Unexpected save error',
    };
  }
}
