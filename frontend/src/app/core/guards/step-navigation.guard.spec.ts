import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot } from '@angular/router';
import { stepNavigationGuard } from './step-navigation.guard';
import { ReservationStateService } from '../../features/reservation/services/reservation-state.service';

describe('stepNavigationGuard', () => {
  let service: ReservationStateService;
  let router: Router;
  let mockRoute: ActivatedRouteSnapshot;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ReservationStateService,
        {
          provide: Router,
          useValue: {
            navigate: jasmine.createSpy('navigate')
          }
        }
      ]
    });

    service = TestBed.inject(ReservationStateService);
    router = TestBed.inject(Router);
  });

  function createMockRoute(stepNumber: string): ActivatedRouteSnapshot {
    return {
      paramMap: {
        get: (key: string) => (key === 'stepNumber' ? stepNumber : null)
      }
    } as any;
  }

  describe('Step 1', () => {
    it('should always allow access to step 1', () => {
      mockRoute = createMockRoute('1');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Step 2', () => {
    it('should allow access when step 1 is complete', () => {
      service.updateReservationData({
        date: '2025-07-24',
        timeSlot: '19:00'
      });

      mockRoute = createMockRoute('2');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to step 1 when date is missing', () => {
      service.updateReservationData({
        timeSlot: '19:00'
      });

      mockRoute = createMockRoute('2');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/reservation/step/1']);
    });

    it('should redirect to step 1 when timeSlot is missing', () => {
      service.updateReservationData({
        date: '2025-07-24'
      });

      mockRoute = createMockRoute('2');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/reservation/step/1']);
    });
  });

  describe('Step 3', () => {
    it('should allow access when steps 1 and 2 are complete', () => {
      service.updateReservationData({
        date: '2025-07-24',
        timeSlot: '19:00',
        customerName: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      });

      mockRoute = createMockRoute('3');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to step 1 when step 1 data is missing', () => {
      service.updateReservationData({
        customerName: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      });

      mockRoute = createMockRoute('3');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/reservation/step/1']);
    });

    it('should redirect to step 2 when step 2 data is missing', () => {
      service.updateReservationData({
        date: '2025-07-24',
        timeSlot: '19:00',
        customerName: 'John Doe'
        // Missing email and phone
      });

      mockRoute = createMockRoute('3');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/reservation/step/2']);
    });
  });

  describe('Step 4', () => {
    it('should allow access when all previous steps are complete', () => {
      service.updateReservationData({
        date: '2025-07-24',
        timeSlot: '19:00',
        customerName: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        partySize: 4
      });

      mockRoute = createMockRoute('4');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(true);
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to step 1 when step 1 data is missing', () => {
      service.updateReservationData({
        customerName: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        partySize: 4
      });

      mockRoute = createMockRoute('4');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/reservation/step/1']);
    });

    it('should redirect to step 2 when step 2 data is missing', () => {
      service.updateReservationData({
        date: '2025-07-24',
        timeSlot: '19:00',
        partySize: 4
      });

      mockRoute = createMockRoute('4');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/reservation/step/2']);
    });

    it('should redirect to step 3 when partySize is missing', () => {
      service.updateReservationData({
        date: '2025-07-24',
        timeSlot: '19:00',
        customerName: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      });

      mockRoute = createMockRoute('4');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/reservation/step/3']);
    });

    it('should redirect to step 3 when partySize is 0', () => {
      service.updateReservationData({
        date: '2025-07-24',
        timeSlot: '19:00',
        customerName: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        partySize: 0
      });

      mockRoute = createMockRoute('4');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/reservation/step/3']);
    });
  });

  describe('Invalid step', () => {
    it('should redirect to step 1 for invalid step numbers', () => {
      mockRoute = createMockRoute('999');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/reservation/step/1']);
    });

    it('should redirect to step 1 for step 0', () => {
      mockRoute = createMockRoute('0');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/reservation/step/1']);
    });

    it('should redirect to step 1 for negative step', () => {
      mockRoute = createMockRoute('-1');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/reservation/step/1']);
    });
  });

  describe('Edge cases', () => {
    it('should handle missing stepNumber parameter', () => {
      mockRoute = {
        paramMap: {
          get: () => null
        }
      } as any;

      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(true); // Defaults to step 1
    });

    it('should handle non-numeric stepNumber', () => {
      mockRoute = createMockRoute('abc');
      const result = TestBed.runInInjectionContext(() => stepNavigationGuard(mockRoute, {} as any));
      expect(result).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/reservation/step/1']);
    });
  });
});
