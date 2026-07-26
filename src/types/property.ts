// src/types/property.ts
// Ekhaya listing model — residential + land (MVP) + commercial (Phase 2)
// short_stay reserved for Phase 3

export type ListingIntent = 'sale' | 'long_rent' | 'short_stay';

export type AssetCategory = 'residential' | 'land' | 'commercial';

export type ResidentialSubtype =
  | 'house'
  | 'apartment'
  | 'backrooms'
  | 'shared'
  | 'townhouse'
  | 'other_residential';

export type LandSubtype =
  | 'residential_plot'
  | 'commercial_plot'
  | 'agricultural'
  | 'other_land';

export type CommercialSubtype =
  | 'office'
  | 'retail'
  | 'warehouse'
  | 'mixed_use'
  | 'other_commercial';

export type PropertySubtype = ResidentialSubtype | LandSubtype | CommercialSubtype;

export type FitOut = 'shell' | 'semi' | 'fitted';

export type PropertyType =
  | 'house'
  | 'flat/apartment'
  | 'shared'
  | 'backrooms'
  | 'other'
  | PropertySubtype
  | 'buy'
  | 'rent'
  | 'land';

/** @deprecated use ListingIntent */
export type ListingType = 'buy' | 'rent' | 'land';

export type TenureType = 'title_deed' | 'leasehold' | 'snl' | 'unsure';

export type PricePeriod = 'month' | 'year' | 'once' | 'night';

export type PropertyStatus =
  | 'pending'
  | 'active'
  | 'paused'
  | 'hidden'
  | 'taken'
  | 'deleted'
  | 'draft'
  | 'rejected'
  | 'rented'
  | 'reported';

export interface Property {
  id: string;
  landlord_id: string;
  title: string;
  description: string;

  listing_intent?: ListingIntent;
  asset_category?: AssetCategory;
  property_subtype?: PropertySubtype;

  property_type: PropertyType;
  listing_type?: ListingType;

  price: number;
  price_period?: PricePeriod;

  location_city: string;
  location_suburb: string;
  location_address?: string;
  area_id?: string;
  latitude?: number;
  longitude?: number;

  bedrooms?: number;
  bathrooms?: number;
  size_sqm?: number;
  is_furnished?: boolean;

  land_size_ha?: number;
  land_size_sqm?: number;
  is_fenced?: boolean;
  has_road_access?: boolean;
  has_water?: boolean;
  has_electricity?: boolean;
  has_sewer?: boolean;
  zoning_notes?: string;

  /** Commercial (Phase 2) */
  floor_area_sqm?: number;
  floors?: number;
  parking_bays?: number;
  fit_out?: FitOut;
  has_loading_bay?: boolean;
  has_street_frontage?: boolean;
  power_notes?: string;

  amenities: string[];
  lease_terms?: string;
  tenure_type?: TenureType;
  status: PropertyStatus;
  is_featured: boolean;
  views: number;
  save_count?: number;
  contact_count?: number;
  report_count?: number;
  created_at: string;
  updated_at: string;
  published_at?: string;
  expires_at?: string;
  contact_phone: string;
  contact_whatsapp?: string;
  country?: string;
  landlord?: {
    full_name: string;
    phone: string;
    is_verified: boolean;
    email?: string;
    role?: string;
  };
  photos?: PropertyPhoto[];
}

export interface PropertyPhoto {
  id: string;
  property_id: string;
  photo_url: string;
  caption?: string;
  display_order: number;
  created_at: string;
}

export interface PropertyFilters {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  propertyType?: PropertyType[];
  listingIntent?: ListingIntent[];
  assetCategory?: AssetCategory[];
  propertySubtype?: PropertySubtype[];
  tenureType?: TenureType[];
  amenities?: string[];
  furnished?: boolean;
  minLandHa?: number;
  maxLandHa?: number;
  minFloorArea?: number;
  keyword?: string;
}

export interface ExtendedProperty extends Property {
  landlord: {
    full_name: string;
    phone: string;
    is_verified: boolean;
    email?: string;
    role?: string;
  };
  photos: PropertyPhoto[];
}

export interface PropertyCardProps {
  property: Property;
  viewMode?: 'grid' | 'list';
  onSave?: (id: string) => void;
  isSaved?: boolean;
  onViewDetails?: (id: string) => void;
}

export interface NearbyPlace {
  type: string;
  name: string;
  distance: string;
  icon: string;
}

export interface SimilarProperty {
  id: string;
  title: string;
  price: number;
  location: string;
  image: string;
  bedrooms: number;
  bathrooms: number;
}

export interface Inquiry {
  id: string;
  property_id: string;
  name: string;
  email: string;
  phone?: string;
  message: string;
  status: 'new' | 'read' | 'replied';
  created_at: string;
}

export const TENURE_CONFIG: Record<
  TenureType,
  { label: string; bg: string; text: string; icon: string }
> = {
  title_deed: { label: 'Title Deed', bg: '#DCFCE7', text: '#166534', icon: 'ShieldCheck' },
  leasehold: { label: 'Leasehold', bg: '#FEF9C3', text: '#854D0E', icon: 'FileClock' },
  snl: { label: 'Swazi Nation Land', bg: '#FEE2E2', text: '#991B1B', icon: 'AlertTriangle' },
  unsure: { label: 'Unsure', bg: '#F3F4F6', text: '#374151', icon: 'HelpCircle' },
};

export const LISTING_INTENT_LABELS: Record<ListingIntent, string> = {
  sale: 'For sale',
  long_rent: 'Long-term rent',
  short_stay: 'Short stay',
};

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  residential: 'Residential',
  land: 'Land / plot',
  commercial: 'Commercial',
};

export const RESIDENTIAL_SUBTYPE_LABELS: Record<ResidentialSubtype, string> = {
  house: 'House',
  apartment: 'Flat / apartment',
  backrooms: 'Backrooms / cottage',
  shared: 'Shared / room',
  townhouse: 'Townhouse',
  other_residential: 'Other residential',
};

export const LAND_SUBTYPE_LABELS: Record<LandSubtype, string> = {
  residential_plot: 'Residential plot',
  commercial_plot: 'Commercial plot',
  agricultural: 'Agricultural land',
  other_land: 'Other land',
};

export const COMMERCIAL_SUBTYPE_LABELS: Record<CommercialSubtype, string> = {
  office: 'Office',
  retail: 'Retail / shop',
  warehouse: 'Warehouse / industrial',
  mixed_use: 'Mixed use',
  other_commercial: 'Other commercial',
};

export const FIT_OUT_LABELS: Record<FitOut, string> = {
  shell: 'Shell',
  semi: 'Semi-fitted',
  fitted: 'Fitted',
};

export function defaultPricePeriod(intent: ListingIntent): PricePeriod {
  switch (intent) {
    case 'sale':
      return 'once';
    case 'short_stay':
      return 'night';
    default:
      return 'month';
  }
}

export function subtypeToLegacyPropertyType(subtype: PropertySubtype | string): string {
  switch (subtype) {
    case 'apartment':
      return 'flat/apartment';
    case 'house':
    case 'backrooms':
    case 'shared':
      return subtype;
    case 'townhouse':
    case 'other_residential':
      return 'other';
    case 'residential_plot':
    case 'commercial_plot':
    case 'agricultural':
    case 'other_land':
      return 'land';
    case 'office':
    case 'retail':
    case 'warehouse':
    case 'mixed_use':
    case 'other_commercial':
      return 'other';
    default:
      return 'other';
  }
}

export function subtypeLabel(subtype?: string | null): string {
  if (!subtype) return 'Property';
  if (subtype in RESIDENTIAL_SUBTYPE_LABELS)
    return RESIDENTIAL_SUBTYPE_LABELS[subtype as ResidentialSubtype];
  if (subtype in LAND_SUBTYPE_LABELS) return LAND_SUBTYPE_LABELS[subtype as LandSubtype];
  if (subtype in COMMERCIAL_SUBTYPE_LABELS)
    return COMMERCIAL_SUBTYPE_LABELS[subtype as CommercialSubtype];
  if (subtype === 'flat/apartment') return 'Flat / apartment';
  return subtype.replace(/_/g, ' ');
}

export function inferAssetCategory(p: {
  asset_category?: string | null;
  property_type?: string | null;
  listing_type?: string | null;
  property_subtype?: string | null;
}): AssetCategory {
  if (
    p.asset_category === 'residential' ||
    p.asset_category === 'land' ||
    p.asset_category === 'commercial'
  ) {
    return p.asset_category;
  }
  const sub = p.property_subtype || p.property_type || '';
  if (
    ['office', 'retail', 'warehouse', 'mixed_use', 'other_commercial'].includes(sub)
  ) {
    return 'commercial';
  }
  if (p.listing_type === 'land' || p.property_type === 'land') return 'land';
  if (
    ['residential_plot', 'commercial_plot', 'agricultural', 'other_land'].includes(sub)
  ) {
    return 'land';
  }
  return 'residential';
}

export function inferListingIntent(p: {
  listing_intent?: string | null;
  listing_type?: string | null;
  price_period?: string | null;
}): ListingIntent {
  if (
    p.listing_intent === 'sale' ||
    p.listing_intent === 'long_rent' ||
    p.listing_intent === 'short_stay'
  ) {
    return p.listing_intent;
  }
  if (p.listing_type === 'buy' || p.price_period === 'once') return 'sale';
  if (p.price_period === 'night') return 'short_stay';
  return 'long_rent';
}

export function formatPricePeriod(period?: PricePeriod | null): string {
  switch (period) {
    case 'once':
      return '';
    case 'year':
      return '/year';
    case 'night':
      return '/night';
    case 'month':
    default:
      return '/month';
  }
}
