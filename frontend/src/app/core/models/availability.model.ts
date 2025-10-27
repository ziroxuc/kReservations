import { Region } from './region.model';

export interface RegionAvailability {
  region: Region; // Full region object from API
  availableTables: number; // Number of available tables
}

export interface TimeSlot {
  timeSlot: string;
  availableRegions: RegionAvailability[]; // Array of region availability objects
}

export interface Alternative {
  date: string;
  timeSlot: string;
  region: string; // Region ID (UUID)
  available: boolean;
}

export interface AvailabilityCheck {
  available: boolean;
  reason?: string;
}
