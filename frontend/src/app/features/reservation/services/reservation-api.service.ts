import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Reservation, LockInfo, ReservationData } from '../../../core/models/reservation.model';

@Injectable({ providedIn: 'root' })
export class ReservationApiService {
  private api = inject(ApiService);

  lockSlot(data: { date: string, timeSlot: string, regionId: string, sessionId: string }): Observable<LockInfo> {
    return this.api.post<LockInfo>('/reservations/lock', data);
  }

  createReservation(data: ReservationData, sessionId: string): Observable<Reservation> {
    const body = {
      ...data,
      sessionId,
      regionId: data.region
    };
    const { region, ...bodyWithoutRegion } = body;
    return this.api.post<Reservation>('/reservations', bodyWithoutRegion);
  }

  getReservation(id: string): Observable<Reservation> {
    return this.api.get<Reservation>(`/reservations/${id}`);
  }

  releaseLock(sessionId: string): Observable<void> {
    return this.api.delete<void>(`/reservations/lock/${sessionId}`);
  }
}
