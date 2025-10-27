/**
 * Business Rules Constants for Kafè Restaurant
 * Defines operational constraints and configuration for the reservation system
 */

/**
 * Configuration for each restaurant region
 * NOTE: This is now stored in the database (Region model)
 * This interface is kept for type safety purposes
 */
export interface RegionConfig {
  id: string;
  name: string;
  displayName: string;
  capacity: number;
  tables: number;
  allowChildren: boolean;
  allowSmoking: boolean;
  isActive: boolean;
}

/**
 * Available time slots for reservations (30-minute intervals)
 */
export const TIME_SLOTS = [
  '18:00',
  '18:30',
  '19:00',
  '19:30',
  '20:00',
  '20:30',
  '21:00',
  '21:30',
  '22:00',
] as const;

/**
 * Date range for accepting reservations
 */
export const ALLOWED_DATE_RANGE = {
  start: '2025-07-24',
  end: '2025-07-31',
} as const;

/**
 * Reservation duration in hours
 */
export const RESERVATION_DURATION_HOURS = 2;

/**
 * Lock duration in minutes (how long a slot is held before payment)
 */
export const LOCK_DURATION_MINUTES = parseInt(
  process.env.LOCK_DURATION_MINUTES || '5',
  10,
);

/**
 * Maximum party size allowed
 */
export const MAX_PARTY_SIZE = 12;

/**
 * Minimum party size allowed
 */
export const MIN_PARTY_SIZE = 1;

/**
 * Phone number validation regex (international format)
 */
export const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

/**
 * Type for time slots
 */
export type TimeSlot = (typeof TIME_SLOTS)[number];

/**
 * Helper to check if a time slot is valid
 */
export function isValidTimeSlot(timeSlot: string): timeSlot is TimeSlot {
  return TIME_SLOTS.includes(timeSlot as TimeSlot);
}

/**
 * Helper to check if a date is within allowed range
 */
export function isDateInAllowedRange(date: Date): boolean {
  const startDate = new Date(ALLOWED_DATE_RANGE.start);
  const endDate = new Date(ALLOWED_DATE_RANGE.end);

  // Set to start of day for comparison
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  return checkDate >= startDate && checkDate <= endDate;
}

/**
 * Get all time slots that would overlap with a reservation at the given slot
 * A 2-hour reservation occupies 4 consecutive 30-minute slots
 *
 * Example: For slot 19:00 (7 PM) which occupies 19:00-21:00, we need to check:
 * - Past slots that extend into this period:
 *   - 18:00 (6 PM - 8 PM) - overlaps
 *   - 18:30 (6:30 PM - 8:30 PM) - overlaps
 * - Current slot: 19:00 (7 PM - 9 PM)
 * - Future slots that start before this period ends:
 *   - 19:30 (7:30 PM - 9:30 PM) - overlaps
 *   - 20:00 (8 PM - 10 PM) - overlaps
 *   - 20:30 (8:30 PM - 10:30 PM) - overlaps (starts before 21:00)
 *
 * @param timeSlot The time slot to check
 * @returns Array of time slots that could conflict with this slot
 */
export function getOverlappingTimeSlots(timeSlot: string): string[] {
  const slotIndex = TIME_SLOTS.indexOf(timeSlot as TimeSlot);
  if (slotIndex === -1) {
    throw new Error(`Invalid time slot: ${timeSlot}`);
  }

  // A 2-hour reservation spans 4 slots (120 minutes / 30 minutes per slot)
  const SLOTS_PER_RESERVATION = RESERVATION_DURATION_HOURS * 2;

  // Get slots that would overlap:
  // - Slots that start before this one but extend into it (previous 3 slots)
  // - The current slot itself
  // - Slots that start after this one but before it ends (next 3 slots)
  const overlappingSlots: string[] = [];

  // Start from (SLOTS_PER_RESERVATION - 1) slots before, end at (SLOTS_PER_RESERVATION - 1) slots after
  const startIndex = Math.max(0, slotIndex - (SLOTS_PER_RESERVATION - 1));
  const endIndex = Math.min(TIME_SLOTS.length - 1, slotIndex + (SLOTS_PER_RESERVATION - 1));

  for (let i = startIndex; i <= endIndex; i++) {
    overlappingSlots.push(TIME_SLOTS[i]);
  }

  return overlappingSlots;
}

/**
 * Parse time slot string to minutes since midnight
 * @param timeSlot Time slot in HH:MM format
 * @returns Minutes since midnight
 */
export function timeSlotToMinutes(timeSlot: string): number {
  const [hours, minutes] = timeSlot.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Calculate end time for a reservation starting at given slot
 * @param timeSlot Starting time slot
 * @returns End time in HH:MM format
 */
export function getReservationEndTime(timeSlot: string): string {
  const startMinutes = timeSlotToMinutes(timeSlot);
  const endMinutes = startMinutes + RESERVATION_DURATION_HOURS * 60;
  const hours = Math.floor(endMinutes / 60);
  const minutes = endMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
