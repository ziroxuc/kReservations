import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error) => {
      console.error('HTTP Error:', error);

      // Handle specific errors
      if (error.status === 0) {
        notificationService.showError('Network error. Please check your connection.');
      } else if (error.status === 404) {
        notificationService.showError('Resource not found.');
      } else if (error.status === 500) {
        notificationService.showError('Server error. Please try again later.');
      } else if (error.error?.message) {
        notificationService.showError(error.error.message);
      }

      return throwError(() => error);
    })
  );
};
