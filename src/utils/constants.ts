// src/utils/constants.ts

// Eswatini-specific constants
export const ESWATINI_CITIES = [
  'Manzini', 'Mbabane', 'Matsapha', 'Nhlangano', 'Siteki', 
  'Big Bend', 'Ezulwini', 'Lobamba', 'Piggs Peak', 'Kwaluseni',
  'Hlatikulu', 'Mhlume', 'Simunye'
] as const;

export const PROPERTY_TYPES = [
  'house', 'flat/apartment', 'shared', 'backrooms', 'other'
] as const;

export const ESWATINI_AMENITIES = [
  'Parking', 'Own Electricity Meter', 'Shared Electricity Meter', 'Security', 
  'Own Water Meter', 'Fully Fitted', 'Pet Friendly', 'Shower', 'Bathtub'
] as const;

// File upload limits
export const MAX_PHOTOS = 8;
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB

// Eswatini phone number validation
export const ESWATINI_PHONE_REGEX = /^(\+268)?[7-9][0-9]{7}$/;

// Price check debounce
export const PRICE_CHECK_DEBOUNCE = 800;

// Room options
export const ROOM_OPTIONS = ['0', '1', '2', '3', '4', '5'] as const;
export const BATH_OPTIONS = ['0', '1', '2', '3', '4'] as const;

// Property statuses
export const PROPERTY_STATUSES = {
  PENDING: 'pending',
  ACTIVE: 'active',
  RENTED: 'rented',
  REJECTED: 'rejected',
} as const;

// Eswatini country code (for phone formatting)
export const ESWATINI_COUNTRY_CODE = '268';

// Currency symbol
export const CURRENCY_SYMBOL = 'E';
export const CURRENCY_CODE = 'SZL'; // Swazi Lilangeni
