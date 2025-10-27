/**
 * IMPORTANT: Region is no longer an enum!
 * Regions are now fetched dynamically from the API.
 * Import Region interface from './region.model.ts' instead.
 */

export enum ReservationStatus {
  LOCKED = 'LOCKED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED'
}
