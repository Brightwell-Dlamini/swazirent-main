// src/lib/featureFlags.ts
//
// BETA / PRE-LAUNCH
// Flip these to false before public launch to re-enable verification gates.
//

/**
 * When true:
 * - Phone OTP is not required to publish
 * - Poster account verification is not required
 * - New listings go live as `active` (skip pending admin queue)
 *
 * Set to `false` when you launch for real.
 */
export const BETA_SKIP_VERIFICATION = true;

/** Listings created while beta flag is on skip the pending queue */
export const BETA_AUTO_PUBLISH = true;
