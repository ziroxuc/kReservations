import { ReservationStatus } from './enums';

export interface ReservationData {
  date: string;
  timeSlot: string;
  customerName: string;
  email: string;
  phone: string;
  partySize: number;
  region: string; // Region ID (UUID from backend)
  childrenCount: number;
  hasSmokingRequest: boolean;
  hasBirthday: boolean;
  birthdayName?: string;
}

export interface LockInfo {
  lockId: string;
  sessionId: string;
  expiresAt: string;
}

export interface Reservation extends ReservationData {
  id: string;
  status: ReservationStatus;
  createdAt: string;
}
