// src/utils/phone.ts
import { ESWATINI_COUNTRY_CODE } from './constants';

/**
 * Normalize an Eswatini phone number to E.164 format
 */
export function normalizeEswatiniPhone(phone: string): string {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If it starts with 268 (Eswatini country code)
  if (cleaned.startsWith(ESWATINI_COUNTRY_CODE)) {
    return `+${cleaned}`;
  }
  
  // If it's 8 digits, assume local Eswatini number
  if (cleaned.length === 8) {
    return `+${ESWATINI_COUNTRY_CODE}${cleaned}`;
  }
  
  // If it's 9 digits and starts with a valid prefix
  if (cleaned.length === 9 && ['7', '8', '9'].includes(cleaned[0])) {
    return `+${ESWATINI_COUNTRY_CODE}${cleaned}`;
  }
  
  // Return as-is if we can't normalize
  return phone;
}

/**
 * Format an Eswatini phone number for display
 */
export function formatEswatiniPhone(phone: string): string {
  if (!phone) return '';
  
  const normalized = normalizeEswatiniPhone(phone);
  
  // Remove the + prefix for formatting
  const digits = normalized.replace('+', '');
  
  // Check if it has the country code
  if (digits.startsWith(ESWATINI_COUNTRY_CODE)) {
    const local = digits.slice(ESWATINI_COUNTRY_CODE.length);
    if (local.length === 8) {
      return `+${ESWATINI_COUNTRY_CODE} ${local.slice(0, 4)} ${local.slice(4)}`;
    }
    if (local.length === 9) {
      return `+${ESWATINI_COUNTRY_CODE} ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
    }
    return `+${digits}`;
  }
  
  // Local number
  if (digits.length === 8) {
    return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  }
  
  return phone;
}

/**
 * Validate an Eswatini phone number
 */
export function isValidEswatiniPhone(phone: string): boolean {
  if (!phone) return false;
  
  const normalized = normalizeEswatiniPhone(phone);
  const digits = normalized.replace(/\D/g, '');
  
  // Must have country code or be 8 digits
  if (digits.startsWith(ESWATINI_COUNTRY_CODE)) {
    const local = digits.slice(ESWATINI_COUNTRY_CODE.length);
    return local.length === 8 || local.length === 9;
  }
  
  return digits.length === 8;
}
