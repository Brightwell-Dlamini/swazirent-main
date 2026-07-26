// src/utils/constants.ts

export const ESWATINI_CITIES = [
  'Manzini',
  'Mbabane',
  'Matsapha',
  'Nhlangano',
  'Siteki',
  'Big Bend',
  'Ezulwini',
  'Lobamba',
  'Piggs Peak',
  'Kwaluseni',
  'Hlatikulu',
  'Mhlume',
  'Simunye',
] as const;

/** @deprecated */
export const PROPERTY_TYPES = [
  'house',
  'flat/apartment',
  'shared',
  'backrooms',
  'other',
] as const;

/** @deprecated */
export const LISTING_TYPES = ['buy', 'rent', 'land'] as const;

export const LISTING_INTENTS = ['sale', 'long_rent'] as const;

/** MVP + Phase 2 (no short_stay) */
export const ASSET_CATEGORIES = ['residential', 'land', 'commercial'] as const;

export const RESIDENTIAL_SUBTYPES = [
  'house',
  'apartment',
  'backrooms',
  'shared',
  'townhouse',
  'other_residential',
] as const;

export const LAND_SUBTYPES = [
  'residential_plot',
  'commercial_plot',
  'agricultural',
  'other_land',
] as const;

export const COMMERCIAL_SUBTYPES = [
  'office',
  'retail',
  'warehouse',
  'mixed_use',
  'other_commercial',
] as const;

export const FIT_OUT_OPTIONS = ['shell', 'semi', 'fitted'] as const;

export const TENURE_TYPES = ['title_deed', 'leasehold', 'snl', 'unsure'] as const;

export const RESIDENTIAL_AMENITIES = [
  'Water tank',
  'Borehole',
  'Solar',
  'Prepaid electricity',
  'Security / guard',
  'Boundary wall',
  'Parking',
  'Garage',
  'Garden',
  'Staff quarters',
  'Fibre / Wi-Fi',
  'Backup power',
  'Pet friendly',
  'Own electricity meter',
  'Shared electricity meter',
  'Own water meter',
  'Shower',
  'Bathtub',
] as const;

export const LAND_AMENITIES = [
  'Fenced',
  'Gate',
  'Gravel access',
  'Tar access',
  'Corner stand',
  'Flat / level',
  'Services on boundary',
  'Surveyed / beacons',
] as const;

export const COMMERCIAL_AMENITIES = [
  'Air conditioning',
  'Lift',
  'Reception',
  'Toilets',
  'Fibre',
  'Generator',
  'Security',
  'Parking',
  'Loading bay',
  'Street frontage',
] as const;

/** @deprecated */
export const ESWATINI_AMENITIES = RESIDENTIAL_AMENITIES;

export const MAX_PHOTOS = 10;
export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

export const ESWATINI_PHONE_REGEX = /^(\+268)?[7-9][0-9]{7}$/;

export const PRICE_CHECK_DEBOUNCE = 800;

export const ROOM_OPTIONS = ['0', '1', '2', '3', '4', '5'] as const;
export const BATH_OPTIONS = ['0', '1', '2', '3', '4'] as const;

export const PROPERTY_STATUSES = {
  PENDING: 'pending',
  ACTIVE: 'active',
  PAUSED: 'paused',
  HIDDEN: 'hidden',
  TAKEN: 'taken',
  DELETED: 'deleted',
  DRAFT: 'draft',
  RENTED: 'rented',
  REJECTED: 'rejected',
  REPORTED: 'reported',
} as const;

export const ESWATINI_COUNTRY_CODE = '268';
export const CURRENCY_SYMBOL = 'E';
export const CURRENCY_CODE = 'SZL';
