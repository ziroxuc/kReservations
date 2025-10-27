import { Injectable, signal } from '@angular/core';

export interface Notification {
  id?: string;
  type: 'error' | 'success' | 'info';
  message: string;
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notifications = signal<Notification[]>([]);

  readonly notifications$ = this.notifications.asReadonly();

  showError(message: string, duration = 5000): void {
    this.addNotification({ type: 'error', message, duration });
  }

  showSuccess(message: string, duration = 3000): void {
    this.addNotification({ type: 'success', message, duration });
  }

  showInfo(message: string, duration = 3000): void {
    this.addNotification({ type: 'info', message, duration });
  }

  private addNotification(notification: Notification): void {
    const id = Date.now().toString();
    const notif = { ...notification, id };

    this.notifications.update(current => [...current, notif]);

    // Auto-remove after duration
    setTimeout(() => {
      this.removeNotification(id);
    }, notification.duration);
  }

  removeNotification(id: string): void {
    this.notifications.update(current =>
      current.filter(n => n.id !== id)
    );
  }
}
