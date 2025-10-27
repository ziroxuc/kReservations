import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { ReservationStateService } from '../../features/reservation/services/reservation-state.service';

/**
 * Step Navigation Guard
 *
 * Prevents users from jumping to future steps via URL manipulation
 * without completing the required data for previous steps.
 *
 * Business Rules:
 * - Step 1: Always accessible (entry point)
 * - Step 2: Requires date and timeSlot from Step 1
 * - Step 3: Requires customerName, email, phone from Step 2
 * - Step 4: Requires partySize from Step 3
 *
 * If validation fails, redirects to the highest accessible step.
 */
export const stepNavigationGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const stateService = inject(ReservationStateService);
  const router = inject(Router);

  const requestedStep = parseInt(route.paramMap.get('stepNumber') || '1');
  const data = stateService.reservationData();

  // Step 1 is always accessible (entry point)
  if (requestedStep === 1) {
    return true;
  }

  // Step 2: Requires date and timeSlot from Step 1
  if (requestedStep === 2) {
    if (!data.date || !data.timeSlot) {
      router.navigate(['/reservation/step/1']);
      return false;
    }
    return true;
  }

  // Step 3: Requires Step 1 and Step 2 data
  if (requestedStep === 3) {
    if (!data.date || !data.timeSlot) {
      router.navigate(['/reservation/step/1']);
      return false;
    }
    if (!data.customerName || !data.email || !data.phone) {
      router.navigate(['/reservation/step/2']);
      return false;
    }
    return true;
  }

  // Step 4: Requires Step 1, 2, and 3 data
  if (requestedStep === 4) {
    if (!data.date || !data.timeSlot) {
      router.navigate(['/reservation/step/1']);
      return false;
    }
    if (!data.customerName || !data.email || !data.phone) {
      router.navigate(['/reservation/step/2']);
      return false;
    }
    if (data.partySize === undefined || data.partySize <= 0) {
      router.navigate(['/reservation/step/3']);
      return false;
    }
    return true;
  }

  // Invalid step number - redirect to step 1
  router.navigate(['/reservation/step/1']);
  return false;
};
