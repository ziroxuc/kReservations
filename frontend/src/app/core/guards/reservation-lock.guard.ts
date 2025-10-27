import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ReservationStateService } from '../../features/reservation/services/reservation-state.service';

export const reservationLockGuard: CanActivateFn = () => {
  const stateService = inject(ReservationStateService);
  const router = inject(Router);

  if (!stateService.isLockActive()) {
    router.navigate(['/reservation/step/1']);
    return false;
  }

  return true;
};
