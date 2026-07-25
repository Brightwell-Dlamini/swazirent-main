// src/types/property.ts
// Ekhaya hybrid model — aligned with DOC-001 / DOC-005 while preserving existing data shape

/** Listing category (Buy / Rent / Land) — documents */
export type ListingType = 'buy' | 'rent' | 'land';

/** Legacy property_type values still present in the database */
export type PropertyType =
  | 'house'
  | 'flat/apartment'
  | 'shared'
  | 'backrooms'
  | 'other'
  | ListingType; // allow new values during transition

/** Land tenure — mandatory on every listing (DOC-001 FR-005 / DOC-005) */
export type TenureType = 'title_deed' | 'leasehold' | 'snl' | 'unsure';

/** Expanded status enum from DOC-005 */
export type PropertyStatus =
  | 'pending'
  | 'active'
  | 'paused'
  | 'hidden'
  | 'taken'
  | 'deleted'
  // legacy values still present in data
  | 'rejected'
  | 'rented'
  | 'reported';

export interface Property {
  id: string;
  /** Owner / poster — kept as landlord_id for backward compatibility */
  landlord_id: string;
  title: string;
  description: string;
  property_type: PropertyType;
  /** New field from documents — will be populated going forward */
  listing_type?: ListingType;
  price: number;
  /** month | year | once (for buy/land) */
  price_period?: 'month' | 'year' | 'once';
  location_city: string;
  location_suburb: string;
  location_address?: string;
  /** Future FK to areas table */
  area_id?: string;
  latitude?: number;
  longitude?: number;
  bedrooms?: number;
  bathrooms?: number;
  size_sqm?: number;
  is_furnished: boolean;
  amenities: string[];
  lease_terms?: string;
  /** Mandatory land tenure badge */
  tenure_type?: TenureType;
  status: PropertyStatus;
  is_featured: boolean;
  views: number;
  /** Denormalised counters (DOC-005) */
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
  listingType?: ListingType[];
  tenureType?: TenureType[];
  amenities?: string[];
  furnished?: boolean;
  keyword?: string;
}

// Extended types for property detail page
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

// Property detail page types
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

/** Tenure badge display helpers (semantic colours from documents) */
export const TENURE_CONFIG: Record<
  TenureType,
  { label: string; bg: string; text: string; icon: string }
> = {
  title_deed: {
    label: 'Title Deed',
    bg: '#DCFCE7',
    text: '#166534',
    icon: 'ShieldCheck',
  },
  leasehold: {
    label: 'Leasehold',
    bg: '#FEF9C3',
    text: '#854D0E',
    icon: 'FileClock',
  },
  snl: {
    label: 'Swazi Nation Land',
    bg: '#FEE2E2',
    text: '#991B1B',
    icon: 'AlertTriangle',
  },
  unsure: {
    label: 'Unsure',
    bg: '#F3F4F6',
    text: '#374151',
    icon: 'HelpCircle',
  },
};
